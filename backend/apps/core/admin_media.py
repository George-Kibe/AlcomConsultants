"""Admin inline for Cloudinary media: pick a file and it is uploaded on save."""

from typing import Any

from django import forms
from django.conf import settings
from django.contrib import admin
from django.utils.html import format_html

from . import media


class MediaInlineForm(forms.ModelForm):
    upload = forms.FileField(
        required=False, help_text="Choose a file to upload to Cloudinary (photo, plan or video)."
    )

    class Meta:
        fields = ["upload", "kind", "alt_text", "caption", "order"]

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        # Folder inside the environment's Cloudinary folder, set by the inline.
        self.upload_folder = "uploads"

    def clean(self) -> dict[str, Any]:
        data = super().clean() or {}
        if data.get("upload") and not settings.CLOUDINARY_URL:
            raise forms.ValidationError(
                "Photo uploads are not set up yet: add CLOUDINARY_URL to the server's .env."
            )
        if not self.instance.public_id and not data.get("upload") and self.has_changed():
            raise forms.ValidationError("Choose a file to upload.")
        return data

    def save(self, commit: bool = True) -> Any:
        file = self.cleaned_data.get("upload")
        if file:
            self.instance.apply_upload_result(media.upload(file, folder=self.upload_folder))
        return super().save(commit=commit)


class MediaInline(admin.TabularInline):
    form = MediaInlineForm
    extra = 1
    readonly_fields = ["preview"]
    fields = ["preview", "upload", "kind", "alt_text", "caption", "order"]
    upload_folder = "uploads"

    def get_formset(self, request: Any, obj: Any = None, **kwargs: Any) -> Any:
        formset = super().get_formset(request, obj, **kwargs)
        folder = self.upload_folder

        class FolderFormSet(formset):  # type: ignore[valid-type,misc]
            def _construct_form(self, i: int, **form_kwargs: Any) -> Any:
                form = super()._construct_form(i, **form_kwargs)
                form.upload_folder = folder
                return form

        return FolderFormSet

    @admin.display(description="Preview")
    def preview(self, obj: media.BaseMedia) -> str:
        if not obj.public_id:
            return "—"
        if obj.resource_type == "image":
            thumb = media.delivery_url(obj.public_id, width=160, height=110, crop="fill")
            return format_html('<img src="{}" width="160" height="110" alt="">', thumb)
        return format_html('<a href="{}" target="_blank">Open file</a>', obj.url)
