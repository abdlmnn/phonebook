import type {
  Contact,
  ContactPayload,
  FormErrors,
} from "@/types/contact";

const BASE_URL = "/api/contacts/";

// The result of a delete call.
export type DeleteResult = { ok: true } | { ok: false; missing?: boolean; retry?: boolean };

// Django returns validation errors as { field: ["message", ...] }.
function serverErrors(body: unknown): FormErrors {
  if (body && typeof body === "object") {
    const errors: FormErrors = {};
    for (const [field, messages] of Object.entries(body)) {
      const message = Array.isArray(messages) ? messages[0] : messages;
      if (typeof message === "string") {
        errors[field as keyof FormErrors] = message;
      }
    }
    if (Object.keys(errors).length > 0) return errors;
  }
  return { form: "Something went wrong. Please try again." };
}

export async function fetchContacts(search: string): Promise<Contact[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await fetch(`${BASE_URL}${query}`);
  if (!response.ok) {
    throw new Error("Loading contacts failed.");
  }
  return response.json() as Promise<Contact[]>;
}

// Shared by create and update: returns null on success, field errors on failure.
async function saveContact(
  url: string,
  method: "POST" | "PATCH",
  payload: ContactPayload,
): Promise<FormErrors | null> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) return null;
    return serverErrors(await response.json().catch(() => null));
  } catch {
    return { form: "Could not reach the server. Please try again." };
  }
}

export function createContact(payload: ContactPayload): Promise<FormErrors | null> {
  return saveContact(BASE_URL, "POST", payload);
}

export function updateContact(id: number, payload: ContactPayload): Promise<FormErrors | null> {
  return saveContact(`${BASE_URL}${id}/`, "PATCH", payload);
}

export async function deleteContact(id: number): Promise<DeleteResult> {
  try {
    const response = await fetch(`${BASE_URL}${id}/`, { method: "DELETE" });
    if (response.ok) return { ok: true };
    if (response.status === 404) return { ok: false, missing: true };
    return { ok: false, retry: true };
  } catch {
    return { ok: false, retry: true };
  }
}
