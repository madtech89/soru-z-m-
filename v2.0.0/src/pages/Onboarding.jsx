import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Landmark,
  Stethoscope,
  Car,
  Briefcase,
  Languages,
  School,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Target,
  Clock,
  Calendar,
  Compass,
  Zap,
  HelpCircle,
  TrendingUp,
  Award,
  Brain,
  Rocket,
  Star,
  Timer,
  BarChart3,
  ChevronRight
} from "lucide-react";
import { fetchExams } from "@/lib/api";
import { EASE, Card } from "@/app/ui";
import { toast } from "sonner";

// ─── Category metadata ────────────────────────────────────────────────
const CATEGORY_META = {
  universite: { label: "Üniversite", icon: GraduationCap, color: "#4F46E5", gradient: "from-indigo-600 to-violet-600" },
  lise: { label: "Lise (LGS)", icon: School, color: "#10B981", gradient: "from-emerald-500 to-teal-600" },
  kpss: { label: "Kamu Personeli", icon: Landmark, color: "#0F172A", gradient: "from-slate-700 to-slate-900" },
  saglik: { label: "Sağlık (TUS/DUS)", icon: Stethoscope, color: "#EC4899", gradient: "from-pink-500 to-rose-600" },
  mesleki: { label: "Mesleki", icon: Briefcase, color: "#6366F1", gradient: "from-violet-500 to-purple-600" },
  dil: { label: "Yabancı Dil", icon: Languages, color: "#14B8A6", gradient: "from-teal-500 to-cyan-600" },
};

// ─── Categories that need grade/school step ───────────────────────────
const NEEDS_GRADE_CATEGORIES = new Set(["universite", "lise"]);

// ─── Grade options (only for universite & lise) ───────────────────────
const GRADE_OPTIONS = [
  { id: "9", label: "9. Sınıf", desc: "Lise Başlangıcı & Temel", icon: "📚" },
  { id: "10", label: "10. Sınıf", desc: "Temel Sağlamlaştırma", icon: "📖" },
  { id: "11", label: "11. Sınıf", desc: "TYT-AYT Hazırlık Başlangıcı", icon: "🎯" },
  { id: "12", label: "12. Sınıf", desc: "Sınav Yılı & Yoğun Tempo", icon: "🔥" },
  { id: "mezun", label: "Mezun", desc: "Tam Zamanlı Sınav Odaklı", icon: "🚀" },
];

