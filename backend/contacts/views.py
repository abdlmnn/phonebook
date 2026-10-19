# Views for the contacts API. Two views, one job each:
# - ContactListCreateView: GET and POST on /api/contacts/
# - ContactDetailView: GET, PATCH and DELETE on /api/contacts/{id}/
from django.db import IntegrityError
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter

from .models import Contact
from .serializers import ContactSerializer

# Shown when two requests try to save the same number at almost the same
# moment. The serializer's normal check runs first; this catches the rare
# case where both slip past it and hit the database rule.
DUPLICATE_MESSAGE = {
    "contact_number": ["A contact with this contact number already exists."]
}


class ContactListCreateView(generics.ListCreateAPIView):
    """GET lists contacts, POST creates one (both on /api/contacts/)."""

    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    # Powers the ?search= param: filters by name and contact_number.
    filter_backends = [SearchFilter]
    search_fields = ["name", "contact_number"]

    # The unique check in the serializer runs first, but two requests sent
    # at almost the same moment can collide in the database. We turn that
    # database error into a normal field error (400) instead of a 500.
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            raise ValidationError(DUPLICATE_MESSAGE)


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET, PATCH and DELETE for a single contact on /api/contacts/{id}/."""

    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

    # Same guard as above, for edits that try to grab someone else's number.
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except IntegrityError:
            raise ValidationError(DUPLICATE_MESSAGE)
