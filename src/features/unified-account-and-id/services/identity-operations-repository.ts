import {
  ID_APPLICATIONS,
  ID_CREDENTIALS,
  ID_TEMPLATES,
  IDENTITY_ACCOUNTS,
  RESIDENT_LINKS,
} from "../data/identity-operations-fixtures";
import type {
  Credential,
  IdApplication,
  IdentityAccount,
  IdTemplate,
  ResidentLink,
} from "../types/identity-operations";

export type AccountInput = Omit<IdentityAccount, "id" | "history">;
export type LinkInput = Omit<ResidentLink, "id" | "history">;
export type ApplicationInput = Omit<IdApplication, "id" | "history">;
export type CredentialInput = Omit<Credential, "id" | "history">;
export type TemplateInput = Omit<IdTemplate, "id" | "history" | "version">;

class IdentityOperationsRepository {
  private accounts = structuredClone(IDENTITY_ACCOUNTS);
  private links = structuredClone(RESIDENT_LINKS);
  private applications = structuredClone(ID_APPLICATIONS);
  private credentials = structuredClone(ID_CREDENTIALS);
  private templates = structuredClone(ID_TEMPLATES);
  private sequence = { account: 5, link: 5, application: 5, credential: 3, template: 1 };

  listAccounts() {
    return structuredClone(this.accounts);
  }
  findAccount(id: string) {
    const item = this.accounts.find((entry) => entry.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createAccount(input: AccountInput) {
    if (!input.name.trim() || !input.phone.trim() || !input.personId.trim()) return undefined;
    const id = `ACC-2026-${String(++this.sequence.account).padStart(3, "0")}`;
    const item: IdentityAccount = { ...input, id, history: ["Resident account created"] };
    this.accounts.unshift(item);
    return structuredClone(item);
  }
  updateAccount(id: string, input: AccountInput) {
    const item = this.accounts.find((entry) => entry.id === id);
    if (!item || !input.name.trim()) return undefined;
    Object.assign(item, input);
    item.history.push("Account profile updated");
    return structuredClone(item);
  }
  setAccountStatus(id: string, status: IdentityAccount["status"]) {
    const item = this.accounts.find((entry) => entry.id === id);
    if (!item) return undefined;
    item.status = status;
    item.history.push(`Account marked ${status.toLocaleLowerCase()}`);
    return structuredClone(item);
  }

  listLinks() {
    return structuredClone(this.links);
  }
  findLink(id: string) {
    const item = this.links.find((entry) => entry.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createLink(input: LinkInput) {
    if (!input.accountId.trim() || !input.personId.trim()) return undefined;
    const id = `LNK-2026-${String(++this.sequence.link).padStart(3, "0")}`;
    const item: ResidentLink = { ...input, id, history: ["Resident link request created"] };
    this.links.unshift(item);
    return structuredClone(item);
  }
  updateLink(id: string, input: LinkInput) {
    const item = this.links.find((entry) => entry.id === id);
    if (!item) return undefined;
    Object.assign(item, input);
    item.history.push("Resident link information updated");
    return structuredClone(item);
  }
  decideLink(id: string, status: ResidentLink["status"], reason: string) {
    const item = this.links.find((entry) => entry.id === id);
    if (!item || (status !== "Approved" && reason.trim().length < 8)) return undefined;
    item.status = status;
    item.reason = reason.trim() || "Resident identity and registry record confirmed.";
    item.reviewedBy = "Municipal Identity Desk";
    item.history.push(`Resident link marked ${status.toLocaleLowerCase()}`);
    return structuredClone(item);
  }

  listApplications() {
    return structuredClone(this.applications);
  }
  findApplication(id: string) {
    const item = this.applications.find((entry) => entry.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createApplication(input: ApplicationInput) {
    if (!input.accountId.trim() || !input.personId.trim() || !input.applicantName.trim()) return undefined;
    const id = `IDA-2026-${String(++this.sequence.application).padStart(3, "0")}`;
    const item: IdApplication = { ...input, id, history: ["ID application created"] };
    this.applications.unshift(item);
    return structuredClone(item);
  }
  updateApplication(id: string, input: ApplicationInput) {
    const item = this.applications.find((entry) => entry.id === id);
    if (!item) return undefined;
    Object.assign(item, input);
    item.history.push("Application information updated");
    return structuredClone(item);
  }
  decideApplication(id: string, status: IdApplication["status"], reason: string) {
    const item = this.applications.find((entry) => entry.id === id);
    if (!item || (["Correction", "Rejected"].includes(status) && reason.trim().length < 8)) return undefined;
    item.status = status;
    item.reason = reason.trim();
    item.reviewer = "Municipal Identity Desk";
    item.history.push(`Application marked ${status.toLocaleLowerCase()}`);
    return structuredClone(item);
  }

  listCredentials() {
    return structuredClone(this.credentials);
  }
  findCredential(id: string) {
    const item = this.credentials.find((entry) => entry.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createCredential(input: CredentialInput) {
    if (!input.applicationId.trim() || !input.personId.trim() || !input.holderName.trim()) return undefined;
    const id = `MID-2026-${String(++this.sequence.credential).padStart(4, "0")}`;
    const item: Credential = { ...input, id, history: ["Municipal credential issued"] };
    this.credentials.unshift(item);
    return structuredClone(item);
  }
  updateCredential(id: string, input: CredentialInput) {
    const item = this.credentials.find((entry) => entry.id === id);
    if (!item) return undefined;
    Object.assign(item, input);
    item.history.push("Credential record updated");
    return structuredClone(item);
  }
  setCredentialStatus(id: string, status: Credential["status"], reason: string) {
    const item = this.credentials.find((entry) => entry.id === id);
    if (!item || (status === "Revoked" && reason.trim().length < 8)) return undefined;
    item.status = status;
    item.invalidReason = reason.trim();
    item.history.push(`Credential marked ${status.toLocaleLowerCase()}`);
    return structuredClone(item);
  }
  replaceCredential(id: string) {
    const source = this.credentials.find((entry) => entry.id === id);
    if (source?.status !== "Active") return undefined;
    source.status = "Replaced";
    source.invalidReason = "Replacement credential issued.";
    source.history.push("Credential replaced");
    return this.createCredential({
      ...structuredClone(source),
      applicationId: source.applicationId,
      status: "Active",
      issuedAt: "2026-09-20",
      validUntil: "2029-09-19",
      token: `MATNOG-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      invalidReason: "",
    });
  }

  listTemplates() {
    return structuredClone(this.templates);
  }
  findTemplate(id: string) {
    const item = this.templates.find((entry) => entry.id === id);
    return item ? structuredClone(item) : undefined;
  }
  createTemplate(input: TemplateInput) {
    if (!input.name.trim()) return undefined;
    const id = `TPL-${String(++this.sequence.template).padStart(3, "0")}`;
    const item: IdTemplate = { ...input, id, version: 1, history: ["ID template created"] };
    this.templates.unshift(item);
    return structuredClone(item);
  }
  updateTemplate(id: string, input: TemplateInput) {
    const item = this.templates.find((entry) => entry.id === id);
    if (!item || !input.name.trim()) return undefined;
    Object.assign(item, input);
    item.version += 1;
    item.updatedAt = "2026-09-20";
    item.history.push(`Template version ${item.version} saved`);
    return structuredClone(item);
  }
  saveTemplateDesign(id: string, elements: IdTemplate["elements"]) {
    const item = this.templates.find((entry) => entry.id === id);
    if (!item) return undefined;
    item.elements = structuredClone(elements);
    item.version += 1;
    item.updatedAt = "2026-09-20";
    item.updatedBy = "Municipal Identity Desk";
    item.history.push(`Designer layout saved as version ${item.version}`);
    return structuredClone(item);
  }
  setTemplateStatus(id: string, status: IdTemplate["status"]) {
    const item = this.templates.find((entry) => entry.id === id);
    if (!item) return undefined;
    if (status === "Active")
      this.templates.forEach((entry) => {
        if (entry.id !== id && entry.status === "Active") entry.status = "Draft";
      });
    item.status = status;
    item.history.push(`Template marked ${status.toLocaleLowerCase()}`);
    return structuredClone(item);
  }
  duplicateTemplate(id: string) {
    const source = this.templates.find((entry) => entry.id === id);
    if (!source) return undefined;
    return this.createTemplate({
      ...structuredClone(source),
      name: `${source.name} copy`,
      status: "Draft",
      updatedAt: "2026-09-20",
      updatedBy: "Municipal Identity Desk",
    });
  }
}

export const identityOperationsRepository = new IdentityOperationsRepository();
