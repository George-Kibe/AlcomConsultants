from apps.blog import html


def test_clean_keeps_editor_formatting_and_drops_everything_else():
    dirty = (
        '<h1>Title</h1><h2 class="x" onclick="evil()">Heading</h2>'
        '<p style="color:red">Text <strong>bold</strong> <a href="javascript:alert(1)">x</a> '
        '<a href="https://example.com" target="_blank">ok</a></p>'
        "<script>alert(1)</script><img src=x onerror=alert(1)><!-- note -->"
    )
    cleaned = html.clean(dirty)
    assert "<h2>Heading</h2>" in cleaned
    assert "<strong>bold</strong>" in cleaned
    assert '<a href="https://example.com" rel="noopener noreferrer">ok</a>' in cleaned
    for bad in ("<h1", "onclick", "style=", "javascript:", "<script", "<img", "<!--", "target="):
        assert bad not in cleaned


def test_plain_text_excerpt_and_reading_time():
    body = "<h2>Why</h2><p>One &amp; two.</p><ul><li>three</li></ul>"
    assert html.plain_text(body) == "Why One & two. three"
    assert html.excerpt(body) == "Why One & two. three"
    long = "<p>" + "word " * 500 + "</p>"
    short = html.excerpt(long, length=50)
    assert short.endswith("…") and len(short) <= 51
    assert html.reading_minutes(long) == 3  # 500 words at 220/min, rounded up
    assert html.reading_minutes("") == 1
