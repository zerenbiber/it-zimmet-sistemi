import {
  ArrowLeftRight,
  Building2,
  Laptop,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Package,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useAuth, useCurrentUser } from "../auth/AuthContext";
import { fullName } from "../lib/format";
import { ROLE_LABELS } from "../lib/labels";
import { useTheme, type ThemePreference } from "../lib/theme";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const ADMIN_NAV: NavItem[] = [
  { to: "/", label: "Panel", icon: LayoutDashboard, end: true },
  { to: "/cihazlar", label: "Cihazlar", icon: Laptop },
  { to: "/zimmetler", label: "Zimmetler", icon: ArrowLeftRight },
  { to: "/personel", label: "Personel", icon: Users },
  { to: "/departmanlar", label: "Departmanlar", icon: Building2 },
];

const STAFF_NAV: NavItem[] = [{ to: "/", label: "Zimmetlerim", icon: Package, end: true }];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

export function Layout() {
  const user = useCurrentUser();
  const nav = user.role === "ADMIN" ? ADMIN_NAV : STAFF_NAV;

  return (
    <div className="shell">
      <aside className="rail">
        <Link to="/" className="rail-brand" aria-label="IT Zimmet ana sayfa">
          <img src="/favicon.svg" alt="" width={34} height={34} />
        </Link>
        <nav className="rail-nav" aria-label="Ana menü">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="rail-link" aria-label={label} data-tooltip={label}>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="rail-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <ProfileMenu />
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

function ProfileMenu() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const { preference, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="profile" ref={containerRef}>
      <button
        className="avatar-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${fullName(user)} — hesap menüsü`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar">
          {user.firstName[0]}
          {user.lastName[0]}
        </span>
      </button>

      {open && (
        <div className="profile-menu" role="menu">
          <div className="profile-menu-header">
            <span className="avatar avatar-lg" aria-hidden="true">
              {user.firstName[0]}
              {user.lastName[0]}
            </span>
            <div className="profile-menu-identity">
              <strong>{fullName(user)}</strong>
              <span>{user.email}</span>
              <span className="pill pill-subtle">{ROLE_LABELS[user.role]}</span>
            </div>
          </div>

          <div className="profile-menu-section">
            <span className="profile-menu-caption">Tema</span>
            <div className="theme-switch" role="radiogroup" aria-label="Tema">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={preference === value}
                  className={preference === value ? "active" : ""}
                  onClick={() => setTheme(value)}
                >
                  <Icon size={14} strokeWidth={2} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-menu-section">
            <Link to="/profil" className="menu-item" role="menuitem">
              <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
              Profilim ve şifre
            </Link>
            <button className="menu-item menu-item-danger" role="menuitem" onClick={() => void logout()}>
              <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
              Çıkış yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
