import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Target, BookOpen, Flag, TrendingUp, ArrowRight, Loader2, CalendarDays } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

export default function AICoach() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [ai, setAi] = useState(null);
  const [gen, setGen] = useState(false);

  useEffect(() => {
    api.get("/dashboard").then((r) => setD(r.data));
    api.get("/ai/coach/latest").then((r) => setAi(r.data?.result || null));
  }, []);
  if (!d) return <Spinner />;

  const weakest = d.weak_topics[0];
  const target = user?.target_score;
  const gap = target && d.avg_score ? Math.max(0, target - d.avg_score) : null;
  const recQ = weakest ? (weakest.status === "Kritik Eksik" ? 30 : 20) : d.daily_goal;

  const advice = weakest
    ? `Son performansına göre en zayıf konun "${weakest.topic_name}" (${weakest.subject_name}) — yeterliliğin %${weakest.proficiency}. Önce bu konunun ders notunu incelemen, ardından orta zorlukta ${recQ} soru çözmen önerilir.`
    : "Henüz yeterli veri yok. Birkaç deneme çöz, sana özel önerini oluşturayım.";

  const generate = async () => {
    setGen(true);
    try {
      const { data } = await api.post("/ai/coach");
      setAi(data.result);
      toast.success("AI analizin hazır!");
    } catch (e) {
      toast.error("AI önerisi üretilemedi, tekrar dene.");
    } finally { setGen(false); }
  };

  const blocks = [
    { icon: Flag, color: "#F43F5E", title: "En önemli eksiğin", body: weakest ? `${weakest.topic_name} — %${weakest.proficiency} (${weakest.status})` : "Belirlenmedi" },
    { icon: BookOpen, color: "#4F46E5", title: "Bugün çözmen gereken", body: `${recQ} soru · odak: ${weakest ? weakest.subject_name : "genel tekrar"}` },
    { icon: TrendingUp, color: "#10B981", title: "Hedefine kalan yol", body: gap != null ? `Ortalaman ${d.avg_score}, hedefin ${target}. Kalan: ${gap} puan.` : "Hedef puan belirle, yolunu çizeyim." },
    { icon: Target, color: "#F59E0B", title: "Günlük hedefin", body: `${d.daily_goal} soru · seri: ${d.streak} gün` },
  ];

  return (
    <div>
      <PageHeader eyebrow="ai koç" title="AI Koç" sub="Önerilerin gerçek performans verine dayanır — rastgele değil."
        right={
          <button onClick={generate} disabled={gen} data-testid="ai-generate" className="hidden sm:flex items-center gap-2 bg-subject-ai text-white font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60">
            {gen ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} AI analizi oluştur
          </button>
        } />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}>
        <Card className="p-7 mb-5 bg-subject-ai/5 border-subject-ai/20 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-subject-ai/10" />
          <div className="relative flex items-start gap-4">
            <span className="h-12 w-12 rounded-2xl bg-subject-ai/15 grid place-items-center shrink-0">
              <Brain size={22} className="text-subject-ai" />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading font-bold text-lg">Kişisel analiz</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-subject-ai/15 text-subject-ai">{ai ? "GPT-5.4" : "kural tabanlı"}</span>
              </div>
              <p className="text-zinc-600 leading-relaxed" data-testid="ai-analysis">{ai?.analysis || advice}</p>
              {ai?.motivation && <p className="mt-2 font-editorial italic text-subject-ai">"{ai.motivation}"</p>}
            </div>
          </div>
          <button onClick={generate} disabled={gen} data-testid="ai-generate-mobile" className="sm:hidden mt-4 w-full flex items-center justify-center gap-2 bg-subject-ai text-white font-semibold py-2.5 rounded-xl disabled:opacity-60">
            {gen ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} AI analizi oluştur
          </button>
        </Card>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {blocks.map((b, i) => (
          <motion.div key={b.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06, ease: EASE }}>
            <Card className="p-6 h-full">
              <span className="h-10 w-10 rounded-xl grid place-items-center mb-3" style={{ background: `${b.color}18` }}>
                <b.icon size={18} style={{ color: b.color }} />
              </span>
              <h4 className="font-heading font-bold text-sm">{b.title}</h4>
              <p className="text-sm text-zinc-500 mt-1.5">{b.body}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {ai?.weekly_plan?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2"><CalendarDays size={18} className="text-subject-ai" /> Haftalık Çalışma Planın</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="ai-plan">
              {ai.weekly_plan.map((p, i) => (
                <Card key={i} className="p-4">
                  <div className="text-xs font-semibold text-subject-ai">{p.day}</div>
                  <div className="font-heading font-bold mt-1">{p.subject}</div>
                  <div className="text-sm text-zinc-500">{p.topic}</div>
                  <div className="text-xs text-zinc-400 mt-2 border-t border-zinc-100 pt-2">{p.task}</div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {weakest && (
        <Link to={`/app/ders-notlari?topic_id=${weakest.topic_id}`} data-testid="ai-start" className="mt-6 inline-flex items-center gap-2 bg-ink text-white font-semibold px-6 py-3 rounded-full hover:bg-subject-ai transition-colors">
          Önerilen ders notunu aç <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
