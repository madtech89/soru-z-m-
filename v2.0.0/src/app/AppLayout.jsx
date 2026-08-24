import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { fetchExams, fetchSubjects, EXAM_CATEGORIES } from "@/lib/api";
import {
  LayoutDashboard, GraduationCap, FileText, Library, Target,
  Trophy, Brain, User, LogOut, Sparkles, ShieldCheck, BookOpen, Calculator, Menu, X, Award, MessageSquare,
  ChevronDown, ChevronRight, Compass, Clock, BookCopy, Home,
} from "lucide-react";

function useClickOutside(ref, cb) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

function Dropdown({ label, icon: Icon, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${open ? "text-subject-matematik" : "text-zinc-600 hover:text-ink"}`}
      >
        {Icon && <Icon size={16} />}
        {label}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 pt-1 w-56 bg-white rounded-2xl shadow-xl border border-zinc-100 py-2 z-50"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CascadingItem({ label, exams, subjCache, loadSubjects, basePath }) {
  const [subOpen, setSubOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setSubOpen(true)} onMouseLeave={() => setSubOpen(false)}>
      <div className="flex items-center justify-between px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors">
        <span className="font-medium">{label}</span>
        <ChevronRight size={14} className={`text-zinc-400 transition-transform ${subOpen ? "rotate-90" : ""}`} />
      </div>
      {subOpen && exams.length > 0 && (
        <div className="absolute left-full top-0 pl-1 w-56 max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white py-2 shadow-xl z-50">
          {exams.map((e) => (
            <div key={e.id} onMouseEnter={() => loadSubjects(e.id)}>
              <DropdownLink to={`${basePath}?exam_id=${e.id}`}>{e.name}</DropdownLink>
              {subjCache[e.id]?.map((s) => (
                <NavLink key={s.id} to={`${basePath}?exam_id=${e.id}&subject_id=${s.id}`}
                  className="block pl-8 pr-4 py-2 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700">
                  {s.name}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownLink({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-4 py-2.5 text-sm transition-colors ${isActive ? "bg-subject-matematik/5 text-subject-matematik font-semibold" : "text-zinc-600 hover:bg-zinc-50"}`
      }
    >
      {children}
    </NavLink>
  );
}

function DropdownGroup({ label, children }) {
  return (
    <div className="py-1">
      <div className="px-4 text-[11px] font-bold uppercase tracking-wide text-zinc-400 mb-1">{label}</div>
      {children}
    </div>
  );
}

