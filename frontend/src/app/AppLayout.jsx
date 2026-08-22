import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, GraduationCap, FileText, Library, Target,
  Trophy, Brain, User, LogOut, Sparkles, ShieldCheck,
} from "lucide-react";

const NAV = [
  { to: "/app", label: "Ana Sayfa", icon: LayoutDashboard, end: true },
  { to: "/app/sinavlar", label: "Sınavlar", icon: GraduationCap },
  { to: "/app/denemeler", label: "Denemeler", icon: FileText },
  { to: "/app/soru-bankasi", label: "Soru Bankası", icon: Library },
  { to: "/app/eksiklerim", label: "Eksiklerim", icon: Target },
  { to: "/app/siralama", label: "Sıralama", icon: Trophy },
  { to: "/app/ai-koc", label: "AI Koç", icon: Brain },
  { to: "/app/profil", label: "Profil", icon: User },
];

const MOBILE = [
  { to: "/app", label: "Ana Sayfa", icon: LayoutDashboard, end: true },
  { to: "/app/denemeler", label: "Denemeler", icon: FileText },
  { to: "/app/soru-bankasi", label: "Sorular", icon: Library },
  { to: "/app/eksiklerim", label: "Eksik", icon: Target },
  { to: "/app/profil", label: "Profil", icon: User },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const doLogout = async () => {
    await logout();
    nav("/");
  };

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive ? "bg-ink text-white" : "text-zinc-600 hover:bg-black/5"
    }`;

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-zinc-200 bg-white px-4 py-6 z-40">
        <NavLink to="/app" className="flex items-center gap-2 px-2 mb-8">
          <span className="h-8 w-8 rounded-lg bg-subject-matematik grid place-items-center">
            <Sparkles size={16} className="text-white" />
          </span>
          <span className="font-heading font-extrabold text-xl tracking-tight">Netor</span>
        </NavLink>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkCls} data-testid={`nav-${n.label}`}>
              <n.icon size={18} /> {n.label}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink to="/app/admin" className={linkCls} data-testid="nav-admin">
              <ShieldCheck size={18} /> Admin
            </NavLink>
          )}
        </nav>
        <div className="border-t border-zinc-200 pt-4 mt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="h-9 w-9 rounded-full bg-subject-matematik/15 grid place-items-center font-heading font-bold text-subject-matematik">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-xs text-zinc-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button onClick={doLogout} data-testid="logout-btn" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-subject-turkce px-2 transition-colors">
            <LogOut size={16} /> Çıkış yap
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 glass border-b border-zinc-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-subject-matematik grid place-items-center">
            <Sparkles size={14} className="text-white" />
          </span>
          <span className="font-heading font-extrabold text-lg">Netor</span>
        </div>
        <button onClick={doLogout} className="text-zinc-500" data-testid="logout-btn-mobile">
          <LogOut size={18} />
        </button>
      </header>

      {/* Content */}
      <main className="lg:pl-64 pb-24 lg:pb-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-zinc-200 grid grid-cols-5 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {MOBILE.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            data-testid={`mnav-${n.label}`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1.5 rounded-lg text-[11px] font-medium ${
                isActive ? "text-subject-matematik" : "text-zinc-400"
              }`
            }
          >
            <n.icon size={20} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
