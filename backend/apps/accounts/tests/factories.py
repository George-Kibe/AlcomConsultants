import factory

from apps.accounts.models import User


class UserFactory(factory.django.DjangoModelFactory):
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    password = factory.django.Password("S3cure-pass-123")

    class Meta:
        model = User
        skip_postgeneration_save = True
