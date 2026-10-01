"""Staff lead pipeline: enquiries, their stage, assignee, follow-up date and notes."""

from typing import Any

import django_filters
from django.db.models import Count, Q, QuerySet
from django.utils import timezone
from django.utils.formats import date_format
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.accounts.models import User
from apps.core.permissions import IsStaff

from .models import OPEN_STAGES, Enquiry, Kind, Note, Stage


def _name(user: User | None) -> str:
    return (user.get_full_name() or user.email) if user else ""


class NoteSerializer(serializers.ModelSerializer[Note]):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = ["id", "body", "author_name", "is_system", "created_at"]
        read_only_fields = ["id", "author_name", "is_system", "created_at"]

    def get_author_name(self, note: Note) -> str:
        return _name(note.author)

    def validate_body(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Write a note first.")
        return value


class EnquiryListSerializer(serializers.ModelSerializer[Enquiry]):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_staff=True, is_active=True),
        allow_null=True,
        required=False,
    )
    assigned_to_name = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Enquiry
        fields = [
            "uuid",
            "reference",
            "kind",
            "name",
            "email",
            "phone",
            "property_label",
            "stage",
            "assigned_to",
            "assigned_to_name",
            "follow_up_on",
            "is_overdue",
            "is_spam",
            "created_at",
        ]
        read_only_fields = [
            "uuid",
            "reference",
            "kind",
            "name",
            "email",
            "phone",
            "property_label",
            "created_at",
        ]

    def get_assigned_to_name(self, enquiry: Enquiry) -> str:
        return _name(enquiry.assigned_to)

    def get_is_overdue(self, enquiry: Enquiry) -> bool:
        return bool(
            enquiry.is_open()
            and enquiry.follow_up_on
            and enquiry.follow_up_on < timezone.localdate()
        )


class EnquiryDetailSerializer(EnquiryListSerializer):
    property = serializers.SerializerMethodField()
    purpose_label = serializers.CharField(source="get_purpose_display", read_only=True)
    has_account = serializers.SerializerMethodField()
    notes = NoteSerializer(many=True, read_only=True)

    class Meta(EnquiryListSerializer.Meta):
        fields = [
            *EnquiryListSerializer.Meta.fields,
            "message",
            "property",
            "property_type",
            "location",
            "purpose",
            "purpose_label",
            "units",
            "source_path",
            "consent_at",
            "consent_version",
            "spam_check",
            "closed_at",
            "has_account",
            "notes",
        ]
        read_only_fields = [
            *EnquiryListSerializer.Meta.read_only_fields,
            "message",
            "property_type",
            "location",
            "purpose",
            "units",
            "source_path",
            "consent_at",
            "consent_version",
            "spam_check",
            "closed_at",
        ]

    @extend_schema(
        responses=inline_serializer(
            "EnquiryProperty",
            {
                "slug": serializers.CharField(),
                "reference": serializers.CharField(),
                "title": serializers.CharField(),
                "uuid": serializers.UUIDField(),
            },
        )
    )
    def get_property(self, enquiry: Enquiry) -> dict[str, str] | None:
        prop = enquiry.property
        if prop is None:
            return None
        return {
            "slug": prop.slug,
            "reference": prop.reference or "",
            "title": prop.title,
            "uuid": str(prop.uuid),
        }

    def get_has_account(self, enquiry: Enquiry) -> bool:
        return enquiry.user_id is not None

    def update(self, enquiry: Enquiry, validated_data: dict[str, Any]) -> Enquiry:
        """Apply the change and record it on the timeline."""
        author = self.context["request"].user
        events = []
        if "stage" in validated_data and validated_data["stage"] != enquiry.stage:
            old, new = Stage(enquiry.stage).label, Stage(validated_data["stage"]).label
            events.append(f"Stage changed from {old} to {new}.")
        if "assigned_to" in validated_data and validated_data["assigned_to"] != enquiry.assigned_to:
            who = validated_data["assigned_to"]
            events.append(f"Assigned to {_name(who)}." if who else "No longer assigned.")
        if (
            "follow_up_on" in validated_data
            and validated_data["follow_up_on"] != enquiry.follow_up_on
        ):
            day = validated_data["follow_up_on"]
            events.append(
                f"Follow-up set for {date_format(day, 'D j M Y')}." if day else "Follow-up cleared."
            )
        if "is_spam" in validated_data and validated_data["is_spam"] != enquiry.is_spam:
            events.append("Marked as spam." if validated_data["is_spam"] else "Marked as not spam.")
        enquiry = super().update(enquiry, validated_data)
        Note.objects.bulk_create(
            Note(enquiry=enquiry, author=author, body=body, is_system=True) for body in events
        )
        return enquiry


