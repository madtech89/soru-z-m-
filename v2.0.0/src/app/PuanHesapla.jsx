import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, RotateCcw, GraduationCap, ArrowRight, Sparkles,
  Info, Check, Compass, Award, ShieldCheck, Flame, BookOpen, Layers,
} from "lucide-react";
import { EXAM_SCORING_PRESETS, computeExamScores, calculateNet } from "@/lib/scoring";
import { PageHeader, Card, EASE } from "@/app/ui";

const EXAM_KEYS = [
  { key: "YKS", label: "YKS (TYT · AYT · YDT)" },
  { key: "LGS", label: "LGS" },
  { key: "KPSS_LISANS", label: "KPSS Lisans" },
  { key: "KPSS_ONLISANS", label: "KPSS Ön Lisans" },
  { key: "ALES", label: "ALES" },
  { key: "DGS", label: "DGS" },
  { key: "MSU", label: "MSÜ" },
  { key: "TUS", label: "TUS" },
  { key: "DUS", label: "DUS" },
  { key: "YDS", label: "YDS / YÖKDİL" },
];

export default function PuanHesapla() {
  const [selectedExam, setSelectedExam] = useState("YKS");
  const [yksSubTab, setYksSubTab] = useState("ALL"); // ALL, SAY, EA, SOZ, DIL
  const [inputs, setInputs] = useState({});
  const [diplomaScore, setDiplomaScore] = useState(85);
  const [isKirikOBP, setIsKirikOBP] = useState(false);

  const preset = EXAM_SCORING_PRESETS[selectedExam] || EXAM_SCORING_PRESETS.YKS;

  const handleInputChange = (sectionKey, field, val, maxCount) => {
    const num = Math.max(0, Math.min(maxCount, Number(val) || 0));
    setInputs((prev) => {
      const current = prev[sectionKey] || { correct: 0, wrong: 0, penalty: preset.sections[sectionKey]?.penalty || 0.25 };
      const updated = { ...current, [field]: num };
      // ensure correct + wrong <= max
      if (updated.correct + updated.wrong > maxCount) {
        if (field === "correct") updated.wrong = maxCount - updated.correct;
        else updated.correct = maxCount - updated.wrong;
      }
      return { ...prev, [sectionKey]: updated };
    });
  };

  const handleReset = () => {
    setInputs({});
  };

  // Live Score Calculation
  const result = useMemo(() => {
    return computeExamScores(selectedExam, inputs, diplomaScore, isKirikOBP);
  }, [selectedExam, inputs, diplomaScore, isKirikOBP]);

  // Filter sections for YKS tabs if needed
  const visibleSections = useMemo(() => {
    if (selectedExam !== "YKS" || yksSubTab === "ALL") {
      return Object.entries(preset.sections);
    }
    return Object.entries(preset.sections).filter(([k, s]) => {
      if (s.exam === "TYT") return true;
      if (yksSubTab === "SAY") return ["ayt_matematik", "ayt_fizik", "ayt_kimya", "ayt_biyoloji"].includes(k);
      if (yksSubTab === "EA") return ["ayt_matematik", "ayt_edebiyat", "ayt_tarih1", "ayt_cografya1"].includes(k);
      if (yksSubTab === "SOZ") return ["ayt_edebiyat", "ayt_tarih1", "ayt_cografya1", "ayt_tarih2", "ayt_cografya2", "ayt_felsefe", "ayt_din"].includes(k);
      if (yksSubTab === "DIL") return k === "ydt_dil";
      return true;
    });
  }, [selectedExam, yksSubTab, preset]);

  return (
    <div className="max-w-7xl mx-auto pb-16">
      <PageHeader
        eyebrow="Resmi ÖSYM & MEB Standartları"
        title="Gelişmiş Puan ve Sıralama Hesaplama"
        sub="Tüm sınav türleri, alan katsayıları, OBP ek puanları ve güncel yanlış-doğru oranlarıyla anlık hesaplayın."
      />

      {/* Sınav Türü Seçici */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-6">
        {EXAM_KEYS.map((e) => (
          <button
            key={e.key}
            onClick={() => {
              setSelectedExam(e.key);
              setInputs({});
            }}
            className={`shrink-0 px-4 py-2.5 rounded-2xl text-sm font-bold border transition-all ${
              selectedExam === e.key
                ? "bg-ink text-white border-ink shadow-md shadow-ink/10 scale-[1.02]"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* YKS Alan Sekmeleri */}
      {selectedExam === "YKS" && (
        <div className="flex flex-wrap items-center gap-2 mb-6 p-1.5 bg-zinc-100 rounded-2xl w-fit">
          {[
            { id: "ALL", label: "Tüm Testler (Genel)" },
            { id: "SAY", label: "Sayısal Alanı (SAY)" },
            { id: "EA", label: "Eşit Ağırlık Alanı (EA)" },
            { id: "SOZ", label: "Sözel Alanı (SÖZ)" },
            { id: "DIL", label: "Yabancı Dil (YDT)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setYksSubTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                yksSubTab === tab.id
                  ? "bg-white text-ink shadow-sm"
                  : "text-zinc-500 hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Sol Panel: Doğru / Yanlış / Net Giriş Tablosu */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
              <div>
                <h3 className="font-heading font-extrabold text-lg text-ink">{preset.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedExam === "LGS" ? "3 yanlış 1 doğruyu götürür (0.33 ceza)" : selectedExam === "YDS" ? "Yanlış doğruyu götürmez" : "4 yanlış 1 doğruyu götürür (0.25 ceza)"}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-rose-600 transition-colors"
              >
                <RotateCcw size={13} /> Sıfırla
              </button>
            </div>

            {/* Tablo Başlıkları */}
            <div className="grid grid-cols-[1fr_65px_65px_65px] gap-2.5 items-center text-xs font-bold text-zinc-400 uppercase tracking-wider pb-2 border-b border-zinc-100">
              <span>Test / Branş</span>
              <span className="text-center text-emerald-600">Doğru</span>
              <span className="text-center text-rose-500">Yanlış</span>
              <span className="text-center text-subject-matematik">Net</span>
            </div>

            {/* Test Satırları */}
            <div className="divide-y divide-zinc-100">
              {visibleSections.map(([key, s]) => {
                const current = inputs[key] || { correct: 0, wrong: 0 };
                const net = calculateNet(current.correct, current.wrong, s.penalty !== undefined ? s.penalty : 0.25);
                const remainingBlank = s.max - (current.correct + current.wrong);

                return (
                  <div key={key} className="grid grid-cols-[1fr_65px_65px_65px] gap-2.5 items-center py-3">
                    <div className="min-w-0 pr-2">
                      <div className="text-sm font-semibold text-zinc-800 truncate">{s.name}</div>
                      <div className="text-xs text-zinc-400">{s.max} soru {remainingBlank > 0 ? `· ${remainingBlank} boş` : ""}</div>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max={s.max}
                        value={current.correct || ""}
                        placeholder="0"
                        onChange={(e) => handleInputChange(key, "correct", e.target.value, s.max)}
                        className="w-full text-center py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-bold text-emerald-700 outline-none focus:border-emerald-500 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max={s.max}
                        value={current.wrong || ""}
                        placeholder="0"
                        onChange={(e) => handleInputChange(key, "wrong", e.target.value, s.max)}
                        className="w-full text-center py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-bold text-rose-600 outline-none focus:border-rose-500 focus:bg-white transition"
                      />
                    </div>
                    <div className="text-center font-heading font-extrabold text-sm text-subject-matematik bg-subject-matematik/5 py-2 rounded-xl">
                      {net.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* OBP / Diploma Notu Bölümü (YKS ve DGS için) */}
          {(preset.hasOBP) && (
            <Card className="p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border-indigo-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-xl bg-subject-matematik text-white grid place-items-center">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-base text-ink">
                    {selectedExam === "DGS" ? "Ön Lisans Başarı Puanı (ÖBP)" : "Ortaöğretim Başarı Puanı (OBP)"}
                  </h4>
                  <p className="text-xs text-zinc-500">Yerleştirme puanınıza eklenecek okul başarı katkısı</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">
                    {selectedExam === "DGS" ? "Ön Lisans Mezuniyet Notu (50 - 100)" : "Lise Diploma Notu (50 - 100)"}
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    step="0.1"
                    value={diplomaScore}
                    onChange={(e) => setDiplomaScore(Math.min(100, Math.max(50, Number(e.target.value) || 50)))}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white font-heading font-bold text-base outline-none focus:border-subject-matematik transition"
                  />
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    OBP Değeri: {(diplomaScore * (selectedExam === "DGS" ? 0.6 : 5)).toFixed(1)} · Katkı: +{result.obpAddon || 0} puan
                  </span>
                </div>

                {selectedExam === "YKS" && (
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isKirikOBP}
                      onChange={(e) => setIsKirikOBP(e.target.checked)}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-xs leading-tight">
                      <span className="font-bold text-amber-900 block">Kırık OBP (Önceki Yıl Yerleştim)</span>
                      <span className="text-amber-700 text-[11px]">Katkı yarı yarıya düşer (0.06 katsayı)</span>
                    </div>
                  </label>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Sağ Panel: Anlık Hesaplanan Puan Kartları */}
        <div className="lg:col-span-5 space-y-5 sticky top-6">
          <Card className="p-6 bg-paper border-zinc-200 shadow-xl shadow-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Hesaplama Özeti</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check size={12} /> Canlı Hesaplandı
              </span>
            </div>

            {/* Ana Puan Göstergesi */}
            <div className="text-center py-4 bg-white rounded-2xl border border-zinc-100 shadow-sm mb-5">
              <div className="text-xs font-semibold text-zinc-400">{result.primaryType}</div>
              <div className="font-heading font-extrabold text-5xl text-ink tracking-tight mt-1">
                {result.primaryScore.toFixed(2)}
              </div>
              {result.level && (
                <div className="text-xs font-bold text-subject-matematik mt-1.5">{result.level}</div>
              )}
            </div>

            {/* Puan Türleri & Yerleştirme Listesi */}
            <div className="space-y-3">
              {result.scores?.map((sc, idx) => (
                <motion.div
                  key={sc.type}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3, ease: EASE }}
                  className="p-4 rounded-2xl border border-zinc-200 bg-white hover:border-subject-matematik/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-700 block">{sc.type}</span>
                      <span className="text-[11px] text-zinc-400">Toplam Net: {sc.net.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-heading font-extrabold text-xl text-ink">
                        {sc.score.toFixed(2)}
                      </div>
                      {sc.yerlestirme && (
                        <div className="text-[11px] font-bold text-emerald-600">
                          Yerleştirme: {sc.yerlestirme.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Tercih Robotuna Aktar Butonu */}
            <div className="mt-6 pt-5 border-t border-zinc-100">
              <Link
                to={`/app/tercih-robotu?score=${result.primaryScore}`}
                className="w-full py-3.5 px-4 rounded-2xl bg-ink text-white font-heading font-bold text-sm flex items-center justify-center gap-2 hover:bg-subject-matematik transition-colors shadow-md shadow-ink/10 group"
              >
                <Compass size={18} className="group-hover:rotate-45 transition-transform" />
                Bu Puanla Tercih Robotu'na Git
                <ArrowRight size={16} />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
