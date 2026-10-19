from django.urls import path

from .views import ContactDetailView, ContactListCreateView

urlpatterns = [
    path("", ContactListCreateView.as_view(), name="contact-list"),
    path("<int:pk>/", ContactDetailView.as_view(), name="contact-detail"),
]
