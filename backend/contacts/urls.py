# URL routes for the contacts app. Included from config/urls.py.
from django.urls import path

from .views import ContactDetailView, ContactListCreateView

urlpatterns = [
    path("", ContactListCreateView.as_view(), name="contact-list"),
    path("<int:pk>/", ContactDetailView.as_view(), name="contact-detail"),
]
