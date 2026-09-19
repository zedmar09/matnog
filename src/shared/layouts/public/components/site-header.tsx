"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ArrowUpRight, Menu } from "lucide-react";

import { PUBLIC_NAVIGATION } from "@/config/app-config";
import { buildSignInPath } from "@/features/unified-account-and-id/services/account-navigation";
import { Brand } from "@/shared/components/brand";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

/** Routes whose hero runs full-bleed behind a transparent header. */
const OVERLAY_HERO_ROUTES = new Set(["/", "/visit"]);

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { session, ready } = useDemoSession();
  const accountHref = ready && session ? "/account/profile" : buildSignInPath("/account/profile");
  const isLanding = OVERLAY_HERO_ROUTES.has(pathname);
  const transparent = isLanding && !scrolled;

  useEffect(() => {
    if (!isLanding) {
      setScrolled(false);
      return;
    }
    const updateHeader = () => setScrolled(window.scrollY > 48);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, [isLanding]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header
        className={cn(
          "site-header",
          isLanding && "site-header-landing",
          transparent && "is-transparent",
          isLanding && scrolled && "is-scrolled",
        )}
      >
        <div className="site-container header-inner">
          <Brand inverse={transparent} variant="love" />
          <nav aria-label="Main navigation" className="desktop-nav">
            {PUBLIC_NAVIGATION.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn("nav-link", pathname === item.href && "nav-link-active")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Button asChild className={cn("header-sign-in", transparent && "header-sign-in-light")}>
              <Link href={accountHref}>
                {ready && session ? "My account" : "Sign in"}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <Button
                variant="outline"
                size="icon"
                className={cn("mobile-menu-button", transparent && "mobile-menu-button-light")}
                aria-label="Open navigation"
                onClick={() => setOpen(true)}
              >
                <Menu />
              </Button>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>I ♥ Matnog</SheetTitle>
                  <SheetDescription>Find a service or explore our municipality.</SheetDescription>
                </SheetHeader>
                <nav aria-label="Mobile navigation" className="mobile-nav">
                  {PUBLIC_NAVIGATION.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                      {item.label}
                      <ArrowUpRight size={16} />
                    </Link>
                  ))}
                  <Link href="/track" onClick={() => setOpen(false)}>
                    Track a request
                    <ArrowUpRight size={16} />
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
