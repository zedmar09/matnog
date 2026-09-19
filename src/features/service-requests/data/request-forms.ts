export type RequestFieldKind = "text" | "textarea" | "date" | "number" | "select";

export type RequestField = {
  id: string;
  label: string;
  kind: RequestFieldKind;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

export type RequestFormConfig = {
  /** Shown above the details step. */
  summary: string;
  /** Prefix for the issued control number. */
  prefix: string;
  fields: RequestField[];
};

const BARANGAY_OPTIONS = [
  { value: "DEMO-BRGY-A", label: "Demo Barangay A" },
  { value: "DEMO-BRGY-B", label: "Demo Barangay B" },
];

/**
 * What each service asks for. Only the details that service actually needs —
 * a request should never collect more than the office will use.
 */
export const REQUEST_FORMS: Record<string, RequestFormConfig> = {
  "business-permits": {
    summary: "Tell us about the business and what you need.",
    prefix: "BPL",
    fields: [
      {
        id: "applicationType",
        label: "What do you need?",
        kind: "select",
        required: true,
        options: [
          { value: "new", label: "New business permit" },
          { value: "renewal", label: "Business permit renewal" },
          { value: "amendment", label: "Permit amendment" },
          { value: "retirement", label: "Business retirement" },
        ],
      },
      { id: "businessName", label: "Business name", kind: "text", required: true, placeholder: "Example: Bay Tours" },
      { id: "businessAddress", label: "Business address", kind: "text", required: true },
      { id: "barangayId", label: "Barangay", kind: "select", required: true, options: BARANGAY_OPTIONS },
    ],
  },
  "tourism-registration": {
    summary: "Tell us about the trip.",
    prefix: "TRV",
    fields: [
      {
        id: "destination",
        label: "Where are you going?",
        kind: "text",
        required: true,
        placeholder: "Example: Subic Beach",
      },
      { id: "travelDate", label: "Travel date", kind: "date", required: true },
      { id: "travellers", label: "Number of travellers", kind: "number", required: true },
      { id: "contactName", label: "Lead traveller name", kind: "text", required: true },
    ],
  },
  "municipal-id": {
    summary: "Tell us who the ID is for.",
    prefix: "MID",
    fields: [
      { id: "fullName", label: "Full name", kind: "text", required: true },
      { id: "birthDate", label: "Date of birth", kind: "date", required: true },
      { id: "address", label: "Residential address", kind: "text", required: true },
      { id: "barangayId", label: "Barangay", kind: "select", required: true, options: BARANGAY_OPTIONS },
    ],
  },
  assistance: {
    summary: "Tell us what help you need.",
    prefix: "AST",
    fields: [
      {
        id: "program",
        label: "Which assistance?",
        kind: "select",
        required: true,
        options: [
          { value: "medical", label: "Medical assistance" },
          { value: "educational", label: "Educational assistance" },
          { value: "burial", label: "Burial assistance" },
          { value: "livelihood", label: "Livelihood support" },
        ],
      },
      { id: "reason", label: "Briefly, what is it for?", kind: "textarea", required: true },
      { id: "barangayId", label: "Barangay", kind: "select", required: true, options: BARANGAY_OPTIONS },
    ],
  },
  "document-routing": {
    summary: "Tell us which document you are following up.",
    prefix: "DOC",
    fields: [
      { id: "documentTitle", label: "Document or subject", kind: "text", required: true },
      { id: "receivingOffice", label: "Which office?", kind: "text", required: true },
      { id: "notes", label: "Anything else we should know?", kind: "textarea" },
    ],
  },
  "service-desk": {
    summary: "Tell us about the concern.",
    prefix: "SVC",
    fields: [
      {
        id: "concernType",
        label: "What is this about?",
        kind: "select",
        required: true,
        options: [
          { value: "request", label: "Service request" },
          { value: "concern", label: "Report a concern" },
          { value: "appointment", label: "Book an appointment" },
          { value: "feedback", label: "Feedback" },
        ],
      },
      { id: "details", label: "Describe it briefly", kind: "textarea", required: true },
      { id: "location", label: "Where is it?", kind: "text", hint: "Optional" },
    ],
  },
  payments: {
    summary: "Tell us what you are paying for.",
    prefix: "PAY",
    fields: [
      {
        id: "reference",
        label: "Assessment or reference number",
        kind: "text",
        required: true,
        placeholder: "Example: DEMO-ASM-001",
      },
      { id: "payerName", label: "Name on the payment", kind: "text", required: true },
    ],
  },
};

export function getRequestForm(slug: string): RequestFormConfig | undefined {
  return REQUEST_FORMS[slug];
}
