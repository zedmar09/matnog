import Link from "next/link";

import { ChevronRight } from "lucide-react";
export function PageHeader({
  title,
  description,
  parent = "Home",
  parentHref = "/",
}: {
  title: string;
  description: string;
  parent?: string;
  parentHref?: string;
}) {
  return (
    <div className="page-heading">
      <div className="breadcrumbs">
        <Link href={parentHref}>{parent}</Link>
        <ChevronRight size={13} />
        <span>{title}</span>
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
