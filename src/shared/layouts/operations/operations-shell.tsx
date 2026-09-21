"use client";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Refine } from "@refinedev/core";
import {
  ArrowLeft,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  FileBadge2,
  FileStack,
  Globe,
  HandCoins,
  Headset,
  IdCard,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  type LucideIcon,
  Settings2,
  Ship,
  Stamp,
  UsersRound,
  Wallet,
  Workflow,
} from "lucide-react";

import { GROUPS, MODULES } from "@/features/operations-overview/data/modules";
import { createModuleDataProvider } from "@/features/operations-overview/services/module-data-provider";
import { Brand } from "@/shared/components/brand";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/shared/components/ui/sidebar";
import {
  useWorkspaceSession,
  type WorkspaceRole,
  WorkspaceSessionProvider,
} from "@/shared/providers/workspace-session-provider";

const MODULE_ICONS: Record<string, LucideIcon> = {
  M01: UsersRound,
  M02: IdCard,
  M03: FileBadge2,
  M04: Ship,
  M05: FileStack,
  M06: Wallet,
  M07: Stamp,
  M08: HandCoins,
  M09: LifeBuoy,
  M10: LockKeyhole,
  M11: Headset,
  M12: Workflow,
  M13: Building2,
  M14: Landmark,
  M15: ChartNoAxesCombined,
  M16: Globe,
  M17: Settings2,
};

export const ROLE_NAMES: Record<WorkspaceRole, string> = {
  municipal: "Municipal staff",
  barangay: "Barangay staff",
  partner: "Tourism partner",
  enumerator: "Field Surveyor",
};

function WorkspaceSidebar() {
  const { role } = useWorkspaceSession();
  const { setOpenMobile, setOpen } = useSidebar();
  const railRef = useRef<HTMLDivElement>(null);

  /**
   * The rail expands while the pointer is over it. Native listeners are used so
   * the behaviour does not depend on React's synthesized enter/leave pair.
   */
  useEffect(() => {
    const node = railRef.current;
    if (!node) return;
    const expand = () => setOpen(true);
    const collapse = () => setOpen(false);
    node.addEventListener("mouseenter", expand);
    node.addEventListener("mouseleave", collapse);
    return () => {
      node.removeEventListener("mouseenter", expand);
      node.removeEventListener("mouseleave", collapse);
    };
  }, [setOpen]);
  const pathname = usePathname();
  const close = () => setOpenMobile(false);

  /** Modules this role can see. Screens may narrow it further. */
  const visible = MODULES.filter((module) => module.roles.includes(role));

  return (
    <Sidebar ref={railRef} collapsible="icon" className="ops-sidebar">
      <SidebarHeader className="ops-sidebar-brand">
        <Brand variant="love" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-3">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/ops"} className="h-10">
              <Link href="/ops" onClick={close}>
                <LayoutDashboard />
                <span>Workspace overview</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {GROUPS.filter((item) => item.id !== "all").map((groupItem) => {
          const groupModules = visible.filter((module) => module.group === groupItem.id);
          if (groupModules.length === 0) return null;
          return (
            <SidebarGroup key={groupItem.id}>
              <SidebarGroupLabel className="ops-sidebar-label">{groupItem.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="px-1">
                  {groupModules.map((module) => {
                    const Icon = MODULE_ICONS[module.id] ?? FileStack;
                    const screens = module.screens.filter(
                      (screen) => !screen.hidden && (!screen.roles || screen.roles.includes(role)),
                    );
                    if (screens.length === 0) return null;
                    const inModule = screens.some(
                      (screen) => pathname === screen.href || pathname.startsWith(`${screen.href}/`),
                    );
                    return (
                      <Collapsible key={module.id} defaultOpen={inModule} className="group/module">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="h-10" isActive={inModule}>
                              <Icon />
                              <span>{module.shortName}</span>
                              <ChevronRight className="ops-sidebar-chevron" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {screens.map((screen) => (
                                <SidebarMenuSubItem key={screen.href}>
                                  <SidebarMenuSubButton asChild isActive={pathname === screen.href}>
                                    <Link href={screen.href} onClick={close}>
                                      {screen.label}
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}

/**
 * Header account control: who you are acting as, the role you are acting in,
 * and the way back out. Role lives here rather than on the workspace overview
 * so it stays reachable from every screen.
 */
function WorkspaceAccountMenu() {
  const { role, setRole } = useWorkspaceSession();
  const name = ROLE_NAMES[role];
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ops-avatar" aria-label="Account menu">
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="ops-avatar-menu">
        <div className="ops-avatar-head">
          <span className="ops-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <strong>{name}</strong>
            <small>Municipality of Matnog</small>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Acting as</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={role} onValueChange={(next) => setRole(next as WorkspaceRole)}>
          {(Object.keys(ROLE_NAMES) as WorkspaceRole[]).map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {ROLE_NAMES[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <ArrowLeft size={14} aria-hidden="true" />
            Back to I ♥ Matnog
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/staff/sign-in">
            <LogOut size={14} aria-hidden="true" />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const { role, scenario, generation } = useWorkspaceSession();
  // A fresh provider identity on every render would make Refine refetch in a
  // loop, so it is memoised on the inputs that actually change it.
  const provider = useMemo(() => createModuleDataProvider(role, scenario), [role, scenario]);
  return (
    <Refine
      key={`${role}-${generation}`}
      dataProvider={provider}
      resources={[{ name: "municipal-modules" }]}
      options={{
        disableTelemetry: true,
        reactQuery: { clientConfig: { defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } } } },
      }}
    >
      <SidebarProvider className="ops-provider" defaultOpen={false}>
        <a href="#main-content" className="skip-link">
          Skip to workspace
        </a>
        <WorkspaceSidebar />
        {/* SidebarInset renders the page's <main>, so the skip-link target and
            focus handling live on it. A second <main> would create a duplicate
            landmark. */}
        <SidebarInset id="main-content" tabIndex={-1} className="min-w-0">
          <header className="ops-header">
            <div>
              <SidebarTrigger aria-label="Toggle workspace navigation" />
              <strong>Staff workspace</strong>
            </div>
            <WorkspaceAccountMenu />
          </header>
          <div className="ops-main">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </Refine>
  );
}

export function OperationsShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceSessionProvider>
      <ShellFrame>{children}</ShellFrame>
    </WorkspaceSessionProvider>
  );
}
