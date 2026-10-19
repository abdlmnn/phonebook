from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APITestCase

from unittest import mock

from .models import Contact

LIST_URL = "/api/contacts/"


def detail_url(contact_id):
    return f"{LIST_URL}{contact_id}/"


def valid_payload(**overrides):
    """A payload that passes validation; tests override single fields."""
    payload = {
        "name": "Ada Lovelace",
        "address": "12 Fenny Road",
        "contact_number": "09171234567",
        "email": "ada@example.com",
    }
    payload.update(overrides)
    return payload


class CreateContactTests(APITestCase):
    def test_create_succeeds(self):
        response = self.client.post(LIST_URL, valid_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Returned object is what was saved
        self.assertEqual(response.data["name"], "Ada Lovelace")
        self.assertEqual(response.data["contact_number"], "09171234567")
        self.assertEqual(response.data["email"], "ada@example.com")

    def test_create_succeeds_with_optional_fields_omitted(self):
        payload = valid_payload()
        del payload["email"]
        response = self.client.post(LIST_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["email"])

    def test_create_succeeds_with_empty_email(self):
        response = self.client.post(LIST_URL, valid_payload(email=""), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["email"])

    def test_create_preserves_leading_plus_and_zeros(self):
        response = self.client.post(
            LIST_URL, valid_payload(contact_number="+639171234567"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["contact_number"], "+639171234567")

    def test_create_rejects_missing_required_fields(self):
        for field in ["name", "address", "contact_number"]:
            payload = valid_payload()
            del payload[field]
            with self.subTest(field=field):
                response = self.client.post(LIST_URL, payload, format="json")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(field, response.data)

    def test_create_rejects_whitespace_only_required_fields(self):
        for field in ["name", "address"]:
            with self.subTest(field=field):
                response = self.client.post(
                    LIST_URL, valid_payload(**{field: "   "}), format="json"
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(field, response.data)

    def test_create_rejects_invalid_contact_numbers(self):
        invalid_numbers = [
            "091712",  # 6 digits: too short
            "091712345678901234",  # 18 digits: too long
            "0917123a45",  # contains a letter
            "0917 123 4567",  # embedded space
            "0917-123-4567",  # embedded dashes
            "-09171234567",  # dash instead of '+' at start
            "09171234567+",  # plus not at start
        ]
        for number in invalid_numbers:
            with self.subTest(number=number):
                response = self.client.post(
                    LIST_URL, valid_payload(contact_number=number), format="json"
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("contact_number", response.data)

    def test_create_rejects_invalid_emails(self):
        for email in ["ada@ex", "@example.com", "ada example.com", "ada@@ex.com"]:
            with self.subTest(email=email):
                response = self.client.post(
                    LIST_URL, valid_payload(email=email), format="json"
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("email", response.data)


class ListAndSearchTests(APITestCase):
    def setUp(self):
        self.client.post(LIST_URL, valid_payload(), format="json")
        self.client.post(
            LIST_URL,
            valid_payload(
                name="Grace Hopper",
                contact_number="+639288887777",
                email="grace@example.com",
            ),
            format="json",
        )

    def test_list_returns_all_contacts(self):
        response = self.client.get(LIST_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_search_matches_by_name(self):
        response = self.client.get(LIST_URL, {"search": "grace"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["name"] for item in response.data], ["Grace Hopper"])

    def test_search_matches_by_contact_number(self):
        response = self.client.get(LIST_URL, {"search": "63928"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["name"] for item in response.data], ["Grace Hopper"])

    def test_search_with_no_matches_returns_empty_list(self):
        response = self.client.get(LIST_URL, {"search": "nomatch"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_search_never_modifies_record(self):
        self.client.get(LIST_URL, {"search": "917123"})
        response = self.client.get(detail_url(1))
        self.assertEqual(response.data["contact_number"], "09171234567")


class RetrieveTests(APITestCase):
    def test_retrieve_returns_contact(self):
        created = self.client.post(LIST_URL, valid_payload(), format="json").data
        response = self.client.get(detail_url(created["id"]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Ada Lovelace")

    def test_retrieve_missing_contact_returns_404(self):
        response = self.client.get(detail_url(999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class UpdateTests(APITestCase):
    def test_partial_update_changes_only_submitted_fields(self):
        created = self.client.post(LIST_URL, valid_payload(), format="json").data
        response = self.client.patch(
            detail_url(created["id"]),
            {"name": "Ada K. Lovelace"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Ada K. Lovelace")
        # Untouched fields keep their values
        self.assertEqual(response.data["contact_number"], "09171234567")
        self.assertEqual(response.data["email"], "ada@example.com")

    def test_partial_update_rejects_invalid_email_and_changes_nothing(self):
        created = self.client.post(LIST_URL, valid_payload(), format="json").data
        url = detail_url(created["id"])
        response = self.client.patch(url, {"email": "bad-email"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # The record is unchanged
        after = self.client.get(url).data
        self.assertEqual(after["email"], "ada@example.com")


class DeleteTests(APITestCase):
    def test_delete_removes_contact(self):
        created = self.client.post(LIST_URL, valid_payload(), format="json").data
        response = self.client.delete(detail_url(created["id"]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            self.client.get(detail_url(created["id"])).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_delete_missing_contact_returns_404(self):
        response = self.client.delete(detail_url(999))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DuplicateNumberTests(APITestCase):
    """The same contact number cannot exist twice (unique rule)."""

    def setUp(self):
        self.client.post(LIST_URL, valid_payload(), format="json")

    def test_create_rejects_duplicate_number(self):
        response = self.client.post(
            LIST_URL,
            valid_payload(name="Someone Else With The Same Number"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["contact_number"],
            ["A contact with this contact number already exists."],
        )

    def test_update_to_another_contacts_number_rejected_and_record_kept(self):
        other = self.client.post(
            LIST_URL,
            valid_payload(
                name="Grace Hopper",
                contact_number="09182223333",
                email="grace@example.com",
            ),
            format="json",
        ).data
        # Try to steal contact 1's number
        response = self.client.patch(
            detail_url(other["id"]),
            {"contact_number": "09171234567"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # The record is unchanged
        after = self.client.get(detail_url(other["id"])).data
        self.assertEqual(after["contact_number"], "09182223333")

    def test_update_keeping_own_number_allowed(self):
        response = self.client.patch(
            LIST_URL + "1/", {"name": "Ada K. Lovelace"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Ada K. Lovelace")

    def test_number_is_free_again_after_delete(self):
        self.assertEqual(self.client.delete(LIST_URL + "1/").status_code, status.HTTP_204_NO_CONTENT)
        response = self.client.post(LIST_URL, valid_payload(name="Second Ada"), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["contact_number"], "09171234567")

    def test_database_collision_becomes_friendly_error_not_500(self):
        """Two simultaneous requests can slip past the serializer check and
        collide in the database. That must end as a normal field error (400),
        never as a 500 error page."""
        with mock.patch.object(
            Contact, "save", side_effect=IntegrityError("UNIQUE constraint failed")
        ):
            response = self.client.post(LIST_URL, valid_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["contact_number"],
            ["A contact with this contact number already exists."],
        )

