"use client";

import { useEffect, useState } from "react";
import ContactFormModal from "@/components/ContactFormModal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import type { Contact } from "@/types/contact";
import { deleteContact, fetchContacts } from "@/services/contacts";

type Notice = { kind: "success" | "error"; text: string };

export default function PhonebookPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // null = closed; otherwise which modal is open and for which contact
  const [formTarget, setFormTarget] = useState<{ contact: Contact | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  // A single loader serves everything: changing the search term reloads,
  // and mutations bump refreshKey to reload.
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchContacts(term);
        if (!cancelled) {
          setContacts(data);
          setLoadFailed(false);
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, refreshKey]);

  function refresh() {
    setRefreshKey((key) => key + 1);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteContact(deleteTarget.id);
      if (result.ok) {
        setNotice({ kind: "success", text: "Contact deleted." });
        setDeleteTarget(null);
        refresh();
      } else if (result.missing) {
        setNotice({ kind: "error", text: "This contact no longer exists." });
        setDeleteTarget(null);
        refresh();
      } else {
        setNotice({ kind: "error", text: "Could not delete the contact. Please try again." });
      }
    } finally {
      setDeleting(false);
    }
  }

  const showListPlaceholder = !loading && !loadFailed && contacts.length === 0;
  const searching = term.trim().length > 0;

  return (
    <main className="container">
      <h1>Phonebook</h1>

      {notice && (
        <p
          className={notice.kind === "success" ? "banner banner-success" : "banner banner-error"}
          role="status"
        >
          {notice.text}
        </p>
      )}

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search by name or contact number…"
          aria-label="Search contacts"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormTarget({ contact: null });
          }}
        >
          Add Contact
        </button>
      </div>

      {loadFailed && (
        <div className="banner banner-error" role="alert">
          <span>Could not load contacts.</span>
          <button type="button" className="btn btn-secondary" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      <table className="contact-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Address</th>
            <th>Contact Number</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && contacts.length === 0 && (
            <tr>
              <td colSpan={5}>Loading contacts…</td>
            </tr>
          )}
          {showListPlaceholder && (
            <tr>
              <td colSpan={5}>
                {searching
                  ? `No contacts match your search "${term.trim()}".`
                  : "No contacts yet. Add your first contact to get started."}
              </td>
            </tr>
          )}
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td>{contact.name}</td>
              <td>{contact.address}</td>
              <td>{contact.contact_number}</td>
              <td>{contact.email ?? "—"}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setFormTarget({ contact })}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setDeleteTarget(contact)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {formTarget && (
        <ContactFormModal
          contact={formTarget.contact}
          onClose={() => setFormTarget(null)}
          onSaved={(message) => {
            setNotice({ kind: "success", text: message });
            setFormTarget(null);
            refresh();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          name={deleteTarget.name}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </main>
  );
}
