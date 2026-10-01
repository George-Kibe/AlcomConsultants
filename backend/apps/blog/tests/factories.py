import factory
from django.utils import timezone

from apps.accounts.tests.factories import UserFactory
from apps.blog.models import Post, PostStatus


class PostFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Post

    title = factory.Sequence(lambda n: f"Buying land in Kenya, part {n}")
    body = "<p>Always run a search at the lands registry before you pay a deposit.</p>"
    author = factory.SubFactory(UserFactory, is_staff=True, first_name="Jane", last_name="Wanjiru")
    cover_public_id = "alcom/test/blog/cover"
    cover_alt = "Title deed on a desk"
    cover_width = 1600
    cover_height = 900
    status = PostStatus.PUBLISHED
    published_at = factory.LazyFunction(timezone.now)
