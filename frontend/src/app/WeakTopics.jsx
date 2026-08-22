import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, Card, Spinner, Empty, EASE } from "@/app/ui";
import { statusColor, tone } from "@/lib/subjects";

export default function WeakTopics() {
  const [prof, setProf] = useState(null);

  useEffect(() => {
    api.get("/topics/proficiency").then((r) => setProf(r.data));
  }, []);

  if (prof === null) return <Spinner />;

  const weak = prof.filter((p) => p.status !== "İyi");
  const good = prof.filter((p) => p.status === "İyi");

  return (
    <div>
      <PageHeader eyebrow="eksik konu tespiti" title="Eksiklerim" sub="Başarı oranı, süre, yanlış ve boş sayına göre hesaplanan konu yeterlilik skorların." />

      {prof.length === 0 ? (
        <Empty text="Henüz yeterli veri yok. Birkaç soru veya deneme çöz." />
      ) : (
        <>
          <div className="space-y-3">
            {weak.map((t, i) => {
              const sc = statusColor(t.status);
              const tn = tone(t.subject_slug);
              return (
                <motion.div key={t.topic_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}>
                  <Card className="p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: tn.hex }} />
                          <span className="font-heading font-bold">{t.topic_name}</span>
                          <span className="text-sm text-zinc-400">· {t.subject_name}</span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">{t.solved} soru · {t.correct} doğru · {t.wrong} yanlış · {t.blank} boş · ort. {t.avg_time}sn</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-heading font-extrabold text-2xl" style={{ color: sc }}>%{t.proficiency}</div>
                          <div className="text-xs font-semibold" style={{ color: sc }}>{t.status}</div>
                        </div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 overflow-hidden mt-3">
                      <motion.div className="h-full rounded-full" style={{ background: sc }} initial={{ width: 0 }} whileInView={{ width: `${t.proficiency}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-zinc-500">Bu konuyu geliştirmek için ders notunu incele.</p>
                      <Link to="/app/soru-bankasi" className="flex items-center gap-1 text-sm font-semibold" style={{ color: tn.hex }} data-testid={`weak-practice-${t.topic_id}`}>
                        <BookOpen size={14} /> Çalış <ArrowRight size={14} />
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {good.length > 0 && (
            <div className="mt-10">
              <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-subject-fen" /> Güçlü Konuların</h3>
              <div className="flex flex-wrap gap-2">
                {good.map((t) => (
                  <span key={t.topic_id} className="px-3 py-1.5 rounded-full text-sm font-medium bg-subject-fen/10 text-subject-fen">
                    {t.topic_name} · %{t.proficiency}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
