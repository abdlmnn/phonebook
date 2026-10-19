from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from contacts.views import ContactViewSet

router = DefaultRouter()
router.register(r"contacts", ContactViewSet, basename="contact")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
]
