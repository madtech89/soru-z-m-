import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Landmark, Stethoscope, Car, Briefcase, Languages, School, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { fetchExams } from "@/lib/api";
import { EASE } from "@/app/ui";

const CATEGORY_META = {
  universite: { label: "Üniversite", icon: GraduationCap, color: "#4F46E5" },
  lise: { label: "Lise", icon: School, color: "#10B981" },
  ortaokul: { label: "Ortaokul", icon: BookOpen, color: "#F59E0B" },
  kpss: { label: "Kamu Personeli", icon: Landmark, color: "#0F172A" },
  saglik: { label: "Sağlık", icon: Stethoscope, color: "#EC4899" },
  surucu: { label: "Sürücü", icon: Car, color: "#F43F5E" },
  mesleki: { label: "Mesleki", icon: Briefcase, color: "#6366F1" },
  dil: { label: "Yabancı Dil", icon: Languages, color: "#14B8A6" },
};

export default function Onboarding() {
  const nav = useNavigate();
  const [exams, setExams] = useState(null);
  const [category, setCategory] = useState("universite");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchExams().then(setExams).catch(() => setExams([]));
  }, []);

  const filteredExams = (exams || []).filter((e) => e.category === category);
  const categories = Object.keys(CATEGORY_META).filter((cat) =>
    (exams || []).some((e) => e.category === cat)
  );

  const start = () => {
    if (!selected) return;
    nav(`/test?exam_id=${selected}`);
  };

  if (!exams) {
    return (
      <div className="min-h-screen grid place-items-center bg-paper">
        <Loader2 className="animate-spin text-subject-matematik" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-12">
        <div className="flex items-center gap-2 mb-12">
          <span className="h-8 w-8 rounded-lg bg-subject-matematik grid place-items-center"><Sparkles size={16} className="text-white" /></span>
          <span className="font-heading font-extrabold text-xl tracking-tight">Netor</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          <div className="font-editorial italic text-subject-matematik mb-2">— seviyeni ölç</div>
          <h1 className="font-heading font-extrabold tracking-tighter text-4xl sm:text-5xl mb-3">
            Hangi sınava hazırlanıyorsun?
          </h1>
          <p className="text-zinc-500 text-lg mb-10">
            Sınavını seç, 30 soruluk kısa bir seviye ölçme testi çözelim. Sonucunu ve eksiklerini hemen görelim.
          </p>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            return (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setSelected(null); }}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-colors ${
                  category === cat ? "bg-ink text-white border-ink" : "border-zinc-300 text-zinc-600 hover:border-ink"
                }`}
              >
                <Icon size={16} /> {meta.label}
              </button>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {filteredExams.map((e, i) => {
            const on = selected === e.id;
            return (
              <motion.button
                key={e.id}
                onClick={() => setSelected(e.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.4, ease: EASE }}
                className={`text-left rounded-2xl p-5 border-2 transition-all ${
                  on ? "border-subject-matematik bg-subject-matematik/5" : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`h-9 w-9 rounded-lg grid place-items-center ${on ? "bg-subject-matematik text-white" : "bg-zinc-100 text-zinc-500"}`}>
                    {on ? <Check size={17} /> : <GraduationCap size={17} />}
                  </span>
                </div>
                <div className="font-heading font-bold">{e.name}</div>
                <div className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{e.description}</div>
              </motion.button>
            );
          })}
        </div>

        <button
          onClick={start}
          disabled={!selected}
          className="w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3.5 rounded-xl hover:bg-subject-matematik transition-colors disabled:opacity-40"
        >
          Seviye Ölçme Testine Başla <ArrowRight size={18} />
        </button>

        <p className="text-center text-sm text-zinc-400 mt-4">
          Kayıt gerekmez — testi çöz, sonucunu gör, beğenirsen kayıt ol.
        </p>
      </div>
    </div>
  );
}
