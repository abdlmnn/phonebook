from django.db import IntegrityError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter

from .models import Contact
from .serializers import ContactSerializer

# For when two simultaneous requests collide in the database; a 500 would
# leak, a 400 shows the normal field error.
DUPLICATE_MESSAGE = {
    "contact_number": ["A contact with this contact number already exists."]
}


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

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            raise ValidationError(DUPLICATE_MESSAGE)

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except IntegrityError:
            raise ValidationError(DUPLICATE_MESSAGE)
