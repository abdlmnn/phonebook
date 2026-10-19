# Views for the contacts API. Two separate views instead of one ViewSet:
# - ContactListCreateView handles the collection URL /api/contacts/
# - ContactDetailView handles the single item URL /api/contacts/{id}/
from rest_framework import generics
from rest_framework.filters import SearchFilter

from .models import Contact
from .serializers import ContactSerializer


class ContactListCreateView(generics.ListCreateAPIView):
    """GET lists contacts, POST creates one (both on /api/contacts/)."""

    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    # Powers the ?search= param: filters by name and contact_number.
    filter_backends = [SearchFilter]
    search_fields = ["name", "contact_number"]


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET, PATCH and DELETE for a single contact on /api/contacts/{id}/."""

    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