// ─── Context-aware goal configurations per exam category ──────────────
const GOAL_CONFIG = {
  universite: {
    title: "Hayalindeki üniversite hedefin ne?",
    subtitle: "Bölüm, üniversite veya hedef sıralamandan en az birini yazabilirsin.",
    fields: [
      { key: "targetDepartment", label: "Hedef Bölüm", placeholder: "Örn: Bilgisayar Mühendisliği, Hukuk, Tıp..." },
      { key: "targetUniversity", label: "Hedef Üniversite", placeholder: "Örn: ODTÜ, İTÜ, Boğaziçi, Hacettepe..." },
    ],
    rankLabel: "Hedef Sıralama",
    rankPlaceholder: "Örn: İlk 20.000",
    scoreLabel: "Hedef Puan",
    scorePlaceholder: "Örn: 420+",
    unknownLabel: "Hedefimi henüz bilmiyorum (AI Koç yönlendirsin)",
  },
  lise: {
    title: "LGS'de hedefin ne?",
    subtitle: "Gitmek istediğin lise veya hedef puanını yazabilirsin.",
    fields: [
      { key: "targetDepartment", label: "Hedef Lise", placeholder: "Örn: Kadıköy Anadolu Lisesi, İstanbul Erkek..." },
    ],
    rankLabel: "Hedef Sıralama",
    rankPlaceholder: "Örn: İlk 5.000",
    scoreLabel: "Hedef Puan",
    scorePlaceholder: "Örn: 450+",
    unknownLabel: "Hedefimi henüz bilmiyorum",
  },
  kpss: {
    title: "KPSS'de hedefin ne?",
    subtitle: "Hedef puanını veya kadro tercihini yazabilirsin.",
    fields: [
      { key: "targetDepartment", label: "Hedef Kadro / Alan", placeholder: "Örn: Zabıta Memuru, VHKİ, Mühendis..." },
    ],
    rankLabel: "Hedef Sıralama",
    rankPlaceholder: "Örn: İlk 500",
    scoreLabel: "Hedef Puan",
    scorePlaceholder: "Örn: 80+",
    unknownLabel: "Hedefimi henüz bilmiyorum (Puan hedefi yeterli)",
  },
  saglik: {
    title: "TUS / DUS'ta hedefin ne?",
    subtitle: "Yerleşmek istediğin uzmanlık alanını ve hedef sıralamayı belirleyebilirsin.",
    fields: [
      { key: "targetDepartment", label: "Hedef Uzmanlık Alanı", placeholder: "Örn: Kardiyoloji, Ortopedi, Dermatoloji..." },
      { key: "targetUniversity", label: "Hedef Hastane / Üniversite", placeholder: "Örn: Hacettepe, Cerrahpaşa..." },
    ],
    rankLabel: "Hedef Sıralama",
    rankPlaceholder: "Örn: İlk 1.000",
    scoreLabel: "Hedef Puan",
    scorePlaceholder: "Örn: 65+",
    unknownLabel: "Hedefimi henüz bilmiyorum",
  },
  mesleki: {
    title: "Bu sınavda hedefin ne?",
    subtitle: "Hedef puanını veya geçmek istediğin barajı belirleyebilirsin.",
    fields: [
      { key: "targetDepartment", label: "Hedef Pozisyon / Alan", placeholder: "Örn: Lisans Tamamlama, DGS ile geçiş..." },
    ],
    rankLabel: "Hedef Sıralama",
    rankPlaceholder: "Örn: İlk 10.000",
    scoreLabel: "Hedef Puan",
    scorePlaceholder: "Örn: 300+",
    unknownLabel: "Hedefimi henüz bilmiyorum",
  },
  dil: {
    title: "Dil sınavında hedefin ne?",
    subtitle: "Almak istediğin puan veya seviyeyi belirleyebilirsin.",
    fields: [
      { key: "targetDepartment", label: "Hedef Seviye / Amaç", placeholder: "Örn: B2 Seviyesi, Yurtdışı Eğitim..." },
    ],
    rankLabel: "Hedef Sıralama",
    rankPlaceholder: "Örn: İlk 5.000",
    scoreLabel: "Hedef Puan",
    scorePlaceholder: "Örn: 85+",
    unknownLabel: "Hedefimi henüz bilmiyorum",
  },
};

// ─── Study tempo presets with visual indicators ───────────────────────
const TEMPO_PRESETS = [
  { id: "30", label: "30 dk", longLabel: "Günde 30 Dakika", desc: "Hafif tempo · Düzenli kalıcı öğrenme", icon: "🌱", color: "#10B981", intensity: 1 },
  { id: "60", label: "1 saat", longLabel: "Günde 1 Saat", desc: "Dengeli ve ideal çalışma ritmi", icon: "⚡", color: "#3B82F6", intensity: 2 },
  { id: "120", label: "2 saat", longLabel: "Günde 2 Saat", desc: "Yoğun ve hedef odaklı çalışma", icon: "🔥", color: "#F59E0B", intensity: 3 },
  { id: "180", label: "3 saat", longLabel: "Günde 3 Saat", desc: "Hızlı ilerleme · Disiplinli program", icon: "🚀", color: "#EF4444", intensity: 4 },
  { id: "240", label: "4+ saat", longLabel: "Günde 4+ Saat", desc: "Maksimum verim · Sınav odaklı maraton", icon: "💎", color: "#8B5CF6", intensity: 5 },
];

// ─── Animated background pattern ──────────────────────────────────────
function BackgroundPattern() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -left-32 w-80 h-80 bg-violet-100/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 right-1/4 w-72 h-72 bg-purple-100/25 rounded-full blur-3xl" />
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle, #4F46E5 1px, transparent 1px)`,
        backgroundSize: '32px 32px'
      }} />
    </div>
  );
}

