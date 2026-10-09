import { Link, NavLink, Outlet } from "react-router";
import { useAuth, useCurrentUser } from "../auth/AuthContext";
import { fullName } from "../lib/format";
import { ROLE_LABELS } from "../lib/labels";

const ADMIN_NAV = [
  { to: "/", label: "Panel", icon: "▦", end: true },
  { to: "/cihazlar", label: "Cihazlar", icon: "▭" },
  { to: "/zimmetler", label: "Zimmetler", icon: "⇄" },
  { to: "/personel", label: "Personel", icon: "◉" },
  { to: "/departmanlar", label: "Departmanlar", icon: "▤" },
];

const STAFF_NAV = [{ to: "/", label: "Zimmetlerim", icon: "▭", end: true }];

export function Layout() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const nav = user.role === "ADMIN" ? ADMIN_NAV : STAFF_NAV;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>IT Zimmet</span>
        </div>
        <nav className="nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <Link to="/profil" className="sidebar-user-link" title="Profilim">
            <span className="avatar" aria-hidden="true">
              {user.firstName[0]}
              {user.lastName[0]}
            </span>
            <span className="sidebar-user-info">
              <strong>{fullName(user)}</strong>
              <span className="muted">{ROLE_LABELS[user.role]}</span>
            </span>
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>
            Çıkış
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
