"use client";

import { useEffect, useState } from "react";
import type { Contact, FieldName, FormErrors } from "@/types/contact";
import {
  toFormValues,
  toPayload,
  validateContactForm,
} from "@/lib/contactValidation";
import { createContact, updateContact } from "@/services/contacts";

export type ContactFormModalProps = {
  /** null = create mode, otherwise edit mode (pre-filled) */
  contact: Contact | null;
  onClose: () => void;
  /** Called once the contact was saved; parent shows the success message + refreshes. */
  onSaved: (message: string) => void;
};

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
          <div className="form-field">
            <label htmlFor="field-name">Name</label>
            <input
              id="field-name"
              type="text"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="field-address">Address</label>
            <input
              id="field-address"
              type="text"
              value={values.address}
              onChange={(event) => setField("address", event.target.value)}
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address && <p className="field-error">{errors.address}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="field-contact_number">Contact Number</label>
            <input
              id="field-contact_number"
              type="text"
              value={values.contact_number}
              onChange={(event) => setField("contact_number", event.target.value)}
              aria-invalid={Boolean(errors.contact_number)}
            />
            {errors.contact_number && <p className="field-error">{errors.contact_number}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="field-email">Email (optional)</label>
            <input
              id="field-email"
              type="email"
              value={values.email}
              onChange={(event) => setField("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

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
