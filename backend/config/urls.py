from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # The contacts app owns its own routes (listed in contacts/urls.py).
    path("admin/", admin.site.urls),
    path("api/contacts/", include("contacts.urls")),
]
