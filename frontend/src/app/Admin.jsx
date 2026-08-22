import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, HelpCircle, FileText, Database, BarChart3, Plus, Loader2, Upload, BookOpen, Calculator } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-subject-matematik transition";

function ExamPicker({ examId, subjectId, topicId, onChange, exams }) {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  useEffect(() => { if (examId) api.get(`/exams/${examId}/subjects`).then((r) => setSubjects(r.data)); else setSubjects([]); }, [examId]);
  useEffect(() => { if (examId && subjectId) api.get(`/exams/${examId}/topics?subject_id=${subjectId}`).then((r) => setTopics(r.data)); else setTopics([]); }, [examId, subjectId]);
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <select value={examId} onChange={(e) => onChange({ examId: e.target.value, subjectId: "", topicId: "" })} className={inputCls} data-testid="admin-pick-exam">
        <option value="">Sınav</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <select value={subjectId} onChange={(e) => onChange({ examId, subjectId: e.target.value, topicId: "" })} className={inputCls} data-testid="admin-pick-subject">
        <option value="">Ders</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select value={topicId} onChange={(e) => onChange({ examId, subjectId, topicId: e.target.value })} className={inputCls} data-testid="admin-pick-topic">
        <option value="">Konu</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [tab, setTab] = useState("exam");
  const [busy, setBusy] = useState(false);

  const [exam, setExam] = useState({ name: "", description: "" });
  const [q, setQ] = useState({ exam_id: "", subject_id: "", topic_id: "", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", option_e: "", correct_answer: "A", difficulty: "orta", explanation: "" });
  const [note, setNote] = useState({ exam_id: "", subject_id: "", topic_id: "", title: "", description: "", content: "", video_url: "", file_path: null, file_name: null });
  const [csvReport, setCsvReport] = useState(null);
  const [scoreExam, setScoreExam] = useState("");
  const [scoreCfg, setScoreCfg] = useState(null);

  const loadStats = () => api.get("/admin/stats").then((r) => setStats(r.data));
  useEffect(() => { loadStats(); api.get("/exams").then((r) => setExams(r.data)); }, []);
  useEffect(() => { if (scoreExam) api.get(`/exams/${scoreExam}/scoring`).then((r) => setScoreCfg(r.data || { sections: [], base_score: 100, multiplier: 1, score_type: "Ağırlıklı Puan" })); }, [scoreExam]);

  const createExam = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post("/admin/exams", { ...exam, exam_type: "general", status: "active" });
      toast.success("Sınav eklendi!"); setExam({ name: "", description: "" });
      api.get("/exams").then((r) => setExams(r.data)); loadStats();
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const createQuestion = async (e) => {
    e.preventDefault();
    if (!q.topic_id) return toast.error("Ders ve konu seç.");
    setBusy(true);
    try {
      await api.post("/admin/questions", { ...q, tags: [], year: null, source: "Admin" });
      toast.success("Soru eklendi!");
      setQ((s) => ({ ...s, question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", option_e: "", explanation: "" }));
      loadStats();
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const uploadNoteFile = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setNote((s) => ({ ...s, file_path: data.path, file_name: data.name }));
      toast.success("Dosya yüklendi!");
    } catch { toast.error("Dosya yüklenemedi."); }
  };

  const createNote = async (e) => {
    e.preventDefault();
    if (!note.exam_id || !note.title) return toast.error("Sınav ve başlık gerekli.");
    setBusy(true);
    try {
      await api.post("/admin/notes", { ...note, status: "published" });
      toast.success("Ders notu eklendi!");
      setNote({ exam_id: "", subject_id: "", topic_id: "", title: "", description: "", content: "", video_url: "", file_path: null, file_name: null });
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const importCsv = async (file) => {
    if (!file) return;
    setBusy(true); setCsvReport(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/admin/questions/import-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setCsvReport(data); loadStats();
      toast.success(`${data.inserted} soru eklendi`);
    } catch { toast.error("İçe aktarılamadı."); } finally { setBusy(false); }
  };

  const saveScoring = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/exams/${scoreExam}/scoring`, scoreCfg);
      toast.success("Puanlama kaydedildi!");
    } catch { toast.error("Kaydedilemedi."); } finally { setBusy(false); }
  };

  if (!stats) return <Spinner />;

  const cards = [
    { icon: Users, label: "Kullanıcı", value: stats.users, color: "#4F46E5" },
    { icon: GraduationCap, label: "Sınav", value: stats.exams, color: "#10B981" },
    { icon: HelpCircle, label: "Soru", value: stats.questions, color: "#F59E0B" },
    { icon: FileText, label: "Deneme", value: stats.tests, color: "#EC4899" },
    { icon: Database, label: "Cevap", value: stats.answers, color: "#F43F5E" },
    { icon: BarChart3, label: "Sonuç", value: stats.results, color: "#0F172A" },
  ];
  const tabs = [["exam", "Sınav"], ["question", "Soru"], ["note", "Ders Notu"], ["csv", "CSV İçe Aktar"], ["scoring", "Puanlama"]];

  return (
    <div>
      <PageHeader eyebrow="yönetim" title="Admin Paneli" sub="Sistem istatistikleri, içerik ve puanlama yönetimi." />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}>
            <Card className="p-4">
              <c.icon size={16} style={{ color: c.color }} />
              <div className="font-heading font-extrabold text-2xl mt-2" style={{ color: c.color }}>{c.value}</div>
              <div className="text-xs text-zinc-500">{c.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {tabs.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} data-testid={`admin-tab-${v}`} className={`px-4 py-2 rounded-full text-sm font-medium ${tab === v ? "bg-ink text-white" : "bg-zinc-100 text-zinc-600"}`}>{l}</button>
        ))}
      </div>

      {tab === "exam" && (
        <Card className="p-6 max-w-lg">
          <form onSubmit={createExam} className="space-y-4" data-testid="admin-exam-form">
            <div><label className="text-sm text-zinc-500">Sınav adı</label><input required value={exam.name} onChange={(e) => setExam((s) => ({ ...s, name: e.target.value }))} className={inputCls} data-testid="admin-exam-name" /></div>
            <div><label className="text-sm text-zinc-500">Açıklama</label><input value={exam.description} onChange={(e) => setExam((s) => ({ ...s, description: e.target.value }))} className={inputCls} /></div>
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60" data-testid="admin-exam-submit">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Ekle
            </button>
          </form>
        </Card>
      )}

      {tab === "question" && (
        <Card className="p-6 max-w-2xl">
          <form onSubmit={createQuestion} className="space-y-4" data-testid="admin-question-form">
            <ExamPicker exams={exams} examId={q.exam_id} subjectId={q.subject_id} topicId={q.topic_id} onChange={(v) => setQ((s) => ({ ...s, exam_id: v.examId, subject_id: v.subjectId, topic_id: v.topicId }))} />
            <textarea required placeholder="Soru metni" value={q.question_text} onChange={(e) => setQ((s) => ({ ...s, question_text: e.target.value }))} className={inputCls} rows={2} data-testid="admin-q-text" />
            <div className="grid sm:grid-cols-2 gap-3">
              {["a", "b", "c", "d", "e"].map((o) => (
                <input key={o} placeholder={`Seçenek ${o.toUpperCase()}`} required={o !== "e"} value={q[`option_${o}`]} onChange={(e) => setQ((s) => ({ ...s, [`option_${o}`]: e.target.value }))} className={inputCls} />
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <select value={q.correct_answer} onChange={(e) => setQ((s) => ({ ...s, correct_answer: e.target.value }))} className={inputCls} data-testid="admin-q-correct">
                {["A", "B", "C", "D", "E"].map((o) => <option key={o} value={o}>Doğru: {o}</option>)}
              </select>
              <select value={q.difficulty} onChange={(e) => setQ((s) => ({ ...s, difficulty: e.target.value }))} className={inputCls}>
                {["kolay", "orta", "zor"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <textarea placeholder="Açıklama (opsiyonel)" value={q.explanation} onChange={(e) => setQ((s) => ({ ...s, explanation: e.target.value }))} className={inputCls} rows={2} />
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60" data-testid="admin-q-submit">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Soru ekle
            </button>
          </form>
        </Card>
      )}

      {tab === "note" && (
        <Card className="p-6 max-w-2xl">
          <form onSubmit={createNote} className="space-y-4" data-testid="admin-note-form">
            <ExamPicker exams={exams} examId={note.exam_id} subjectId={note.subject_id} topicId={note.topic_id} onChange={(v) => setNote((s) => ({ ...s, exam_id: v.examId, subject_id: v.subjectId, topic_id: v.topicId }))} />
            <input required placeholder="Başlık" value={note.title} onChange={(e) => setNote((s) => ({ ...s, title: e.target.value }))} className={inputCls} data-testid="admin-note-title" />
            <input placeholder="Kısa açıklama" value={note.description} onChange={(e) => setNote((s) => ({ ...s, description: e.target.value }))} className={inputCls} />
            <textarea placeholder="İçerik (konu anlatımı)" value={note.content} onChange={(e) => setNote((s) => ({ ...s, content: e.target.value }))} className={inputCls} rows={4} />
            <input placeholder="Video URL (embed)" value={note.video_url} onChange={(e) => setNote((s) => ({ ...s, video_url: e.target.value }))} className={inputCls} />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 cursor-pointer text-sm font-medium hover:border-ink transition-colors">
                <Upload size={15} /> PDF/Görsel yükle
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" onChange={(e) => uploadNoteFile(e.target.files[0])} data-testid="admin-note-file" />
              </label>
              {note.file_name && <span className="text-sm text-subject-fen">✓ {note.file_name}</span>}
            </div>
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60" data-testid="admin-note-submit">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <BookOpen size={16} />} Ders notu ekle
            </button>
          </form>
        </Card>
      )}

      {tab === "csv" && (
        <Card className="p-6 max-w-2xl">
          <p className="text-sm text-zinc-500 mb-4">CSV sütunları: <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded">exam, subject, topic, subtopic, question, option_a, option_b, option_c, option_d, option_e, correct_answer, difficulty, explanation</code></p>
          <label className="flex items-center justify-center gap-2 px-4 py-8 rounded-2xl border-2 border-dashed border-zinc-300 cursor-pointer hover:border-subject-matematik transition-colors">
            {busy ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
            <span className="font-medium">{busy ? "İşleniyor..." : "CSV dosyası seç"}</span>
            <input type="file" className="hidden" accept=".csv" onChange={(e) => importCsv(e.target.files[0])} data-testid="admin-csv-file" />
          </label>
          {csvReport && (
            <div className="mt-6" data-testid="csv-report">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[["Toplam", csvReport.total, "#0F172A"], ["Eklendi", csvReport.inserted, "#10B981"], ["Tekrar", csvReport.duplicates, "#F59E0B"], ["Hatalı", csvReport.error_count, "#F43F5E"]].map(([l, v, c]) => (
                  <div key={l} className="text-center p-3 rounded-xl bg-zinc-50">
                    <div className="font-heading font-bold text-xl" style={{ color: c }}>{v}</div>
                    <div className="text-xs text-zinc-500">{l}</div>
                  </div>
                ))}
              </div>
              {csvReport.errors?.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-auto">
                  {csvReport.errors.map((er, i) => (
                    <div key={i} className="text-xs text-subject-turkce">Satır {er.row}: {er.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {tab === "scoring" && (
        <Card className="p-6 max-w-2xl">
          <select value={scoreExam} onChange={(e) => setScoreExam(e.target.value)} className={`${inputCls} mb-5`} data-testid="admin-scoring-exam">
            <option value="">Sınav seç</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {scoreCfg && scoreExam && (
            <>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xs font-semibold text-zinc-400 mb-2">
                <span>Ders/Test</span><span className="w-20 text-center">Soru</span><span className="w-20 text-center">Yanlış Ceza</span><span className="w-20 text-center">Katsayı</span>
              </div>
              <div className="space-y-2">
                {scoreCfg.sections.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                    <input value={s.name} onChange={(e) => setScoreCfg((c) => ({ ...c, sections: c.sections.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) }))} className={inputCls} />
                    <input type="number" value={s.question_count} onChange={(e) => setScoreCfg((c) => ({ ...c, sections: c.sections.map((x, idx) => idx === i ? { ...x, question_count: Number(e.target.value) } : x) }))} className={`${inputCls} w-20 text-center`} />
                    <input type="number" step="0.05" value={s.wrong_penalty} onChange={(e) => setScoreCfg((c) => ({ ...c, sections: c.sections.map((x, idx) => idx === i ? { ...x, wrong_penalty: Number(e.target.value) } : x) }))} className={`${inputCls} w-20 text-center`} />
                    <input type="number" step="0.1" value={s.coefficient} onChange={(e) => setScoreCfg((c) => ({ ...c, sections: c.sections.map((x, idx) => idx === i ? { ...x, coefficient: Number(e.target.value) } : x) }))} className={`${inputCls} w-20 text-center`} />
                    <button type="button" onClick={() => setScoreCfg((c) => ({ ...c, sections: c.sections.filter((_, idx) => idx !== i) }))} data-testid={`admin-scoring-remove-${i}`} className="h-8 w-8 grid place-items-center rounded-lg text-subject-turkce hover:bg-subject-turkce/10">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setScoreCfg((c) => ({ ...c, sections: [...c.sections, { name: "Yeni Bölüm", question_count: 20, wrong_penalty: 0.25, coefficient: 1.0 }] }))} data-testid="admin-scoring-add" className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-subject-matematik">
                <Plus size={15} /> Bölüm ekle
              </button>
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                <div><label className="text-xs text-zinc-500">Taban puan</label><input type="number" value={scoreCfg.base_score} onChange={(e) => setScoreCfg((c) => ({ ...c, base_score: Number(e.target.value) }))} className={inputCls} /></div>
                <div><label className="text-xs text-zinc-500">Çarpan</label><input type="number" step="0.1" value={scoreCfg.multiplier} onChange={(e) => setScoreCfg((c) => ({ ...c, multiplier: Number(e.target.value) }))} className={inputCls} /></div>
                <div><label className="text-xs text-zinc-500">Puan türü</label><input value={scoreCfg.score_type} onChange={(e) => setScoreCfg((c) => ({ ...c, score_type: e.target.value }))} className={inputCls} /></div>
              </div>
              <button onClick={saveScoring} disabled={busy} className="mt-5 flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60" data-testid="admin-scoring-save">
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />} Puanlamayı kaydet
              </button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
