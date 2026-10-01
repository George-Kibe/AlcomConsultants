"""Sanitising the rich-text body of blog posts (stored as HTML)."""

import html
import math
import re

import nh3

ALLOWED_TAGS = {
    "p", "br", "hr", "h2", "h3", "strong", "em", "u", "s", "code", "pre",
    "blockquote", "ul", "ol", "li", "a",
}  # fmt: skip
ALLOWED_ATTRIBUTES = {"a": {"href", "title"}, "ol": {"start"}}
URL_SCHEMES = {"http", "https", "mailto", "tel"}
WORDS_PER_MINUTE = 220


def clean(body: str) -> str:
    """Keep only the formatting the editor offers; links get rel="noopener noreferrer"."""
    return nh3.clean(
        body,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=URL_SCHEMES,
        link_rel="noopener noreferrer",
        strip_comments=True,
    ).strip()


def plain_text(body: str) -> str:
    """The words of an HTML body, for excerpts, search snippets and reading time."""
    spaced = re.sub(r"<(?:/p|br\s*/?|/h[23]|/li|/blockquote)>", " ", body)
    return re.sub(r"\s+", " ", html.unescape(nh3.clean(spaced, tags=set()))).strip()


def reading_minutes(body: str) -> int:
    return max(1, math.ceil(len(plain_text(body).split()) / WORDS_PER_MINUTE))


def excerpt(body: str, length: int = 200) -> str:
    text = plain_text(body)
    if len(text) <= length:
        return text
    return text[:length].rsplit(" ", 1)[0].rstrip(",.;:") + "…"
