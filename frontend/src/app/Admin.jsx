import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap, HelpCircle, FileText, Database, BarChart3, Plus, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-subject-matematik transition";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [tab, setTab] = useState("exam");

  // exam form
  const [exam, setExam] = useState({ name: "", description: "" });
  // question form
  const [q, setQ] = useState({ exam_id: "", subject_id: "", topic_id: "", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", option_e: "", correct_answer: "A", difficulty: "orta", explanation: "" });
  const [busy, setBusy] = useState(false);

  const loadStats = () => api.get("/admin/stats").then((r) => setStats(r.data));
  useEffect(() => { loadStats(); api.get("/exams").then((r) => setExams(r.data)); }, []);
  useEffect(() => { if (q.exam_id) api.get(`/exams/${q.exam_id}/subjects`).then((r) => setSubjects(r.data)); }, [q.exam_id]);
  useEffect(() => { if (q.exam_id && q.subject_id) api.get(`/exams/${q.exam_id}/topics?subject_id=${q.subject_id}`).then((r) => setTopics(r.data)); }, [q.subject_id, q.exam_id]);

  const createExam = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post("/admin/exams", { ...exam, exam_type: "general", status: "active" });
      toast.success("Sınav eklendi!"); setExam({ name: "", description: "" });
      api.get("/exams").then((r) => setExams(r.data)); loadStats();
    } catch { toast.error("Eklenemedi (admin yetkisi gerekli)."); } finally { setBusy(false); }
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

  if (!stats) return <Spinner />;

  const cards = [
    { icon: Users, label: "Kullanıcı", value: stats.users, color: "#4F46E5" },
    { icon: GraduationCap, label: "Sınav", value: stats.exams, color: "#10B981" },
    { icon: HelpCircle, label: "Soru", value: stats.questions, color: "#F59E0B" },
    { icon: FileText, label: "Deneme", value: stats.tests, color: "#EC4899" },
    { icon: Database, label: "Cevap Kaydı", value: stats.answers, color: "#F43F5E" },
    { icon: BarChart3, label: "Sonuç", value: stats.results, color: "#0F172A" },
  ];

  return (
    <div>
      <PageHeader eyebrow="yönetim" title="Admin Paneli" sub="Sistem istatistikleri, sınav ve soru yönetimi." />

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

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("exam")} className={`px-4 py-2 rounded-full text-sm font-medium ${tab === "exam" ? "bg-ink text-white" : "bg-zinc-100 text-zinc-600"}`} data-testid="admin-tab-exam">Sınav Ekle</button>
        <button onClick={() => setTab("question")} className={`px-4 py-2 rounded-full text-sm font-medium ${tab === "question" ? "bg-ink text-white" : "bg-zinc-100 text-zinc-600"}`} data-testid="admin-tab-question">Soru Ekle</button>
      </div>

      {tab === "exam" ? (
        <Card className="p-6 max-w-lg">
          <form onSubmit={createExam} className="space-y-4" data-testid="admin-exam-form">
            <div><label className="text-sm text-zinc-500">Sınav adı</label><input required value={exam.name} onChange={(e) => setExam((s) => ({ ...s, name: e.target.value }))} className={inputCls} data-testid="admin-exam-name" /></div>
            <div><label className="text-sm text-zinc-500">Açıklama</label><input value={exam.description} onChange={(e) => setExam((s) => ({ ...s, description: e.target.value }))} className={inputCls} /></div>
            <button disabled={busy} className="flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60" data-testid="admin-exam-submit">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Ekle
            </button>
          </form>
        </Card>
      ) : (
        <Card className="p-6 max-w-2xl">
          <form onSubmit={createQuestion} className="space-y-4" data-testid="admin-question-form">
            <div className="grid sm:grid-cols-3 gap-3">
              <select required value={q.exam_id} onChange={(e) => setQ((s) => ({ ...s, exam_id: e.target.value, subject_id: "", topic_id: "" }))} className={inputCls} data-testid="admin-q-exam">
                <option value="">Sınav</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select required value={q.subject_id} onChange={(e) => setQ((s) => ({ ...s, subject_id: e.target.value, topic_id: "" }))} className={inputCls} data-testid="admin-q-subject">
                <option value="">Ders</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select required value={q.topic_id} onChange={(e) => setQ((s) => ({ ...s, topic_id: e.target.value }))} className={inputCls} data-testid="admin-q-topic">
                <option value="">Konu</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
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
    </div>
  );
}
