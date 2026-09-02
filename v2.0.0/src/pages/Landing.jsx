import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight, ArrowRight, Target, Brain, LineChart, BookOpen,
  Trophy, Repeat, Sparkles, CheckCircle2, GraduationCap, ChevronDown, ChevronRight,
  Calculator, Compass, Clock, BookCopy, Library, GraduationCap as GradIcon,
} from "lucide-react";
import { SUBJECT_TONES } from "@/lib/subjects";
import { fetchExams, fetchSubjects, EXAM_CATEGORIES, DEFAULT_EXAMS } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const EASE = [0.16, 1, 0.3, 1];

const HERO_IMG = "https://images.unsplash.com/photo-1728455635901-bb16530faf40?crop=entropy&cs=srgb&fm=jpg&q=85";
const ANALYSIS_IMG = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=srgb&fm=jpg&q=85";
const LIBRARY_IMG = "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?crop=entropy&cs=srgb&fm=jpg&q=85";

const Reveal = ({ children, delay = 0, y = 26, className = "" }) => (
  <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-70px" }} transition={{ duration: 0.75, delay, ease: EASE }}>
    {children}
  </motion.div>
);

const MaskedLine = ({ children, delay = 0 }) => (
  <span className="block overflow-hidden pb-[0.12em]">
    <motion.span className="block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 1, delay, ease: EASE }}>
      {children}
    </motion.span>
  </span>
);

const EXAMS = ["YKS", "TYT", "AYT", "KPSS", "TUS", "DUS", "ALES", "DGS", "YDS", "YÖKDİL", "ÖABT", "Kaymakamlık", "İSG", "MEB-AGS"];

const CHAPTERS = [
  { n: "01", t: "Soru Çöz", d: "Ders, konu ve zorluk bazlı binlerce soru. Her cevabın tek tek kaydedilir.", icon: BookOpen, slug: "matematik" },
  { n: "02", t: "Analiz Edilsin", d: "Doğru/yanlış/boş, süre ve zorluk birlikte değerlendirilir.", icon: LineChart, slug: "fen" },
  { n: "03", t: "Eksiğin Bulunsun", d: "Her konu için yeterlilik skoru: İyi, Geliştirilmeli, Kritik Eksik.", icon: Target, slug: "turkce" },
  { n: "04", t: "Ders Notuna Git", d: "Zayıf konuda otomatik olarak doğru ders notuna yönlendirilirsin.", icon: GraduationCap, slug: "sosyal" },
  { n: "05", t: "Tekrar Çöz", d: "Yanlışlarını ve boşlarını hedefli tekrar setleriyle kapat.", icon: Repeat, slug: "matematik" },
  { n: "06", t: "Gelişimini Ölç", d: "7 ve 30 günlük trend grafiklerinle ilerlemeni gör.", icon: Trophy, slug: "fen" },
  { n: "07", t: "AI Önerisi Al", d: "Gerçek verine dayalı kişisel çalışma planı.", icon: Brain, slug: "ai" },
];

