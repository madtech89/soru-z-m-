import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, Loader2, Search, TrendingUp, Target, ArrowRight, ArrowLeft,
  MapPin, Clock, Award, Info, GraduationCap, Check, Building2, Filter,
} from "lucide-react";
import {
  fetchProgramRecommendations, fetchDistinctCities, fetchDistinctUniversities,
  SCORE_TYPES, EXAM_TYPES,
} from "@/lib/api";
import { PageHeader, Card, EASE } from "@/app/ui";

const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-subject-matematik focus:ring-2 focus:ring-subject-matematik/20 transition text-lg font-semibold";
const chipCls = "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors";

function StepDots({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold transition-colors ${i < step ? "bg-subject-matematik text-white" : i === step ? "bg-ink text-white" : "bg-zinc-100 text-zinc-400"}`}>
            {i < step ? <Check size={14} /> : i + 1}
          </div>
          {i < total - 1 && <div className={`h-0.5 w-8 ${i < step ? "bg-subject-matematik" : "bg-zinc-200"}`} />}
        </div>
      ))}
    </div>
  );
}

function ProgramRow({ program, index, category }) {
  const colors = {
    guaranteed: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Yerleşir", icon: Target },
    likely: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Muhtemel", icon: TrendingUp },
    reach: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", label: "Ulaşılabilir", icon: Compass },
  };
  const c = colors[category];
  const Icon = c.icon;
  const trend = Number(program.score_2025) - Number(program.score_2023);
  const trendStr = trend > 0 ? `+${trend.toFixed(1)}` : trend.toFixed(1);
  const diff = (Number(program.score_2025) - (category === "guaranteed" ? Number(program.score_2025) : 0)).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.3, ease: EASE }}
      className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col sm:flex-row sm:items-center gap-3`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-bold ${c.text} ${c.bg} px-2 py-0.5 rounded-full border ${c.border} flex items-center gap-1`}>
            <Icon size={11} /> {c.label}
          </span>
          {program.scholarship && (
            <span className="text-xs font-bold text-subject-matematik bg-subject-matematik/10 px-2 py-0.5 rounded-full">{program.scholarship} Burs</span>
          )}
        </div>
        <div className="font-heading font-bold text-sm leading-snug">{program.program}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{program.university} · {program.faculty}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><MapPin size={11} /> {program.city}</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {program.duration_years} yıl</span>
          {program.quota > 0 && <span className="flex items-center gap-1"><Award size={11} /> Kont: {program.quota}</span>}
        </div>
      </div>
      <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 shrink-0">
        <div className="text-right">
          <div className="text-xs text-zinc-400">2025 Taban</div>
          <div className="font-heading font-extrabold text-lg leading-none">{Number(program.score_2025).toFixed(2)}</div>
        </div>
        <div className={`text-xs font-medium ${trend > 0 ? "text-rose-500" : trend < 0 ? "text-emerald-500" : "text-zinc-400"}`}>
          3 yıl: {trendStr}
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400">Başarı Sırası</div>
          <div className="text-sm font-bold text-zinc-600">{program.rank_2025.toLocaleString("tr-TR")}</div>
        </div>
      </div>
    </motion.div>
  );
}

function ProgramList({ title, programs, category, icon: Icon, color }) {
  if (!programs || programs.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-lg grid place-items-center" style={{ background: `${color}18` }}>
          <Icon size={14} style={{ color }} />
        </span>
        <h3 className="font-heading font-bold text-base">{title}</h3>
        <span className="text-xs text-zinc-400">({programs.length} program)</span>
      </div>
      <div className="space-y-2.5">
        {programs.map((p, i) => (
          <ProgramRow key={p.id} program={p} index={i} category={category} />
        ))}
      </div>
    </div>
  );
}

export default function TercihRobotu() {
  const [step, setStep] = useState(0);
  const [examType, setExamType] = useState("");
  const [scoreType, setScoreType] = useState("");
  const [score, setScore] = useState("");
  const [cities, setCities] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [selectedUnis, setSelectedUnis] = useState([]);
  const [programKeyword, setProgramKeyword] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const TOTAL_STEPS = 4;

  useEffect(() => {
    fetchDistinctCities().then(setCities).catch(() => setCities([]));
    fetchDistinctUniversities().then(setUniversities).catch(() => setUniversities([]));
  }, []);

  const toggleCity = (c) => {
    setSelectedCities((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };
  const toggleUni = (u) => {
    setSelectedUnis((prev) => prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]);
  };

  const canNext = () => {
    if (step === 0) return !!examType;
    if (step === 1) return !!scoreType;
    if (step === 2) {
      const s = parseFloat(score.replace(",", "."));
      return !!s && s >= 100 && s <= 600;
    }
    return true;
  };

  const next = () => {
    if (step === 2) {
      const s = parseFloat(score.replace(",", "."));
      if (!s || s < 100 || s > 600) {
        setError("Lütfen 100-600 arası geçerli bir puan giriniz.");
        return;
      }
      setError("");
    }
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      compute();
    }
  };

  const back = () => {
    setError("");
    if (step > 0) setStep(step - 1);
  };

  const compute = async () => {
    const s = parseFloat(score.replace(",", "."));
    if (!s || s < 100 || s > 600) {
      setError("Lütfen 100-600 arası geçerli bir puan giriniz.");
      setStep(2);
      return;
    }
    setError("");
    setBusy(true);
    setResults(null);
    try {
      const filters = {};
      if (selectedCities.length > 0) filters.cities = selectedCities;
      if (selectedUnis.length > 0) filters.universities = selectedUnis;
      if (programKeyword.trim()) filters.programKeyword = programKeyword.trim();
      const data = await fetchProgramRecommendations(scoreType, s, filters);
      setResults({ ...data, userScore: s });
    } catch (err) {
      setError("Öneriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(0);
    setExamType("");
    setScoreType("");
    setScore("");
    setSelectedCities([]);
    setSelectedUnis([]);
    setProgramKeyword("");
    setResults(null);
    setError("");
  };

  const totalResults = results ? results.guaranteed.length + results.likely.length + results.reach.length : 0;
  const examLabel = EXAM_TYPES.find((e) => e.key === examType)?.label || "";
  const scoreTypeLabel = SCORE_TYPES.find((s) => s.key === scoreType)?.label || "";

  return (
    <div>
      <PageHeader
        eyebrow="tercih robotu"
        title="Tercih Robotu"
        sub="Sınav türünü, puan türünü ve puanını gir; sana uygun üniversite bölümlerini görelim."
      />

      <AnimatePresence mode="wait">
        {!results ? (
          <motion.div
            key="wizard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <StepDots step={step} total={TOTAL_STEPS} />

            <div className="max-w-2xl">
              {/* Step 0: Exam Type */}
              {step === 0 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap size={18} className="text-subject-matematik" />
                      <span className="text-sm font-medium text-zinc-500">Adım 1</span>
                    </div>
                    <h2 className="font-heading font-extrabold text-xl mb-1">Hangi sınav için tercih yapacaksın?</h2>
                    <p className="text-sm text-zinc-500 mb-5">Sınav türünü seçerek başla.</p>
                    <div className="space-y-3">
                      {EXAM_TYPES.map((et) => {
                        const on = examType === et.key;
                        return (
                          <button
                            key={et.key}
                            onClick={() => setExamType(et.key)}
                            className={`w-full text-left rounded-2xl p-4 border-2 transition-all flex items-center justify-between ${on ? "border-subject-matematik bg-subject-matematik/5" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
                          >
                            <div>
                              <div className="font-heading font-bold text-sm">{et.label}</div>
                              <div className="text-xs text-zinc-500 mt-0.5">{et.desc}</div>
                            </div>
                            {on && <span className="h-6 w-6 rounded-full bg-subject-matematik grid place-items-center"><Check size={14} className="text-white" /></span>}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Step 1: Score Type */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={18} className="text-subject-matematik" />
                      <span className="text-sm font-medium text-zinc-500">Adım 2</span>
                    </div>
                    <h2 className="font-heading font-extrabold text-xl mb-1">Puan türünü seç</h2>
                    <p className="text-sm text-zinc-500 mb-5">{examLabel} puan türlerinden hangisini kullandın?</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {SCORE_TYPES.map((st) => {
                        const on = scoreType === st.key;
                        return (
                          <button
                            key={st.key}
                            onClick={() => setScoreType(st.key)}
                            className={`text-left rounded-2xl p-4 border-2 transition-all ${on ? "border-subject-matematik bg-subject-matematik/5" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-heading font-bold text-sm">{st.label}</span>
                              {on && <span className="h-5 w-5 rounded-full bg-subject-matematik grid place-items-center"><Check size={12} className="text-white" /></span>}
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">{st.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Step 2: Score Input */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Award size={18} className="text-subject-matematik" />
                      <span className="text-sm font-medium text-zinc-500">Adım 3</span>
                    </div>
                    <h2 className="font-heading font-extrabold text-xl mb-1">Yerleştirme puanını gir</h2>
                    <p className="text-sm text-zinc-500 mb-5">{examLabel} · {scoreTypeLabel} puan türündeki yerleştirme puanını gir.</p>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Örn: 425.50"
                      value={score}
                      onChange={(e) => { setScore(e.target.value); setError(""); }}
                      className={inputCls}
      data-testid="tercih-score-input"
                      autoFocus
                    />
                    {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}
                    <div className="mt-4 flex items-start gap-2 text-xs text-zinc-400 leading-relaxed">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      <span>ÖSYM sonuç belgendeki yerleştirme puanını gir. 100-600 arası olmalıdır.</span>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Step 3: Filters */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Filter size={18} className="text-subject-matematik" />
                      <span className="text-sm font-medium text-zinc-500">Adım 4</span>
                    </div>
                    <h2 className="font-heading font-extrabold text-xl mb-1">Tercihlerini belirt (opsiyonel)</h2>
                    <p className="text-sm text-zinc-500 mb-5">Bölüm, şehir veya üniversite filtreleyebilirsin. Boş bırakırsan tüm uygun bölümler listelenir.</p>

                    {/* Program keyword */}
                    <div className="mb-5">
                      <label className="text-sm font-medium text-zinc-700 mb-2 block">Bölüm adında ara</label>
                      <input
                        type="text"
                        placeholder="Örn: Bilgisayar, Hukuk, Tıp..."
                        value={programKeyword}
                        onChange={(e) => setProgramKeyword(e.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 outline-none focus:border-subject-matematik focus:ring-2 focus:ring-subject-matematik/20 transition text-sm"
                      />
                    </div>

                    {/* City filter */}
                    {cities.length > 0 && (
                      <div className="mb-5">
                        <label className="text-sm font-medium text-zinc-700 mb-2 block flex items-center gap-1.5"><MapPin size={14} /> Şehir ({selectedCities.length} seçili)</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {cities.map((c) => (
                            <button
                              key={c}
                              onClick={() => toggleCity(c)}
                              className={chipCls + (selectedCities.includes(c) ? " bg-subject-matematik text-white border-subject-matematik" : " border-zinc-300 text-zinc-600 hover:border-ink")}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* University filter */}
                    {universities.length > 0 && (
                      <div className="mb-2">
                        <label className="text-sm font-medium text-zinc-700 mb-2 block flex items-center gap-1.5"><Building2 size={14} /> Üniversite ({selectedUnis.length} seçili)</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {universities.map((u) => (
                            <button
                              key={u}
                              onClick={() => toggleUni(u)}
                              className={chipCls + (selectedUnis.includes(u) ? " bg-subject-matematik text-white border-subject-matematik" : " border-zinc-300 text-zinc-600 hover:border-ink")}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={back}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-ink disabled:opacity-30 transition-colors"
                >
                  <ArrowLeft size={16} /> Geri
                </button>
                <button
                  onClick={next}
                  disabled={!canNext()}
                  className="flex items-center gap-2 bg-ink text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-subject-matematik transition-colors disabled:opacity-40"
                  data-testid="tercih-next"
                >
                  {step === TOTAL_STEPS - 1 ? (
                    busy ? <Loader2 className="animate-spin" size={16} /> : <><Search size={16} /> Bölümleri Listele</>
                  ) : (
                    <>İleri <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Summary Bar */}
            <Card className="p-5 bg-gradient-to-br from-subject-matematik/5 to-transparent border-subject-matematik/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <div className="text-xs text-zinc-400">Sınav</div>
                    <div className="font-heading font-bold text-sm">{examLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Puan Türü</div>
                    <div className="font-heading font-bold text-sm">{scoreTypeLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Puanın</div>
                    <div className="font-heading font-extrabold text-lg">{results.userScore.toFixed(2)}</div>
                  </div>
                  {(selectedCities.length > 0 || selectedUnis.length > 0 || programKeyword) && (
                    <div>
                      <div className="text-xs text-zinc-400">Filtreler</div>
                      <div className="font-heading font-bold text-sm flex items-center gap-1">
                        <Filter size={12} />
                        {[
                          selectedCities.length > 0 && `${selectedCities.length} şehir`,
                          selectedUnis.length > 0 && `${selectedUnis.length} üniversite`,
                          programKeyword && `"${programKeyword}"`,
                        ].filter(Boolean).join(", ") || "Yok"}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Uygun Bölüm</div>
                    <div className="font-heading font-extrabold text-2xl text-subject-matematik">{totalResults}</div>
                  </div>
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-ink border border-zinc-300 rounded-lg px-3 py-2 hover:border-ink transition-colors"
                  >
                    <ArrowLeft size={14} /> Yeniden
                  </button>
                </div>
              </div>
            </Card>

            {totalResults === 0 ? (
              <Card className="p-10 text-center">
                <p className="text-zinc-500 mb-2">Girdiğin puana ve filtrelere uygun bölüm bulunamadı.</p>
                <p className="text-sm text-zinc-400">Puanını kontrol edip tekrar deneyebilir veya filtreleri azaltabilirsin.</p>
                <button onClick={reset} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-subject-matematik">
                  <ArrowLeft size={14} /> Başa dön
                </button>
              </Card>
            ) : (
              <>
                <div className="text-sm text-zinc-500 px-1">
                  {examLabel} · {scoreTypeLabel} puan türünde <strong className="text-ink">{results.userScore.toFixed(2)}</strong> puanınla sana uygun bölümler:
                </div>
                {results.guaranteed.length > 0 && (
                  <ProgramList
                    title="Rahatlıkla Yerleşebileceğin Bölümler"
                    programs={results.guaranteed}
                    category="guaranteed"
                    icon={Target}
                    color="#059669"
                  />
                )}
                {results.likely.length > 0 && (
                  <ProgramList
                    title="Muhtemelen Yerleşebileceğin Bölümler"
                    programs={results.likely}
                    category="likely"
                    icon={TrendingUp}
                    color="#D97706"
                  />
                )}
                {results.reach.length > 0 && (
                  <ProgramList
                    title="Çalışarak Ulaşabileceğin Bölümler"
                    programs={results.reach}
                    category="reach"
                    icon={Compass}
                    color="#E11D48"
                  />
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