function DropdownDivider() {
  return <div className="my-1 border-t border-zinc-100" />;
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const [exams, setExams] = useState([]);
  const [subjCache, setSubjCache] = useState({});

  useEffect(() => { fetchExams().then(setExams).catch(() => setExams([])); }, []);

  const loadSubjects = (examId) => {
    if (subjCache[examId]) return;
    fetchSubjects(examId).then((r) => setSubjCache((c) => ({ ...c, [examId]: r }))).catch(() => {});
  };

  const doLogout = async () => { await logout(); nav("/"); };

  const examsByCat = EXAM_CATEGORIES.map((cat) => ({
    ...cat,
    exams: exams.filter((e) => e.category === cat.key),
  })).filter((c) => c.exams.length > 0);

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-ink text-white" : "text-zinc-600 hover:bg-black/5"}`;

  const headerCls = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "text-subject-matematik" : "text-zinc-600 hover:text-ink"}`;

  return (
    <div className="min-h-screen bg-paper">
      {/* Top header with dropdown menus */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-1">
            <NavLink to={user ? "/app" : "/"} className="flex items-center gap-2 mr-3">
              <span className="h-7 w-7 rounded-lg bg-subject-matematik grid place-items-center"><Sparkles size={14} className="text-white" /></span>
              <span className="font-heading font-extrabold text-lg hidden sm:block">Netor</span>
            </NavLink>
            <Link to="/" className="hidden sm:flex items-center gap-1 text-sm text-zinc-500 hover:text-ink mr-2 transition-colors">
              <Home size={15} /> Ana Sayfa
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {/* Ana Sayfa */}
              <NavLink to="/app" end className={headerCls}><LayoutDashboard size={16} /> Ana Sayfa</NavLink>

              {/* Sınav türleri dropdown — kademeli */}
              <Dropdown label="Sinavlar" icon={GraduationCap}>
                {examsByCat.map((cat) => (
                  <CascadingItem key={cat.key} label={cat.label} exams={cat.exams} subjCache={subjCache} loadSubjects={loadSubjects} basePath="/app/soru-bankasi" />
                ))}
              </Dropdown>

              {/* Deneme */}
              <NavLink to="/app/denemeler" className={headerCls}><FileText size={16} /> Denemeler</NavLink>

              {/* Dersler dropdown — kademeli */}
              <Dropdown label="Dersler" icon={BookCopy}>
                <DropdownLink to="/app/ders-notlari">Ders Notlari</DropdownLink>
                <DropdownLink to="/app/soru-bankasi">Soru Bankasi</DropdownLink>
                <DropdownLink to="/app/eksiklerim">Eksiklerim</DropdownLink>
                <DropdownDivider />
                {examsByCat.map((cat) => (
                  <CascadingItem key={cat.key} label={cat.label} exams={cat.exams} subjCache={subjCache} loadSubjects={loadSubjects} basePath="/app/ders-notlari" />
                ))}
              </Dropdown>

              {/* Araclar dropdown */}
              <Dropdown label="Araclar" icon={Calculator}>
                <DropdownLink to="/app/puan-hesapla">Puan Hesapla</DropdownLink>
                <DropdownLink to="/app/tercih-robotu">Tercih Robotu</DropdownLink>
                <DropdownLink to="/app/geri-sayim">Geri Sayim</DropdownLink>
              </Dropdown>

              {/* AI */}
              <Dropdown label="AI" icon={Brain}>
                <DropdownLink to="/app/ai-koc">AI Koc</DropdownLink>
                <DropdownLink to="/app/ai-sohbet">AI Sohbet</DropdownLink>
              </Dropdown>

              {/* Diger */}
              <NavLink to="/app/siralama" className={headerCls}><Trophy size={16} /> Siralama</NavLink>
              <NavLink to="/app/rozetler" className={headerCls}><Award size={16} /> Rozetler</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NavLink to="/app/profil" className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-black/5 transition-colors ${user?.role === "admin" ? "" : ""}`}>
                  <div className="h-7 w-7 rounded-full bg-subject-matematik/15 grid place-items-center font-heading font-bold text-subject-matematik text-xs">
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hidden lg:block">{user?.name}</span>
                </NavLink>
                {user?.role === "admin" && (
                  <NavLink to="/app/admin" className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-ink">
                    <ShieldCheck size={16} /> Admin
                  </NavLink>
                )}
                <button onClick={doLogout} className="hidden md:flex items-center gap-1.5 text-sm text-zinc-500 hover:text-subject-turkce px-2 transition-colors">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="hidden md:inline-flex text-sm font-medium px-4 py-2 rounded-lg text-zinc-600 hover:bg-black/5 transition-colors">Giriş</NavLink>
                <NavLink to="/onboarding" className="hidden md:inline-flex text-sm font-semibold px-4 py-2 rounded-lg bg-ink text-white hover:bg-subject-matematik transition-colors">Ücretsiz Başla</NavLink>
              </>
            )}
            <button onClick={() => setMenu(true)} className="md:hidden p-2 rounded-lg text-zinc-700 hover:bg-zinc-100"><Menu size={22} /></button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMenu(false)}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.28 }} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-72 bg-white p-5 overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <span className="font-heading font-extrabold text-lg">Menu</span>
                <button onClick={() => setMenu(false)}><X size={22} className="text-zinc-400" /></button>
              </div>
              <nav className="space-y-1">
                <Link to="/" onClick={() => setMenu(false)} className={linkCls}>
                  <Home size={18} /> Ana Sayfa
                </Link>
                {[
                  ["/app", "Ana Sayfa", LayoutDashboard, true],
                  ["/app/sinavlar", "Sinavlar", GraduationCap, false],
                  ["/app/denemeler", "Denemeler", FileText, false],
                  ["/app/soru-bankasi", "Soru Bankasi", Library, false],
                  ["/app/ders-notlari", "Ders Notlari", BookOpen, false],
                  ["/app/eksiklerim", "Eksiklerim", Target, false],
                  ["/app/puan-hesapla", "Puan Hesapla", Calculator, false],
                  ["/app/tercih-robotu", "Tercih Robotu", Compass, false],
                  ["/app/geri-sayim", "Geri Sayim", Clock, false],
                  ["/app/siralama", "Siralama", Trophy, false],
                  ["/app/ai-koc", "AI Koc", Brain, false],
                  ["/app/ai-sohbet", "AI Sohbet", MessageSquare, false],
                  ["/app/rozetler", "Rozetler", Award, false],
                  ["/app/profil", "Profil", User, false],
                ].map(([to, label, Icon, end]) => (
                  <NavLink key={to} to={to} end={end} onClick={() => setMenu(false)} className={linkCls}>
                    <Icon size={18} /> {label}
                  </NavLink>
                ))}
                {user?.role === "admin" && (
                  <NavLink to="/app/admin" onClick={() => setMenu(false)} className={linkCls}>
                    <ShieldCheck size={18} /> Admin
                  </NavLink>
                )}
                {user ? (
                  <button onClick={doLogout} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-subject-turkce w-full mt-2">
                    <LogOut size={18} /> Cikis yap
                  </button>
                ) : (
                  <>
                    <NavLink to="/login" onClick={() => setMenu(false)} className={linkCls}>
                      <LogOut size={18} /> Giris yap
                    </NavLink>
                    <NavLink to="/onboarding" onClick={() => setMenu(false)} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-ink text-white mt-1">
                      <Sparkles size={18} /> Ucretsiz basla
                    </NavLink>
                  </>
                )}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pb-24 md:pb-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-zinc-200 shadow-sm grid grid-cols-5 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {[
          { to: "/app", label: "Ana", icon: LayoutDashboard, end: true },
          { to: "/app/denemeler", label: "Deneme", icon: FileText },
          { to: "/app/soru-bankasi", label: "Sorular", icon: Library },
          { to: "/app/geri-sayim", label: "Sayim", icon: Clock },
          { to: "/app/profil", label: "Profil", icon: User },
        ].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `flex flex-col items-center gap-1 py-1.5 rounded-lg text-[11px] font-medium ${isActive ? "text-subject-matematik" : "text-zinc-400"}`}>
            <n.icon size={20} />{n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