function useClickOutside(ref, cb) {
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

function SınavlarMegaMenu({ exams, onClose }) {
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
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[620px] max-w-[92vw] bg-white/95 backdrop-blur-xl rounded-3xl border border-zinc-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-4 z-50 overflow-hidden"
    >
      <div className="grid grid-cols-12 gap-3">
        {/* Sol Kategori Listesi */}
        <div className="col-span-5 bg-zinc-50/80 rounded-2xl p-1.5 space-y-1 border border-zinc-100">
          <div className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Kategoriler</div>
          {categories.map((cat) => {
            const isActive = activeCat === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onMouseEnter={() => setActiveCat(cat.key)}
                onClick={() => setActiveCat(cat.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? "bg-white text-ink shadow-sm border border-zinc-200/80 font-bold"
                    : "text-zinc-600 hover:bg-white/60 hover:text-ink font-medium"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-xs truncate">{cat.label}</span>
                </div>
                <ChevronRight size={13} className={`shrink-0 transition-transform ${isActive ? "text-subject-matematik translate-x-0.5" : "text-zinc-300"}`} />
              </button>
            );
          })}
        </div>

        {/* Sağ Sınav Kartları */}
        <div className="col-span-7 flex flex-col justify-between pl-1">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
              <span className="text-xs font-bold text-ink">
                {categories.find((c) => c.key === activeCat)?.label} Sınavları
              </span>
              <span className="text-[11px] text-zinc-400 font-semibold">{filteredExams.length} Sınav</span>
            </div>

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {filteredExams.map((exam) => (
                <div
                  key={exam.id || exam.name}
                  className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200/60 transition-all"
                >
                  <div className="truncate mr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-ink group-hover:text-subject-matematik transition-colors">{exam.name}</span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500">{exam.exam_type}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">{exam.description || "Resmi ÖSYM müfredatı & testler"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to={`/app/soru-bankasi?exam_id=${exam.id}`}
                      onClick={onClose}
                      className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-ink hover:text-white text-[11px] font-bold text-zinc-600 transition-colors"
                      title="Soru Bankası"
                    >
                      Sorular
                    </Link>
                    <Link
                      to={`/app/ders-notlari?exam_id=${exam.id}`}
                      onClick={onClose}
                      className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-subject-matematik hover:text-white text-[11px] font-bold text-zinc-600 transition-colors"
                      title="Ders Notları"
                    >
                      Notlar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
            <Link to="/app/puan-hesapla" onClick={onClose} className="text-subject-matematik font-bold flex items-center gap-1 hover:underline">
              <Calculator size={13} /> Puanını Hesapla
            </Link>
            <Link to="/app/tercih-robotu" onClick={onClose} className="text-zinc-500 font-medium flex items-center gap-1 hover:text-ink">
              <Compass size={13} /> Tercih Robotu &rarr;
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DerslerMegaMenu({ onClose }) {
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
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[520px] max-w-[92vw] bg-white/95 backdrop-blur-xl rounded-3xl border border-zinc-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-4 z-50 overflow-hidden"
    >
      {/* 3 Ana Modül Kartı */}
      <div className="grid grid-cols-3 gap-2 pb-3 mb-3 border-b border-zinc-100">
        <Link
          to="/app/ders-notlari"
          onClick={onClose}
          className="group p-2.5 rounded-2xl bg-zinc-50 hover:bg-subject-matematik/10 border border-zinc-100 hover:border-subject-matematik/30 transition-all text-center"
        >
          <div className="h-8 w-8 rounded-xl bg-white shadow-sm mx-auto mb-1.5 grid place-items-center text-subject-matematik group-hover:scale-110 transition-transform">
            <BookOpen size={16} />
          </div>
          <div className="font-bold text-xs text-ink group-hover:text-subject-matematik transition-colors">Ders Notları</div>
          <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">Konu özetleri</div>
        </Link>

        <Link
          to="/app/soru-bankasi"
          onClick={onClose}
          className="group p-2.5 rounded-2xl bg-zinc-50 hover:bg-subject-fen/10 border border-zinc-100 hover:border-subject-fen/30 transition-all text-center"
        >
          <div className="h-8 w-8 rounded-xl bg-white shadow-sm mx-auto mb-1.5 grid place-items-center text-subject-fen group-hover:scale-110 transition-transform">
            <CheckCircle2 size={16} />
          </div>
          <div className="font-bold text-xs text-ink group-hover:text-subject-fen transition-colors">Soru Bankası</div>
          <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">Çözümlü testler</div>
        </Link>

        <Link
          to="/app/eksiklerim"
          onClick={onClose}
          className="group p-2.5 rounded-2xl bg-zinc-50 hover:bg-subject-turkce/10 border border-zinc-100 hover:border-subject-turkce/30 transition-all text-center"
        >
          <div className="h-8 w-8 rounded-xl bg-white shadow-sm mx-auto mb-1.5 grid place-items-center text-subject-turkce group-hover:scale-110 transition-transform">
            <Target size={16} />
          </div>
          <div className="font-bold text-xs text-ink group-hover:text-subject-turkce transition-colors">Eksiklerim</div>
          <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">Zayıf konu analizi</div>
        </Link>
      </div>

      {/* Popüler Dersler */}
      <div>
        <div className="px-1 py-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">
          Popüler Branşlar & Müfredat
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {popularSubjects.map((sub) => (
            <Link
              key={sub.name}
              to="/app/ders-notlari"
              onClick={onClose}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200/60 transition-all text-xs font-medium text-zinc-700 hover:text-ink"
            >
              <span className="truncate mr-1">{sub.name}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${sub.color}`}>{sub.tag}</span>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [exams, setExams] = useState(DEFAULT_EXAMS);
  const [openMenu, setOpenMenu] = useState(null); // 'sinavlar' | 'dersler' | null
  const menuTimerRef = useRef(null);
  const navRef = useRef(null);

  useClickOutside(navRef, () => setOpenMenu(null));

  const handleMouseEnter = (menuName) => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    setOpenMenu(menuName);
  };

  const handleMouseLeave = () => {
    menuTimerRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 180);
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/blog?limit=3`)
      .then((res) => res.json())
      .then((data) => setBlogs(data || []))
      .catch(() => {});
  }, []);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const badgeY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  useEffect(() => {
    fetchExams().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setExams(data);
      }
    }).catch(() => {});

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  return (
    <div className="grain relative bg-paper text-ink font-sans">
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 mt-4">
          <div ref={navRef} className="glass rounded-full border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex items-center justify-between pl-5 pr-2 py-2 relative">
            {/* Logo */}
            <Link to="/" data-testid="logo-home" className="flex items-center gap-2 shrink-0">
              <span className="h-7 w-7 rounded-lg bg-subject-matematik grid place-items-center"><Sparkles size={15} className="text-white" /></span>
              <span className="font-heading font-extrabold text-lg tracking-tight">HedefMatik</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="flex items-center gap-1 text-sm">
              {/* Sınavlar Mega Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter("sinavlar")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu((m) => (m === "sinavlar" ? null : "sinavlar"))}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    openMenu === "sinavlar"
                      ? "bg-zinc-100 text-subject-matematik"
                      : "text-zinc-600 hover:text-ink hover:bg-zinc-100/70"
                  }`}
                >
                  <GradIcon size={15} /> Sınavlar
                  <ChevronDown size={13} className={`transition-transform duration-200 ${openMenu === "sinavlar" ? "rotate-180 text-subject-matematik" : "text-zinc-400"}`} />
                </button>

                <AnimatePresence>
                  {openMenu === "sinavlar" && (
                    <SınavlarMegaMenu exams={exams} onClose={() => setOpenMenu(null)} />
                  )}
                </AnimatePresence>
              </div>

              {/* Dersler Mega Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter("dersler")}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu((m) => (m === "dersler" ? null : "dersler"))}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    openMenu === "dersler"
                      ? "bg-zinc-100 text-subject-matematik"
                      : "text-zinc-600 hover:text-ink hover:bg-zinc-100/70"
                  }`}
                >
                  <BookCopy size={15} /> Dersler
                  <ChevronDown size={13} className={`transition-transform duration-200 ${openMenu === "dersler" ? "rotate-180 text-subject-matematik" : "text-zinc-400"}`} />
                </button>

                <AnimatePresence>
                  {openMenu === "dersler" && (
                    <DerslerMegaMenu onClose={() => setOpenMenu(null)} />
                  )}
                </AnimatePresence>
              </div>

              {/* Puan Hesapla */}
              <Link
                to="/app/puan-hesapla"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-zinc-600 hover:text-ink hover:bg-zinc-100/70 transition-colors"
              >
                <Calculator size={15} className="text-zinc-500" /> Puan Hesapla
              </Link>

              {/* Tercih Robotu */}
              <Link
                to="/app/tercih-robotu"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-zinc-600 hover:text-ink hover:bg-zinc-100/70 transition-colors"
              >
                <Compass size={15} className="text-zinc-500" /> Tercih Robotu
              </Link>

              {/* Geri Sayım */}
              <Link
                to="/app/geri-sayim"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-zinc-600 hover:text-ink hover:bg-zinc-100/70 transition-colors"
              >
                <Clock size={15} className="text-zinc-500" /> Geri Sayım
              </Link>
            </nav>

            {/* Auth CTAs */}
            <div className="flex items-center gap-2">
              {user ? (
                <Link to="/app" className="group text-sm font-semibold px-5 py-2.5 rounded-full bg-ink text-white flex items-center gap-1.5 hover:bg-subject-matematik transition-colors shadow-sm">
                  Uygulamaya Git<ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link to="/login" data-testid="nav-login" className="hidden sm:inline text-sm font-semibold px-4 py-2 rounded-full text-zinc-700 hover:bg-black/5 transition-colors">Giriş</Link>
                  <Link to="/onboarding" data-testid="nav-register" className="group text-sm font-semibold px-5 py-2.5 rounded-full bg-ink text-white flex items-center gap-1.5 hover:bg-subject-matematik transition-colors shadow-sm">
                    Ücretsiz Başla<ArrowUpRight size={15} className="group-hover:rotate-45 transition-transform" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section ref={heroRef} className="relative pt-36 sm:pt-44 pb-16 overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 border border-zinc-300 rounded-full px-3 py-1.5 mb-7">
                <span className="h-1.5 w-1.5 rounded-full bg-subject-fen animate-pulse" />
                Türkiye'nin sınav hazırlık platformu
              </motion.div>
              <h1 className="font-heading font-extrabold tracking-tighter leading-[1.05] text-5xl sm:text-6xl lg:text-7xl">
                <MaskedLine delay={0.05}>Zayıf konunu</MaskedLine>
                <MaskedLine delay={0.18}><span className="italic font-editorial font-medium text-subject-matematik">bul</span>, doğru</MaskedLine>
                <MaskedLine delay={0.31}>soruyu çöz.</MaskedLine>
              </h1>
              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7, ease: EASE }} className="mt-7 text-lg text-zinc-600 max-w-md leading-relaxed">
                Deneme çöz, sonucun analiz edilsin, eksik konuların otomatik bulunsun ve ders notlarıyla kapat. Sadece soru çözmek değil — gerçek gelişim.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.68, duration: 0.7, ease: EASE }} className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/onboarding" data-testid="hero-cta" className="group px-7 py-3.5 rounded-full bg-ink text-white font-semibold flex items-center gap-2 hover:bg-subject-matematik transition-colors">
                  Hemen başla<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#dongu" className="px-7 py-3.5 rounded-full border border-zinc-300 font-semibold hover:border-ink transition-colors">Nasıl çalışır?</a>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.8 }} className="mt-10 flex items-center gap-6 text-sm text-zinc-500">
                <div><span className="font-heading font-bold text-ink text-xl">20+</span> Sınav Türü</div>
                <div className="h-8 w-px bg-zinc-200" />
                <div><span className="font-heading font-bold text-ink text-xl">2026</span> Güncel Müfredat</div>
                <div className="h-8 w-px bg-zinc-200" />
                <div><span className="font-heading font-bold text-ink text-xl">%100</span> Kişiselleştirilmiş</div>
              </motion.div>
            </div>
            <div className="lg:col-span-5 relative">
              <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 1, ease: EASE }} className="relative">
                <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 shadow-[0_30px_80px_rgba(0,0,0,0.12)]" style={{ aspectRatio: "4/5" }}>
                  <motion.img src={HERO_IMG} alt="Odaklanmış öğrenci" style={{ y: imgY, scale: imgScale }} className="absolute inset-0 h-[115%] w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                </div>
                <motion.div style={{ y: badgeY }} className="absolute -left-5 top-10 glass rounded-2xl border border-white/60 shadow-xl p-4 w-48 animate-floaty">
                  <div className="text-xs text-zinc-500 font-medium">Fonksiyonlar & Grafikler</div>
                  <div className="font-heading font-bold text-2xl text-subject-matematik">%84</div>
                  <div className="text-[11px] font-bold text-emerald-600">Güçlü Seviye ↑</div>
                </motion.div>
                <motion.div style={{ y: useTransform(scrollYProgress, [0, 1], [0, -110]) }} className="absolute -right-4 bottom-12 glass rounded-2xl border border-white/60 shadow-xl p-4 w-44">
                  <div className="text-xs text-zinc-500 font-medium">Sayı Problemleri</div>
                  <div className="font-heading font-bold text-2xl text-rose-600">%38</div>
                  <div className="text-[11px] font-bold text-rose-600">Kritik Eksik (Öncelikli)</div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative border-y border-zinc-200 py-6 bg-white/40 overflow-hidden">
        <div className="marquee-track">
          {[...EXAMS, ...EXAMS].map((e, i) => (
            <span key={i} className="flex items-center gap-10 px-10 whitespace-nowrap">
              <span className="font-editorial italic text-3xl sm:text-4xl text-zinc-800">{e}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-subject-matematik" />
            </span>
          ))}
        </div>
      </div>

      {/* ─── 3 ADIMDA BAŞARI DÖNGÜSÜ ─── */}
      <section id="dongu" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <div className="font-editorial italic text-subject-matematik text-lg mb-3">— nasıl çalışır?</div>
              <h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[1.02]">
                Rastgele soru çözme.<br /><span className="text-zinc-400">3 adımda netlerini artır.</span>
              </h2>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-3 gap-6">
            <Reveal delay={0.05}>
              <div className="h-full rounded-3xl bg-white border border-zinc-200 p-8 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center font-heading font-extrabold text-xl mb-6">
                  1
                </div>
                <h3 className="font-heading font-bold text-xl text-zinc-900">Seviyeni Belirle</h3>
                <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
                  15-20 soruluk adaptif teşhis testiyle tüm derslerdeki güçlü ve zayıf konularını nokta atışı çıkar.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="h-full rounded-3xl bg-white border border-zinc-200 p-8 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center font-heading font-extrabold text-xl mb-6">
                  2
                </div>
                <h3 className="font-heading font-bold text-xl text-zinc-900">Bugünün Planını Uygula</h3>
                <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
                  Kişisel kapasitene göre hazırlanan günlük 5 net görevi (özet, soru pratiği, paragraf rutini) tamamla.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="h-full rounded-3xl bg-white border border-zinc-200 p-8 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center font-heading font-extrabold text-xl mb-6">
                  3
                </div>
                <h3 className="font-heading font-bold text-xl text-zinc-900">Yanlışlarını Kapat</h3>
                <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
                  Yanlış Defteri üzerinden hatalarını sınıflandır (dikkat, bilgi, işlem) ve aralıklı tekrarla eksiklerini sıfırla.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── ÖZELLİKLER VE YETERLİLİK MOTORU ─── */}
      <section id="ozellikler" className="relative py-20 bg-zinc-50 border-y border-zinc-200">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 shadow-xl" style={{ aspectRatio: "5/4" }}>
              <img src={ANALYSIS_IMG} alt="Analiz" className="h-full w-full object-cover" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              <div className="font-editorial italic text-subject-turkce text-lg mb-3">— ölçme & yeterlilik motoru</div>
              <h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl leading-[1.05] mb-6">
                Sadece doğru/yanlış değil.<br />Bilimsel Yeterlilik Analizi.
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-6 text-sm">
                Soru zorluk katsayıları (kolay, orta, zor), çözüm süresi, hata nedenleri ve Ebbinghaus unutma eğrisi birlikte değerlendirilir. Her konuya 0-100 arasında güvenilir bir <b>yeterlilik skoru</b> verilir.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm">
                {[
                  "Kritik Eksik (<%40), Geliştirilmeli (%40-%64), Güçlü (%65+) sınıflandırması",
                  "Ölçüm Güven Seviyesi (Düşük / Orta / Yüksek güvenilirlik rozetleri)",
                  "Zaman aşımı ve unutma riski tespitiyle otomatik aralıklı tekrar alarmı",
                  "Hata Nedenleri Analizi (Bilgi eksikliği, dikkat hatası, işlem hatası)",
                  "Doğrudan ilgili ders notuna ve pekiştirme sorularına tek tıkla yönlendirme"
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-zinc-700">
                    <CheckCircle2 size={17} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── SIKÇA SORULAN SORULAR (SSS / FAQ) ─── */}
      <section id="sss" className="relative py-24 bg-white">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <Reveal>
            <div className="text-center max-w-xl mx-auto mb-14">
              <div className="font-editorial italic text-indigo-600 text-lg mb-2">— merak edilenler</div>
              <h2 className="font-heading font-extrabold tracking-tight text-3xl sm:text-4xl text-zinc-900">
                Sıkça Sorulan Sorular
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-2">
                HedefMatik'in çalışma mantığı ve sınav hazırlık süreci hakkında bilmeniz gerekenler.
              </p>
            </div>
          </Reveal>

          <div className="space-y-4">
            {[
              {
                q: "HedefMatik sıradan bir soru bankasından nasıl farklıdır?",
                a: "HedefMatik sıradan bir içerik deposu değildir. Önce seviyenizi teşhis eder, her gün kapasitenize göre 'Bugünün Planı' görevlerini belirler ve çözdüğünüz her sorunun analizini tutarak aralıklı tekrarla eksiklerinizi kapatır."
              },
              {
                q: "Seviye tespit testini çözmek için kayıt olmak zorunda mıyım?",
                a: "Hayır! Seviye tespit testini kayıtsız olarak çözebilir, eksik konu analizlerinizi ve 7 günlük kişisel çalışma planınızı ücretsiz görebilirsiniz. Sonuçlarınızı kaydetmek istediğinizde tek tıkla ücretsiz hesap oluşturabilirsiniz."
              },
              {
                q: "Sorular 2026 ÖSYM ve MEB müfredatına uygun mu?",
                a: "Evet. Tüm sorular, konular, alt kazanımlar ve soru dağılımları 2026 ÖSYM & MEB güncel müfredat standartlarına tam uyumlu olarak hazırlanır ve denetlenir."
              },
              {
                q: "Yanlış Defteri sistemi netlerimi nasıl artırır?",
                a: "Denemelerde veya soru çözerken yaptığınız hataları 'Bilgi Eksikliği', 'Dikkat Hatası', 'İşlem Hatası' gibi kategorilere ayırarak kaydeder. Sistem, unuttuğunuz konuları aralıklı tekrar algoritmasıyla periyodik olarak önünüze getirir."
              },
              {
                q: "AI Koç bana nasıl yardımcı olur?",
                a: "AI Koç, genel motivasyon cümleleri yerine gerçek netlerinize, çözme sürelerinize ve en zayıf konularınıza bakarak 'Bugün hangi konudan kaç soru çözmelisin?' sorusuna nokta atışı stratejik yanıt verir."
              }
            ].map((faq, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <details className="group bg-zinc-50 rounded-2xl p-5 border border-zinc-200 open:bg-indigo-50/30 open:border-indigo-200 transition">
                  <summary className="font-heading font-bold text-sm sm:text-base text-zinc-900 cursor-pointer list-none flex items-center justify-between gap-4">
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className="text-zinc-400 group-open:rotate-180 transition-transform shrink-0" />
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm text-zinc-600 leading-relaxed pt-2 border-t border-zinc-200/60">
                    {faq.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CALL TO ACTION (CTA) ─── */}
      <section className="relative py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 text-white px-8 sm:px-16 py-16 sm:py-20 shadow-2xl">
              <img src={LIBRARY_IMG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
              <div className="relative max-w-2xl space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Hedefine Ulaşmak İçin İlk Adım</span>
                <h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[1.02]">
                  Eksiklerini keşfet, hedefine doğru çalış.
                </h2>
                <p className="text-white/70 text-sm sm:text-base max-w-lg leading-relaxed">
                  20 soruluk ücretsiz seviye tespit testini çöz, güçlü ve zayıf konularını anında gör.
                </p>
                <div className="pt-4">
                  <Link to="/onboarding" data-testid="cta-register" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-indigo-600/30 transition group text-sm">
                    Ücretsiz Seviye Testini Başlat <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── REHBER BLOG KARTI ─── */}
      {blogs.length > 0 && (
        <section id="blog" className="relative py-20 bg-zinc-50 border-t border-zinc-200">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
                <div>
                  <div className="font-editorial italic text-violet-600 text-lg mb-2">— güncel gelişmeler & rehberler</div>
                  <h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">
                    HedefMatik Rehber & Sınav Blogu
                  </h2>
                </div>
                <Link to="/blog" className="text-sm font-bold text-violet-600 hover:text-violet-800 underline flex items-center gap-1">
                  Tüm Yazıları Gör <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-6">
              {blogs.map((b, i) => (
                <Reveal key={b.id} delay={i * 0.1}>
                  <Link to={`/blog/${b.slug}`} className="group flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                    <div className="relative overflow-hidden aspect-video bg-zinc-100">
                      <img src={b.image_url || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop"} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <span className="absolute top-3 left-3 px-3 py-1 bg-violet-600 text-white font-bold text-[10px] rounded-full uppercase tracking-wider shadow-sm">
                        {b.category}
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{b.created_at?.split("T")[0] || "Haber"} · {b.views || 0} okuma</span>
                        <h3 className="font-heading font-bold text-lg text-ink group-hover:text-violet-600 transition-colors line-clamp-2 leading-snug">
                          {b.title}
                        </h3>
                        <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                          {b.summary}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-ink group-hover:text-violet-600 transition-colors pt-2">
                        Yazıyı Oku <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="relative border-t border-zinc-200 py-12 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs text-zinc-500">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-6 w-6 rounded-md bg-indigo-600 grid place-items-center text-white font-bold"><Sparkles size={12} /></span>
                <span className="font-heading font-extrabold text-sm text-zinc-900">HedefMatik</span>
              </div>
              <p className="leading-relaxed text-zinc-500">
                Türkiye'nin kişiselleştirilmiş akıllı sınav hazırlık ve tercih işletim sistemi platformu.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-zinc-900 mb-3">Öne Çıkan Sınavlar</h4>
              <ul className="space-y-1.5">
                <li><Link to="/onboarding" className="hover:text-indigo-600">YKS TYT & AYT Hazırlık</Link></li>
                <li><Link to="/onboarding" className="hover:text-indigo-600">KPSS Lisans & Alan Bilgisi</Link></li>
                <li><Link to="/onboarding" className="hover:text-indigo-600">LGS Sınavı</Link></li>
                <li><Link to="/onboarding" className="hover:text-indigo-600">ALES & DGS</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-zinc-900 mb-3">Modüller & Araçlar</h4>
              <ul className="space-y-1.5">
                <li><Link to="/app/puan-hesapla" className="hover:text-indigo-600">YKS & KPSS Puan Hesaplama</Link></li>
                <li><Link to="/app/tercih-robotu" className="hover:text-indigo-600">Üniversite Tercih Robotu</Link></li>
                <li><Link to="/app/geri-sayim" className="hover:text-indigo-600">Sınav Takvimi & Geri Sayım</Link></li>
                <li><Link to="/blog" className="hover:text-indigo-600">Rehberlik Blogu</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-zinc-900 mb-3">Kurumsal & Hukuki</h4>
              <ul className="space-y-1.5">
                <li><span className="hover:text-indigo-600 cursor-pointer">KVKK Aydınlatma Metni</span></li>
                <li><span className="hover:text-indigo-600 cursor-pointer">Kullanıcı Sözleşmesi</span></li>
                <li><span className="hover:text-indigo-600 cursor-pointer">Çerez Politikası</span></li>
                <li><span className="hover:text-indigo-600 cursor-pointer">İletişim & Destek</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-150 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
            <p>© 2026 HedefMatik (hedefmatik.com) · Tüm Hakları Saklıdır.</p>
            <p>ÖSYM & MEB sınav standartlarına uyumlu kişisel eğitim platformu.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
