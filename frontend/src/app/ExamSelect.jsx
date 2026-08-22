import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, GraduationCap, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

export default function ExamSelect() {
  const { user, updateUser } = useAuth();
  const [exams, setExams] = useState(null);
  const [selected, setSelected] = useState(user?.target_exams || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/exams").then((r) => setExams(r.data));
  }, []);

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/profile", { target_exams: selected });
      updateUser(data.user);
      toast.success("Sınav tercihlerin kaydedildi!");
    } catch {
      toast.error("Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (!exams) return <Spinner />;

  return (
    <div>
      <PageHeader
        eyebrow="sınav seçimi"
        title="Hangi sınava hazırlanıyorsun?"
        sub="Birden fazla sınav seçebilirsin. Dersler, denemeler ve istatistikler buna göre gelir."
        right={
          <button onClick={save} disabled={saving} data-testid="save-exams" className="hidden sm:flex items-center gap-2 bg-ink text-white font-semibold px-5 py-2.5 rounded-full hover:bg-subject-matematik transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Kaydet
          </button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map((e, i) => {
          const on = selected.includes(e.id);
          return (
            <motion.button
              key={e.id}
              data-testid={`exam-${e.name}`}
              onClick={() => toggle(e.id)}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.4, ease: EASE }}
              className={`text-left rounded-3xl p-6 border-2 transition-all ${
                on ? "border-subject-matematik bg-subject-matematik/5" : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`h-11 w-11 rounded-xl grid place-items-center ${on ? "bg-subject-matematik text-white" : "bg-zinc-100 text-zinc-500"}`}>
                  {on ? <Check size={19} /> : <GraduationCap size={19} />}
                </span>
              </div>
              <div className="font-heading font-bold text-lg">{e.name}</div>
              <div className="text-sm text-zinc-500 mt-1 line-clamp-2">{e.description}</div>
            </motion.button>
          );
        })}
      </div>

      <button onClick={save} disabled={saving} data-testid="save-exams-mobile" className="sm:hidden mt-6 w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3 rounded-full disabled:opacity-60">
        {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Kaydet
      </button>
    </div>
  );
}
