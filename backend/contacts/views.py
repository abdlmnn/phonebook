from rest_framework import viewsets
from rest_framework.filters import SearchFilter

from .models import Contact
from .serializers import ContactSerializer


class ContactViewSet(viewsets.ModelViewSet):
    """CRUD endpoints for contacts.

    Provides list/create/retrieve/partial-update/delete from the router.
    SearchFilter powers ?search= against name and contact_number only.
    Serializer validation (fields, phone format, conditional email) applies
    to every write automatically.
    """

    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    filter_backends = [SearchFilter]
    search_fields = ["name", "contact_number"]
