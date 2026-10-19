export interface Contact {
  id: number;
  name: string;
  address: string;
  contact_number: string;
  email: string | null; // null when not provided
}

// Shape of the data in the form fields (everything is a string; "" means empty).
export interface ContactFormValues {
  name: string;
  address: string;
  contact_number: string;
  email: string;
}

// Shape of the data sent to the API.
export interface ContactPayload {
  name: string;
  address: string;
  contact_number: string;
  email: string;
}

export type FieldName = keyof ContactFormValues;

// One error message per field. "form" is used for errors that are not about a single field.
export type FormErrors = Partial<Record<FieldName, string>> & { form?: string };
