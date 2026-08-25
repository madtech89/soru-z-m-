import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, HelpCircle, FileText, Database, BarChart3, Plus, Loader2, BookOpen, Calculator, Layers, ListTree, FileQuestion, ClipboardList, Trash2, Wand2, Crown, ArrowRight, ArrowUpRight, Calendar, Key, Sparkles, Square, PlayCircle, Newspaper, Edit3 } from "lucide-react";

import {
  fetchAdminStats, fetchExams, fetchSubjects, fetchTopics, fetchSubtopics,
  fetchExamScoring, saveExamScoring, createExam, createSubject, createTopic,
  createSubtopic, createQuestion, createNote, createTest, fetchQuestionsForExam,
  updateExam, deleteExam, updateSubject, deleteSubject, updateTopic, deleteTopic,
  updateSubtopic, deleteSubtopic,
  api as apiClient,
} from "@/lib/api";
import { EXAM_CATEGORIES } from "@/lib/api";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";
import NoteStudio from "@/app/NoteStudio";
import QuestionBankStudio from "@/app/QuestionBankStudio";
import AdminUserManagement from "@/app/AdminUserManagement";
import AdminExamDates from "@/app/AdminExamDates";
import AdminApiKeys from "@/app/AdminApiKeys";
import AdminBlog from "@/app/AdminBlog";
import AdminTercih from "@/app/AdminTercih";
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
  const [tab, setTab] = useState("question_bank");
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

  const [curriculumEdit, setCurriculumEdit] = useState({ type: "", id: null });
  const [listSubjects, setListSubjects] = useState([]);
  const [listTopics, setListTopics] = useState([]);
  const [listSubtopics, setListSubtopics] = useState([]);

  const refreshSubjects = useCallback(async (examId) => {
    if (!examId) return setListSubjects([]);
    try {
      const res = await fetchSubjects(examId);
      setListSubjects(res || []);
    } catch { setListSubjects([]); }
  }, []);

  const refreshTopics = useCallback(async (examId, subjectId) => {
    if (!examId || !subjectId) return setListTopics([]);
    try {
      const res = await fetchTopics(examId, subjectId);
      setListTopics(res || []);
    } catch { setListTopics([]); }
  }, []);

  const refreshSubtopics = useCallback(async (topicId) => {
    if (!topicId) return setListSubtopics([]);
    try {
      const res = await fetchSubtopics(topicId);
      setListSubtopics(res || []);
    } catch { setListSubtopics([]); }
  }, []);

  const loadStats = useCallback(() => fetchAdminStats().then(setStats).catch(() => setStats({})), []);

  useEffect(() => { loadStats(); fetchExams().then(setExams).catch(() => setExams([])); }, [loadStats]);
  useEffect(() => { if (scoreExam) fetchExamScoring(scoreExam).then((c) => setScoreCfg(c || { sections: [], base_score: 100, multiplier: 1, score_type: "Ağırlıklı Puan" })); }, [scoreExam]);

  useEffect(() => {
    if (tab === "subject") {
      refreshSubjects(subjForm.examId);
    }
  }, [tab, subjForm.examId, refreshSubjects]);

  useEffect(() => {
    if (tab === "topic") {
      refreshTopics(topicForm.examId, topicForm.subjectId);
    }
  }, [tab, topicForm.examId, topicForm.subjectId, refreshTopics]);

  useEffect(() => {
    if (tab === "subtopic") {
      refreshSubtopics(subtopicForm.topicId);
    }
  }, [tab, subtopicForm.topicId, refreshSubtopics]);


  // Handlers
  const handleCreateExam = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (curriculumEdit.type === "exam" && curriculumEdit.id) {
        await updateExam(curriculumEdit.id, { name: exam.name, description: exam.description, category: exam.category });
        toast.success("Sınav güncellendi!");
        setCurriculumEdit({ type: "", id: null });
      } else {
        await createExam(exam.name, exam.description, exam.category);
        toast.success("Sınav eklendi!");
      }
      setExam({ name: "", description: "", category: "universite" });
      fetchExams().then(setExams); loadStats();
    } catch { toast.error("İşlem başarısız."); } finally { setBusy(false); }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm("Bu sınavı silmek istediğinizden emin misiniz? Sınava bağlı tüm dersler, konular ve sorular etkilenebilir.")) return;
    try {
      await deleteExam(examId);
      toast.success("Sınav silindi!");
      fetchExams().then(setExams); loadStats();
    } catch { toast.error("Silinemedi."); }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!subjForm.examId || !subjForm.name) return toast.error("Sınav ve ders adı gerekli.");
    setBusy(true);
    try {
      if (curriculumEdit.type === "subject" && curriculumEdit.id) {
        await updateSubject(curriculumEdit.id, { exam_id: subjForm.examId, name: subjForm.name, slug: subjForm.slug, order: 0 });
        toast.success("Ders güncellendi!");
        setCurriculumEdit({ type: "", id: null });
      } else {
        const subjects = await fetchSubjects(subjForm.examId);
        await createSubject(subjForm.examId, subjForm.name, subjForm.slug, subjects.length);
        toast.success("Ders eklendi!");
      }
      setSubjForm((s) => ({ ...s, name: "", slug: "general" }));
      refreshSubjects(subjForm.examId);
      loadStats();
    } catch { toast.error("İşlem başarısız."); } finally { setBusy(false); }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm("Bu dersi silmek istediğinizden emin misiniz? Dersi silmek tüm alt konu ve notları da etkileyebilir.")) return;
    try {
      await deleteSubject(subjectId);
      toast.success("Ders silindi!");
      refreshSubjects(subjForm.examId);
      loadStats();
    } catch { toast.error("Silinemedi."); }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!topicForm.subjectId || !topicForm.name) return toast.error("Ders ve konu adı gerekli.");
    setBusy(true);
    try {
      if (curriculumEdit.type === "topic" && curriculumEdit.id) {
        await updateTopic(curriculumEdit.id, { exam_id: topicForm.examId, subject_id: topicForm.subjectId, name: topicForm.name, order: 0 });
        toast.success("Konu güncellendi!");
        setCurriculumEdit({ type: "", id: null });
      } else {
        const topics = await fetchTopics(topicForm.examId, topicForm.subjectId);
        await createTopic(topicForm.examId, topicForm.subjectId, topicForm.name, topics.length);
        toast.success("Konu eklendi!");
      }
      setTopicForm((s) => ({ ...s, name: "" }));
      refreshTopics(topicForm.examId, topicForm.subjectId);
      loadStats();
    } catch { toast.error("İşlem başarısız."); } finally { setBusy(false); }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm("Bu konuyu silmek istediğinizden emin misiniz?")) return;
    try {
      await deleteTopic(topicId);
      toast.success("Konu silindi!");
      refreshTopics(topicForm.examId, topicForm.subjectId);
      loadStats();
    } catch { toast.error("Silinemedi."); }
  };

  const handleCreateSubtopic = async (e) => {
    e.preventDefault();
    if (!subtopicForm.topicId || !subtopicForm.name) return toast.error("Konu ve alt konu adı gerekli.");
    setBusy(true);
    try {
      if (curriculumEdit.type === "subtopic" && curriculumEdit.id) {
        await updateSubtopic(curriculumEdit.id, { topic_id: subtopicForm.topicId, name: subtopicForm.name, order: 0 });
        toast.success("Alt konu güncellendi!");
        setCurriculumEdit({ type: "", id: null });
      } else {
        const subs = await fetchSubtopics(subtopicForm.topicId);
        await createSubtopic(subtopicForm.topicId, subtopicForm.name, subs.length);
        toast.success("Alt konu eklendi!");
      }
      setSubtopicForm((s) => ({ ...s, name: "" }));
      refreshSubtopics(subtopicForm.topicId);
    } catch { toast.error("İşlem başarısız."); } finally { setBusy(false); }
  };

  const handleDeleteSubtopic = async (subtopicId) => {
    if (!window.confirm("Bu alt konuyu silmek istediğinizden emin misiniz?")) return;
    try {
      await deleteSubtopic(subtopicId);
      toast.success("Alt konu silindi!");
      refreshSubtopics(subtopicForm.topicId);
    } catch { toast.error("Silinemedi."); }
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
    { icon: HelpCircle, label: "Soru Havuzu", value: stats.questions, color: "#4F46E5", tab: "question_bank", sub: "Tüm Branşlar" },
    { icon: FileText, label: "Deneme Sınavı", value: stats.tests, color: "#10B981", tab: "question_bank", sub: "Aktif Sınavlar" },
    { icon: Users, label: "Toplam Üye", value: stats.users, color: "#0F172A", tab: "users", sub: "Kayıtlı Öğrenciler" },
    { icon: Crown, label: "Ücretli (Pro) Üye", value: stats.paid_users || 0, color: "#D97706", tab: "users", sub: "Premium Aboneler" },
    { icon: BookOpen, label: "Ders Notu & Blog", value: stats.notes || 0, color: "#EC4899", tab: "note", sub: "Dizgi & Anlatım" },
    { icon: Layers, label: "Ders Sayısı", value: stats.subjects || 0, color: "#6366F1", tab: "subject", sub: "Tüm Branşlar" },
    { icon: ListTree, label: "Konu Sayısı", value: stats.topics || 0, color: "#8B5CF6", tab: "topic", sub: "Müfredat Konuları" },
    { icon: GraduationCap, label: "Sınav Türü", value: stats.exams || 0, color: "#14B8A6", tab: "exam", sub: "YKS, LGS, KPSS..." },
    { icon: Database, label: "Çözülen Soru", value: stats.answers || 0, color: "#F43F5E", tab: "users", sub: "Öğrenci Cevapları" },
    { icon: BarChart3, label: "Tamamlanan Deneme", value: stats.results || 0, color: "#0284C7", tab: "users", sub: "Sınav Seansları" },
  ];

  const tabs = [
    ["users", "Üye & Kullanıcı Yönetimi", Users],
    ["question_bank", "Soru Bankası & Akıllı Deneme", Wand2],
    ["note", "Ders Notu & Blog Dizgi", BookOpen],
    ["exam", "Sınavlar", GraduationCap],
    ["subject", "Dersler", Layers],
    ["topic", "Konular", ListTree],
    ["subtopic", "Alt Konular", ListTree],
    ["question", "Tek Soru Ekle", FileQuestion],
    ["test", "Manuel Deneme", ClipboardList],
    ["dates", "Sınav Tarihleri", Calendar],
    ["scoring", "Puanlama Kuralları", Calculator],
    ["api_keys", "API Anahtarları", Key],
    ["content_gen", "İçerik Üretici", Sparkles],
    ["blog_posts", "Blog & Gündem", Newspaper],
    ["tercih", "Tercih Robotu", Building2],
  ];

  return (
    <div>
      <PageHeader eyebrow="yönetim" title="Admin Paneli" sub="Platform genel akışı, üyeler, soru bankası, denemeler ve müfredat yönetimi." />

      {/* Tıklanabilir Profesyonel Dashboard Metrik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02, ease: EASE }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
          >
            <Card
              onClick={() => setTab(c.tab)}
              className="p-4 cursor-pointer hover:border-subject-matematik/50 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl" style={{ background: `${c.color}15`, color: c.color }}>
                  <c.icon size={18} />
                </span>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-subject-matematik transition flex items-center gap-0.5">
                  Yönet <ArrowRight size={10} />
                </span>
              </div>
              <div className="font-heading font-extrabold text-2xl mt-2.5 text-ink">
                {c.value}
              </div>
              <div className="text-xs font-bold text-zinc-700 mt-0.5">{c.label}</div>
              <div className="text-[11px] text-zinc-400">{c.sub}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(([v, l, Icon]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            data-testid={`admin-tab-${v}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition ${
              tab === v ? "bg-ink text-white shadow-md shadow-ink/10" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <Icon size={14} /> {l}
          </button>
        ))}
      </div>

      {/* TAB: Üye & Kullanıcı Yönetimi */}
      {tab === "users" && <AdminUserManagement />}
      {tab === "question_bank" && <QuestionBankStudio exams={exams} onRefreshStats={loadStats} />}
      {tab === "dates" && <AdminExamDates />}
      {tab === "api_keys" && <AdminApiKeys />}
      {tab === "content_gen" && <ContentGenTab />}
      {tab === "blog_posts" && <AdminBlog />}
      {tab === "tercih" && <AdminTercih />}


      {/* TAB: Exam */}
      {tab === "exam" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 h-fit">
            <h3 className="font-heading font-bold text-base text-ink mb-4">
              {curriculumEdit.id ? "Sınav Düzenle" : "Yeni Sınav Ekle"}
            </h3>
            <form onSubmit={handleCreateExam} className="space-y-4" data-testid="admin-exam-form">
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Sınav adı</label>
                <input required value={exam.name} onChange={(e) => setExam((s) => ({ ...s, name: e.target.value }))} className={inputCls} data-testid="admin-exam-name" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Sınav kategorisi / türü</label>
                <select value={exam.category} onChange={(e) => setExam((s) => ({ ...s, category: e.target.value }))} className={inputCls} data-testid="admin-exam-category">
                  {EXAM_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Açıklama</label>
                <input value={exam.description} onChange={(e) => setExam((s) => ({ ...s, description: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60 text-xs" data-testid="admin-exam-submit">
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  {curriculumEdit.id ? "Değişiklikleri Kaydet" : "Ekle"}
                </button>
                {curriculumEdit.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurriculumEdit({ type: "", id: null });
                      setExam({ name: "", description: "", category: "universite" });
                    }}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold"
                  >
                    İptal
                  </button>
                )}
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-bold text-base text-ink mb-4">Mevcut Sınavlar</h3>
            {exams.length === 0 ? (
              <div className="text-sm text-zinc-400">Henüz sınav eklenmemiş.</div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {exams.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-150 text-sm">
                    <div>
                      <div className="font-bold text-zinc-800">{ex.name}</div>
                      <div className="text-[10px] text-zinc-400 font-bold uppercase">{ex.category}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setCurriculumEdit({ type: "exam", id: ex.id });
                          setExam({ name: ex.name, description: ex.description || "", category: ex.category || "universite" });
                        }}
                        className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                        title="Düzenle"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(ex.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                        title="Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB: Subject */}
      {tab === "subject" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 h-fit">
            <h3 className="font-heading font-bold text-base text-ink mb-4">
              {curriculumEdit.id ? "Ders Düzenle" : "Yeni Ders Ekle"}
            </h3>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Sınav seç</label>
                <select value={subjForm.examId} onChange={(e) => setSubjForm((s) => ({ ...s, examId: e.target.value }))} className={inputCls} required>
                  <option value="">Sınav seç</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Ders adı</label>
                <input required value={subjForm.name} onChange={(e) => setSubjForm((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="Örn: Matematik" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Slug (renk teması)</label>
                <select value={subjForm.slug} onChange={(e) => setSubjForm((s) => ({ ...s, slug: e.target.value }))} className={inputCls}>
                  {["matematik", "turkce", "fen", "sosyal", "general"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60 text-xs">
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  {curriculumEdit.id ? "Değişiklikleri Kaydet" : "Ders ekle"}
                </button>
                {curriculumEdit.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurriculumEdit({ type: "", id: null });
                      setSubjForm((s) => ({ ...s, name: "", slug: "general" }));
                    }}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold"
                  >
                    İptal
                  </button>
                )}
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-bold text-base text-ink mb-4">Mevcut Dersler</h3>
            {!subjForm.examId ? (
              <div className="text-sm text-zinc-400">Dersleri görüntülemek için lütfen soldan bir sınav seçin.</div>
            ) : listSubjects.length === 0 ? (
              <div className="text-sm text-zinc-400">Bu sınava ait ders eklenmemiş.</div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {listSubjects.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-150 text-sm">
                    <div>
                      <div className="font-bold text-zinc-800">{sub.name}</div>
                      <div className="text-[10px] text-zinc-400 font-bold uppercase">{sub.slug}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setCurriculumEdit({ type: "subject", id: sub.id });
                          setSubjForm({ examId: sub.exam_id, name: sub.name, slug: sub.slug || "general" });
                        }}
                        className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                        title="Düzenle"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                        title="Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB: Topic */}
      {tab === "topic" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 h-fit">
            <h3 className="font-heading font-bold text-base text-ink mb-4">
              {curriculumEdit.id ? "Konu Düzenle" : "Yeni Konu Ekle"}
            </h3>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-500 block mb-1">Sınav seç</label>
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
                <label className="text-xs font-bold text-zinc-500 block mb-1">Konu adı</label>
                <input required value={topicForm.name} onChange={(e) => setTopicForm((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="Örn: Fonksiyonlar" />
              </div>
              <div className="flex gap-2">
                <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60 text-xs">
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  {curriculumEdit.id ? "Değişiklikleri Kaydet" : "Konu ekle"}
                </button>
                {curriculumEdit.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurriculumEdit({ type: "", id: null });
                      setTopicForm((s) => ({ ...s, name: "" }));
                    }}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold"
                  >
                    İptal
                  </button>
                )}
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-bold text-base text-ink mb-4">Mevcut Konular</h3>
            {!topicForm.subjectId ? (
              <div className="text-sm text-zinc-400">Konuları görüntülemek için soldan ders seçin.</div>
            ) : listTopics.length === 0 ? (
              <div className="text-sm text-zinc-400">Bu derse ait konu eklenmemiş.</div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {listTopics.map((tp) => (
                  <div key={tp.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-150 text-sm">
                    <div className="font-bold text-zinc-800">{tp.name}</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setCurriculumEdit({ type: "topic", id: tp.id });
                          setTopicForm({ examId: tp.exam_id, subjectId: tp.subject_id, name: tp.name });
                        }}
                        className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                        title="Düzenle"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(tp.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                        title="Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB: Subtopic */}
      {tab === "subtopic" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 h-fit">
            <h3 className="font-heading font-bold text-base text-ink mb-4">
              {curriculumEdit.id ? "Alt Konu Düzenle" : "Yeni Alt Konu Ekle"}
            </h3>
            <form onSubmit={handleCreateSubtopic} className="space-y-4">
              <ExamPicker
                exams={exams}
                examId={subtopicForm.examId}
                subjectId={subtopicForm.subjectId}
                topicId={subtopicForm.topicId}
                onChange={(v) => setSubtopicForm((s) => ({ ...s, examId: v.examId, subjectId: v.subjectId, topicId: v.topicId }))}
              />
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Alt konu adı</label>
                <input required value={subtopicForm.name} onChange={(e) => setSubtopicForm((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="Örn: Birinci dereceden denklemler" />
              </div>
              <div className="flex gap-2">
                <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60 text-xs">
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  {curriculumEdit.id ? "Değişiklikleri Kaydet" : "Alt konu ekle"}
                </button>
                {curriculumEdit.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurriculumEdit({ type: "", id: null });
                      setSubtopicForm((s) => ({ ...s, name: "" }));
                    }}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 rounded-xl text-xs font-bold"
                  >
                    İptal
                  </button>
                )}
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-bold text-base text-ink mb-4">Mevcut Alt Konular</h3>
            {!subtopicForm.topicId ? (
              <div className="text-sm text-zinc-400">Alt konuları görüntülemek için soldan konu seçin.</div>
            ) : listSubtopics.length === 0 ? (
              <div className="text-sm text-zinc-400">Bu konuya ait alt konu eklenmemiş.</div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {listSubtopics.map((st) => (
                  <div key={st.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-150 text-sm">
                    <div className="font-bold text-zinc-800">{st.name}</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setCurriculumEdit({ type: "subtopic", id: st.id });
                          setSubtopicForm({ examId: subtopicForm.examId, subjectId: subtopicForm.subjectId, topicId: st.topic_id, name: st.name });
                        }}
                        className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-600 transition"
                        title="Düzenle"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubtopic(st.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                        title="Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
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

      {/* TAB: Note (Ders Notu ve Dizgi Stüdyosu) */}
      {tab === "note" && (
        <Card className="p-6 max-w-5xl">
          <form onSubmit={handleCreateNote} className="space-y-5" data-testid="admin-note-form">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">1. Sınav, Ders ve Konu Hedefi</span>
              <ExamPicker
                exams={exams}
                examId={note.exam_id}
                subjectId={note.subject_id}
                topicId={note.topic_id}
                onChange={(v) => setNote((s) => ({ ...s, exam_id: v.examId, subject_id: v.subjectId, topic_id: v.topicId }))}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">Ders Notu Başlığı *</label>
                <input required placeholder="Örn: Türev Alma Kuralları ve Geometrik Yorumu" value={note.title} onChange={(e) => setNote((s) => ({ ...s, title: e.target.value }))} className={inputCls} data-testid="admin-note-title" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">Kısa Özet / Alt Başlık</label>
                <input placeholder="Örn: AYT Matematik için kritik formüller ve soru çözüm teknikleri" value={note.description} onChange={(e) => setNote((s) => ({ ...s, description: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">YouTube / Video Anlatım URL (Opsiyonel)</label>
                <input placeholder="https://www.youtube.com/watch?v=..." value={note.video_url} onChange={(e) => setNote((s) => ({ ...s, video_url: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">Ek Dosya / PDF Adı (Otomatik doldurulur)</label>
                <input placeholder="Örn: Turev_Ozet_Foyu.pdf" value={note.file_name || ""} onChange={(e) => setNote((s) => ({ ...s, file_name: e.target.value }))} className={inputCls} />
              </div>
            </div>

            {/* Profesyonel Dizgi Stüdyosu (Canlı Önizleme & Görsel Araçları) */}
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">2. Konu Anlatımı Dizgisi & Görsel Düzenleme</span>
              <NoteStudio
                note={note}
                setNote={setNote}
                isSubmitting={busy}
              />
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
              <button disabled={busy || !note.title || !note.exam_id} className="flex items-center gap-2 bg-ink text-white font-bold px-6 py-3 rounded-2xl hover:bg-subject-matematik transition-colors disabled:opacity-50 shadow-md shadow-ink/10" data-testid="admin-note-submit">
                {busy ? <Loader2 className="animate-spin" size={18} /> : <BookOpen size={18} />} Ders Notunu Yayınla
              </button>
            </div>
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

// ─── İçerik Üretici Sekmesi ───────────────────────────────────────────────────
// ─── İçerik Üretici Sekmesi ───────────────────────────────────────────────────
function ContentGenTab() {
  const [subTab, setSubTab] = useState("lecture"); // "lecture", "curriculum", "bulk_questions"
  
  // 1. Lecture Note Generator states
  const [status, setStatus] = useState({ running: false, done: 0, failed: 0, total: 0, log: [] });
  const [form, setForm] = useState({ exam_filter: "", subject_filter: "", limit: "", concurrency: 10 });
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  // 2. Curriculum Generator states
  const [currForm, setCurrForm] = useState({ exam_name: "", description: "", category: "diger" });
  const [currLoading, setCurrLoading] = useState(false);
  const [generatedCurriculum, setGeneratedCurriculum] = useState(null);

  // 3. Bulk Question Generator states
  const [qForm, setQForm] = useState({ exam_id: "", count_per_subtopic: 5, difficulty: "orta", style: "standard" });
  const [qStatus, setQStatus] = useState({ running: false, done: 0, failed: 0, total: 0, log: [] });
  const [qLoading, setQLoading] = useState(false);
  const [qPolling, setQPolling] = useState(false);
  const [examsList, setExamsList] = useState([]);

  // Fetch lists of exams for dropdown
  useEffect(() => {
    fetchExams().then(setExamsList).catch(() => setExamsList([]));
  }, []);

  // Lecture Note Polling
  const fetchStatus = useCallback(async () => {
    try {
      const r = await apiClient.get("/admin/generate-content/status");
      setStatus(r.data);
    } catch {}
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (!status.running) { setPolling(false); return; }
    setPolling(true);
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [status.running, fetchStatus]);

  // Bulk Question Polling
  const fetchQStatus = useCallback(async () => {
    try {
      const r = await apiClient.get("/admin/generate-questions/status");
      setQStatus(r.data);
    } catch {}
  }, []);

  useEffect(() => { fetchQStatus(); }, [fetchQStatus]);

  useEffect(() => {
    if (!qStatus.running) { setQPolling(false); return; }
    setQPolling(true);
    const interval = setInterval(fetchQStatus, 2000);
    return () => clearInterval(interval);
  }, [qStatus.running, fetchQStatus]);


  // Actions: Lecture notes
  const handleStart = async () => {
    if (!window.confirm("İçerik üretimini başlatmak istiyor musunuz? Bu işlem birkaç dakika sürebilir.")) return;
    setLoading(true);
    try {
      const body = {
        concurrency: Number(form.concurrency) || 10,
        exam_filter: form.exam_filter || null,
        subject_filter: form.subject_filter || null,
        limit: form.limit ? Number(form.limit) : null,
      };
      const r = await apiClient.post("/admin/generate-content", body);
      setStatus(r.data.status || status);
      setPolling(true);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Başlatılamadı");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      await apiClient.delete("/admin/generate-content/cancel");
      fetchStatus();
    } catch {}
  };

  // Actions: Curriculum
  const handleGenerateCurriculum = async (e) => {
    e.preventDefault();
    if (!currForm.exam_name) return toast.error("Sınav adı zorunludur.");
    setCurrLoading(true);
    setGeneratedCurriculum(null);
    try {
      const res = await apiClient.post("/admin/generate-curriculum", currForm);
      toast.success("🎉 Sınav müfredatı (ders, konu ve alt konuları) başarıyla oluşturuldu.");
      setGeneratedCurriculum(res.data.curriculum);
      setCurrForm({ exam_name: "", description: "", category: "diger" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Müfredat üretilemedi.");
    } finally {
      setCurrLoading(false);
    }
  };

  // Actions: Bulk Questions
  const handleStartQBulk = async (e) => {
    e.preventDefault();
    if (!window.confirm("Toplu soru üretimini başlatmak istiyor musunuz? Alt konular sırayla taranıp soru havuzuna eklenecektir.")) return;
    setQLoading(true);
    try {
      const body = {
        exam_id: qForm.exam_id || null,
        count_per_subtopic: Number(qForm.count_per_subtopic) || 5,
        difficulty: qForm.difficulty,
        style: qForm.style,
      };
      const res = await apiClient.post("/admin/generate-questions", body);
      setQStatus(res.data.status || qStatus);
      setQPolling(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Başlatılamadı.");
    } finally {
      setQLoading(false);
    }
  };

  const handleStopQBulk = async () => {
    try {
      await apiClient.delete("/admin/generate-questions/cancel");
      fetchQStatus();
    } catch {}
  };

  const pct = status.total > 0 ? Math.round((status.done / status.total) * 100) : 0;
  const pctQ = qStatus.total > 0 ? Math.round((qStatus.done / qStatus.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Tab Selector inside Content Generator */}
      <div className="flex gap-2 border-b border-zinc-200 pb-3">
        <button
          onClick={() => setSubTab("lecture")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            subTab === "lecture"
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          📝 Konu Anlatımı Üretici
        </button>
        <button
          onClick={() => setSubTab("curriculum")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            subTab === "curriculum"
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          🗺️ AI Akıllı Müfredat Üretici
        </button>
        <button
          onClick={() => setSubTab("bulk_questions")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            subTab === "bulk_questions"
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          🤖 AI Toplu Soru Üretici
        </button>
      </div>

      {subTab === "lecture" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50"><Sparkles size={20} className="text-violet-600" /></div>
            <div>
              <h2 className="text-xl font-heading font-bold text-ink">Otomatik Konu Anlatımı Üretici</h2>
              <p className="text-sm text-zinc-500">Tüm konu başlıkları için AI ile konu anlatımı üret ve MySQL'e kaydet.</p>
            </div>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-ink text-sm">Filtreler (isteğe bağlı)</h3>
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Sınav Türü Filtresi</label>
                <input value={form.exam_filter} onChange={e => setForm(f => ({ ...f, exam_filter: e.target.value }))}
                  placeholder="ör: TYT, KPSS" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Ders Filtresi</label>
                <input value={form.subject_filter} onChange={e => setForm(f => ({ ...f, subject_filter: e.target.value }))}
                  placeholder="ör: Matematik" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Maksimum Konu</label>
                <input type="number" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))}
                  placeholder="Boş = tümü" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Eşzamanlılık (hız)</label>
                <select value={form.concurrency} onChange={e => setForm(f => ({ ...f, concurrency: e.target.value }))} className={inputCls}>
                  <option value={5}>5 paralel (ücretsiz tier)</option>
                  <option value={10}>10 paralel (önerilen)</option>
                  <option value={20}>20 paralel (ücretli API)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {!status.running ? (
                <button onClick={handleStart} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                  Üretimi Başlat
                </button>
              ) : (
                <button onClick={handleStop} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors">
                  <Square size={16} /> Durdur
                </button>
              )}
              <button onClick={fetchStatus} className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm hover:bg-zinc-50">Yenile</button>
            </div>
          </Card>

          {(status.running || status.total > 0) && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{status.running ? "⚡ Üretim devam ediyor..." : "✅ Tamamlandı"}</span>
                <span className="text-sm font-bold text-violet-600">{pct}%</span>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <div className="text-2xl font-black text-emerald-600">{status.done}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Tamamlanan</div>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <div className="text-2xl font-black text-red-500">{status.failed}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Başarısız</div>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl">
                  <div className="text-2xl font-black text-zinc-700">{status.total}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Toplam Konu</div>
                </div>
              </div>
              {status.log && status.log.length > 0 && (
                <div className="bg-zinc-900 rounded-xl p-4 font-mono text-xs text-zinc-200 max-h-32 overflow-auto space-y-1">
                  {status.log.map((line, i) => <div key={i}>{line}</div>)}
                </div>
              )}
            </Card>
          )}

          <Card className="p-5 bg-zinc-50 border-dashed">
            <h3 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2"><Sparkles size={14} className="text-violet-600" /> Nasıl Çalışır?</h3>
            <div className="grid sm:grid-cols-3 gap-3 text-xs text-zinc-600">
              <div className="flex gap-2"><span className="font-black text-violet-600 shrink-0">1.</span> Veritabanındaki tüm konular taranır, zaten içeriği olanlar atlanır.</div>
              <div className="flex gap-2"><span className="font-black text-violet-600 shrink-0">2.</span> Seçilen eşzamanlılıkta Gemini/OpenAI API paralel çağrılır.</div>
              <div className="flex gap-2"><span className="font-black text-violet-600 shrink-0">3.</span> Üretilen her konu anlatımı, MySQL'e "Ders Notu" olarak anında kaydedilir.</div>
            </div>
          </Card>
        </div>
      )}

      {subTab === "curriculum" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50"><Sparkles size={20} className="text-violet-600" /></div>
            <div>
              <h2 className="text-xl font-heading font-bold text-ink">AI Akıllı Müfredat Oluşturucu</h2>
              <p className="text-sm text-zinc-500">Sadece sınav adını girin; yapay zeka tüm dersleri, konuları ve alt konuları otomatik oluştursun.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-6 items-start">
            <Card className="p-6 md:col-span-5 space-y-4">
              <form onSubmit={handleGenerateCurriculum} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 block mb-1">Sınav Adı *</label>
                  <input
                    required
                    value={currForm.exam_name}
                    onChange={e => setCurrForm(f => ({ ...f, exam_name: e.target.value }))}
                    placeholder="Örn: TUS, DGS, LGS, YÖKDİL"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 block mb-1">Kategori</label>
                  <select
                    value={currForm.category}
                    onChange={e => setCurrForm(f => ({ ...f, category: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="universite">Üniversite Hazırlık (YKS/TYT)</option>
                    <option value="lise">Lise Hazırlık (LGS)</option>
                    <option value="kpss">Kamu Sınavları (KPSS)</option>
                    <option value="diger">Diğer / Mesleki Sınavlar</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 block mb-1">Sınav Açıklaması</label>
                  <input
                    value={currForm.description}
                    onChange={e => setCurrForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Örn: Tıpta Uzmanlık Sınavı müfredatı"
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={currLoading}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {currLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  🤖 AI Müfredatı Oluştur ve Kaydet
                </button>
              </form>
            </Card>

            <Card className="p-6 md:col-span-7 space-y-4">
              <h3 className="font-heading font-bold text-sm text-ink">AI Üretim Çıktısı</h3>
              {currLoading ? (
                <div className="py-20 text-center space-y-3">
                  <Spinner />
                  <p className="text-xs text-zinc-500 animate-pulse">Yapay zeka sınav müfredatını yapılandırıyor. Bu işlem 30-45 saniye sürebilir...</p>
                </div>
              ) : generatedCurriculum ? (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} /> Müfredat başarıyla oluşturuldu ve veritabanına eklendi!
                  </div>
                  {generatedCurriculum.subjects?.map((s, idx_s) => (
                    <div key={idx_s} className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50 space-y-2">
                      <h4 className="font-heading font-black text-sm text-violet-600">{s.name} <span className="text-[10px] text-zinc-400 font-bold">({s.slug})</span></h4>
                      <div className="space-y-1.5 pl-2 border-l-2 border-zinc-200">
                        {s.topics?.map((t, idx_t) => (
                          <div key={idx_t} className="text-xs">
                            <span className="font-bold text-zinc-700">• {t.name}</span>
                            <div className="text-[10px] text-zinc-500 pl-4 mt-0.5">
                              Alt Konular: {t.subtopics?.join(", ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-400 py-16 text-center">
                  Henüz bir üretim başlatılmadı. AI ile sınav müfredatı oluşturmak için soldaki formu kullanın.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {subTab === "bulk_questions" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50"><Sparkles size={20} className="text-violet-600" /></div>
            <div>
              <h2 className="text-xl font-heading font-bold text-ink">AI Toplu Soru Üretim İstasyonu</h2>
              <p className="text-sm text-zinc-500">
                Seçtiğiniz sınav türüne ait tüm dersleri, konuları ve alt konuları tarayarak otomatik toplu sorular üretir.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-6 items-start">
            <Card className="p-6 md:col-span-5 space-y-4">
              <form onSubmit={handleStartQBulk} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 block mb-1">Sınav Türü</label>
                  <select
                    value={qForm.exam_id}
                    onChange={e => setQForm(f => ({ ...f, exam_id: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">TÜM SINAV TÜRLERİ (Sırayla taranır)</option>
                    {examsList.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-zinc-600 block mb-1">Alt Konu Başına Soru</label>
                    <select
                      value={qForm.count_per_subtopic}
                      onChange={e => setQForm(f => ({ ...f, count_per_subtopic: e.target.value }))}
                      className={inputCls}
                    >
                      <option value={3}>3 Soru</option>
                      <option value={5}>5 Soru (Önerilen)</option>
                      <option value={10}>10 Soru</option>
                      <option value={20}>20 Soru</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-600 block mb-1">Zorluk</label>
                    <select
                      value={qForm.difficulty}
                      onChange={e => setQForm(f => ({ ...f, difficulty: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="orta">Orta Seviye</option>
                      <option value="kolay">Kolay Seviye</option>
                      <option value="zor">Zor Seviye</option>
                      <option value="mix">Karma (Karışık)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-600 block mb-1">Soru Stili</label>
                  <select
                    value={qForm.style}
                    onChange={e => setQForm(f => ({ ...f, style: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="standard">Standart ÖSYM Tarzı</option>
                    <option value="new_generation">Yeni Nesil Hikaye/Şekil Temelli</option>
                    <option value="conceptual">Kavramsal & Tuzaklı</option>
                    <option value="mix">Karışık Tarzlar</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  {!qStatus.running ? (
                    <button
                      type="submit"
                      disabled={qLoading}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                      {qLoading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                      🚀 Toplu Soru Üretimini Başlat
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopQBulk}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-colors"
                    >
                      <Square size={16} /> Durdur
                    </button>
                  )}
                </div>
              </form>
            </Card>

            <Card className="p-6 md:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm text-ink">Canlı Üretim Durumu</h3>
                {qStatus.running && (
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 font-bold rounded-lg text-[10px] uppercase animate-pulse">
                    Devam Ediyor
                  </span>
                )}
              </div>

              {(qStatus.running || qStatus.total > 0) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-500">Müfredat İlerlemesi</span>
                    <span className="font-bold text-violet-600">{pctQ}%</span>
                  </div>
                  <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full"
                      animate={{ width: `${pctQ}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-3 bg-emerald-50 rounded-xl">
                      <div className="text-xl font-black text-emerald-600">{qStatus.done}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Tamamlanan Konu</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-xl">
                      <div className="text-xl font-black text-red-500">{qStatus.failed}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Başarısız Konu</div>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <div className="text-xl font-black text-zinc-700">{qStatus.total}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Toplam Alt Konu</div>
                    </div>
                  </div>
                </div>
              )}

              {qStatus.log && qStatus.log.length > 0 ? (
                <div className="bg-zinc-900 rounded-xl p-4 font-mono text-[10px] text-zinc-200 max-h-48 overflow-auto space-y-1">
                  {qStatus.log.map((line, i) => <div key={i}>{line}</div>)}
                </div>
              ) : (
                <div className="text-xs text-zinc-400 py-16 text-center">
                  Henüz toplu üretim başlatılmadı. Yapay zeka ile toplu sorular üretmek için soldaki paneli kullanın.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}