class DashboardEnquiryFilter(django_filters.FilterSet):
    stage = django_filters.ChoiceFilter(
        choices=[("open", "All open"), *Stage.choices], method="filter_stage"
    )
    kind = django_filters.ChoiceFilter(choices=Kind.choices)
    assigned = django_filters.CharFilter(
        method="filter_assigned", help_text='"me", "none", or a staff user id'
    )
    due = django_filters.BooleanFilter(
        method="filter_due", help_text="Open leads due for a follow-up today or earlier"
    )
    spam = django_filters.BooleanFilter(field_name="is_spam")
    q = django_filters.CharFilter(method="search")

    class Meta:
        model = Enquiry
        fields: list[str] = []

    def filter_stage(self, qs: QuerySet[Enquiry], name: str, value: str) -> QuerySet[Enquiry]:
        return qs.filter(stage__in=OPEN_STAGES) if value == "open" else qs.filter(stage=value)

    def filter_assigned(self, qs: QuerySet[Enquiry], name: str, value: str) -> QuerySet[Enquiry]:
        if value == "me":
            return qs.filter(assigned_to=self.request.user)
        if value == "none":
            return qs.filter(assigned_to__isnull=True)
        return qs.filter(assigned_to_id=int(value)) if value.isdigit() else qs.none()

    def filter_due(self, qs: QuerySet[Enquiry], name: str, value: bool) -> QuerySet[Enquiry]:
        if not value:
            return qs
        return qs.filter(stage__in=OPEN_STAGES, follow_up_on__lte=timezone.localdate())

    def search(self, qs: QuerySet[Enquiry], name: str, value: str) -> QuerySet[Enquiry]:
        value = value.strip()
        if not value:
            return qs
        return qs.filter(
            Q(reference__iexact=value)
            | Q(name__icontains=value)
            | Q(email__icontains=value)
            | Q(phone__icontains=value)
            | Q(property_label__icontains=value)
            | Q(message__icontains=value)
        )


class DashboardEnquiryViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet[Enquiry],
):
    """Leads. Spam is hidden unless ?spam=true; follow-ups due sort first with ?due=true."""

    permission_classes = [IsStaff]
    lookup_field = "uuid"
    filterset_class = DashboardEnquiryFilter
    ordering_fields: list[str] = []
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self) -> QuerySet[Enquiry]:
        qs = Enquiry.objects.select_related("assigned_to", "property")
        if self.action == "list":
            if self.request.query_params.get("spam") is None:
                qs = qs.filter(is_spam=False)
            if self.request.query_params.get("due") in ("true", "1", "True"):
                return qs.order_by("follow_up_on", "-created_at")
            return qs.order_by("-created_at")
        return qs.prefetch_related("notes__author")

    def get_serializer_class(self) -> type[EnquiryListSerializer]:
        return EnquiryListSerializer if self.action == "list" else EnquiryDetailSerializer

    @extend_schema(request=NoteSerializer, responses={201: NoteSerializer})
    @action(detail=True, methods=["post"])
    def notes(self, request: Request, uuid: str) -> Response:
        """Add a note to the lead's timeline."""
        enquiry = self.get_object()
        serializer = NoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(enquiry=enquiry, author=request.user)
        Enquiry.objects.filter(pk=enquiry.pk).update(updated_at=timezone.now())
        return Response(NoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses=inline_serializer(
            "EnquirySummary",
            {
                "stages": serializers.DictField(child=serializers.IntegerField()),
                "open": serializers.IntegerField(),
                "new": serializers.IntegerField(),
                "due": serializers.IntegerField(),
                "overdue": serializers.IntegerField(),
                "unassigned": serializers.IntegerField(),
                "mine": serializers.IntegerField(),
                "spam": serializers.IntegerField(),
            },
        )
    )
    @action(detail=False, pagination_class=None, filter_backends=[])
    def summary(self, request: Request) -> Response:
        """Counts for the pipeline bar, the tabs and the dashboard overview."""
        today = timezone.localdate()
        leads = Enquiry.objects.leads()
        opened = Q(stage__in=OPEN_STAGES)
        counts = leads.aggregate(
            open=Count("pk", filter=opened),
            new=Count("pk", filter=Q(stage=Stage.NEW)),
            due=Count("pk", filter=opened & Q(follow_up_on__lte=today)),
            overdue=Count("pk", filter=opened & Q(follow_up_on__lt=today)),
            unassigned=Count("pk", filter=opened & Q(assigned_to__isnull=True)),
            mine=Count("pk", filter=opened & Q(assigned_to=request.user)),
        )
        by_stage = dict(leads.values_list("stage").annotate(n=Count("pk")))
        return Response(
            {
                **counts,
                "stages": {stage: by_stage.get(stage, 0) for stage in Stage.values},
                "spam": Enquiry.objects.filter(is_spam=True).count(),
            }
        )
