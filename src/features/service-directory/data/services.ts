import type { Service } from "../types/service";

export const AUDIENCES = [
  { value: "all", label: "All services" },
  { value: "residents", label: "For residents" },
  { value: "businesses", label: "For businesses" },
  { value: "visitors", label: "For visitors" },
] as const;

export const SERVICES: Service[] = [
  {
    slug: "barangay-certificates",
    title: "Barangay certificates",
    description: "Find the guide for residency certificates, clearances, and other barangay documents.",
    audience: "residents",
    module: "M07",
    icon: "certificate",
    office: "Barangay Secretary’s Office",
    officeInfo:
      "Located at the applicant’s Barangay Hall. The office receives, verifies, and releases certificates based on the current barangay record.",
    contactNumber: "+63 (56) 311-0000 local 201",
    email: "barangayservices@matnog.gov.ph",
    sampleFee: "₱0.00–₱500.00 depending on certificate type",
    serviceHours: "Monday–Friday, 8:00 AM–5:00 PM",
    offerings: [
      {
        title: "Certificate of residency",
        requestType: "residency",
        description: "Confirms that a person currently resides in the issuing barangay for a stated local purpose.",
        sampleFee: "₱50.00",
        requirements: ["Valid ID", "Current barangay address", "Purpose of the certificate"],
      },
      {
        title: "Barangay clearance",
        requestType: "clearance",
        description:
          "Supports employment, school, banking, and other transactions that require barangay-level clearance.",
        sampleFee: "₱50.00",
        requirements: ["Valid ID", "Resident record", "Named requesting office or purpose"],
      },
      {
        title: "Certificate of indigency",
        requestType: "indigency",
        description:
          "Supports medical, educational, burial, legal, or social-assistance applications after eligibility review.",
        sampleFee: "₱0.00",
        requirements: ["Valid ID", "Declared assistance purpose", "Eligibility evidence when requested"],
      },
      {
        title: "Barangay business clearance",
        requestType: "business-clearance",
        description: "Certifies the barangay review of a business location before municipal permit processing.",
        sampleFee: "₱500.00",
        requirements: ["Business details", "Site or lease information", "Authorized representative ID"],
      },
    ],
    preparation: [
      "The type of certificate and its intended use",
      "Your current barangay and residential address",
      "Supporting identification, as requested by the issuing office",
    ],
    steps: [
      "Choose the document you need.",
      "Prepare your information for barangay review.",
      "Follow any correction or assessment instructions.",
      "Collect the document after approval.",
    ],
  },
  {
    slug: "business-permits",
    title: "Business permits & licensing",
    description: "Get ready to register, renew, amend, or retire your business permit.",
    audience: "businesses",
    module: "M03",
    icon: "business",
    office: "Business Permits and Licensing Office (BPLO), Office of the Municipal Mayor",
    officeInfo:
      "Manages business registration, renewal, changes, retirement, requirements review, and coordinated permit assessment.",
    contactNumber: "+63 (56) 311-0000 local 120",
    email: "bplo@matnog.gov.ph",
    sampleFee: "From ₱500.00; final fee follows the approved assessment",
    serviceHours: "Monday–Friday, 8:00 AM–5:00 PM",
    offerings: [
      {
        title: "New business permit",
        description:
          "Registers a new establishment and coordinates zoning, fire, sanitary, barangay, and treasury requirements.",
        sampleFee: "₱2,500.00",
        requirements: ["Business registration", "Barangay business clearance", "Proof of business address"],
      },
      {
        title: "Business permit renewal",
        description: "Renews an active permit after reviewing the current business record, clearances, and assessment.",
        sampleFee: "₱2,000.00",
        requirements: ["Previous permit", "Current barangay clearance", "Updated supporting clearances"],
      },
      {
        title: "Permit amendment",
        description:
          "Records an approved change in business name, ownership details, address, activity, or establishment information.",
        sampleFee: "₱500.00",
        requirements: ["Existing permit", "Proof of requested change", "Authorized representative ID"],
      },
      {
        title: "Business retirement",
        description:
          "Closes the municipal business record after the required office and financial clearances are completed.",
        sampleFee: "₱0.00",
        requirements: ["Existing permit", "Closure declaration", "Required municipal clearances"],
      },
    ],
    preparation: [
      "Your business name, ownership type, and address",
      "The application type: new, renewal, amendment, or retirement",
      "Registration and other supporting documents requested by the office",
    ],
    steps: [
      "Select your application type.",
      "Complete your business details and document checklist.",
      "Respond to review and assessment updates.",
      "Receive the permit after the required approvals.",
    ],
  },
  {
    slug: "tourism-registration",
    title: "Tourism & visitor registration",
    description: "Explore Matnog and get familiar with the planned visitor registration journey.",
    audience: "visitors",
    module: "M04",
    icon: "tourism",
    office: "Municipal Tourism, Culture and Arts Office (MTCAO)",
    officeInfo:
      "Provides visitor information, tourism registration, destination coordination, and guidance for accredited local operators.",
    contactNumber: "+63 (56) 311-0000 local 130",
    email: "tourism@matnog.gov.ph",
    sampleFee: "₱0.00 registration fee; activity fees may apply",
    serviceHours: "Monday–Friday, 8:00 AM–5:00 PM",
    offerings: [
      {
        title: "Visitor registration",
        description:
          "Records the visitor, contact number, travel dates, destination, and party details for a planned Matnog visit.",
        sampleFee: "₱0.00",
        requirements: ["Contact number", "Travel dates", "Destination and party details"],
      },
      {
        title: "Destination information",
        description:
          "Provides local guidance for attractions, access points, travel reminders, and responsible visitor conduct.",
        sampleFee: "₱0.00",
        requirements: ["Intended destination", "Preferred travel date", "Accessibility or safety needs"],
      },
      {
        title: "Tourism establishment assistance",
        description:
          "Guides accommodation, food, transport, and tour operators through local accreditation requirements.",
        sampleFee: "₱500.00",
        requirements: ["Business registration", "Operating address", "Applicable safety clearances"],
      },
      {
        title: "Tour or boat-trip coordination",
        description:
          "Reviews a planned tourism activity and identifies the operator, manifest, safety, and port requirements.",
        sampleFee: "₱100.00 sample environmental fee",
        requirements: ["Trip details", "Passenger manifest", "Accredited operator information"],
      },
    ],
    preparation: [
      "Your intended travel dates and destination",
      "Your travel party details",
      "The documents requested for your chosen activity",
    ],
    steps: [
      "Explore destinations and visitor information.",
      "Register your contact number in the demo.",
      "Review the planned trip and document checklist.",
      "Wait for the applicable reviews before any trip proceeds.",
    ],
  },
  {
    slug: "municipal-id",
    title: "Municipal ID & profile",
    description: "Learn how a unified account will connect to your verified resident record.",
    audience: "residents",
    module: "M02",
    icon: "id",
    office: "Municipal ID Registration Desk, Office of the Municipal Mayor",
    officeInfo:
      "Links a verified account to the municipal resident record and manages enrollment, correction, renewal, and replacement requests.",
    contactNumber: "+63 (56) 311-0000 local 110",
    email: "municipalid@matnog.gov.ph",
    sampleFee: "₱0.00 for first issuance; ₱100.00 for replacement",
    serviceHours: "Monday–Friday, 8:00 AM–5:00 PM",
    offerings: [
      {
        title: "New municipal ID enrollment",
        description: "Creates a municipal credential after the person and current resident record are verified.",
        sampleFee: "₱0.00",
        requirements: ["Verified resident record", "Valid identity document", "Current contact information"],
      },
      {
        title: "Resident-record association",
        description: "Reviews and links an existing mobile account to the correct permanent resident record.",
        sampleFee: "₱0.00",
        requirements: ["Verified mobile account", "Identity evidence", "Resident matching review"],
      },
      {
        title: "Profile correction",
        description:
          "Requests a reviewed correction to identity, residency, or contact information without replacing prior history.",
        sampleFee: "₱0.00",
        requirements: ["Current municipal ID", "Correction evidence", "Updated contact details"],
      },
      {
        title: "Lost or damaged ID replacement",
        description: "Replaces a credential while retaining the original person and resident-record association.",
        sampleFee: "₱100.00",
        requirements: ["Loss or damage declaration", "Identity verification", "Existing municipal ID reference"],
      },
    ],
    preparation: [
      "Your personal information and current address",
      "Supporting identity documents",
      "A review of any existing resident record",
    ],
    steps: [
      "Create or sign in to your account.",
      "Request a link to your resident record.",
      "Complete the required identity review.",
      "View your credential after approval.",
    ],
  },
  {
    slug: "payments",
    title: "Payments & assessments",
    description: "Understand assessment details and the planned payment and receipt flow.",
    audience: "businesses",
    module: "M06",
    icon: "payments",
    office: "Municipal Treasurer’s Office — Cashier and Collection Division",
    officeInfo:
      "Confirms approved assessments, receives municipal payments, issues receipts, and supports payment-status verification.",
    contactNumber: "+63 (56) 311-0000 local 140",
    email: "treasury@matnog.gov.ph",
    sampleFee: "₱1,250.00 sample assessment; actual amount depends on the service",
    serviceHours: "Monday–Friday, 8:00 AM–5:00 PM",
    offerings: [
      {
        title: "Business permit assessment",
        description: "Pays an approved business-permit assessment linked to the correct application and establishment.",
        sampleFee: "₱1,250.00 sample assessment",
        requirements: ["Assessment reference", "Business application reference", "Payer information"],
      },
      {
        title: "Certificate or clearance payment",
        description: "Pays a reviewed certificate fee and preserves the link between the payment and request.",
        sampleFee: "₱50.00 sample fee",
        requirements: ["Request reference", "Approved assessment", "Payer information"],
      },
      {
        title: "Tourism or activity fee",
        description: "Pays an approved visitor, environmental, operator, or activity assessment when applicable.",
        sampleFee: "₱100.00 sample fee",
        requirements: ["Tourism reference", "Approved assessment", "Visitor or operator details"],
      },
      {
        title: "Receipt verification and reprint",
        description: "Checks a confirmed collection and displays the corresponding official-receipt record.",
        sampleFee: "₱0.00",
        requirements: ["Receipt number", "Payment reference", "Payer verification"],
      },
    ],
    preparation: [
      "Your application or assessment reference",
      "A review of the assessment breakdown",
      "Any applicable exemption documentation",
    ],
    steps: [
      "Open a reviewed assessment.",
      "Check the amount and application reference.",
      "Select a supported payment method.",
      "View the receipt after payment confirmation.",
    ],
  },
  {
    slug: "service-desk",
    title: "Citizen help & requests",
    description: "Find the right office for a concern, service request, or appointment.",
    audience: "residents",
    module: "M11",
    icon: "help",
    office: "Public Assistance and Complaints Desk, Office of the Municipal Mayor",
    officeInfo:
      "Receives questions, requests, complaints, and appointment needs, then routes each concern to the responsible municipal office.",
    contactNumber: "+63 (56) 311-0000 local 100",
    email: "helpdesk@matnog.gov.ph",
    sampleFee: "₱0.00",
    serviceHours: "Monday–Friday, 8:00 AM–5:00 PM",
    offerings: [
      {
        title: "General service inquiry",
        description: "Identifies the office, requirements, and next step for a municipal concern or transaction.",
        sampleFee: "₱0.00",
        requirements: ["Request summary", "Preferred contact details", "Related office if known"],
      },
      {
        title: "Service request",
        description:
          "Creates a reference for a municipal action or assistance request and routes it to an assigned office.",
        sampleFee: "₱0.00",
        requirements: ["Request description", "Location when relevant", "Supporting information"],
      },
      {
        title: "Complaint or feedback",
        description: "Records a complaint, compliment, or service-quality concern for acknowledgment and response.",
        sampleFee: "₱0.00",
        requirements: ["Concern details", "Date and office involved", "Supporting evidence when available"],
      },
      {
        title: "Office appointment",
        description: "Requests an available schedule with the office responsible for the selected service.",
        sampleFee: "₱0.00",
        requirements: ["Selected service", "Preferred schedule", "Contact number"],
      },
    ],
    preparation: [
      "A short description of your request",
      "The location or office involved, when relevant",
      "Supporting information that helps explain the request",
    ],
    steps: [
      "Choose the subject of your request.",
      "Describe what you need help with.",
      "Review the assigned office and reference.",
      "Follow the response and resolution updates.",
    ],
  },
  {
    slug: "assistance",
    title: "Community assistance",
    description: "Learn about the planned program eligibility and assistance request journey.",
    audience: "residents",
    module: "M08",
    icon: "assistance",
    office: "Municipal Social Welfare and Development Office (MSWDO)",
    officeInfo:
      "Provides program guidance, conducts eligibility assessment, and coordinates approved social protection and emergency assistance.",
    contactNumber: "+63 (56) 311-0000 local 150",
    email: "mswdo@matnog.gov.ph",
    sampleFee: "₱0.00",
    serviceHours: "Monday–Friday, 8:00 AM–5:00 PM",
    offerings: [
      {
        title: "Assistance to individuals in crisis",
        description: "Reviews urgent medical, burial, transportation, food, or other crisis-assistance needs.",
        sampleFee: "₱0.00",
        requirements: ["Valid ID", "Barangay certification", "Documents supporting the stated need"],
      },
      {
        title: "Sectoral program referral",
        description:
          "Guides senior citizens, PWDs, solo parents, youth, and other sectors to the appropriate program desk.",
        sampleFee: "₱0.00",
        requirements: ["Sector information", "Resident record", "Program-specific evidence"],
      },
      {
        title: "Emergency relief assistance",
        description:
          "Records household needs and supports an authorized relief assessment after an emergency or disaster.",
        sampleFee: "₱0.00",
        requirements: ["Household information", "Affected location", "Damage or need assessment"],
      },
      {
        title: "Educational or livelihood assistance",
        description:
          "Reviews an applicant’s stated need, eligibility evidence, and available local or referred program.",
        sampleFee: "₱0.00",
        requirements: ["Application letter", "Eligibility evidence", "School or livelihood documents"],
      },
    ],
    preparation: [
      "The program you want to ask about",
      "Your household and sector information, where applicable",
      "The supporting documents requested for that program",
    ],
    steps: [
      "Find a relevant program.",
      "Review its eligibility and requirements.",
      "Submit information for an authorized review.",
      "Follow the decision and release schedule.",
    ],
  },
  {
    slug: "document-routing",
    title: "Document follow-up",
    description: "Understand how a submitted document moves between municipal offices.",
    audience: "businesses",
    module: "M05",
    icon: "documents",
    office: "Records Section, Office of the Municipal Administrator",
    officeInfo:
      "Receives official submissions, records custody events, routes documents between offices, and supports release or return tracking.",
    contactNumber: "+63 (56) 311-0000 local 160",
    email: "records@matnog.gov.ph",
    sampleFee: "₱0.00 for follow-up; document processing fees may apply",
    serviceHours: "Monday–Friday, 8:00 AM–5:00 PM",
    offerings: [
      {
        title: "New document intake",
        description:
          "Registers an incoming letter, application, endorsement, or supporting document and issues a tracking reference.",
        sampleFee: "₱0.00",
        requirements: ["Document title", "Sender details", "Intended receiving office"],
      },
      {
        title: "Routing-status follow-up",
        description:
          "Shows the latest public-safe routing stage and whether a response, correction, or release is pending.",
        sampleFee: "₱0.00",
        requirements: ["Tracking reference", "Submission date", "Receiving office"],
      },
      {
        title: "Correction or resubmission",
        description: "Adds corrected material to the existing document history while preserving earlier submissions.",
        sampleFee: "₱0.00",
        requirements: ["Tracking reference", "Correction notice", "Revised document"],
      },
      {
        title: "Document release or return",
        description:
          "Confirms release instructions, recipient authorization, or the recorded reason a document was returned.",
        sampleFee: "₱0.00",
        requirements: ["Tracking reference", "Claimant identification", "Authorization when represented"],
      },
    ],
    preparation: ["Your document reference number", "The receiving office", "The date and purpose of your submission"],
    steps: [
      "Find your document reference.",
      "Review the latest receiving office.",
      "Respond to any requested corrections.",
      "Follow the recorded release or return.",
    ],
  },
];

export function getService(slug: string) {
  return SERVICES.find((service) => service.slug === slug);
}
