import type { MunicipalRecord } from "@/shared/data/record-envelope";

export type RequestStep = {
  title: string;
  detail: string;
  complete: boolean;
};

/**
 * Safe public projection of a service request. It deliberately omits applicant
 * names, addresses and document contents: a reference number is not proof of
 * identity, so anyone holding one must not learn anything personal.
 */
export type PublicRequest = MunicipalRecord & {
  title: string;
  office: string;
  steps: RequestStep[];
};
