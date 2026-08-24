import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Medal } from "lucide-react";
import { fetchExams, fetchLeaderboard } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Spinner, Empty, EASE } from "@/app/ui";

const PERIODS = [["all", "Tüm Zamanlar"], ["monthly", "Aylık"], ["weekly", "Haftalık"], ["daily", "Günlük"]];
const METRICS = [["score", "Puan"], ["questions", "Doğru Soru"], ["xp", "XP"]];

export default function Leaderboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [period, setPeriod] = useState("all");
  const [metric, setMetric] = useState("score");
  const [examId, setExamId] = useState("");
  const [rows, setRows] = useState(null);

  useEffect(() => { fetchExams().then(setExams).catch(() => setExams([])); }, []);

  useEffect(() => {
    setRows(null);
    fetchLeaderboard(period, metric, examId || null, user?.id).then(setRows).catch(() => setRows([]));
  }, [period, metric, examId, user?.id]);

  const metricVal = (r) => (metric === "questions" ? r.total_correct : metric === "xp" ? r.xp : r.avg_score);
  const medal = ["#F59E0B", "#A1A1AA", "#B45309"];

  return (
    <div>
      <PageHeader eyebrow="liderlik tablosu" title="Platform Sıralaması" sub="Platform içi sıralamadır — gerçek Türkiye geneli sıralama değildir." />

      <div className="flex flex-wrap gap-2 mb-4">
        {PERIODS.map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)} data-testid={`lb-period-${v}`}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${period === v ? "bg-ink text-white border-ink" : "border-zinc-300 text-zinc-600"}`}>{l}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {METRICS.map(([v, l]) => (
          <button key={v} onClick={() => setMetric(v)} data-testid={`lb-metric-${v}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${metric === v ? "bg-subject-matematik/10 text-subject-matematik" : "text-zinc-500"}`}>{l}</button>
        ))}
        <select value={examId} onChange={(e) => setExamId(e.target.value)} data-testid="lb-exam" className="ml-auto rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm outline-none">
          <option value="">Tüm sınavlar</option>
          {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {rows === null ? <Spinner /> : rows.length === 0 ? <Empty text="Bu filtrede sıralama verisi yok." /> : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const me = r.user_id === user?.id;
            return (
              <motion.div key={r.user_id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, ease: EASE }}>
                <Card className={`p-4 flex items-center gap-4 ${me ? "border-subject-matematik bg-subject-matematik/5" : ""}`} data-testid={`lb-row-${r.rank}`}>
                  <div className="w-8 grid place-items-center">
                    {i < 3 ? <Medal size={22} style={{ color: medal[i] }} /> : <span className="font-heading font-bold text-zinc-400">{r.rank}</span>}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-subject-matematik/15 grid place-items-center font-heading font-bold text-subject-matematik">
                    {(r.name || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.name} {me && <span className="text-xs text-subject-matematik">(sen)</span>}</div>
                    <div className="text-xs text-zinc-400">{r.tests} deneme</div>
                  </div>
                  {i === 0 && <Crown size={18} className="text-subject-sosyal" />}
                  <div className="font-heading font-extrabold text-lg text-ink">{metricVal(r)}</div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
