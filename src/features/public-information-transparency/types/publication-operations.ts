import type { PublicationKind, PublicationRecord, PublicationStatus } from "../data/publication-fixtures";

export type PublicationPriority = "Routine" | "Important" | "Urgent";
export type PublicationChannel = "Website" | "Mobile app" | "SMS bulletin" | "Social media";
export type PublicationScope = "all" | PublicationKind | "review";

export type PublicationOperationsRecord = PublicationRecord & {
  slug: string;
  priority: PublicationPriority;
  audience: string;
  channels: PublicationChannel[];
  reviewer: string;
  createdDate: string;
  scheduledAt?: string;
  publishedAt?: string;
  attachmentCount: number;
};

export type PublicationInput = Omit<PublicationOperationsRecord, "id" | "history"> & {
  status: PublicationStatus;
};

export type PublicationDecision = "submit" | "return" | "publish" | "archive" | "restore";
