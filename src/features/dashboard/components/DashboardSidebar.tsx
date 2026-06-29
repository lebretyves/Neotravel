"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Archive,
  BarChart3,
  Bell,
  Bus,
  Calendar,
  ChevronDown,
  Cpu,
  FileText,
  Gauge,
  Inbox,
  LayoutDashboard,
  Menu,
  ScrollText,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
  Workflow,
  X,
  type LucideIcon
} from "lucide-react";
import type { StaffRole } from "@/shared/lib/auth/localAuth";
import type { PermissionKey } from "@/shared/lib/auth/permissions";
import styles from "./dashboard.module.css";

type Item = {
  label: string;
  href: string;
  icon: LucideIcon;
  perm?: PermissionKey;
  /** Visible uniquement pour les administrateurs (ex. gouvernance). */
  adminOnly?: boolean;
  /** Badge « Alpha » — fonctionnalité en cours de développement. */
  alpha?: boolean;
};

const groups: { title: string; items: Item[]; adminSection?: boolean; defaultExpanded?: boolean }[] = [
  {
    title: "Pipeline",
    defaultExpanded: true,
    items: [
      { label: "Vue générale", href: "/dashboard", icon: LayoutDashboard },
      { label: "KPIs", href: "/dashboard/kpis", icon: BarChart3 },
      { label: "Demandes", href: "/dashboard/demandes", icon: Inbox, perm: "leads" },
      { label: "Archives demandes", href: "/dashboard/demandes/archive", icon: Archive, perm: "leads" },
      { label: "Validation humaine", href: "/dashboard/human-review", icon: ShieldCheck, perm: "human_review" },
      { label: "Devis", href: "/dashboard/devis", icon: FileText, perm: "quotes" },
      { label: "Relances", href: "/dashboard/relances", icon: Bell, perm: "followups" },
      { label: "Agenda", href: "/dashboard/agenda-commerciaux", icon: Calendar, perm: "agenda" },
      { label: "Comptes clients", href: "/dashboard/clients", icon: Users, perm: "clients" }
    ]
  },
  {
    title: "Pilotage",
    defaultExpanded: false,
    items: [
      { label: "Vue admin", href: "/dashboard/admin", icon: Gauge, perm: "admin_view" },
      { label: "Tarification", href: "/dashboard/pricing", icon: FileText, perm: "pricing" },
      { label: "Automatisations", href: "/dashboard/automatisations", icon: Workflow, perm: "automations", alpha: true },
      { label: "Croissance", href: "/dashboard/croissance", icon: TrendingUp, perm: "growth", alpha: true },
      { label: "Partenaires", href: "/dashboard/partenaires", icon: Bus, perm: "partners", alpha: true },
      { label: "Audit RGPD", href: "/dashboard/rgpd-audit", icon: ShieldCheck, perm: "compliance", alpha: true },
      { label: "Logs système", href: "/dashboard/couts-logs", icon: ScrollText, perm: "costs_logs" },
      { label: "Coûts IA", href: "/dashboard/couts-ia-admin", icon: Cpu, perm: "costs_ai" }
    ]
  },
  {
    title: "Gouvernance",
    adminSection: true,
    defaultExpanded: false,
    items: [{ label: "Équipe & accès", href: "/dashboard/gouvernance", icon: UserCog, adminOnly: true }]
  }
];

const NAV_EXPANDED_STORAGE_KEY = "neotravel.dashboard.navExpanded.v2";

function groupHasActive(pathname: string, items: Item[]) {
  return items.some((item) => isActive(pathname, item.href));
}

function readStoredExpanded(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NAV_EXPANDED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  role,
  email,
  name,
  permissions
}: {
  role: StaffRole;
  email: string | null;
  name?: string;
  permissions: PermissionKey[];
}) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const canSee = (item: Item) => {
    if (item.adminOnly) return isAdmin;
    return isAdmin || !item.perm || permissions.includes(item.perm);
  };

  const visibleGroups = groups
    .filter((group) => !group.adminSection || isAdmin)
    .map((group) => ({ ...group, items: group.items.filter(canSee) }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    const stored = readStoredExpanded();
    const next: Record<string, boolean> = {};

    for (const group of visibleGroups) {
      const wasStored = Object.prototype.hasOwnProperty.call(stored, group.title);
      next[group.title] = wasStored
        ? Boolean(stored[group.title])
        : groupHasActive(pathname, group.items) || Boolean(group.defaultExpanded);
    }

    setExpandedSections(next);
  }, [pathname, isAdmin, permissions.join("|")]);

  function toggleSection(title: string) {
    setExpandedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        window.localStorage.setItem(NAV_EXPANDED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }

  return (
    <>
      <div className={styles.mobileBar}>
        <Link className={styles.mobileBrand} href="/dashboard" aria-label="NeoTravel - tableau de bord">
          <img
            className={styles.brandLogo}
            src="/logo-neotravel-v12.svg"
            alt="NeoTravel"
            width={250}
            height={72}
          />
        </Link>
        <button
          type="button"
          className={styles.mobileToggle}
          aria-expanded={open}
          aria-controls="dashboard-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <Menu aria-hidden="true" size={20} />
          <span className={styles.srOnly}>Ouvrir le menu</span>
        </button>
      </div>

      {open ? <div className={styles.navOverlay} onClick={() => setOpen(false)} aria-hidden="true" /> : null}

      <nav
        id="dashboard-nav"
        className={styles.dashboardNav}
        data-open={open ? "true" : "false"}
        aria-label="Navigation du tableau de bord"
      >
        <div className={styles.navTop}>
          <Link className={styles.brand} href="/dashboard" aria-label="NeoTravel - tableau de bord">
            <img
              className={styles.brandLogo}
              src="/logo-neotravel-v12.svg"
              alt="NeoTravel"
              width={250}
              height={72}
            />
          </Link>
          <button
            type="button"
            className={styles.navClose}
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className={styles.navScroll}>
          {visibleGroups.map((group) => {
            const isExpanded =
              expandedSections[group.title] ??
              (groupHasActive(pathname, group.items) || Boolean(group.defaultExpanded));

            return (
              <div key={group.title} className={styles.navSection} data-expanded={isExpanded ? "true" : "false"}>
                <button
                  type="button"
                  className={styles.navSectionToggle}
                  aria-expanded={isExpanded}
                  aria-controls={`nav-section-${group.title}`}
                  onClick={() => toggleSection(group.title)}
                >
                  <span className={styles.navSectionTitle}>{group.title}</span>
                  <ChevronDown className={styles.navSectionChevron} aria-hidden="true" size={14} strokeWidth={2.4} />
                </button>
                <div
                  id={`nav-section-${group.title}`}
                  className={styles.navGroup}
                  hidden={!isExpanded}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      >
                        <Icon className={styles.navIcon} aria-hidden="true" size={16} strokeWidth={2.2} />
                        <span className={styles.navLinkLabel}>
                          <span className={styles.navLinkText}>{item.label}</span>
                          {item.alpha && isAdmin ? (
                            <span className={styles.navAlphaBadge} title="Fonctionnalité en cours de développement">
                              Alpha
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.userCard}>
          <span className={styles.userName}>{name ?? email ?? "Session dashboard"}</span>
          <span className={styles.userRole} data-role={role}>
            {isAdmin ? "Administrateur" : "Commercial"}
          </span>
        </div>

        <form action="/api/auth/signout" method="post" className={styles.logoutForm}>
          <button type="submit" className={styles.logoutButton}>
            Déconnexion
          </button>
        </form>
      </nav>
    </>
  );
}
