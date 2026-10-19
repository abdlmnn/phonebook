from django.db import models


class Contact(models.Model):
    """A single phonebook entry.

    contact_number is stored as a string so leading zeros and a leading
    '+' are preserved. email is optional (null when not provided).
    """

    name = models.CharField(max_length=120)
    address = models.TextField()
    # Strings so numbers like '+63...' and '09...' keep their exact form.
    contact_number = models.CharField(
        max_length=20,
        unique=True,
        error_messages={
            "unique": "A contact with this contact number already exists."
        },
    )
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]  # newest contacts first

    def __str__(self):
        return f"{self.name} ({self.contact_number})"
