import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Loader2 } from "lucide-react";
import { fetchExams, fetchExamScoring, calculateScore } from "@/lib/api";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";

export default function PuanHesapla() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [cfg, setCfg] = useState(null);
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchExams().then((r) => { setExams(r); if (r[0]) setExamId(r[0].id); }).catch(() => setExams([]));
  }, []);

  useEffect(() => {
    if (!examId) return;
    setResult(null);
    setCfg(null);
    fetchExamScoring(examId).then((c) => {
      setCfg(c);
      setRows((c.sections || []).map((s) => ({ name: s.name, correct: 0, wrong: 0, blank: 0 })));
    }).catch(() => {
      setCfg({ sections: [], base_score: 100, multiplier: 1, score_type: "Ham Puan" });
      setRows([]);
    });
  }, [examId]);

  const setVal = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: Math.max(0, Number(v) || 0) } : r)));

  const calc = async () => {
    setBusy(true);
    try {
      const data = await calculateScore(examId, rows);
      setResult(data);
    } finally { setBusy(false); }
  };

  const inputCls = "w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-center outline-none focus:border-subject-matematik";

  return (
    <div>
      <PageHeader eyebrow="puan hesaplama" title="Puan Hesapla" sub="Sınav bazlı net, katsayı ve puan kurallarına göre puanını hesapla." />

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
        {exams.map((e) => (
          <button key={e.id} onClick={() => setExamId(e.id)} data-testid={`score-exam-${e.name}`}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${examId === e.id ? "bg-ink text-white border-ink" : "border-zinc-300 text-zinc-600"}`}>{e.name}</button>
        ))}
      </div>

      {!cfg ? <Spinner /> : rows.length === 0 ? (
        <Card className="p-10 text-center text-zinc-400">Bu sınav için puanlama henüz tanımlı değil. Admin panelinden ekleyebilirsin.</Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="p-6 lg:col-span-2">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center text-xs font-semibold text-zinc-400 mb-2 px-1">
              <span>Ders / Test</span><span className="w-16 text-center">Doğru</span><span className="w-16 text-center">Yanlış</span><span className="w-16 text-center">Boş</span>
            </div>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                  <span className="text-sm font-medium truncate">{r.name}</span>
                  <input type="number" value={r.correct} onChange={(e) => setVal(i, "correct", e.target.value)} className={`${inputCls} w-16`} data-testid={`score-correct-${i}`} />
                  <input type="number" value={r.wrong} onChange={(e) => setVal(i, "wrong", e.target.value)} className={`${inputCls} w-16`} data-testid={`score-wrong-${i}`} />
                  <input type="number" value={r.blank} onChange={(e) => setVal(i, "blank", e.target.value)} className={`${inputCls} w-16`} />
                </div>
              ))}
            </div>
            <button onClick={calc} disabled={busy} data-testid="score-calc" className="mt-6 flex items-center gap-2 bg-ink text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-subject-matematik transition-colors disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />} Hesapla
            </button>
          </Card>

          <div>
            {result ? (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}>
                <Card className="p-6 text-center">
                  <div className="text-sm text-zinc-500">{result.score_type}</div>
                  <div className="font-heading font-extrabold text-5xl text-subject-matematik mt-2" data-testid="score-result">{result.score}</div>
                  <div className="text-zinc-400 mt-1">Toplam net: {result.total_net}</div>
                  <div className="mt-5 space-y-2 text-left">
                    {result.breakdown.map((b) => (
                      <div key={b.name} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 truncate">{b.name}</span>
                        <span className="font-semibold">{b.net} net ×{b.coefficient}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Card className="p-6 text-center text-zinc-400 text-sm">Doğru/yanlış sayılarını gir ve Hesapla'ya bas.</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