// ─── Step indicator with labels ───────────────────────────────────────
function StepIndicator({ current, total, labels }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => i + 1).map((st) => (
        <div key={st} className="flex items-center gap-1">
          <div className={`flex items-center justify-center transition-all duration-500 ${
            st === current
              ? "h-8 w-8 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 scale-110"
              : st < current
              ? "h-7 w-7 rounded-full bg-indigo-600 text-white text-[10px]"
              : "h-6 w-6 rounded-full bg-zinc-200 text-zinc-400 text-[10px]"
          }`}>
            {st < current ? <Check size={12} /> : st}
          </div>
          {st < total && (
            <div className={`w-6 sm:w-10 h-0.5 rounded-full transition-all duration-500 ${
              st < current ? "bg-indigo-600" : "bg-zinc-200"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────
export default function Onboarding() {
  const nav = useNavigate();
  const [exams, setExams] = useState(null);
  const [category, setCategory] = useState("universite");

  // Form state
  const [selectedExam, setSelectedExam] = useState("");
  const [grade, setGrade] = useState("12");
  const [schoolType, setSchoolType] = useState("");

  const [targetDepartment, setTargetDepartment] = useState("");
  const [targetUniversity, setTargetUniversity] = useState("");
  const [targetRank, setTargetRank] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [unknownTarget, setUnknownTarget] = useState(false);

  const [weeklyDays, setWeeklyDays] = useState("6");
  const [dailyMinutes, setDailyMinutes] = useState("120");

  const [hasKnownNet, setHasKnownNet] = useState(false);
  const [knownNet, setKnownNet] = useState("");

  useEffect(() => {
    fetchExams()
      .then((data) => {
        setExams(data);
        const tyt = (data || []).find((e) => e.name?.includes("TYT"));
        if (tyt) {
          setSelectedExam(tyt.id);
          setCategory(tyt.category || "universite");
        }
      })
      .catch(() => setExams([]));
  }, []);

  // ─── Dynamic step calculation ─────────────────────────────────────
  const needsGrade = NEEDS_GRADE_CATEGORIES.has(category);

  // Steps: 1=Sınav, 2=Eğitim(conditional), 3=Hedef, 4=Tempo+Seviye
  const steps = useMemo(() => {
    const s = [
      { id: "exam", label: "Sınav Seçimi" },
    ];
    if (needsGrade) {
      s.push({ id: "grade", label: "Eğitim Durumu" });
    }
    s.push({ id: "goal", label: "Hedef Belirleme" });
    s.push({ id: "tempo", label: "Plan & Başla" });
    return s;
  }, [needsGrade]);

  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = steps[stepIdx]?.id || "exam";
  const totalSteps = steps.length;

  const filteredExams = (exams || []).filter((e) => e.category === category);
  const categories = Object.keys(CATEGORY_META).filter((cat) =>
    (exams || []).some((e) => e.category === cat)
  );

  const goalConfig = GOAL_CONFIG[category] || GOAL_CONFIG.universite;

  // When category changes, reset step to exam selection if we're past it
  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setSelectedExam("");
    // Don't reset step - let user stay on step 1
  };

  const handleNext = () => {
    if (currentStep === "exam" && !selectedExam) {
      return toast.error("Lütfen bir sınav seçin.");
    }
    if (stepIdx < totalSteps - 1) {
      setStepIdx((s) => s + 1);
    } else {
      // Final step: submit and go to placement test
      const onboardingData = {
        examId: selectedExam,
        category,
        grade: needsGrade ? grade : null,
        schoolType: needsGrade ? schoolType : null,
        targetDepartment: unknownTarget ? "Belirlenmedi" : targetDepartment,
        targetUniversity: unknownTarget ? "Belirlenmedi" : targetUniversity,
        targetRank: unknownTarget ? null : targetRank,
        targetScore: unknownTarget ? null : targetScore,
        weeklyDays,
        dailyMinutes,
        knownNet: hasKnownNet ? knownNet : null,
      };

      try {
        sessionStorage.setItem("hedefmatik_onboarding_profile", JSON.stringify(onboardingData));
      } catch (_) {}

      nav(`/test?exam_id=${selectedExam}`);
    }
  };

  const handleBack = () => {
    if (stepIdx > 0) setStepIdx((s) => s - 1);
  };

  // ─── Loading State ────────────────────────────────────────────────
  if (!exams) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <BackgroundPattern />
        <div className="text-center space-y-4 relative">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-indigo-100 animate-ping opacity-20" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 grid place-items-center shadow-xl shadow-indigo-600/20">
              <Loader2 className="animate-spin text-white" size={28} />
            </div>
          </div>
          <div>
            <p className="font-heading font-bold text-zinc-900">HedefMatik</p>
            <p className="text-xs text-zinc-500 font-medium mt-1">Sınavlar ve müfredatlar yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Selected exam info for step labels ───────────────────────────
  const selectedExamObj = (exams || []).find(e => e.id === selectedExam);
  const selectedExamName = selectedExamObj?.name || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 relative">
      <BackgroundPattern />

      <div className="relative py-8 sm:py-12 px-4 sm:px-8">
        <div className="mx-auto max-w-2xl">
          {/* ─── Top Header ────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 grid place-items-center text-white shadow-lg shadow-indigo-600/20">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="font-heading font-extrabold text-lg tracking-tight text-zinc-900">HedefMatik</span>
                <div className="text-[10px] text-zinc-400 font-medium -mt-0.5">Kişiselleştirilmiş Sınav Koçun</div>
              </div>
            </div>

            <StepIndicator current={stepIdx + 1} total={totalSteps} labels={steps.map(s => s.label)} />
          </div>

          {/* ─── Wizard Steps ──────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {/* ═══ STEP: EXAM SELECTION ═══ */}
            {currentStep === "exam" && (
              <motion.div key="exam" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold mb-3">
                    <GraduationCap size={12} /> Adım {stepIdx + 1} · Sınav Tercihi
                  </div>
                  <h1 className="font-heading font-extrabold tracking-tight text-3xl sm:text-4xl text-zinc-900">
                    Hangi sınava hazırlanıyorsun?
                  </h1>
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                    Sınav türünü seç, sonra hedefini ve çalışma planını birlikte oluşturalım.
                  </p>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                  {categories.map((cat) => {
                    const meta = CATEGORY_META[cat] || { label: cat, icon: BookOpen };
                    const Icon = meta.icon;
                    const active = category === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${
                          active
                            ? "border-zinc-900 bg-zinc-900 text-white shadow-lg shadow-zinc-900/10"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:shadow-sm"
                        }`}
                      >
                        <Icon size={14} /> {meta.label}
                      </button>
                    );
                  })}
                </div>

                {/* Exam Cards */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {filteredExams.map((e) => {
                    const on = selectedExam === e.id;
                    const meta = CATEGORY_META[category];
                    return (
                      <button
                        key={e.id}
                        onClick={() => setSelectedExam(e.id)}
                        className={`text-left rounded-2xl p-5 border-2 transition-all duration-200 relative group ${
                          on
                            ? "border-indigo-600 bg-gradient-to-br from-indigo-50/60 to-violet-50/30 shadow-lg shadow-indigo-600/10"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`h-9 w-9 rounded-xl grid place-items-center font-bold text-xs transition-all ${
                            on ? `bg-gradient-to-br ${meta?.gradient || "from-indigo-600 to-violet-600"} text-white shadow-md` : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
                          }`}>
                            {on ? <Check size={16} /> : <GraduationCap size={16} />}
                          </span>
                          {on && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-[10px] font-bold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg"
                            >
                              ✓ Seçildi
                            </motion.span>
                          )}
                        </div>
                        <div className="font-heading font-bold text-sm text-zinc-900">{e.name}</div>
                        <div className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{e.description}</div>
                      </button>
                    );
                  })}
                </div>

                {filteredExams.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200">
                    <BookOpen size={32} className="mx-auto text-zinc-300 mb-3" />
                    <p className="text-sm text-zinc-500 font-medium">Bu kategoride henüz sınav bulunmuyor.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ STEP: GRADE (only for universite & lise) ═══ */}
            {currentStep === "grade" && (
              <motion.div key="grade" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold mb-3">
                    <School size={12} /> Adım {stepIdx + 1} · Eğitim Durumu
                  </div>
                  <h1 className="font-heading font-extrabold tracking-tight text-3xl sm:text-4xl text-zinc-900">
                    Şu an hangi sınıftasın?
                  </h1>
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                    Çalışma temposunu ve soru zorluk dağılımını seviyene göre optimize edeceğiz.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {GRADE_OPTIONS.map((g) => {
                    const on = grade === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setGrade(g.id)}
                        className={`text-left p-4.5 rounded-2xl border-2 transition-all duration-200 group ${
                          on
                            ? "border-indigo-600 bg-gradient-to-br from-indigo-50/60 to-violet-50/30 shadow-lg shadow-indigo-600/10"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{g.icon}</span>
                          <div>
                            <div className="font-heading font-bold text-sm text-zinc-900">{g.label}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">{g.desc}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ═══ STEP: GOAL (context-aware) ═══ */}
            {currentStep === "goal" && (
              <motion.div key="goal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold mb-3">
                    <Target size={12} /> Adım {stepIdx + 1} · Sınav Hedefin
                  </div>
                  <h1 className="font-heading font-extrabold tracking-tight text-3xl sm:text-4xl text-zinc-900">
                    {goalConfig.title}
                  </h1>
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                    {goalConfig.subtitle}
                  </p>
                </div>

                {/* Selected exam badge */}
                {selectedExamName && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200">
                    <GraduationCap size={14} className="text-indigo-600" />
                    <span className="text-xs font-bold text-zinc-700">{selectedExamName}</span>
                  </div>
                )}

                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                  {/* Unknown target toggle */}
                  <label className="flex items-center gap-3 cursor-pointer pb-3 border-b border-zinc-100">
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                      unknownTarget ? "border-indigo-600 bg-indigo-600" : "border-zinc-300"
                    }`}>
                      {unknownTarget && <Check size={12} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={unknownTarget}
                      onChange={(e) => setUnknownTarget(e.target.checked)}
                      className="sr-only"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-700 block">{goalConfig.unknownLabel}</span>
                      <span className="text-[10px] text-zinc-400">Seviye testinden sonra AI Koç sana özel hedef önerecek</span>
                    </div>
                  </label>

                  {!unknownTarget && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      {/* Dynamic fields based on exam category */}
                      {goalConfig.fields.map((f) => (
                        <div key={f.key}>
                          <label className="text-[11px] font-bold text-zinc-600 block mb-1.5">{f.label}</label>
                          <input
                            type="text"
                            value={f.key === "targetDepartment" ? targetDepartment : targetUniversity}
                            onChange={(e) =>
                              f.key === "targetDepartment"
                                ? setTargetDepartment(e.target.value)
                                : setTargetUniversity(e.target.value)
                            }
                            placeholder={f.placeholder}
                            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                          />
                        </div>
                      ))}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-zinc-600 block mb-1.5">{goalConfig.rankLabel}</label>
                          <input
                            type="text"
                            value={targetRank}
                            onChange={(e) => setTargetRank(e.target.value)}
                            placeholder={goalConfig.rankPlaceholder}
                            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-zinc-600 block mb-1.5">{goalConfig.scoreLabel}</label>
                          <input
                            type="text"
                            value={targetScore}
                            onChange={(e) => setTargetScore(e.target.value)}
                            placeholder={goalConfig.scorePlaceholder}
                            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ═══ STEP: TEMPO + START ═══ */}
            {currentStep === "tempo" && (
              <motion.div key="tempo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold mb-3">
                    <Clock size={12} /> Adım {stepIdx + 1} · Çalışma Planı
                  </div>
                  <h1 className="font-heading font-extrabold tracking-tight text-3xl sm:text-4xl text-zinc-900">
                    Günlük çalışma planını oluşturalım
                  </h1>
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                    Kapasiteni aşmayacak, sürdürülebilir bir tempo belirle. Sonradan değiştirebilirsin.
                  </p>
                </div>

                {/* Interactive Tempo Selector */}
                <div className="space-y-3">
                  {TEMPO_PRESETS.map((t) => {
                    const on = dailyMinutes === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setDailyMinutes(t.id)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group ${
                          on
                            ? "border-indigo-600 bg-gradient-to-r from-indigo-50/60 to-violet-50/30 shadow-lg shadow-indigo-600/10"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{t.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-heading font-bold text-sm text-zinc-900">{t.longLabel}</span>
                              {on && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="h-6 w-6 rounded-full bg-indigo-600 text-white grid place-items-center"
                                >
                                  <Check size={12} />
                                </motion.span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">{t.desc}</div>
                            {/* Intensity bar */}
                            <div className="flex gap-1 mt-2">
                              {[1,2,3,4,5].map(level => (
                                <div
                                  key={level}
                                  className="h-1.5 flex-1 rounded-full transition-all duration-300"
                                  style={{
                                    backgroundColor: level <= t.intensity ? t.color : '#E4E4E7',
                                    opacity: on ? 1 : 0.5,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Weekly days selector */}
                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-zinc-800 flex items-center gap-2">
                        <Calendar size={14} className="text-indigo-600" />
                        Haftada Çalışacağın Gün
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">Dinlenme günleri için ideal: Haftada 5-6 gün</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-zinc-100 rounded-xl p-1">
                      {["4", "5", "6", "7"].map(d => (
                        <button
                          key={d}
                          onClick={() => setWeeklyDays(d)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            weeklyDays === d
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-zinc-600 hover:text-zinc-800"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Known net (optional) */}
                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                      hasKnownNet ? "border-indigo-600 bg-indigo-600" : "border-zinc-300"
                    }`}>
                      {hasKnownNet && <Check size={12} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={hasKnownNet}
                      onChange={(e) => setHasKnownNet(e.target.checked)}
                      className="sr-only"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-700 block">Son deneme netimi biliyorum</span>
                      <span className="text-[10px] text-zinc-400">Seviye tespitini daha hassas yapabilmemiz için (isteğe bağlı)</span>
                    </div>
                  </label>
                  <AnimatePresence>
                    {hasKnownNet && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="text"
                          value={knownNet}
                          onChange={(e) => setKnownNet(e.target.value)}
                          placeholder="Örn: 62.5 Net"
                          className="w-full mt-3 rounded-xl border border-zinc-300 px-4 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Diagnostic Test CTA */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/40 rounded-full blur-2xl -mr-10 -mt-10" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white grid place-items-center shadow-lg shadow-indigo-600/25">
                        <Brain size={22} />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-sm text-zinc-900">
                          Adaptif Seviye Tespit Testi
                        </h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {selectedExamName ? `${selectedExamName} müfredatından dengeli dağılım` : "Sınav müfredatından dengeli dağılım"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <div className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-600 grid place-items-center"><Check size={10} /></div>
                        <span><strong>1/4 Oranında:</strong> Gerçek sınav formatı (Örn: TYT/KPSS 30 Soru, LGS 22 Soru)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <div className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-600 grid place-items-center"><Check size={10} /></div>
                        <span>Konu ve ders bazlı eksik tespiti</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <div className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-600 grid place-items-center"><Check size={10} /></div>
                        <span>7 günlük kişisel çalışma planı</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-600">
                        <div className="h-5 w-5 rounded-md bg-emerald-100 text-emerald-600 grid place-items-center"><Check size={10} /></div>
                        <span>Kayıt olmadan anında başla</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Navigation ───────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-zinc-200/60">
            {stepIdx > 0 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-zinc-300 bg-white font-bold text-xs text-zinc-700 hover:bg-zinc-50 hover:shadow-sm transition-all"
              >
                <ArrowLeft size={16} /> Geri
              </button>
            ) : <div />}

            <button
              onClick={handleNext}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 font-bold px-8 py-4 rounded-xl text-sm transition-all duration-300 ${
                currentStep === "tempo"
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xl shadow-indigo-600/25 hover:shadow-2xl hover:shadow-indigo-600/30 hover:scale-[1.02]"
                  : "bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-900/15"
              }`}
            >
              {currentStep === "tempo" ? (
                <>
                  <Rocket size={18} /> Seviye Testine Başla
                </>
              ) : (
                <>
                  Devam Et <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
