import type { ReactNode } from "react";

import { Poppins } from "next/font/google";

import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { DemoAuthProvider } from "@/features/unified-account-and-id/providers/demo-auth-provider";
import { DemoIdentityProvider } from "@/features/unified-account-and-id/providers/demo-identity-provider";
import { DemoRequesterProvider } from "@/features/unified-account-and-id/providers/demo-requester-provider";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { DemoSessionProvider } from "@/shared/providers/demo-session-provider";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: { default: "I ♥ MATNOG | Municipality of Matnog", template: "%s | I ♥ MATNOG" },
  description: APP_CONFIG.description,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${poppins.variable}`}>
        <TooltipProvider>
          <DemoSessionProvider>
            <DemoRequesterProvider>
              <DemoAuthProvider>
                <DemoIdentityProvider>{children}</DemoIdentityProvider>
              </DemoAuthProvider>
            </DemoRequesterProvider>
          </DemoSessionProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
