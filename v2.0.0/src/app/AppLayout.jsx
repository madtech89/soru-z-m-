import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { fetchExams, fetchSubjects, fetchTopics, EXAM_CATEGORIES, fetchCreditBalance } from "@/lib/api";
import {
  LayoutDashboard, GraduationCap, FileText, Library, Target,
  Trophy, Brain, User, LogOut, Sparkles, ShieldCheck, BookOpen, Calculator, Menu, X, Award, MessageSquare,
  ChevronDown, ChevronRight, Compass, Clock, BookCopy, Home, Zap,
} from "lucide-react";

import { DEFAULT_EXAMS } from "@/lib/api";

function useClickOutside(ref, cb) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

function AppSınavlarMenu({ exams, onClose }) {
  const [activeCat, setActiveCat] = useState("universite");

  const categories = [
    { key: "universite", label: "Üniversite & Lisansüstü", icon: "🎓", badge: "YKS / ALES / DGS" },
    { key: "kpss", label: "KPSS & Kariyer", icon: "💼", badge: "Lisans / Alan / Eğitim" },
    { key: "saglik", label: "Sağlık & Tıp", icon: "🩺", badge: "TUS / DUS" },
    { key: "mesleki", label: "Mesleki & Hukuk", icon: "⚖️", badge: "SMMM / Hakimlik" },
    { key: "dil", label: "Yabancı Dil", icon: "🌍", badge: "YDS / YÖKDİL" },
    { key: "ortaokul", label: "MEB & Lise Giriş", icon: "🎒", badge: "LGS / MSÜ" },
  ];

  const filteredExams = exams.filter((e) => {
    if (activeCat === "ortaokul") return e.category === "ortaokul" || e.category === "askeri";
    return e.category === activeCat;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="absolute top-full left-0 mt-2 w-[580px] max-w-[92vw] bg-white rounded-2xl border border-zinc-200 shadow-2xl p-3.5 z-50 overflow-hidden"
    >
      <div className="grid grid-cols-12 gap-3">
        {/* Sol Kategori Listesi */}
        <div className="col-span-5 bg-zinc-50 rounded-xl p-1.5 space-y-1 border border-zinc-100">
          <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Kategoriler</div>
          {categories.map((cat) => {
            const isActive = activeCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onMouseEnter={() => setActiveCat(cat.key)}
                onClick={() => setActiveCat(cat.key)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all ${
                  isActive
                    ? "bg-white text-ink shadow-sm border border-zinc-200 font-bold"
                    : "text-zinc-600 hover:bg-white/60 hover:text-ink font-medium"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-sm">{cat.icon}</span>
                  <span className="text-xs truncate">{cat.label}</span>
                </div>
                <ChevronRight size={12} className={`shrink-0 transition-transform ${isActive ? "text-subject-matematik translate-x-0.5" : "text-zinc-300"}`} />
              </button>
            );
          })}
        </div>

        {/* Sağ Sınav Listesi */}
        <div className="col-span-7 flex flex-col justify-between pl-1">
          <div>
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-100">
              <span className="text-xs font-bold text-ink">
                {categories.find((c) => c.key === activeCat)?.label} Sınavları
              </span>
              <span className="text-[11px] text-zinc-400 font-semibold">{filteredExams.length} Sınav</span>
            </div>

            <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
              {filteredExams.map((exam) => (
                <div
                  key={exam.id || exam.name}
                  className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all"
                >
                  <div className="truncate mr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-ink group-hover:text-subject-matematik transition-colors">{exam.name}</span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500">{exam.exam_type}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">{exam.description || "Resmi ÖSYM müfredatı & testler"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <NavLink
                      to={`/app/soru-bankasi?exam_id=${exam.id}`}
                      onClick={onClose}
                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-ink hover:text-white text-[10px] font-bold text-zinc-600 transition-colors"
                      title="Soru Bankası"
                    >
                      Sorular
                    </NavLink>
                    <NavLink
                      to={`/app/ders-notlari?exam_id=${exam.id}`}
                      onClick={onClose}
                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-subject-matematik hover:text-white text-[10px] font-bold text-zinc-600 transition-colors"
                      title="Ders Notları"
                    >
                      Notlar
                    </NavLink>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 mt-1.5 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <NavLink to="/app/puan-hesapla" onClick={onClose} className="text-subject-matematik font-bold flex items-center gap-1 hover:underline">
              <Calculator size={12} /> Puan Hesapla
            </NavLink>
            <NavLink to="/app/tercih-robotu" onClick={onClose} className="text-zinc-500 font-medium flex items-center gap-1 hover:text-ink">
              <Compass size={12} /> Tercih Robotu &rarr;
            </NavLink>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AppDerslerMenu({ onClose }) {
  const popularSubjects = [
    { name: "Temel Matematik", tag: "Mat-1", color: "bg-blue-50 text-blue-700" },
    { name: "İleri Matematik & Geometri", tag: "Mat-2", color: "bg-indigo-50 text-indigo-700" },
    { name: "Türkçe & Dil Bilgisi", tag: "Türkçe", color: "bg-emerald-50 text-emerald-700" },
    { name: "Türk Dili ve Edebiyatı", tag: "Edebiyat", color: "bg-amber-50 text-amber-700" },
    { name: "Fizik", tag: "Fen", color: "bg-purple-50 text-purple-700" },
    { name: "Kimya", tag: "Fen", color: "bg-pink-50 text-pink-700" },
    { name: "Biyoloji", tag: "Fen", color: "bg-teal-50 text-teal-700" },
    { name: "Tarih & İnkılap", tag: "Sosyal", color: "bg-rose-50 text-rose-700" },
    { name: "Coğrafya & Vatandaşlık", tag: "Sosyal", color: "bg-sky-50 text-sky-700" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="absolute top-full left-0 mt-2 w-[480px] max-w-[92vw] bg-white rounded-2xl border border-zinc-200 shadow-2xl p-3.5 z-50 overflow-hidden"
    >
      {/* 3 Ana Modül Kartı */}
      <div className="grid grid-cols-3 gap-2 pb-2.5 mb-2.5 border-b border-zinc-100">
        <NavLink
          to="/app/ders-notlari"
          onClick={onClose}
          className="group p-2 rounded-xl bg-zinc-50 hover:bg-subject-matematik/10 border border-zinc-100 hover:border-subject-matematik/30 transition-all text-center"
        >
          <div className="h-7 w-7 rounded-lg bg-white shadow-sm mx-auto mb-1 grid place-items-center text-subject-matematik group-hover:scale-110 transition-transform">
            <BookOpen size={14} />
          </div>
          <div className="font-bold text-xs text-ink group-hover:text-subject-matematik transition-colors">Ders Notları</div>
          <div className="text-[10px] text-zinc-400 truncate mt-0.5">Konu özetleri</div>
        </NavLink>

        <NavLink
          to="/app/soru-bankasi"
          onClick={onClose}
          className="group p-2 rounded-xl bg-zinc-50 hover:bg-subject-fen/10 border border-zinc-100 hover:border-subject-fen/30 transition-all text-center"
        >
          <div className="h-7 w-7 rounded-lg bg-white shadow-sm mx-auto mb-1 grid place-items-center text-subject-fen group-hover:scale-110 transition-transform">
            <Target size={14} />
          </div>
          <div className="font-bold text-xs text-ink group-hover:text-subject-fen transition-colors">Soru Bankası</div>
          <div className="text-[10px] text-zinc-400 truncate mt-0.5">Çözümlü testler</div>
        </NavLink>

        <NavLink
          to="/app/eksiklerim"
          onClick={onClose}
          className="group p-2 rounded-xl bg-zinc-50 hover:bg-subject-turkce/10 border border-zinc-100 hover:border-subject-turkce/30 transition-all text-center"
        >
          <div className="h-7 w-7 rounded-lg bg-white shadow-sm mx-auto mb-1 grid place-items-center text-subject-turkce group-hover:scale-110 transition-transform">
            <Sparkles size={14} />
          </div>
          <div className="font-bold text-xs text-ink group-hover:text-subject-turkce transition-colors">Eksiklerim</div>
          <div className="text-[10px] text-zinc-400 truncate mt-0.5">Zayıf konu analizi</div>
        </NavLink>
      </div>

      {/* Popüler Dersler */}
      <div>
        <div className="px-1 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">
          Popüler Branşlar & Müfredat
        </div>
        <div className="grid grid-cols-3 gap-1">
          {popularSubjects.map((sub) => (
            <NavLink
              key={sub.name}
              to="/app/ders-notlari"
              onClick={onClose}
              className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all text-xs font-medium text-zinc-700 hover:text-ink"
            >
              <span className="truncate mr-1">{sub.name}</span>
              <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${sub.color}`}>{sub.tag}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function DropdownLink({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-3.5 py-2 text-xs rounded-xl font-medium transition-colors ${
          isActive ? "bg-subject-matematik/10 text-subject-matematik font-bold" : "text-zinc-700 hover:bg-zinc-50 hover:text-ink"
        }`
      }
    >
      {children}
    </NavLink>
  );
}
function DropdownMenu({ label, icon: Icon, active, children, onOpen, onClose }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);

  return (
    <div className="relative" ref={ref} onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        onClick={() => (active ? onClose() : onOpen())}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
          active
            ? "bg-zinc-100 text-subject-matematik"
            : "text-zinc-600 hover:text-ink hover:bg-zinc-100/70"
        }`}
      >
        {Icon && <Icon size={16} />}
        {label}
        <ChevronDown size={13} className={`transition-transform duration-200 ${active ? "rotate-180 text-subject-matematik" : "text-zinc-400"}`} />
      </button>
      <AnimatePresence>
        {active && children}
      </AnimatePresence>
    </div>
  );
}

function DropdownGroup({ label, children }) {
  return (
    <div className="py-1">
      <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">{label}</div>
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
  const [exams, setExams] = useState(DEFAULT_EXAMS);
  const [openMenu, setOpenMenu] = useState(null); // 'sinavlar' | 'dersler' | 'araclar' | 'ai' | null
  const menuTimerRef = useRef(null);
  const [credits, setCredits] = useState(null);

  const handleMouseEnter = (name) => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    setOpenMenu(name);
  };

  const handleMouseLeave = () => {
    menuTimerRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 180);
  };

  useEffect(() => {
    fetchExams().then((data) => {
      if (Array.isArray(data) && data.length > 0) setExams(data);
    }).catch(() => {});
  }, []);

  const refreshCredits = useCallback(() => {
    if (!user) return;
    fetchCreditBalance().then(r => setCredits(r.balance)).catch(() => {});
  }, [user]);

  useEffect(() => { refreshCredits(); }, [refreshCredits]);

  const doLogout = async () => { await logout(); nav("/"); };

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-ink text-white" : "text-zinc-600 hover:bg-black/5"}`;

  const headerCls = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${isActive ? "bg-zinc-100 text-subject-matematik" : "text-zinc-600 hover:text-ink hover:bg-zinc-100/70"}`;

  return (
    <div className="min-h-screen bg-paper">
      {/* Top header with dropdown menus */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-xs">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-1">
            <NavLink to={user ? "/app" : "/"} className="flex items-center gap-2 mr-3">
              <span className="h-7 w-7 rounded-lg bg-subject-matematik grid place-items-center"><Sparkles size={14} className="text-white" /></span>
              <span className="font-heading font-extrabold text-lg hidden sm:block">HedefMatik</span>
            </NavLink>
            <Link to="/" className="hidden sm:flex items-center gap-1 text-sm text-zinc-500 hover:text-ink mr-2 transition-colors">
              <Home size={15} /> Ana Sayfa
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {/* Dashboard */}
              <NavLink to="/app" end className={headerCls}><LayoutDashboard size={16} /> Dashboard</NavLink>

              {/* Sınavlar Mega Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter("sinavlar")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu((m) => (m === "sinavlar" ? null : "sinavlar"))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    openMenu === "sinavlar"
                      ? "bg-zinc-100 text-subject-matematik"
                      : "text-zinc-600 hover:text-ink hover:bg-zinc-100/70"
                  }`}
                >
                  <GraduationCap size={16} /> Sınavlar
                  <ChevronDown size={13} className={`transition-transform duration-200 ${openMenu === "sinavlar" ? "rotate-180 text-subject-matematik" : "text-zinc-400"}`} />
                </button>

                <AnimatePresence>
                  {openMenu === "sinavlar" && (
                    <AppSınavlarMenu exams={exams} onClose={() => setOpenMenu(null)} />
                  )}
                </AnimatePresence>
              </div>

              {/* Denemeler */}
              <NavLink to="/app/denemeler" className={headerCls}><FileText size={16} /> Denemeler</NavLink>

              {/* Dersler Mega Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter("dersler")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu((m) => (m === "dersler" ? null : "dersler"))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    openMenu === "dersler"
                      ? "bg-zinc-100 text-subject-matematik"
                      : "text-zinc-600 hover:text-ink hover:bg-zinc-100/70"
                  }`}
                >
                  <BookCopy size={16} /> Dersler
                  <ChevronDown size={13} className={`transition-transform duration-200 ${openMenu === "dersler" ? "rotate-180 text-subject-matematik" : "text-zinc-400"}`} />
                </button>

                <AnimatePresence>
                  {openMenu === "dersler" && (
                    <AppDerslerMenu onClose={() => setOpenMenu(null)} />
                  )}
                </AnimatePresence>
              </div>

              {/* Araclar dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter("araclar")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu((m) => (m === "araclar" ? null : "araclar"))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    openMenu === "araclar"
                      ? "bg-zinc-100 text-subject-matematik"
                      : "text-zinc-600 hover:text-ink hover:bg-zinc-100/70"
                  }`}
                >
                  <Calculator size={16} /> Araçlar
                  <ChevronDown size={13} className={`transition-transform duration-200 ${openMenu === "araclar" ? "rotate-180 text-subject-matematik" : "text-zinc-400"}`} />
                </button>

                <AnimatePresence>
                  {openMenu === "araclar" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl border border-zinc-200 shadow-2xl p-2 z-50"
                    >
                      <DropdownLink to="/app/puan-hesapla" onClick={() => setOpenMenu(null)}>
                        <div className="flex items-center gap-2">
                          <Calculator size={15} className="text-subject-matematik" />
                          <div>
                            <div className="font-bold text-xs">Puan Hesapla</div>
                            <div className="text-[10px] text-zinc-400">Tüm sınavlar için canlı hesaplama</div>
                          </div>
                        </div>
                      </DropdownLink>
                      <DropdownLink to="/app/tercih-robotu" onClick={() => setOpenMenu(null)}>
                        <div className="flex items-center gap-2">
                          <Compass size={15} className="text-subject-fen" />
                          <div>
                            <div className="font-bold text-xs">Tercih Robotu</div>
                            <div className="text-[10px] text-zinc-400">81 il üniversite ve taban puanlar</div>
                          </div>
                        </div>
                      </DropdownLink>
                      <DropdownLink to="/app/geri-sayim" onClick={() => setOpenMenu(null)}>
                        <div className="flex items-center gap-2">
                          <Clock size={15} className="text-subject-turkce" />
                          <div>
                            <div className="font-bold text-xs">Geri Sayım</div>
                            <div className="text-[10px] text-zinc-400">ÖSYM & MEB sınav takvim sayacı</div>
                          </div>
                        </div>
                      </DropdownLink>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* AI Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter("ai")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu((m) => (m === "ai" ? null : "ai"))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    openMenu === "ai"
                      ? "bg-zinc-100 text-subject-matematik"
                      : "text-zinc-600 hover:text-ink hover:bg-zinc-100/70"
                  }`}
                >
                  <Brain size={16} /> AI Asistan
                  <ChevronDown size={13} className={`transition-transform duration-200 ${openMenu === "ai" ? "rotate-180 text-subject-matematik" : "text-zinc-400"}`} />
                </button>

                <AnimatePresence>
                  {openMenu === "ai" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full left-0 mt-2 w-52 bg-white rounded-2xl border border-zinc-200 shadow-2xl p-2 z-50"
                    >
                      <DropdownLink to="/app/ai-koc" onClick={() => setOpenMenu(null)}>
                        <div className="flex items-center gap-2">
                          <Brain size={15} className="text-subject-matematik" />
                          <div>
                            <div className="font-bold text-xs">AI Koç</div>
                            <div className="text-[10px] text-zinc-400">Kişiselleştirilmiş analiz</div>
                          </div>
                        </div>
                      </DropdownLink>
                      <DropdownLink to="/app/ai-sohbet" onClick={() => setOpenMenu(null)}>
                        <div className="flex items-center gap-2">
                          <MessageSquare size={15} className="text-subject-fen" />
                          <div>
                            <div className="font-bold text-xs">AI Sohbet</div>
                            <div className="text-[10px] text-zinc-400">7/24 soru ve konu danışmanı</div>
                          </div>
                        </div>
                      </DropdownLink>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Diger */}
              <NavLink to="/app/siralama" className={headerCls}><Trophy size={16} /> Sıralama</NavLink>
              <NavLink to="/app/rozetler" className={headerCls}><Award size={16} /> Rozetler</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Kredi Göstergesi */}
                {credits !== null && (
                  <NavLink
                    to="/app/kredi-al"
                    className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      credits <= 15
                        ? "bg-red-50 text-red-600 border border-red-200 animate-pulse"
                        : "bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100"
                    }`}
                  >
                    <Zap size={13} />
                    {credits} Kredi
                  </NavLink>
                )}
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

      {/* Düşük Kredi Uyarı Bandı */}
      <AnimatePresence>
        {user && credits !== null && credits > 0 && credits <= 15 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-200 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-2 text-xs text-amber-800">
              <span className="flex items-center gap-1.5 font-medium">
                <Zap size={13} className="text-amber-600" />
                Krediniz tükenmek üzere ({credits} kredi kaldı). Sınav maratonunda yarı yolda kalmayın!
              </span>
              <NavLink to="/app/kredi-al" className="font-bold underline hover:text-amber-900">Kredi Yükle →</NavLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  ["/app", "Dashboard", LayoutDashboard, true],
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
          { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
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
