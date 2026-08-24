import { useLocation, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Check, X, Minus, Target, ArrowRight, RotateCcw } from "lucide-react";
import { Card, EASE } from "@/app/ui";

export default function Result() {
  const { state } = useLocation();
  const r = state?.result;
  if (!r) return <Navigate to="/app/denemeler" replace />;

  const items = [
    { label: "Doğru", value: r.correct, color: "#10B981", icon: Check },
    { label: "Yanlış", value: r.wrong, color: "#F43F5E", icon: X },
    { label: "Boş", value: r.blank, color: "#A1A1AA", icon: Minus },
    { label: "Net", value: r.net, color: "#4F46E5", icon: Target },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}>
        <Card className="p-8 text-center relative overflow-hidden">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-subject-matematik/10" />
          <div className="relative">
            <span className="inline-grid place-items-center h-16 w-16 rounded-2xl bg-subject-sosyal/15 mb-4">
              <Trophy size={30} className="text-subject-sosyal" />
            </span>
            <div className="text-sm text-zinc-500">{r.test_name}</div>
            <div className="font-heading font-extrabold text-6xl mt-2 text-subject-matematik" data-testid="result-score">{r.score}</div>
            <div className="text-zinc-400 mt-1">puan · başarı %{r.success_rate}</div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        {items.map((it, i) => (
          <motion.div key={it.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, ease: EASE }}>
            <Card className="p-5 text-center" data-testid={`result-${it.label}`}>
              <span className="inline-grid place-items-center h-9 w-9 rounded-lg mb-2" style={{ background: `${it.color}18` }}>
                <it.icon size={16} style={{ color: it.color }} />
              </span>
              <div className="font-heading font-extrabold text-2xl" style={{ color: it.color }}>{it.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{it.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Link to="/app/eksiklerim" data-testid="result-weak" className="flex-1 flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3 rounded-xl hover:bg-subject-matematik transition-colors">
          Eksik konularımı gör <ArrowRight size={17} />
        </Link>
        <Link to="/app/denemeler" data-testid="result-again" className="flex-1 flex items-center justify-center gap-2 border border-zinc-300 font-semibold py-3 rounded-xl hover:border-ink transition-colors">
          <RotateCcw size={16} /> Başka deneme çöz
        </Link>
      </div>
    </div>
  );
}
