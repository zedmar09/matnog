import type { ActivityPriority, ActivityType } from "@/features/disaster-evacuation-relief/types/disaster-records";
import { ActivityFormView } from "@/features/disaster-evacuation-relief/views/activity-form-view";

export const metadata = { title: "New disaster response activity" };

const types: ActivityType[] = [
  "Typhoon",
  "Flood",
  "Storm surge",
  "Tsunami",
  "Landslide",
  "Fire",
  "Earthquake",
  "Volcanic activity",
  "Maritime incident",
];
const priorities: ActivityPriority[] = ["Low", "Moderate", "High", "Critical"];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; name?: string; priority?: string; reference?: string; summary?: string }>;
}) {
  const query = await searchParams;
  return (
    <ActivityFormView
      initialValues={{
        type: types.includes(query.type as ActivityType) ? (query.type as ActivityType) : "Typhoon",
        priority: priorities.includes(query.priority as ActivityPriority)
          ? (query.priority as ActivityPriority)
          : "Moderate",
        name: query.name?.slice(0, 180) ?? "",
        advisoryReference: query.reference?.slice(0, 100) ?? "",
        summary: query.summary?.slice(0, 600) ?? "",
      }}
    />
  );
}
