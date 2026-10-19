// Client-side validation for the contact form.
// The rules match the Django backend. The backend stays the final authority.

import type {
  Contact,
  ContactFormValues,
  ContactPayload,
  FormErrors,
} from "@/types/contact";

// Optional '+', then 7-15 digits.
const CONTACT_NUMBER_REGEX = /^\+?\d{7,15}$/;
// Quick shape check only. The backend does the full email check.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(values: ContactFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) {
    errors.name = "Name cannot be empty.";
  }
  if (!values.address.trim()) {
    errors.address = "Address cannot be empty.";
  }
  if (!CONTACT_NUMBER_REGEX.test(values.contact_number.trim())) {
    errors.contact_number =
      "Contact number must be 7-15 digits, optionally starting with '+'.";
  }
  const email = values.email.trim();
  if (email && !EMAIL_REGEX.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

// Empty form (contact = null) or pre-filled form (for editing).
export function toFormValues(contact: Contact | null): ContactFormValues {
  return {
    name: contact?.name ?? "",
    address: contact?.address ?? "",
    contact_number: contact?.contact_number ?? "",
    email: contact?.email ?? "",
  };
}

// Trim the values before sending. An empty email means "no email" on the backend.
export function toPayload(values: ContactFormValues): ContactPayload {
  return {
    name: values.name.trim(),
    address: values.address.trim(),
    contact_number: values.contact_number.trim(),
    email: values.email.trim(),
  };
}
