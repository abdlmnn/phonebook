import re

from django.core.exceptions import ValidationError
from django.core.validators import validate_email as django_validate_email
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import Contact

# Optional leading '+', then 7-15 digits, nothing else.
CONTACT_NUMBER_REGEX = re.compile(r"^\+?\d{7,15}$")


class ContactSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=120)
    address = serializers.CharField()
    # Stored/validated as a plain string so the phone rules below stay explicit.
    # UniqueValidator also blocks saving the same number twice, including when
    # editing (a contact may keep its own number).
    contact_number = serializers.CharField(
        max_length=20,
        validators=[
            UniqueValidator(
                queryset=Contact.objects.all(),
                message="A contact with this contact number already exists.",
            )
        ],
    )
    # Optional: empty string and a missing field both mean "no email".
    email = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Contact
        fields = [
            "id",
            "name",
            "address",
            "contact_number",
            "email",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        """Required: must not be empty or whitespace-only."""
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Name cannot be empty.")
        return name

    def validate_address(self, value):
        """Required: must not be empty or whitespace-only."""
        address = value.strip()
        if not address:
            raise serializers.ValidationError("Address cannot be empty.")
        return address

    def validate_contact_number(self, value):
        """Required: optional leading '+', then 7-15 digits, nothing else.
        Kept as a string so '+' and leading zeros survive."""
        number = value.strip()
        if not CONTACT_NUMBER_REGEX.match(number):
            raise serializers.ValidationError(
                "Contact number must be 7-15 digits, optionally starting with '+'."
            )
        return number

    def validate_email(self, value):
        """The conditional rule:
        - empty or missing -> allowed, save as None
        - provided -> must be a valid email address
        """
        email = (value or "").strip()
        if not email:
            return None
        try:
            django_validate_email(email)
        except ValidationError:
            raise serializers.ValidationError("Enter a valid email address.")
        return email
