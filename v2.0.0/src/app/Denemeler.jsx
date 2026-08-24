import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Clock, ArrowRight, HelpCircle } from "lucide-react";
import { fetchExams, fetchTests } from "@/lib/api";
import { PageHeader, Card, Spinner, Empty, EASE } from "@/app/ui";

export default function Denemeler() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [tests, setTests] = useState(null);

  useEffect(() => {
    fetchExams().then(setExams).catch(() => setExams([]));
  }, []);

  useEffect(() => {
    setTests(null);
    fetchTests(examId || null).then(setTests).catch(() => setTests([]));
  }, [examId]);

  return (
    <div>
      <PageHeader eyebrow="deneme sınavları" title="Denemeler" sub="Süreli deneme sınavlarını çöz, netini ve puanını gör." />
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
        <button onClick={() => setExamId("")} data-testid="deneme-filter-all"
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${examId === "" ? "bg-ink text-white border-ink" : "border-zinc-300 text-zinc-600 hover:border-ink"}`}>Tümü</button>
        {exams.map((e) => (
          <button key={e.id} onClick={() => setExamId(e.id)} data-testid={`deneme-filter-${e.name}`}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${examId === e.id ? "bg-ink text-white border-ink" : "border-zinc-300 text-zinc-600 hover:border-ink"}`}>{e.name}</button>
        ))}
      </div>

      {tests === null ? <Spinner /> : tests.length === 0 ? <Empty text="Bu sınav için henüz deneme eklenmemiş." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.4, ease: EASE }}>
              <Card className="p-6 h-full flex flex-col">
                <span className="h-11 w-11 rounded-xl bg-subject-matematik/10 grid place-items-center mb-4"><FileText size={19} className="text-subject-matematik" /></span>
                <h3 className="font-heading font-bold text-lg">{t.name}</h3>
                <p className="text-sm text-zinc-500 mt-1 flex-1">{t.description}</p>
                <div className="flex items-center gap-4 text-xs text-zinc-400 mt-4 mb-4">
                  <span className="flex items-center gap-1"><HelpCircle size={13} /> {(t.question_ids || []).length} soru</span>
                  <span className="flex items-center gap-1"><Clock size={13} /> {t.duration_minutes} dk</span>
                </div>
                <Link to={`/app/deneme/${t.id}`} data-testid={`start-test-${t.id}`} className="group flex items-center justify-center gap-2 bg-ink text-white font-semibold py-2.5 rounded-xl hover:bg-subject-matematik transition-colors">
                  Denemeyi başlat <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
