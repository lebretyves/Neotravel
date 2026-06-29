"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  FileText,
  FolderOpen,
  HelpCircle,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Menu,
  MessageSquare,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon
} from "lucide-react";
import styles from "@/features/dashboard/components/dashboard.module.css";

type Item = { label: string; href: string; icon: LucideIcon };

const groups: { title: string; items: Item[]; defaultExpanded?: boolean }[] = [
  {
    title: "Mon espace",
    defaultExpanded: true,
    items: [
      { label: "Accueil", href: "/compte", icon: LayoutDashboard },
      { label: "Mes demandes", href: "/compte/demandes", icon: Inbox },
      { label: "Mes devis", href: "/compte/devis", icon: FileText },
      { label: "Documents", href: "/compte/documents", icon: FolderOpen },
      { label: "Messages", href: "/compte/messages", icon: MessageSquare }
    ]
  },
  {
    title: "Paramètres",
    defaultExpanded: true,
    items: [
      { label: "Profil", href: "/compte/profil", icon: UserRound },
      { label: "Notifications", href: "/compte/notifications", icon: Bell },
      { label: "Sécurité", href: "/compte/securite", icon: KeyRound }
    ]
  },
  {
    title: "Données & aide",
    defaultExpanded: false,
    items: [
      { label: "Confidentialité", href: "/compte/confidentialite", icon: ShieldCheck },
      { label: "Aide", href: "/compte/aide", icon: HelpCircle }
    ]
  }
];

const NAV_EXPANDED_STORAGE_KEY = "neotravel.client.navExpanded.v1";

function isActive(pathname: string, href: string) {
  if (href === "/compte") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

export function ClientAccountSidebar({
  displayName,
  email
}: {
  displayName: string;
  email: string;
}) {
  const pathname = usePathname();
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

  useEffect(() => {
    const stored = readStoredExpanded();
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      const wasStored = Object.prototype.hasOwnProperty.call(stored, group.title);
      next[group.title] = wasStored
        ? Boolean(stored[group.title])
        : groupHasActive(pathname, group.items) || Boolean(group.defaultExpanded);
    }
    setExpandedSections(next);
  }, [pathname]);

  function toggleSection(title: string) {
    setExpandedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        window.localStorage.setItem(NAV_EXPANDED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <>
      <div className={styles.mobileBar}>
        <Link className={styles.mobileBrand} href="/compte" aria-label="NeoTravel - espace client">
          <img className={styles.brandLogo} src="/logo-neotravel-v12.svg" alt="NeoTravel" width={250} height={72} />
        </Link>
        <button
          type="button"
          className={styles.mobileToggle}
          aria-expanded={open}
          aria-controls="client-account-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <Menu aria-hidden="true" size={20} />
          <span className={styles.srOnly}>Ouvrir le menu</span>
        </button>
      </div>

      {open ? <div className={styles.navOverlay} onClick={() => setOpen(false)} aria-hidden="true" /> : null}

      <nav
        id="client-account-nav"
        className={styles.dashboardNav}
        data-open={open ? "true" : "false"}
        aria-label="Navigation espace client"
      >
        <div className={styles.navTop}>
          <Link className={styles.brand} href="/compte" aria-label="NeoTravel - espace client">
            <img className={styles.brandLogo} src="/logo-neotravel-v12.svg" alt="NeoTravel" width={250} height={72} />
          </Link>
          <button type="button" className={styles.navClose} onClick={() => setOpen(false)} aria-label="Fermer le menu">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className={styles.navScroll}>
          {groups.map((group) => {
            const isExpanded =
              expandedSections[group.title] ??
              (groupHasActive(pathname, group.items) || Boolean(group.defaultExpanded));

            return (
              <div key={group.title} className={styles.navSection} data-expanded={isExpanded ? "true" : "false"}>
                <button
                  type="button"
                  className={styles.navSectionToggle}
                  aria-expanded={isExpanded}
                  aria-controls={`client-nav-${group.title}`}
                  onClick={() => toggleSection(group.title)}
                >
                  <span className={styles.navSectionTitle}>{group.title}</span>
                  <ChevronDown className={styles.navSectionChevron} aria-hidden="true" size={14} strokeWidth={2.4} />
                </button>
                <div id={`client-nav-${group.title}`} className={styles.navGroup} hidden={!isExpanded}>
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
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole} data-role="commercial">
            {email}
          </span>
        </div>

        <form action="/api/auth/client-signout" method="post" className={styles.logoutForm}>
          <button type="submit" className={styles.logoutButton}>
            Déconnexion
          </button>
        </form>
      </nav>
    </>
  );
}
