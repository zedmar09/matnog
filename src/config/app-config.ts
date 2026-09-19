export const APP_CONFIG = {
  name: "I ♥ MATNOG",
  municipality: "Matnog, Sorsogon",
  description: "Your starting point for municipal services, community updates, and discovering Matnog.",
  preview: true,
} as const;
export const PUBLIC_NAVIGATION = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Visit Matnog", href: "/visit" },
  { label: "Advisories", href: "/advisories" },
  { label: "Projects", href: "/projects" },
  { label: "Transparency", href: "/transparency" },
] as const;
