import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Sparkles, Target, BookOpen, Flag, TrendingUp, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";
import { statusColor } from "@/lib/subjects";

export default function AICoach() {
  const { user } = useAuth();
  const [d, setD] = useState(null);

  useEffect(() => { api.get("/dashboard").then((r) => setD(r.data)); }, []);
  if (!d) return <Spinner />;

  const weakest = d.weak_topics[0];
  const target = user?.target_score;
  const gap = target && d.avg_score ? Math.max(0, target - d.avg_score) : null;
  const recQ = weakest ? (weakest.status === "Kritik Eksik" ? 30 : 20) : d.daily_goal;

  const advice = weakest
    ? `Son performansına göre en zayıf konun "${weakest.topic_name}" (${weakest.subject_name}) — yeterliliğin %${weakest.proficiency}. Önce bu konunun ders notunu incelemen, ardından orta zorlukta ${recQ} soru çözmen önerilir.`
    : "Henüz yeterli veri yok. Birkaç deneme çöz, sana özel önerini oluşturayım.";

  const blocks = [
    { icon: Target, color: "#EC4899", title: "Bugünkü önerim", body: advice },
    { icon: Flag, color: "#F43F5E", title: "En önemli eksiğin", body: weakest ? `${weakest.topic_name} — %${weakest.proficiency} (${weakest.status})` : "Belirlenmedi" },
    { icon: BookOpen, color: "#4F46E5", title: "Bugün çözmen gereken", body: `${recQ} soru · odak: ${weakest ? weakest.subject_name : "genel tekrar"}` },
    { icon: TrendingUp, color: "#10B981", title: "Hedefine kalan yol", body: gap != null ? `Ortalaman ${d.avg_score}, hedefin ${target}. Kalan: ${gap} puan.` : "Hedef puan belirle, yolunu çizeyim." },
  ];

  return (
    <div>
      <PageHeader eyebrow="ai koç" title="AI Koç" sub="Önerilerin gerçek performans verine dayanır — rastgele değil." />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE }}>
        <Card className="p-7 mb-5 bg-subject-ai/5 border-subject-ai/20 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-subject-ai/10" />
          <div className="relative flex items-start gap-4">
            <span className="h-12 w-12 rounded-2xl bg-subject-ai/15 grid place-items-center shrink-0">
              <Brain size={22} className="text-subject-ai" />
            </span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading font-bold text-lg">Kişisel analiz</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-subject-ai/15 text-subject-ai">kural tabanlı</span>
              </div>
              <p className="text-zinc-600 leading-relaxed">{advice}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4">
        {blocks.map((b, i) => (
          <motion.div key={b.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.06, ease: EASE }}>
            <Card className="p-6 h-full">
              <span className="h-10 w-10 rounded-xl grid place-items-center mb-3" style={{ background: `${b.color}18` }}>
                <b.icon size={18} style={{ color: b.color }} />
              </span>
              <h4 className="font-heading font-bold">{b.title}</h4>
              <p className="text-sm text-zinc-500 mt-1.5">{b.body}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {weakest && (
        <Link to="/app/soru-bankasi" data-testid="ai-start" className="mt-6 inline-flex items-center gap-2 bg-subject-ai text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity">
          Önerilen çalışmaya başla <ArrowRight size={17} />
        </Link>
      )}

      <Card className="p-6 mt-6 border-dashed flex items-center gap-3 text-sm text-zinc-500">
        <Sparkles size={18} className="text-subject-ai" />
        LLM destekli gelişmiş AI Koç (kişisel çalışma planı üretimi) yakında eklenecek.
      </Card>
    </div>
  );
}
