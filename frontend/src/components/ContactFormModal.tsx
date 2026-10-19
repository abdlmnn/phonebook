"use client";

import { useEffect, useState } from "react";
import {
  Contact,
  FieldName,
  FormErrors,
  createContact,
  toFormValues,
  toPayload,
  updateContact,
  validateContactForm,
} from "@/lib/phonebook";

export type ContactFormModalProps = {
  /** null = create mode, otherwise edit mode (pre-filled) */
  contact: Contact | null;
  onClose: () => void;
  /** Called once the contact was saved; parent shows the success message + refreshes. */
  onSaved: (message: string) => void;
};

const FIELDS: Array<{ name: FieldName; label: string; required: boolean; type?: string }> = [
  { name: "name", label: "Name", required: true },
  { name: "address", label: "Address", required: true },
  { name: "contact_number", label: "Contact Number", required: true },
  { name: "email", label: "Email", required: false, type: "email" },
];

export default function ContactFormModal({ contact, onClose, onSaved }: ContactFormModalProps) {
  const isEdit = contact !== null;
  const [values, setValues] = useState(() => toFormValues(contact));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Escape closes the modal without saving.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setField(name: FieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const clientErrors = validateContactForm(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors); // fast feedback; the backend re-checks anyway
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const serverErrors = isEdit
        ? await updateContact(contact.id, toPayload(values))
        : await createContact(toPayload(values));

      if (serverErrors) {
        setErrors(serverErrors);
      } else {
        onSaved(isEdit ? "Contact updated." : "Contact created.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
        <h2 id="form-modal-title">{isEdit ? "Edit Contact" : "Add Contact"}</h2>

        {errors.form && <p className="form-level-error">{errors.form}</p>}

        <form onSubmit={handleSubmit} noValidate>
          {FIELDS.map((field) => (
            <div className="form-field" key={field.name}>
              <label htmlFor={`field-${field.name}`}>
                {field.label}
                {field.required ? "" : " (optional)"}
              </label>
              <input
                id={`field-${field.name}`}
                type={field.type ?? "text"}
                value={values[field.name]}
                onChange={(event) => setField(field.name, event.target.value)}
                aria-invalid={Boolean(errors[field.name])}
              />
              {errors[field.name] && <p className="field-error">{errors[field.name]}</p>}
            </div>
          ))}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
