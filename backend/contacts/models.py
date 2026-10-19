from django.db import models


class Contact(models.Model):
    name = models.CharField(max_length=120)
    address = models.TextField()
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
        ordering = ["-id"]

    def __str__(self):
        return f"{self.name} ({self.contact_number})"
