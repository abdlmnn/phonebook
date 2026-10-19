/*
 * Shared types, validation rules, and thin API helpers.
 *
 * Client-side rules mirror the Django serializer exactly, but the backend
 * remains the final authority: server field errors are shown in the form.
 */

export interface Contact {
  id: number;
  name: string;
  address: string;
  contact_number: string;
  email: string | null;
}

export interface ContactFormValues {
  name: string;
  address: string;
  contact_number: string;
  email: string;
}

export type FieldName = keyof ContactFormValues;
export type FormErrors = Partial<Record<FieldName, string>> & { form?: string };

// Optional leading '+', then 7-15 digits — same rule as the backend.
const CONTACT_NUMBER_REGEX = /^\+?\d{7,15}$/;
// Shape check only; the backend performs the real email validation.
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

/** Empty edit form / pre-filled edit form */
export function toFormValues(contact: Contact | null): ContactFormValues {
  return {
    name: contact?.name ?? "",
    address: contact?.address ?? "",
    contact_number: contact?.contact_number ?? "",
    email: contact?.email ?? "", // null becomes "" so it reads as "not provided"
  };
}

/** Trimmed payload; empty email means "no email" on the backend (saved as null). */
export function toPayload(values: ContactFormValues) {
  return {
    name: values.name.trim(),
    address: values.address.trim(),
    contact_number: values.contact_number.trim(),
    email: values.email.trim(),
  };
}

/* ---------- API helpers ---------- */

/** DRF 400 responses arrive as { field: ["message", ...] } */
function normalizeServerErrors(body: unknown): FormErrors {
  if (body && typeof body === "object") {
    const errors: FormErrors = {};
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value) && typeof value[0] === "string") {
        errors[key as FieldName] = value[0];
      }
    }
    if (Object.keys(errors).length > 0) return errors;
  }
  return { form: "Something went wrong. Please try again." };
}

export async function fetchContacts(search: string): Promise<Contact[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await fetch(`/api/contacts/${query}`);
  if (!response.ok) {
    throw new Error();
  }
  return response.json() as Promise<Contact[]>;
}

export async function createContact(
  payload: ReturnType<typeof toPayload>,
): Promise<FormErrors | null> {
  try {
    const response = await fetch("/api/contacts/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return normalizeServerErrors(await response.json().catch(() => null));
    }
    return null;
  } catch {
    return { form: "Could not reach the server. Please try again." };
  }
}

export async function updateContact(
  id: number,
  payload: ReturnType<typeof toPayload>,
): Promise<FormErrors | null> {
  try {
    const response = await fetch(`/api/contacts/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return normalizeServerErrors(await response.json().catch(() => null));
    }
    return null;
  } catch {
    return { form: "Could not reach the server. Please try again." };
  }
}

export type DeleteResult = { ok: true } | { ok: false; missing?: boolean; retry?: boolean };

export async function deleteContact(id: number): Promise<DeleteResult> {
  try {
    const response = await fetch(`/api/contacts/${id}/`, { method: "DELETE" });
    if (response.ok) return { ok: true };
    if (response.status === 404) return { ok: false, missing: true };
    return { ok: false, retry: true };
  } catch {
    return { ok: false, retry: true };
  }
}
