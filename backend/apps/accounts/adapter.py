from allauth.account.adapter import DefaultAccountAdapter
from django.http import HttpRequest


class AccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request: HttpRequest) -> bool:
        # Staff accounts are created by an admin. Visitor sign-up arrives in Phase 4.
        return False
