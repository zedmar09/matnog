import Link from "next/link";

import { Compass } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
export default function NotFound() {
  return (
    <main className="not-found">
      <Compass size={44} />
      <h1>Let’s get you back on track.</h1>
      <p>This page isn’t part of the current preview.</p>
      <Button asChild>
        <Link href="/">Return to I ♥ Matnog</Link>
      </Button>
    </main>
  );
}
