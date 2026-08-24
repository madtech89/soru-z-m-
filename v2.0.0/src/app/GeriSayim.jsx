import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Calendar } from "lucide-react";
import { fetchExams } from "@/lib/api";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";

const EXAM_DATES = {
  "YKS": "2026-06-20T10:15:00",
  "TYT": "2026-06-20T10:15:00",
  "AYT": "2026-06-21T10:15:00",
  "YDT": "2026-06-21T14:30:00",
  "LGS": "2026-06-07T09:30:00",
  "KPSS Lisans": "2026-10-31T10:00:00",
  "KPSS Ön Lisans": "2026-10-31T10:00:00",
  "ALES": "2026-05-18T10:00:00",
  "DGS": "2026-07-13T10:00:00",
  "YDS": "2026-03-15T10:00:00",
  "YÖKDİL": "2026-03-16T10:00:00",
  "MSÜ": "2026-03-09T10:00:00",
  "Polis Akademisi": "2026-04-05T10:00:00",
  "TUS": "2026-09-13T10:00:00",
  "DUS": "2026-09-13T10:00:00",
  "TOEFL": "2026-04-12T09:00:00",
  "IELTS": "2026-04-26T09:00:00",
  "Sürücü Kursu": "2026-09-01T10:00:00",
};

function calcRemaining(target) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}

export default function GeriSayim() {
  const [exams, setExams] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { fetchExams().then(setExams).catch(() => setExams([])); }, []);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);

  if (!exams) return <Spinner />;

  const withDates = exams.filter((e) => EXAM_DATES[e.name]);
  const sorted = withDates.sort((a, b) => new Date(EXAM_DATES[a.name]) - new Date(EXAM_DATES[b.name]));
  void tick;

  return (
    <div>
      <PageHeader eyebrow="geri sayim" title="Sinava Kalan Sure" sub="Hedef sinavina kalan gun, saat, dakika ve saniyeyi gercek zamanli takip et." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {sorted.map((e, i) => {
          const r = calcRemaining(EXAM_DATES[e.name]);
          return (
            <motion.div key={e.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}>
              <Card className="p-6 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-10 w-10 rounded-xl bg-subject-matematik/10 grid place-items-center"><Clock size={18} className="text-subject-matematik" /></span>
                  <div>
                    <div className="font-heading font-bold text-lg">{e.name}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1"><Calendar size={12} /> {new Date(EXAM_DATES[e.name]).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</div>
                  </div>
                </div>
                {r ? (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[["Gun", r.days], ["Saat", r.hours], ["Dakika", r.mins], ["Saniye", r.secs]].map(([label, val]) => (
                      <div key={label} className="rounded-xl bg-zinc-50 py-3">
                        <div className="font-heading font-extrabold text-2xl text-ink tabular-nums">{String(val).padStart(2, "0")}</div>
                        <div className="text-[10px] text-zinc-400 uppercase mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-subject-fen/10 py-6 text-center font-heading font-bold text-subject-fen">Sinav zamani geldi!</div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
      {sorted.length === 0 && <Card className="p-10 text-center text-zinc-400">Su an icin tarih belirlenmis sinav bulunmuyor.</Card>}
    </div>
  );
}
