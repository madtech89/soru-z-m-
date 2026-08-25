import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Calendar, CheckCircle2 } from "lucide-react";
import { fetchExams } from "@/lib/api";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";

function calcRemaining(target) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null; // Expired
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}

function formatDate(target) {
  const d = new Date(target);
  if (isNaN(d.getTime())) return "Tarih Belirsiz";
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

export default function GeriSayim() {
  const [exams, setExams] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchExams().then(setExams).catch(() => setExams([]));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!exams) return <Spinner />;

  // Filter exams that have a valid date
  const withDates = exams.filter(e => e.exam_date && !isNaN(new Date(e.exam_date).getTime()));
  
  // Sort them: Future exams closest to now first. Past exams at the bottom.
  const now = Date.now();
  
  const upcoming = withDates.filter(e => new Date(e.exam_date).getTime() > now)
    .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
    
  const passed = withDates.filter(e => new Date(e.exam_date).getTime() <= now)
    .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

  const allSorted = [...upcoming, ...passed];

  void tick; // Trigger re-render every second for the countdown

  return (
    <div>
      <PageHeader 
        eyebrow="GERİ SAYIM" 
        title="Sınav Takvimi & Kalan Süreler" 
        sub="Hedef sınavına kalan gün, saat, dakika ve saniyeyi gerçek zamanlı takip et." 
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Sınav Adı</th>
                <th className="px-6 py-4 font-semibold">Kategori</th>
                <th className="px-6 py-4 font-semibold">Sınav Tarihi</th>
                <th className="px-6 py-4 font-semibold text-right">Kalan Süre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {allSorted.map((exam, i) => {
                const isPassed = new Date(exam.exam_date).getTime() <= Date.now();
                const r = isPassed ? null : calcRemaining(exam.exam_date);

                return (
                  <motion.tr 
                    key={exam.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, ease: EASE }}
                    className={isPassed ? "bg-zinc-50/50 grayscale opacity-70" : "hover:bg-zinc-50/50 transition-colors"}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isPassed ? 'bg-zinc-200 text-zinc-500' : 'bg-orange-50 text-orange-600'}`}>
                          {isPassed ? <CheckCircle2 size={18} /> : <Calendar size={18} />}
                        </div>
                        <span className={`font-semibold ${isPassed ? 'text-zinc-600' : 'text-ink'}`}>
                          {exam.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600 uppercase tracking-wider">
                        {exam.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 font-medium">
                      {formatDate(exam.exam_date)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isPassed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200 text-zinc-600 font-bold text-xs">
                          <CheckCircle2 size={14} /> Tamamlandı
                        </span>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-2 text-center">
                          <div className="bg-ink text-white rounded-lg px-2.5 py-1 min-w-[3rem]">
                            <div className="text-sm font-black font-heading leading-none">{r?.days}</div>
                            <div className="text-[10px] font-medium text-zinc-400 mt-0.5">GÜN</div>
                          </div>
                          <div className="text-zinc-300 font-bold">:</div>
                          <div className="bg-zinc-100 text-ink rounded-lg px-2.5 py-1 min-w-[3rem]">
                            <div className="text-sm font-black font-heading leading-none">{String(r?.hours).padStart(2, '0')}</div>
                            <div className="text-[10px] font-medium text-zinc-500 mt-0.5">SAAT</div>
                          </div>
                          <div className="text-zinc-300 font-bold">:</div>
                          <div className="bg-zinc-100 text-ink rounded-lg px-2.5 py-1 min-w-[3rem]">
                            <div className="text-sm font-black font-heading leading-none">{String(r?.mins).padStart(2, '0')}</div>
                            <div className="text-[10px] font-medium text-zinc-500 mt-0.5">DK</div>
                          </div>
                          <div className="text-zinc-300 font-bold">:</div>
                          <div className="bg-zinc-100 text-ink rounded-lg px-2.5 py-1 min-w-[3rem]">
                            <div className="text-sm font-black font-heading leading-none">{String(r?.secs).padStart(2, '0')}</div>
                            <div className="text-[10px] font-medium text-zinc-500 mt-0.5">SN</div>
                          </div>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {allSorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    Henüz takvimi belirlenmiş sınav bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
