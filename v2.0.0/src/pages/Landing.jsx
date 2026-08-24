import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight, ArrowRight, Target, Brain, LineChart, BookOpen,
  Trophy, Repeat, Sparkles, CheckCircle2, GraduationCap, ChevronDown, ChevronRight,
  Calculator, Compass, Clock, BookCopy, Library, GraduationCap as GradIcon,
} from "lucide-react";
import { SUBJECT_TONES } from "@/lib/subjects";
import { fetchExams, fetchSubjects, EXAM_CATEGORIES } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const EASE = [0.16, 1, 0.3, 1];

const HERO_IMG = "https://images.unsplash.com/photo-1728455635901-bb16530faf40?crop=entropy&cs=srgb&fm=jpg&q=85";
const ANALYSIS_IMG = "https://images.unsplash.com/photo-1514369118554-e20d9352f30a?crop=entropy&cs=srgb&fm=jpg&q=85";
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

function LandingDropdown({ label, icon: Icon, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 whitespace-nowrap px-2 sm:px-3 py-2 rounded-lg transition-colors ${open ? "text-subject-matematik" : "text-zinc-600 hover:text-ink hover:bg-zinc-100"}`}
      >
        {Icon && <Icon size={15} className="hidden sm:block" />}
        {label}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 pt-1 w-56 rounded-2xl border border-zinc-200 bg-white py-2 shadow-xl z-50">
          {children}
        </div>
      )}
    </div>
  );
}

function CascadingMenuItem({ label, exams, subjCache, loadSubjects, basePath }) {
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
              <LandingDropdownLink to={`${basePath}?exam_id=${e.id}`}>{e.name}</LandingDropdownLink>
              {subjCache[e.id]?.map((s) => (
                <Link key={s.id} to={`${basePath}?exam_id=${e.id}&subject_id=${s.id}`}
                  className="block pl-8 pr-4 py-2 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700">{s.name}</Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LandingDropdownLink({ to, children }) {
  return (
    <Link to={to} className="block px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-ink transition-colors">{children}</Link>
  );
}

function LandingDropdownGroup({ label, children }) {
  return (
    <div className="py-1">
      <div className="px-4 text-[11px] font-bold uppercase tracking-wide text-zinc-400 mb-1">{label}</div>
      {children}
    </div>
  );
}

function LandingDropdownDivider() {
  return <div className="my-1 border-t border-zinc-100" />;
}

export default function Landing() {
  const { user } = useAuth();
  const heroRef = useRef(null);
  const [exams, setExams] = useState([]);
  const [subjCache, setSubjCache] = useState({});
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const badgeY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  useEffect(() => {
    fetchExams().then(setExams).catch(() => setExams([]));
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  const loadSubjects = (examId) => {
    if (subjCache[examId]) return;
    fetchSubjects(examId).then((r) => setSubjCache((c) => ({ ...c, [examId]: r }))).catch(() => {});
  };

  const examsByCat = EXAM_CATEGORIES.map((cat) => ({
    ...cat,
    exams: exams.filter((e) => e.category === cat.key),
  })).filter((c) => c.exams.length > 0);

  return (
    <div className="grain relative bg-paper text-ink font-sans">
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 mt-4">
          <div className="glass rounded-full border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex items-center justify-between pl-6 pr-2 py-2">
            <Link to="/" data-testid="logo-home" className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-subject-matematik grid place-items-center"><Sparkles size={15} className="text-white" /></span>
              <span className="font-heading font-extrabold text-lg tracking-tight">Netor</span>
            </Link>
            <nav className="flex items-center gap-0.5 text-sm max-w-[56vw] sm:max-w-none">
              {/* Sınavlar dropdown — kademeli */}
              <LandingDropdown label="Sınavlar" icon={GradIcon}>
                {examsByCat.map((cat) => (
                  <CascadingMenuItem key={cat.key} label={cat.label} exams={cat.exams} subjCache={subjCache} loadSubjects={loadSubjects} basePath="/app/soru-bankasi" />
                ))}
              </LandingDropdown>

              {/* Dersler dropdown — kademeli */}
              <LandingDropdown label="Dersler" icon={BookCopy}>
                <LandingDropdownLink to="/app/ders-notlari">Ders Notları</LandingDropdownLink>
                <LandingDropdownLink to="/app/soru-bankasi">Soru Bankası</LandingDropdownLink>
                {user && <LandingDropdownLink to="/app/eksiklerim">Eksiklerim</LandingDropdownLink>}
                <LandingDropdownDivider />
                {examsByCat.map((cat) => (
                  <CascadingMenuItem key={cat.key} label={cat.label} exams={cat.exams} subjCache={subjCache} loadSubjects={loadSubjects} basePath="/app/ders-notlari" />
                ))}
              </LandingDropdown>

              {/* Puan Hesapla */}
              <Link to="/app/puan-hesapla" className="flex items-center gap-1 whitespace-nowrap px-2 sm:px-3 py-2 rounded-lg text-zinc-600 hover:text-ink hover:bg-zinc-100 transition-colors">
                <Calculator size={15} className="hidden sm:block" /> Puan Hesapla
              </Link>

              {/* Tercih Robotu */}
              <Link to="/app/tercih-robotu" className="flex items-center gap-1 whitespace-nowrap px-2 sm:px-3 py-2 rounded-lg text-zinc-600 hover:text-ink hover:bg-zinc-100 transition-colors">
                <Compass size={15} className="hidden sm:block" /> Tercih Robotu
              </Link>

              {/* Geri Sayım */}
              <Link to="/app/geri-sayim" className="flex items-center gap-1 whitespace-nowrap px-2 sm:px-3 py-2 rounded-lg text-zinc-600 hover:text-ink hover:bg-zinc-100 transition-colors">
                <Clock size={15} className="hidden sm:block" /> Geri Sayım
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              {user ? (
                <Link to="/app" className="group text-sm font-semibold px-5 py-2.5 rounded-full bg-ink text-white flex items-center gap-1.5 hover:bg-subject-matematik transition-colors">
                  Uygulamaya Git<ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link to="/login" data-testid="nav-login" className="hidden sm:inline text-sm font-medium px-4 py-2 rounded-full hover:bg-black/5 transition-colors">Giriş</Link>
                  <Link to="/onboarding" data-testid="nav-register" className="group text-sm font-semibold px-5 py-2.5 rounded-full bg-ink text-white flex items-center gap-1.5 hover:bg-subject-matematik transition-colors">
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
                <div><span className="font-heading font-bold text-ink text-xl">25+</span> sınav türü</div>
                <div className="h-8 w-px bg-zinc-200" />
                <div><span className="font-heading font-bold text-ink text-xl">100K+</span> soru kapasitesi</div>
              </motion.div>
            </div>
            <div className="lg:col-span-5 relative">
              <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 1, ease: EASE }} className="relative">
                <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 shadow-[0_30px_80px_rgba(0,0,0,0.12)]" style={{ aspectRatio: "4/5" }}>
                  <motion.img src={HERO_IMG} alt="Odaklanmış öğrenci" style={{ y: imgY, scale: imgScale }} className="absolute inset-0 h-[115%] w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                </div>
                <motion.div style={{ y: badgeY }} className="absolute -left-5 top-10 glass rounded-2xl border border-white/60 shadow-xl p-4 w-44 animate-floaty">
                  <div className="text-xs text-zinc-500">Fonksiyonlar</div>
                  <div className="font-heading font-bold text-2xl text-subject-matematik">%82</div>
                  <div className="text-[11px] font-medium text-subject-fen">İyi durumda ↑</div>
                </motion.div>
                <motion.div style={{ y: useTransform(scrollYProgress, [0, 1], [0, -110]) }} className="absolute -right-4 bottom-12 glass rounded-2xl border border-white/60 shadow-xl p-4 w-40">
                  <div className="text-xs text-zinc-500">Problemler</div>
                  <div className="font-heading font-bold text-2xl text-subject-turkce">%39</div>
                  <div className="text-[11px] font-medium text-subject-turkce">Kritik eksik</div>
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

      <section id="dongu" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <div className="font-editorial italic text-subject-matematik text-lg mb-3">— öğrenme döngüsü</div>
              <h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[1.02]">
                Soru çözmek başlangıç.<br /><span className="text-zinc-400">Gelişim asıl hedef.</span>
              </h2>
            </div>
          </Reveal>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CHAPTERS.map((c, i) => {
              const t = SUBJECT_TONES[c.slug];
              const Icon = c.icon;
              const wide = i === 6;
              return (
                <Reveal key={c.n} delay={(i % 3) * 0.08} className={wide ? "sm:col-span-2 lg:col-span-1" : ""}>
                  <div className="group h-full rounded-3xl bg-white border border-zinc-200 p-7 hover:-translate-y-1.5 transition-transform duration-300" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-start justify-between">
                      <span className="h-11 w-11 rounded-xl grid place-items-center" style={{ background: t.soft }}><Icon size={19} style={{ color: t.hex }} /></span>
                      <span className="font-editorial text-4xl text-zinc-200 group-hover:text-zinc-300 transition-colors">{c.n}</span>
                    </div>
                    <h3 className="mt-6 font-heading font-bold text-xl">{c.t}</h3>
                    <p className="mt-2 text-zinc-500 leading-relaxed text-sm">{c.d}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="dersler" className="relative py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <h2 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl mb-3">Her ders kendi rengiyle.</h2>
            <p className="text-zinc-500 max-w-xl">Arayüz çözdüğün derse göre renk değiştirir — göz yormadan, odağı artırarak.</p>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(SUBJECT_TONES).slice(0, 5).map(([k, t], i) => (
              <Reveal key={k} delay={i * 0.06}>
                <div className="rounded-3xl p-6 h-40 flex flex-col justify-between border transition-transform hover:-translate-y-1" style={{ background: t.soft, borderColor: t.ring }}>
                  <span className="h-9 w-9 rounded-full" style={{ background: t.hex }} />
                  <div>
                    <div className="font-heading font-bold text-lg" style={{ color: t.hex }}>{t.name}</div>
                    <div className="text-xs text-zinc-500">konu bazlı analiz</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="ozellikler" className="relative py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 shadow-xl" style={{ aspectRatio: "5/4" }}>
              <img src={ANALYSIS_IMG} alt="Analiz" className="h-full w-full object-cover" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              <div className="font-editorial italic text-subject-turkce text-lg mb-3">— eksik konu tespiti</div>
              <h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl leading-[1.02] mb-6">Sadece doğru/yanlış değil.</h2>
              <p className="text-zinc-600 leading-relaxed mb-6">
                Başarı oranı, çözülen soru sayısı, ortalama süre, zorluk ve son 7/30 günlük trend birlikte değerlendirilir. Her konuya bir <b>yeterlilik skoru</b> verilir.
              </p>
              <ul className="space-y-3">
                {["Konu bazlı yeterlilik: İyi / Geliştirilmeli / Kritik Eksik", "Otomatik ders notu yönlendirmesi", "Platform Türkiye sıralaması ve liderlik tablosu", "Deneme motoru: süre, işaretleme, otomatik kayıt"].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-zinc-700"><CheckCircle2 size={19} className="text-subject-fen mt-0.5 shrink-0" /><span>{f}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-ink text-white px-8 sm:px-16 py-16 sm:py-20">
              <img src={LIBRARY_IMG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
              <div className="relative max-w-2xl">
                <h2 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-6xl leading-[0.98]">
                  Hedefine giden yolu<br /><span className="font-editorial italic font-medium">bugün</span> çiz.
                </h2>
                <p className="mt-5 text-white/70 text-lg max-w-md">Ücretsiz hesap oluştur, sınavını seç ve ilk denemeni çöz.</p>
                <Link to="/onboarding" data-testid="cta-register" className="mt-8 inline-flex items-center gap-2 bg-white text-ink font-semibold px-7 py-3.5 rounded-full hover:bg-subject-matematik hover:text-white transition-colors group">
                  Ücretsiz başla<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="relative border-t border-zinc-200 py-12 mt-8">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-subject-matematik grid place-items-center"><Sparkles size={12} className="text-white" /></span>
            <span className="font-heading font-bold text-ink">Netor</span>
          </div>
          <p>© 2026 Netor · Türkiye Sınav Hazırlık Platformu</p>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-ink transition-colors">Giriş</Link>
            <Link to="/register" className="hover:text-ink transition-colors">Kayıt</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
