import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Minus, Clock, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchTestReview, fetchTest } from "@/lib/api";
import { Card, Spinner, EASE } from "@/app/ui";
import { tone } from "@/lib/subjects";

const OPTS = ["A", "B", "C", "D", "E"];

export default function ExamReview() {
  const { testId, sessionId } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const [questions, setQuestions] = useState(null);
  const [test, setTest] = useState(null);
  const [idx, setIdx] = useState(0);

  const sid = sessionId || loc.state?.sessionId;

  useEffect(() => {
    fetchTest(testId).then((t) => setTest(t)).catch(() => {});
    if (sid) {
      fetchTestReview(sid, testId).then(setQuestions).catch(() => setQuestions([]));
    } else {
      fetchTest(testId).then((t) => {
        setQuestions(t.questions.map((q) => ({ ...q, selected_answer: null, is_correct: false, is_blank: true, time_spent: 0 })));
      });
    }
  }, [testId, sid]);

  if (!questions) return <Spinner />;

  const q = questions[idx];
  const t = tone(q.slug || "general");
  const correctCount = questions.filter((x) => x.is_correct).length;
  const wrongCount = questions.filter((x) => !x.is_correct && !x.is_blank).length;
  const blankCount = questions.filter((x) => x.is_blank).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => nav("/app/sonuc", { state: { result: loc.state?.result } })} className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-ink transition-colors">
          <ArrowLeft size={16} /> Geri
        </button>
        <div className="font-heading font-bold text-sm">{test?.name || "Deneme İnceleme"}</div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 text-center">
          <div className="font-heading font-extrabold text-2xl text-subject-fen">{correctCount}</div>
          <div className="text-xs text-zinc-500">Doğru</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="font-heading font-extrabold text-2xl text-subject-turkce">{wrongCount}</div>
          <div className="text-xs text-zinc-500">Yanlış</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="font-heading font-extrabold text-2xl text-zinc-400">{blankCount}</div>
          <div className="text-xs text-zinc-500">Boş</div>
        </Card>
      </div>

      {/* Question navigator */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-4">
        {questions.map((qq, i) => (
          <button key={qq.id} onClick={() => setIdx(i)}
            className={`shrink-0 h-9 w-9 rounded-lg font-heading font-bold text-xs border-2 transition-colors ${
              i === idx ? "border-ink" : "border-transparent"
            } ${
              qq.is_correct ? "bg-subject-fen text-white" :
              qq.is_blank ? "bg-zinc-100 text-zinc-400" :
              "bg-subject-turkce text-white"
            }`}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question detail */}
      <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28, ease: EASE }}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${q.is_correct ? "bg-subject-fen/10 text-subject-fen" : q.is_blank ? "bg-zinc-100 text-zinc-400" : "bg-subject-turkce/10 text-subject-turkce"}`}>
              {q.is_correct ? "Doğru" : q.is_blank ? "Boş" : "Yanlış"}
            </span>
            {q.time_spent > 0 && (
              <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock size={12} /> {q.time_spent}sn</span>
            )}
          </div>

          <p className="font-heading font-semibold leading-relaxed mb-4">Soru {idx + 1}: {q.question_text}</p>

          <div className="space-y-2">
            {OPTS.filter((o) => q[`option_${o.toLowerCase()}`]).map((o) => {
              const isCorrect = q.correct_answer === o;
              const isSelected = q.selected_answer === o;
              return (
                <div key={o}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                    isCorrect ? "border-subject-fen bg-subject-fen/10" :
                    isSelected ? "border-subject-turkce bg-subject-turkce/10" :
                    "border-zinc-200"
                  }`}>
                  <span className={`h-7 w-7 rounded-md grid place-items-center font-heading font-bold text-xs ${
                    isCorrect ? "bg-subject-fen text-white" :
                    isSelected ? "bg-subject-turkce text-white" :
                    "bg-zinc-100 text-zinc-500"
                  }`}>{o}</span>
                  <span className="text-sm flex-1">{q[`option_${o.toLowerCase()}`]}</span>
                  {isCorrect && <Check size={16} className="text-subject-fen" />}
                  {isSelected && !isCorrect && <X size={16} className="text-subject-turkce" />}
                  {isCorrect && isSelected && <Check size={16} className="text-subject-fen" />}
                </div>
              );
            })}
          </div>

          {q.explanation && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-50 text-sm text-zinc-600">
              <b className="text-ink">Açıklama: </b>{q.explanation}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 mt-6">
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-zinc-300 font-medium disabled:opacity-40 hover:border-ink transition-colors">
          <ChevronLeft size={18} /> Önceki
        </button>
        <span className="text-sm text-zinc-500">Soru {idx + 1} / {questions.length}</span>
        <button onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))} disabled={idx >= questions.length - 1} className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-zinc-300 font-medium disabled:opacity-40 hover:border-ink transition-colors">
          Sonraki <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
