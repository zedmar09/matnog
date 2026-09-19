import type { RoutingTemplate } from "../types/document-routing";
import {
  ENGINEERING_OFFICE,
  HEALTH_OFFICE,
  MAYORS_OFFICE,
  RECORDS_OFFICE,
  TOURISM_OFFICE,
} from "./document-foundation-fixtures";

/** Stable records loaded by the local routing-template repository. */
export const ROUTING_TEMPLATE_FIXTURES: readonly RoutingTemplate[] = [
  {
    id: "TPL-STANDARD",
    name: "Standard municipal review",
    version: 3,
    mode: "sequential",
    status: "active",
    stages: [
      {
        id: "TPL-STANDARD-S1",
        title: "Records intake",
        office: RECORDS_OFFICE,
        assigneePersona: "Records receiving clerk",
        sequence: 1,
        dueDays: 1,
        acknowledgmentRequired: true,
      },
      {
        id: "TPL-STANDARD-S2",
        title: "Office review",
        office: MAYORS_OFFICE,
        assigneePersona: "Office reviewer",
        sequence: 2,
        dueDays: 3,
        acknowledgmentRequired: false,
      },
    ],
  },
  {
    id: "TPL-SAFETY",
    name: "Parallel event safety review",
    version: 2,
    mode: "parallel",
    status: "active",
    stages: [
      {
        id: "TPL-SAFETY-S1",
        title: "Tourism intake",
        office: TOURISM_OFFICE,
        assigneePersona: "Tourism receiving clerk",
        sequence: 1,
        dueDays: 1,
        acknowledgmentRequired: true,
      },
      {
        id: "TPL-SAFETY-S2",
        title: "Health review",
        office: HEALTH_OFFICE,
        assigneePersona: "Health reviewer",
        sequence: 2,
        dueDays: 2,
        acknowledgmentRequired: false,
      },
      {
        id: "TPL-SAFETY-S3",
        title: "Engineering review",
        office: ENGINEERING_OFFICE,
        assigneePersona: "Engineering reviewer",
        sequence: 2,
        dueDays: 2,
        acknowledgmentRequired: false,
      },
    ],
  },
];
