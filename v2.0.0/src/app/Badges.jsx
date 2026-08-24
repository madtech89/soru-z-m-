import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { fetchBadges, fetchUserBadges, fetchDashboard, getLevelInfo } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Spinner, StatCard, EASE } from "@/app/ui";

function BadgeIcon({ name, size = 24, color }) {
  const Icon = LucideIcons[name] || LucideIcons.Award;
  return <Icon size={size} style={{ color }} />;
}

export default function Badges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState(null);
  const [earned, setEarned] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchBadges().then(setBadges).catch(() => setBadges([]));
    fetchUserBadges(user.id).then((e) => setEarned(e.map((x) => x.badge_id))).catch(() => setEarned([]));
    fetchDashboard(user.id).then(setStats).catch(() => {});
  }, [user?.id]);

  if (!badges) return <Spinner />;

  const levelInfo = getLevelInfo(user?.xp || 0);
  const earnedBadges = badges.filter((b) => earned.includes(b.id));
  const lockedBadges = badges.filter((b) => !earned.includes(b.id));

  const statItems = stats ? [
    { label: "XP", value: user?.xp || 0, color: "#F59E0B", icon: LucideIcons.Zap },
    { label: "Seviye", value: levelInfo.level, color: "#4F46E5", icon: LucideIcons.TrendingUp },
    { label: "Rozet", value: earnedBadges.length, color: "#EC4899", icon: LucideIcons.Award },
    { label: "Seri", value: `${stats.streak} gün`, color: "#F43F5E", icon: LucideIcons.Flame },
  ] : [];

  return (
    <div>
      <PageHeader eyebrow="rozet ve seviye" title="Rozetlerim" sub="Soru çöz, deneme tamamla ve serini sürdürerek rozet kazan." />

      {/* Level + XP progress */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="mb-6">
        <Card className="p-7 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-subject-matematik/10" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <LucideIcons.TrendingUp size={16} className="text-subject-matematik" /> Seviye {levelInfo.level}
            </div>
            <div className="flex items-end gap-3 mb-4">
              <span className="font-heading font-extrabold text-5xl">{levelInfo.level}</span>
              <span className="text-zinc-400 mb-2">/ {levelInfo.xpInLevel} / {levelInfo.xpForNext} XP</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-100 overflow-hidden">
              <motion.div className="h-full rounded-full bg-subject-matematik" initial={{ width: 0 }} animate={{ width: `${levelInfo.progress}%` }} transition={{ duration: 0.9, ease: EASE }} />
            </div>
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-zinc-500">%{levelInfo.progress}</span>
              <span className="text-zinc-500">Sonraki seviyeye {levelInfo.xpToNext} XP</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {statItems.map((s, i) => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} icon={s.icon} delay={i * 0.05} />
        ))}
      </div>

      {/* Earned badges */}
      {earnedBadges.length > 0 && (
        <div className="mb-8">
          <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
            <LucideIcons.Award size={18} className="text-subject-sosyal" /> Kazanılan Rozetler ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {earnedBadges.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}>
                <Card className="p-6 text-center">
                  <span className="h-14 w-14 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: `${b.color}18` }}>
                    <BadgeIcon name={b.icon} size={26} color={b.color} />
                  </span>
                  <div className="font-heading font-bold text-sm">{b.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">{b.description}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
            <LucideIcons.Lock size={18} className="text-zinc-400" /> Henüz Kazanılmayan ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {lockedBadges.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}>
                <Card className="p-6 text-center opacity-60">
                  <span className="h-14 w-14 rounded-2xl grid place-items-center mx-auto mb-3 bg-zinc-100">
                    <BadgeIcon name={b.icon} size={26} color="#a1a1aa" />
                  </span>
                  <div className="font-heading font-bold text-sm">{b.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">{b.description}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
