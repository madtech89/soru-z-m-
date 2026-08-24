import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, HelpCircle, FileText, Database, BarChart3, Plus, Loader2, BookOpen, Calculator, Layers, ListTree, FileQuestion, ClipboardList, Trash2 } from "lucide-react";
import {
  fetchAdminStats, fetchExams, fetchSubjects, fetchTopics, fetchSubtopics,
  fetchExamScoring, saveExamScoring, createExam, createSubject, createTopic,
  createSubtopic, createQuestion, createNote, createTest, fetchQuestionsForExam,
} from "@/lib/api";
import { EXAM_CATEGORIES } from "@/lib/api";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-subject-matematik transition";

function ExamPicker({ examId, subjectId, topicId, subtopicId, onChange, exams, showSubtopic = false }) {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);

  useEffect(() => { if (examId) fetchSubjects(examId).then(setSubjects).catch(() => setSubjects([])); else setSubjects([]); }, [examId]);
  useEffect(() => { if (examId && subjectId) fetchTopics(examId, subjectId).then(setTopics).catch(() => setTopics([])); else setTopics([]); }, [examId, subjectId]);
  useEffect(() => { if (topicId && showSubtopic) fetchSubtopics(topicId).then(setSubtopics).catch(() => setSubtopics([])); else setSubtopics([]); }, [topicId, showSubtopic]);

  const cols = showSubtopic ? "grid sm:grid-cols-4 gap-3" : "grid sm:grid-cols-3 gap-3";

  return (
    <div className={cols}>
      <select value={examId} onChange={(e) => onChange({ examId: e.target.value, subjectId: "", topicId: "", subtopicId: "" })} className={inputCls} data-testid="admin-pick-exam">
        <option value="">Sınav seç</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <select value={subjectId} onChange={(e) => onChange({ examId, subjectId: e.target.value, topicId: "", subtopicId: "" })} className={inputCls} disabled={!examId}>
        <option value="">Ders seç</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select value={topicId} onChange={(e) => onChange({ examId, subjectId, topicId: e.target.value, subtopicId: "" })} className={inputCls} disabled={!subjectId}>
        <option value="">Konu seç</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      {showSubtopic && (
        <select value={subtopicId} onChange={(e) => onChange({ examId, subjectId, topicId, subtopicId: e.target.value })} className={inputCls} disabled={!topicId}>
          <option value="">Alt konu (opsiyonel)</option>{subtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [tab, setTab] = useState("exam");
  const [busy, setBusy] = useState(false);

  // Exam form
  const [exam, setExam] = useState({ name: "", description: "", category: "universite" });

  // Subject form
  const [subjForm, setSubjForm] = useState({ examId: "", name: "", slug: "general" });

  // Topic form
  const [topicForm, setTopicForm] = useState({ examId: "", subjectId: "", name: "" });

  // Subtopic form
  const [subtopicForm, setSubtopicForm] = useState({ examId: "", subjectId: "", topicId: "", name: "" });

  // Question form
  const [q, setQ] = useState({ exam_id: "", subject_id: "", topic_id: "", subtopic_id: "", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", option_e: "", correct_answer: "A", difficulty: "orta", explanation: "" });

  // Test (deneme) form
  const [testForm, setTestForm] = useState({ examId: "", name: "", description: "", duration: 30, difficulty: "orta", questionCount: 30 });

  // Note form
  const [note, setNote] = useState({ exam_id: "", subject_id: "", topic_id: "", title: "", description: "", content: "", video_url: "" });

  // Scoring
  const [scoreExam, setScoreExam] = useState("");
  const [scoreCfg, setScoreCfg] = useState(null);

  const loadStats = useCallback(() => fetchAdminStats().then(setStats).catch(() => setStats({})), []);
  useEffect(() => { loadStats(); fetchExams().then(setExams).catch(() => setExams([])); }, [loadStats]);
  useEffect(() => { if (scoreExam) fetchExamScoring(scoreExam).then((c) => setScoreCfg(c || { sections: [], base_score: 100, multiplier: 1, score_type: "Ağırlıklı Puan" })); }, [scoreExam]);

  // Handlers
  const handleCreateExam = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await createExam(exam.name, exam.description, exam.category);
      toast.success("Sınav eklendi!");
      setExam({ name: "", description: "", category: "universite" });
      fetchExams().then(setExams); loadStats();
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!subjForm.examId || !subjForm.name) return toast.error("Sınav ve ders adı gerekli.");
    setBusy(true);
    try {
      const subjects = await fetchSubjects(subjForm.examId);
      await createSubject(subjForm.examId, subjForm.name, subjForm.slug, subjects.length);
      toast.success("Ders eklendi!");
      setSubjForm((s) => ({ ...s, name: "", slug: "general" }));
      loadStats();
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!topicForm.subjectId || !topicForm.name) return toast.error("Ders ve konu adı gerekli.");
    setBusy(true);
    try {
      const topics = await fetchTopics(topicForm.examId, topicForm.subjectId);
      await createTopic(topicForm.examId, topicForm.subjectId, topicForm.name, topics.length);
      toast.success("Konu eklendi!");
      setTopicForm({ examId: "", subjectId: "", name: "" });
      loadStats();
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const handleCreateSubtopic = async (e) => {
    e.preventDefault();
    if (!subtopicForm.topicId || !subtopicForm.name) return toast.error("Konu ve alt konu adı gerekli.");
    setBusy(true);
    try {
      const subs = await fetchSubtopics(subtopicForm.topicId);
      await createSubtopic(subtopicForm.topicId, subtopicForm.name, subs.length);
      toast.success("Alt konu eklendi!");
      setSubtopicForm({ examId: "", subjectId: "", topicId: "", name: "" });
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!q.topic_id) return toast.error("Sınav, ders ve konu seç.");
    setBusy(true);
    try {
      await createQuestion(q);
      toast.success("Soru eklendi!");
      setQ((s) => ({ ...s, question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", option_e: "", explanation: "", subtopic_id: "" }));
      loadStats();
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!testForm.examId || !testForm.name) return toast.error("Sınav seç ve deneme adı gir.");
    setBusy(true);
    try {
      const questionIds = await fetchQuestionsForExam(testForm.examId, testForm.questionCount);
      if (questionIds.length === 0) { toast.error("Bu sınav için soru bulunamadı."); setBusy(false); return; }
      await createTest(testForm.examId, testForm.name, testForm.description, testForm.duration, testForm.difficulty, questionIds);
      toast.success(`${questionIds.length} sorulu deneme eklendi!`);
      setTestForm({ examId: "", name: "", description: "", duration: 30, difficulty: "orta", questionCount: 30 });
      loadStats();
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!note.exam_id || !note.title) return toast.error("Sınav ve başlık gerekli.");
    setBusy(true);
    try {
      await createNote(note);
      toast.success("Ders notu eklendi!");
      setNote({ exam_id: "", subject_id: "", topic_id: "", title: "", description: "", content: "", video_url: "" });
    } catch { toast.error("Eklenemedi."); } finally { setBusy(false); }
  };

  const handleSaveScoring = async () => {
    setBusy(true);
    try {
      await saveExamScoring(scoreExam, scoreCfg);
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

  const tabs = [
    ["exam", "Sınav", GraduationCap],
    ["subject", "Ders", Layers],
    ["topic", "Konu", ListTree],
    ["subtopic", "Alt Konu", ListTree],
    ["question", "Soru", FileQuestion],
    ["test", "Deneme", ClipboardList],
    ["note", "Ders Notu", BookOpen],
    ["scoring", "Puanlama", Calculator],
  ];

  return (
    <div>
      <PageHeader eyebrow="yönetim" title="Admin Paneli" sub="Sınav türleri, dersler, konular, sorular, denemeler ve ders notları yönetimi." />

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
        {tabs.map(([v, l, Icon]) => (
          <button key={v} onClick={() => setTab(v)} data-testid={`admin-tab-${v}`} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${tab === v ? "bg-ink text-white" : "bg-zinc-100 text-zinc-600"}`}>
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>

      {/* TAB: Exam */}
      {tab === "exam" && (
        <Card className="p-6 max-w-lg">
          <form onSubmit={handleCreateExam} className="space-y-4" data-testid="admin-exam-form">
            <div>
              <label className="text-sm text-zinc-500">Sınav adı</label>
              <input required value={exam.name} onChange={(e) => setExam((s) => ({ ...s, name: e.target.value }))} className={inputCls} data-testid="admin-exam-name" />
            </div>
            <div>
              <label className="text-sm text-zinc-500">Sınav kategorisi / türü</label>
              <select value={exam.category} onChange={(e) => setExam((s) => ({ ...s, category: e.target.value }))} className={inputCls} data-testid="admin-exam-category">
                {EXAM_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-zinc-500">Açıklama</label>
              <input value={exam.description} onChange={(e) => setExam((s) => ({ ...s, description: e.target.value }))} className={inputCls} />
            </div>
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60" data-testid="admin-exam-submit">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Ekle
            </button>
          </form>
        </Card>
      )}

      {/* TAB: Subject */}
      {tab === "subject" && (
        <Card className="p-6 max-w-lg">
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Sınav seç</label>
              <select value={subjForm.examId} onChange={(e) => setSubjForm((s) => ({ ...s, examId: e.target.value }))} className={inputCls} required>
                <option value="">Sınav seç</option>
                {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-zinc-500">Ders adı</label>
              <input required value={subjForm.name} onChange={(e) => setSubjForm((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="Örn: Matematik" />
            </div>
            <div>
              <label className="text-sm text-zinc-500">Slug (renk teması)</label>
              <select value={subjForm.slug} onChange={(e) => setSubjForm((s) => ({ ...s, slug: e.target.value }))} className={inputCls}>
                {["matematik", "turkce", "fen", "sosyal", "general"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Ders ekle
            </button>
          </form>
        </Card>
      )}

      {/* TAB: Topic */}
      {tab === "topic" && (
        <Card className="p-6 max-w-lg">
          <form onSubmit={handleCreateTopic} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-zinc-500 mb-1 block">Sınav seç</label>
                <select value={topicForm.examId} onChange={(e) => {
                  setTopicForm((s) => ({ ...s, examId: e.target.value, subjectId: "" }));
                }} className={inputCls} required>
                  <option value="">Sınav seç</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <SubjectSelect examId={topicForm.examId} subjectId={topicForm.subjectId} onChange={(subjectId) => setTopicForm((s) => ({ ...s, subjectId }))} />
            </div>
            <div>
              <label className="text-sm text-zinc-500">Konu adı</label>
              <input required value={topicForm.name} onChange={(e) => setTopicForm((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="Örn: Fonksiyonlar" />
            </div>
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Konu ekle
            </button>
          </form>
        </Card>
      )}

      {/* TAB: Subtopic */}
      {tab === "subtopic" && (
        <Card className="p-6 max-w-lg">
          <form onSubmit={handleCreateSubtopic} className="space-y-4">
            <ExamPicker
              exams={exams}
              examId={subtopicForm.examId}
              subjectId={subtopicForm.subjectId}
              topicId={subtopicForm.topicId}
              onChange={(v) => setSubtopicForm((s) => ({ ...s, examId: v.examId, subjectId: v.subjectId, topicId: v.topicId }))}
            />
            <div>
              <label className="text-sm text-zinc-500">Alt konu adı</label>
              <input required value={subtopicForm.name} onChange={(e) => setSubtopicForm((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="Örn: Birinci dereceden denklemler" />
            </div>
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Alt konu ekle
            </button>
          </form>
        </Card>
      )}

      {/* TAB: Question */}
      {tab === "question" && (
        <Card className="p-6 max-w-2xl">
          <form onSubmit={handleCreateQuestion} className="space-y-4" data-testid="admin-question-form">
            <ExamPicker
              exams={exams}
              examId={q.exam_id}
              subjectId={q.subject_id}
              topicId={q.topic_id}
              subtopicId={q.subtopic_id}
              onChange={(v) => setQ((s) => ({ ...s, exam_id: v.examId, subject_id: v.subjectId, topic_id: v.topicId, subtopic_id: v.subtopicId }))}
              showSubtopic
            />
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

      {/* TAB: Test (Deneme) */}
      {tab === "test" && (
        <Card className="p-6 max-w-lg">
          <form onSubmit={handleCreateTest} className="space-y-4">
            <div>
              <label className="text-sm text-zinc-500 mb-1 block">Sınav seç</label>
              <select value={testForm.examId} onChange={(e) => setTestForm((s) => ({ ...s, examId: e.target.value }))} className={inputCls} required>
                <option value="">Sınav seç</option>
                {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-zinc-500">Deneme adı</label>
              <input required value={testForm.name} onChange={(e) => setTestForm((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="Örn: TYT Deneme 1" />
            </div>
            <div>
              <label className="text-sm text-zinc-500">Açıklama</label>
              <input value={testForm.description} onChange={(e) => setTestForm((s) => ({ ...s, description: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500">Süre (dk)</label>
                <input type="number" value={testForm.duration} onChange={(e) => setTestForm((s) => ({ ...s, duration: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Soru sayısı</label>
                <input type="number" value={testForm.questionCount} onChange={(e) => setTestForm((s) => ({ ...s, questionCount: Number(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Zorluk</label>
                <select value={testForm.difficulty} onChange={(e) => setTestForm((s) => ({ ...s, difficulty: e.target.value }))} className={inputCls}>
                  {["kolay", "orta", "zor"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Deneme oluştur
            </button>
          </form>
        </Card>
      )}

      {/* TAB: Note */}
      {tab === "note" && (
        <Card className="p-6 max-w-2xl">
          <form onSubmit={handleCreateNote} className="space-y-4" data-testid="admin-note-form">
            <ExamPicker
              exams={exams}
              examId={note.exam_id}
              subjectId={note.subject_id}
              topicId={note.topic_id}
              onChange={(v) => setNote((s) => ({ ...s, exam_id: v.examId, subject_id: v.subjectId, topic_id: v.topicId }))}
            />
            <input required placeholder="Başlık" value={note.title} onChange={(e) => setNote((s) => ({ ...s, title: e.target.value }))} className={inputCls} data-testid="admin-note-title" />
            <input placeholder="Kısa açıklama" value={note.description} onChange={(e) => setNote((s) => ({ ...s, description: e.target.value }))} className={inputCls} />
            <textarea placeholder="İçerik (konu anlatımı)" value={note.content} onChange={(e) => setNote((s) => ({ ...s, content: e.target.value }))} className={inputCls} rows={4} />
            <input placeholder="Video URL (embed)" value={note.video_url} onChange={(e) => setNote((s) => ({ ...s, video_url: e.target.value }))} className={inputCls} />
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60" data-testid="admin-note-submit">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <BookOpen size={16} />} Ders notu ekle
            </button>
          </form>
        </Card>
      )}

      {/* TAB: Scoring */}
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
                    <button type="button" onClick={() => setScoreCfg((c) => ({ ...c, sections: c.sections.filter((_, idx) => idx !== i) }))} data-testid={`admin-scoring-remove-${i}`} className="h-8 w-8 grid place-items-center rounded-lg text-subject-turkce hover:bg-subject-turkce/10"><Trash2 size={14} /></button>
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
              <button onClick={handleSaveScoring} disabled={busy} className="mt-5 flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60" data-testid="admin-scoring-save">
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Calculator size={16} />} Puanlamayı kaydet
              </button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function SubjectSelect({ examId, subjectId, onChange }) {
  const [subjects, setSubjects] = useState([]);
  useEffect(() => { if (examId) fetchSubjects(examId).then(setSubjects).catch(() => setSubjects([])); else setSubjects([]); }, [examId]);
  return (
    <div>
      <label className="text-sm text-zinc-500 mb-1 block">Ders seç</label>
      <select value={subjectId} onChange={(e) => onChange(e.target.value)} className={inputCls} required disabled={!examId}>
        <option value="">Ders seç</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}
