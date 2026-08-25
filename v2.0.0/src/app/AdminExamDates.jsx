import { useState, useEffect } from "react";
import { fetchExams, updateExamDate } from "@/lib/api";
import { toast } from "sonner";
import { Calendar, Save, Loader2, Clock } from "lucide-react";
import { Card } from "@/app/ui";
import { motion } from "framer-motion";

export default function AdminExamDates() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await fetchExams();
      // Sort exams by category and then by name
      const sorted = data.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      });
      setExams(sorted);
    } catch (e) {
      toast.error("Sınavlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (id, newDateStr) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, exam_date: newDateStr } : e));
  };

  const handleSave = async (exam) => {
    try {
      setSaving(exam.id);
      let isoDate = null;
      if (exam.exam_date) {
        // e.target.value from datetime-local is "YYYY-MM-DDTHH:mm"
        // Ensure it's stored correctly or append seconds if needed, but simple ISO string is fine.
        const d = new Date(exam.exam_date);
        if (!isNaN(d.getTime())) {
          isoDate = d.toISOString();
        } else {
          isoDate = exam.exam_date; // fallback
        }
      }
      
      await updateExamDate(exam.id, isoDate);
      toast.success(`${exam.name} tarihi güncellendi`);
    } catch (e) {
      toast.error("Tarih güncellenemedi");
    } finally {
      setSaving(null);
    }
  };

  const toLocalString = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    // Format to YYYY-MM-DDTHH:mm for input[type="datetime-local"]
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-zinc-400" /></div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
          <Calendar size={20} />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-ink">Sınav Tarihleri Yönetimi</h2>
          <p className="text-sm text-zinc-500">Geri sayım aracında gösterilecek sınav tarihlerini buradan güncelleyebilirsiniz.</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
            <tr>
              <th className="px-4 py-3 font-medium">Sınav Adı</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium w-64">Sınav Tarihi ve Saati</th>
              <th className="px-4 py-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {exams.map((exam, i) => (
              <motion.tr 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.03 }}
                key={exam.id} 
                className="hover:bg-zinc-50/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-ink">{exam.name}</td>
                <td className="px-4 py-3 text-zinc-500">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600 uppercase tracking-wider">
                    {exam.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-zinc-400" />
                    <input
                      type="datetime-local"
                      value={toLocalString(exam.exam_date)}
                      onChange={(e) => handleDateChange(exam.id, e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-subject-matematik w-full max-w-[200px]"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSave(exam)}
                    disabled={saving === exam.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  >
                    {saving === exam.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Kaydet
                  </button>
                </td>
              </motion.tr>
            ))}
            {exams.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Sınav bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
