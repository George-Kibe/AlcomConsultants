"""The FAQs that were hard-coded in the frontend (lib/faqs.ts), now editable in the dashboard."""

from django.db import migrations

FAQS = [
    (
        "general",
        "How do I arrange a property viewing?",
        "Contact us on WhatsApp, by phone or by email and mention the property you are "
        "interested in. One of our agents will confirm a convenient time with you.",
    ),
    (
        "general",
        "Which areas do you cover?",
        "We handle properties across Kenya. If you are looking in a specific county, town or "
        "neighbourhood, let us know and we will tell you what is available.",
    ),
    (
        "selling",
        "Can I list my property for sale or rent with Alcom?",
        "Yes. Get in touch with the property's location, type and your asking price or rent. "
        "We will arrange to see it and advise you on marketing it.",
    ),
    (
        "management",
        "Can you manage a property I already own?",
        "Yes. Our property management service covers finding tenants, collecting rent, "
        "arranging maintenance and keeping you informed with regular statements.",
    ),
    (
        "valuation",
        "What do you need from me to carry out a valuation?",
        "The property's location, a copy of the title or ownership documents if available, the "
        "purpose of the valuation (for example mortgage, sale or insurance) and your contact "
        "details.",
    ),
]


def add(apps, schema_editor):
    Faq = apps.get_model("content", "Faq")
    if Faq.objects.exists():
        return
    for order, (category, question, answer) in enumerate(FAQS, start=1):
        Faq.objects.create(order=order, category=category, question=question, answer=answer)


class Migration(migrations.Migration):
    dependencies = [("content", "0001_initial")]
    operations = [migrations.RunPython(add, migrations.RunPython.noop)]
