from typing import Any

from django import forms
from django.http import HttpRequest

from .models import User


class SignupForm(forms.Form):
    """Extra sign-up field for readers (allauth ACCOUNT_SIGNUP_FORM_CLASS); the name is
    shown on blog comments."""

    name = forms.CharField(max_length=150, label="Your name", strip=True)

    def signup(self, request: HttpRequest, user: User) -> None:
        first, _, last = self.cleaned_data["name"].partition(" ")
        user.first_name, user.last_name = first[:150], last.strip()[:150]
        user.save(update_fields=["first_name", "last_name"])

    def clean_name(self) -> Any:
        name = " ".join(self.cleaned_data["name"].split())
        if len(name) < 2:
            raise forms.ValidationError("Please enter your name.")
        return name
