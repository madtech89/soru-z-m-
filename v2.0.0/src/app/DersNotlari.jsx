import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, PlayCircle, FileText, X } from "lucide-react";
import { fetchExams, fetchSubjects, fetchStudyNotes } from "@/lib/api";
import { PageHeader, Card, Spinner, Empty, EASE } from "@/app/ui";
import { tone } from "@/lib/subjects";

function NoteModal({ note, subjSlug, onClose }) {
  const t = tone(subjSlug);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-6">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} data-testid="note-modal"
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[85vh] overflow-auto">
        <div className="sticky top-0 glass border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg pr-4">{note.title}</h3>
          <button onClick={onClose} data-testid="note-close"><X size={20} className="text-zinc-400" /></button>
        </div>
        <div className="p-6">
          <p className="text-zinc-500 mb-5">{note.description}</p>
          {note.video_url && (
            <div className="rounded-2xl overflow-hidden mb-5 border border-zinc-200" style={{ aspectRatio: "16/9" }}>
              <iframe src={note.video_url} title="video" className="w-full h-full" allowFullScreen />
            </div>
          )}
          {note.file_path && (
            <a href={note.file_path} target="_blank" rel="noreferrer" data-testid="note-file"
              className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-xl font-medium text-white" style={{ background: t.hex }}>
              <FileText size={16} /> {note.file_name || "Dokümanı aç"}
            </a>
          )}
          <div className="space-y-2 text-zinc-700 leading-relaxed text-[15px]">
            {note.content.split("\n").filter((l) => l.trim()).map((line, i) => {
              const s = line.trim();
              if (s.startsWith("## ")) return <h4 key={i} className="font-heading font-bold text-base pt-2">{s.slice(3)}</h4>;
              if (s.startsWith("# ")) return <h3 key={i} className="font-heading font-bold text-lg pt-2">{s.slice(2)}</h3>;
              if (s.startsWith("- ")) return <li key={i} className="ml-5 list-disc">{s.slice(2)}</li>;
              return <p key={i}>{s}</p>;
            })}
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
