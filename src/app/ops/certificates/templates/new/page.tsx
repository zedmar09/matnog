import { Suspense } from "react";

import { CertificateTemplateCreateView } from "@/features/barangay-certifications/views/certificate-template-create-view";

export default function Page() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <CertificateTemplateCreateView />
    </Suspense>
  );
}
