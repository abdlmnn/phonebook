# Views for the contacts API. Two views, one job each:
# - ContactListCreateView: GET and POST on /api/contacts/
# - ContactDetailView: GET, PATCH and DELETE on /api/contacts/{id}/
from django.db import IntegrityError
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter

from .models import Contact
from .serializers import ContactSerializer

# For when two simultaneous requests collide in the database; a 500 would
# leak, a 400 shows the normal field error.
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

    # Stops a request that collided at the database level from being a 500.
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            raise ValidationError(DUPLICATE_MESSAGE)


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET, PATCH and DELETE for a single contact on /api/contacts/{id}/."""

    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except IntegrityError:
            raise ValidationError(DUPLICATE_MESSAGE)
