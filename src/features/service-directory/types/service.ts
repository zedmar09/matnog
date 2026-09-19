export type Audience = "residents" | "businesses" | "visitors";

export type ServiceOffering = {
  title: string;
  description: string;
  sampleFee: string;
  requirements: string[];
  /** Preselects this type on the request form, when the service has one. */
  requestType?: string;
};

export type Service = {
  slug: string;
  title: string;
  description: string;
  audience: Audience;
  module: string;
  icon: "certificate" | "business" | "tourism" | "id" | "payments" | "help" | "assistance" | "documents";
  office: string;
  officeInfo: string;
  contactNumber: string;
  email: string;
  sampleFee: string;
  serviceHours: string;
  offerings: ServiceOffering[];
  preparation: string[];
  steps: string[];
};
