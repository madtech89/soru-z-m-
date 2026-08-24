import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, X, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { fetchExams, fetchSubjects, fetchQuestions, answerPracticeQuestion } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Spinner, Empty, EASE } from "@/app/ui";
import { tone } from "@/lib/subjects";

const OPTS = ["A", "B", "C", "D", "E"];
const DIFFS = [["", "Tümü"], ["kolay", "Kolay"], ["orta", "Orta"], ["zor", "Zor"]];

function QuestionCard({ q, subjectSlug, userId }) {
  const [sel, setSel] = useState(null);
  const [res, setRes] = useState(null);
  const t = tone(subjectSlug);

  const answer = async (o) => {
    if (res) return;
    setSel(o);
    try {
      const data = await answerPracticeQuestion(q.id, o, userId);
      setRes(data);
    } catch {
      setRes({ is_correct: false, correct_answer: q.correct_answer, explanation: "Hata oluştu." });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: t.soft, color: t.hex }}>{q.difficulty}</span>
        {(q.tags || []).slice(0, 2).map((tg) => <span key={tg} className="text-xs text-zinc-400">#{tg}</span>)}
      </div>
      <p className="font-heading font-semibold leading-relaxed mb-4">{q.question_text}</p>
      <div className="space-y-2">
        {OPTS.filter((o) => q[`option_${o.toLowerCase()}`]).map((o) => {
          const isCorrect = res && res.correct_answer === o;
          const isWrongSel = res && sel === o && !res.is_correct;
          return (
            <button key={o} onClick={() => answer(o)} disabled={!!res} data-testid={`qb-${q.id}-opt-${o}`}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                isCorrect ? "border-subject-fen bg-subject-fen/10" :
                isWrongSel ? "border-subject-turkce bg-subject-turkce/10" :
                sel === o ? "border-subject-matematik" : "border-zinc-200 hover:border-zinc-300"}`}>
              <span className="h-7 w-7 rounded-md grid place-items-center font-heading font-bold text-xs bg-zinc-100">{o}</span>
              <span className="text-sm flex-1">{q[`option_${o.toLowerCase()}`]}</span>
              {isCorrect && <Check size={16} className="text-subject-fen" />}
              {isWrongSel && <X size={16} className="text-subject-turkce" />}
            </button>
          );
        })}
      </div>
      {res && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-4 rounded-xl bg-zinc-50 text-sm text-zinc-600">
          <b className={res.is_correct ? "text-subject-fen" : "text-subject-turkce"}>
            {res.is_correct ? "Doğru!" : `Yanlış — doğru cevap ${res.correct_answer}`}
          </b>
          <p className="mt-1">{res.explanation}</p>
        </motion.div>
      )}
    </Card>
  );
}

export default function QuestionBank() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjMap, setSubjMap] = useState({});
  const [f, setF] = useState({ exam_id: "", subject_id: "", difficulty: "", status: "", result_filter: "" });
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchExams().then(setExams).catch(() => setExams([])); }, []);

  useEffect(() => {
    if (!f.exam_id) { setSubjects([]); return; }
    fetchSubjects(f.exam_id).then((r) => {
      setSubjects(r);
      setSubjMap(Object.fromEntries(r.map((s) => [s.id, s.slug])));
    }).catch(() => setSubjects([]));
  }, [f.exam_id]);

  const load = useCallback(() => {
    setData(null);
    fetchQuestions({ ...f, page, page_size: 8, userId: user?.id }).then(setData).catch(() => setData({ items: [], page: 1, pages: 1 }));
  }, [f, page, user?.id]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => { setPage(1); setF((s) => ({ ...s, [k]: v, ...(k === "exam_id" ? { subject_id: "" } : {}) })); };
  const selCls = "rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-subject-matematik";

  return (
    <div>
      <PageHeader eyebrow="soru bankası" title="Soru Bankası" sub="Ders, konu ve zorluğa göre soru çöz. Anında geri bildirim al." />

      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 mb-3"><Filter size={15} /> Filtreler</div>
        <div className="flex flex-wrap gap-3">
          <select data-testid="qb-exam" value={f.exam_id} onChange={(e) => set("exam_id", e.target.value)} className={selCls}>
            <option value="">Tüm sınavlar</option>
            {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select data-testid="qb-subject" value={f.subject_id} onChange={(e) => set("subject_id", e.target.value)} className={selCls} disabled={!subjects.length}>
            <option value="">Tüm dersler</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-1.5">
            {DIFFS.map(([v, l]) => (
              <button key={v} onClick={() => set("difficulty", v)} data-testid={`qb-diff-${v || "all"}`}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${f.difficulty === v ? "bg-ink text-white border-ink" : "border-zinc-300 text-zinc-600"}`}>{l}</button>
            ))}
          </div>
          <select data-testid="qb-result" value={f.result_filter} onChange={(e) => set("result_filter", e.target.value)} className={selCls}>
            <option value="">Tümü</option>
            <option value="wrong">Yanlış yaptıklarım</option>
            <option value="blank">Boş bıraktıklarım</option>
            <option value="correct">Doğru yaptıklarım</option>
          </select>
        </div>
      </Card>

      {data === null ? <Spinner /> : data.items.length === 0 ? <Empty text="Bu filtreye uygun soru bulunamadı." /> : (
        <>
          <div className="space-y-4">
            {data.items.map((q, i) => (
              <motion.div key={q.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}>
                <QuestionCard q={q} subjectSlug={subjMap[q.subject_id]} userId={user?.id} />
              </motion.div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} data-testid="qb-prev" className="flex items-center gap-1 px-4 py-2 rounded-xl border border-zinc-300 disabled:opacity-40"><ChevronLeft size={16} /> Önceki</button>
            <span className="text-sm text-zinc-500">Sayfa {data.page} / {data.pages}</span>
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} data-testid="qb-next" className="flex items-center gap-1 px-4 py-2 rounded-xl border border-zinc-300 disabled:opacity-40">Sonraki <ChevronRight size={16} /></button>
          </div>
        </>
      )}
    </div>
  );
}
