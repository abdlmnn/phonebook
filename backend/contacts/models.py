from django.db import models


class Contact(models.Model):
    """A single phonebook entry.

    contact_number is stored as a string so leading zeros and a leading
    '+' are preserved. email is optional (null when not provided).
    """

    name = models.CharField(max_length=120)
    address = models.TextField()
    # Unique: the same number cannot be saved twice (enforced by the database).
    # Numbers are strings so '+' and leading zeros are preserved.
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
