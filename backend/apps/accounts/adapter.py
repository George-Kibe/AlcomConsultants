from allauth.account.adapter import DefaultAccountAdapter
from django.http import HttpRequest


class AccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request: HttpRequest) -> bool:
        # Readers may create accounts (to comment on the blog). They are never staff:
        # dashboard access is granted by an admin (is_staff) and checked on every API.
        return True
