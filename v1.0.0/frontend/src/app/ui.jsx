import { motion } from "framer-motion";
import { Loader2, Inbox } from "lucide-react";

export const EASE = [0.16, 1, 0.3, 1];

export function PageHeader({ eyebrow, title, sub, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8">
      <div>
        {eyebrow && <div className="font-editorial italic text-subject-matematik mb-1">— {eyebrow}</div>}
        <h1 className="font-heading font-extrabold tracking-tighter text-3xl sm:text-4xl">{title}</h1>
        {sub && <p className="text-zinc-500 mt-1.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Card({ className = "", children, ...p }) {
  return (
    <div
      className={`rounded-3xl bg-white border border-zinc-200 ${className}`}
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
      {...p}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, color = "#0F172A", icon: Icon, delay = 0, testid }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <Card className="p-5 h-full" data-testid={testid}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">{label}</span>
          {Icon && (
            <span className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `${color}18` }}>
              <Icon size={15} style={{ color }} />
            </span>
          )}
        </div>
        <div className="font-heading font-extrabold text-3xl mt-2" style={{ color }}>{value}</div>
        {hint && <div className="text-xs text-zinc-400 mt-1">{hint}</div>}
      </Card>
    </motion.div>
  );
}

export function Spinner() {
  return (
    <div className="grid place-items-center py-24">
      <Loader2 className="animate-spin text-subject-matematik" size={30} />
    </div>
  );
}

export function Empty({ text = "Henüz veri yok." }) {
  return (
    <div className="grid place-items-center py-16 text-center text-zinc-400">
      <Inbox size={34} className="mb-3" />
      <p>{text}</p>
    </div>
  );
}
