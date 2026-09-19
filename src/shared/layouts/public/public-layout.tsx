import type { ReactNode } from "react";

import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-site">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
