import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, PlayCircle, FileText, X, Sparkles, Loader2, Target } from "lucide-react";
import { fetchExams, fetchSubjects, fetchStudyNotes, recordNoteActivity, startTopicQuiz } from "@/lib/api";
import { PageHeader, Card, Spinner, Empty, EASE } from "@/app/ui";
import { tone } from "@/lib/subjects";
import { MarkdownRenderer } from "@/app/NoteStudio";
import { toast } from "sonner";

function NoteModal({ note, subjSlug, onClose }) {
  const t = tone(subjSlug);
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);
  const [startingQuiz, setStartingQuiz] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
      const totalElapsed = Math.floor((Date.now() - startTime) / 1000);
      if (totalElapsed >= 3 && note?.id) {
        recordNoteActivity(note.id, totalElapsed).catch(() => {});
      }
    };
  }, [note?.id]);

  const handleStartQuiz = async () => {
    if (!note?.topic_id) {
      toast.error("Bu ders notuna bağlı bir konu bulunamadı.");
      return;
    }
    setStartingQuiz(true);
    try {
      const res = await startTopicQuiz(note.topic_id, 20);
      toast.success("🎯 20 soruluk pekiştirme testi hazırlandı!");
      onClose();
      navigate(`/app/deneme/${res.test_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Test başlatılamadı, lütfen daha sonra deneyin.");
    } finally {
      setStartingQuiz(false);
    }
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-6 backdrop-blur-sm">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} data-testid="note-modal"
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-3xl max-h-[85vh] overflow-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 glass border-b border-zinc-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-heading font-extrabold text-xl text-ink pr-4">{note.title}</h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ⏱️ Çalışma Süresi: {mins > 0 ? `${mins} dk ` : ""}{secs} sn
            </span>
          </div>
          <button onClick={onClose} data-testid="note-close"><X size={20} className="text-zinc-400 hover:text-ink" /></button>
        </div>

        <div className="p-6 sm:p-8 space-y-5 flex-1">
          {note.description && <p className="text-zinc-500 italic text-sm">{note.description}</p>}
          {note.video_url && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-zinc-200" style={{ aspectRatio: "16/9" }}>
              <iframe src={note.video_url} title="video" className="w-full h-full" allowFullScreen />
            </div>
          )}
          {note.file_path && (
            <a href={note.file_path} target="_blank" rel="noreferrer" data-testid="note-file"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm hover:opacity-90 transition" style={{ background: t.hex }}>
              <FileText size={18} /> {note.file_name || "Ders Dokümanını İndir / Aç"}
            </a>
          )}
          <div className="pt-2 border-t border-zinc-100">
            <MarkdownRenderer content={note.content} />
          </div>

          {/* Konuyu Bitirdim -> 20 Soruluk Test Çöz CTA Kartı */}
          <div className="pt-6 border-t border-zinc-200">
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 text-center space-y-3">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <Sparkles size={22} />
              </div>
              <div>
                <h4 className="font-heading font-extrabold text-lg text-ink">Konuyu Bitirdin mi? Şimdi Bilgini Sına!</h4>
                <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto mt-1">
                  Bu konunun soru havuzundan senin için <strong>rastgele 20 soru</strong> seçip deneme oluşturalım. Çözdüğün her testte gelişim yüzden kaydedilir!
                </p>
              </div>
              <button
                onClick={handleStartQuiz}
                disabled={startingQuiz}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-heading font-extrabold text-sm sm:text-base text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 shadow-xl shadow-indigo-300/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {startingQuiz ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Test Hazırlanıyor...
                  </>
                ) : (
                  <>
                    🎯 20 Soruluk Pekiştirme Testini Başlat →
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}



export default function DersNotlari() {
  const [params] = useSearchParams();
  const topicFilter = params.get("topic_id");
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [notes, setNotes] = useState(null);
  const [subjMap, setSubjMap] = useState({});
  const [active, setActive] = useState(null);

  useEffect(() => { fetchExams().then(setExams).catch(() => setExams([])); }, []);

  useEffect(() => {
    setNotes(null);
    fetchStudyNotes(examId || null, topicFilter || null).then((r) => {
      setNotes(r);
      if (topicFilter && r[0]) setActive(r[0]);
    }).catch(() => setNotes([]));
  }, [examId, topicFilter]);

  useEffect(() => {
    if (!examId) return;
    fetchSubjects(examId).then((r) => setSubjMap(Object.fromEntries(r.map((s) => [s.id, s.slug])))).catch(() => {});
  }, [examId]);

  return (
    <div>
      <PageHeader eyebrow="ders notları" title="Ders Notları" sub="Konu anlatımları, dokümanlar ve video kaynakları." />

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
        <button onClick={() => setExamId("")} data-testid="note-filter-all" className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${examId === "" ? "bg-ink text-white border-ink" : "border-zinc-300 text-zinc-600"}`}>Tümü</button>
        {exams.map((e) => (
          <button key={e.id} onClick={() => setExamId(e.id)} data-testid={`note-filter-${e.name}`} className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${examId === e.id ? "bg-ink text-white border-ink" : "border-zinc-300 text-zinc-600"}`}>{e.name}</button>
        ))}
      </div>

      {notes === null ? <Spinner /> : notes.length === 0 ? <Empty text="Ders notu bulunamadı." /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((n, i) => {
            const t = tone(subjMap[n.subject_id]);
            return (
              <motion.button key={n.id} onClick={() => setActive(n)} data-testid={`note-${n.id}`}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, ease: EASE }}
                className="text-left">
                <Card className="p-6 h-full hover:-translate-y-1 transition-transform">
                  <span className="h-11 w-11 rounded-xl grid place-items-center mb-4" style={{ background: t.soft }}>
                    <BookOpen size={19} style={{ color: t.hex }} />
                  </span>
                  <h3 className="font-heading font-bold">{n.title}</h3>
                  <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{n.description}</p>
                  <div className="flex items-center gap-3 mt-4 text-xs text-zinc-400">
                    {n.video_url && <span className="flex items-center gap-1"><PlayCircle size={13} /> Video</span>}
                    {n.file_path && <span className="flex items-center gap-1"><FileText size={13} /> Doküman</span>}
                  </div>
                </Card>
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {active && <NoteModal note={active} subjSlug={subjMap[active.subject_id]} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </div>
  );
}
