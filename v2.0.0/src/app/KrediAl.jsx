import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, CheckCircle2, Star, Crown, Infinity as InfinityIcon,
  ArrowRight, Clock, Receipt, ChevronDown, ChevronUp, Loader2,
  TrendingDown, TrendingUp, ShoppingCart
} from "lucide-react";
import { fetchCreditBalance, fetchCreditHistory, fetchCreditPackages, purchaseCredits } from "@/lib/api";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

const TYPE_LABELS = {
  welcome_bonus: { label: "Hoş Geldin Hediyesi", color: "text-emerald-600", bg: "bg-emerald-50", icon: Star },
  ai_snap: { label: "Fotoğraflı Soru Çözümü", color: "text-violet-600", bg: "bg-violet-50", icon: Zap },
  ai_chat: { label: "AI Koç Mesajı", color: "text-blue-600", bg: "bg-blue-50", icon: Zap },
  ai_flashcard: { label: "AI Flashcard", color: "text-orange-600", bg: "bg-orange-50", icon: Zap },
  purchase: { label: "Kredi Satın Alma", color: "text-emerald-600", bg: "bg-emerald-50", icon: ShoppingCart },
  admin_grant: { label: "Admin Hediyesi", color: "text-amber-600", bg: "bg-amber-50", icon: Crown },
};

const PACKAGE_ICONS = {
  starter: Zap,
  marathon: Star,
  super: Crown,
  unlimited: InfinityIcon,
};
const PACKAGE_COLORS = {
  starter: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", btn: "bg-blue-600 hover:bg-blue-700" },
  marathon: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-300 ring-2 ring-violet-300", btn: "bg-violet-600 hover:bg-violet-700" },
  super: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", btn: "bg-amber-500 hover:bg-amber-600" },
  unlimited: { bg: "bg-zinc-900", text: "text-white", border: "border-zinc-700", btn: "bg-white text-zinc-900 hover:bg-zinc-100" },
};

function formatDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default function KrediAl() {
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [packages, setPackages] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [purchasing, setPurchasing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCreditBalance(), fetchCreditHistory(), fetchCreditPackages()])
      .then(([b, h, p]) => {
        setBalance(b.balance);
        setHistory(h);
        setPackages(p);
      })
      .catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (pkg) => {
    if (pkg.credits === -1) {
      toast.info("Sınırsız Pro abonelik ödeme entegrasyonu yakında aktif olacak.");
      return;
    }
    setPurchasing(pkg.id);
    try {
      const res = await purchaseCredits(pkg.id);
      setBalance(res.new_balance);
      setHistory(h => [{
        id: Date.now().toString(), type: "purchase",
        amount: pkg.credits, balance_after: res.new_balance,
        description: `${pkg.name} — ${pkg.credits} Kredi Satın Alındı`,
        created_at: new Date().toISOString()
      }, ...h]);
      toast.success(`✅ ${pkg.credits} kredi başarıyla yüklendi!`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Satın alma başarısız");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        eyebrow="KREDİ SİSTEMİ"
        title="AI Kredileri"
        sub="Yapay zeka özelliklerini kullanmak için kredi satın alın. Her yeni üyelikte 100 kredi hediye!"
      />

      {/* Mevcut Bakiye */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: EASE }}
        className="mb-8"
      >
        <Card className="p-6 bg-gradient-to-br from-violet-600 to-purple-700 text-white border-0 shadow-xl shadow-violet-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-violet-200 mb-1">Mevcut Bakiyeniz</div>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black font-heading tabular-nums">{balance ?? 0}</span>
                <span className="text-violet-300 text-lg mb-1">Kredi</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-violet-200">
                <span className="flex items-center gap-1"><Zap size={12} /> Fotoğraflı Soru = 3 kredi</span>
                <span className="flex items-center gap-1"><Zap size={12} /> AI Koç Mesajı = 1 kredi</span>
                <span className="flex items-center gap-1"><Zap size={12} /> AI Flashcard = 1 kredi</span>
              </div>
            </div>
            <div className="h-20 w-20 rounded-2xl bg-white/10 grid place-items-center">
              <Zap size={40} className="text-yellow-300" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Paketler */}
      <h2 className="text-xl font-heading font-bold text-ink mb-4">Kredi Paketleri</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {packages.map((pkg, i) => {
          const Icon = PACKAGE_ICONS[pkg.id] || Zap;
          const col = PACKAGE_COLORS[pkg.id] || PACKAGE_COLORS.starter;
          return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, ease: EASE }}
              whileHover={{ y: -4, transition: { duration: 0.15 } }}
            >
              <Card className={`p-5 h-full flex flex-col relative overflow-hidden border ${col.border}`}>
                {pkg.badge && (
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.id === "unlimited" ? "bg-zinc-700 text-zinc-200" : "bg-violet-100 text-violet-700"}`}>
                    {pkg.badge}
                  </span>
                )}
                <div className={`h-11 w-11 rounded-xl ${col.bg} grid place-items-center mb-3`}>
                  <Icon size={22} className={col.text} />
                </div>
                <div className="font-heading font-bold text-base text-ink mb-1">{pkg.name}</div>
                <div className="text-3xl font-black font-heading text-ink mb-0.5">
                  {pkg.credits === -1 ? <span className="flex items-center gap-1"><InfinityIcon size={28} /></span> : pkg.credits}
                  {pkg.credits !== -1 && <span className="text-sm font-medium text-zinc-500 ml-1">Kredi</span>}
                </div>
                <div className="text-sm text-zinc-500 mb-4">
                  {pkg.id === "unlimited" ? "Aylık abonelik" : `≈ ${Math.floor(pkg.credits / 3)} fotoğraflı soru`}
                </div>
                <div className="text-2xl font-bold text-ink mb-5">
                  {pkg.price_tl} ₺
                  {pkg.id === "unlimited" && <span className="text-sm font-medium text-zinc-500">/ay</span>}
                </div>
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing === pkg.id}
                  className={`mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${col.btn} disabled:opacity-60`}
                >
                  {purchasing === pkg.id
                    ? <Loader2 size={16} className="animate-spin" />
                    : <><ShoppingCart size={15} /> Satın Al</>}
                </button>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Kredi Nasıl Çalışır */}
      <Card className="p-6 mb-8 bg-zinc-50 border-dashed">
        <h3 className="font-heading font-bold text-base text-ink mb-3">⚡ Kredi Sistemi Nasıl Çalışır?</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          {[
            { title: "İlk Üyelikte 100 Kredi Hediye", desc: "Platforma katıldığında otomatik olarak 100 AI kredisi hesabına yüklenir." },
            { title: "AI Özellikleri Kredi Kullanır", desc: "Fotoğraflı soru çözümü (3 kredi), AI Koç mesajı (1 kredi), Flashcard üretimi (1 kredi)." },
            { title: "Soru Bankası Sonsuza Dek Ücretsiz", desc: "Denemeler, soru bankası ve ders notları hiçbir zaman kredi gerektirmez." },
          ].map(({ title, desc }) => (
            <div key={title} className="flex gap-3">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-ink">{title}</div>
                <div className="text-zinc-500 text-xs mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Hareket Geçmişi */}
      <div>
        <button
          onClick={() => setShowHistory(h => !h)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-ink transition-colors mb-3"
        >
          <Receipt size={16} />
          Kredi Hareketleri ({history.length})
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">İşlem</th>
                        <th className="px-5 py-3 font-medium">Açıklama</th>
                        <th className="px-5 py-3 font-medium text-right">Miktar</th>
                        <th className="px-5 py-3 font-medium text-right">Bakiye</th>
                        <th className="px-5 py-3 font-medium text-right">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {history.map((tx, i) => {
                        const meta = TYPE_LABELS[tx.type] || { label: tx.type, color: "text-zinc-600", bg: "bg-zinc-50", icon: Zap };
                        const Icon = meta.icon;
                        const isPositive = tx.amount > 0;
                        return (
                          <motion.tr
                            key={tx.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-zinc-50/50"
                          >
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
                                <Icon size={12} /> {meta.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-zinc-600 max-w-[200px] truncate">{tx.description || "—"}</td>
                            <td className="px-5 py-3 text-right">
                              <span className={`font-bold font-heading ${isPositive ? "text-emerald-600" : "text-red-500"} flex items-center justify-end gap-1`}>
                                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {isPositive ? "+" : ""}{tx.amount}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-ink">{tx.balance_after}</td>
                            <td className="px-5 py-3 text-right text-zinc-400 text-xs">{formatDate(tx.created_at)}</td>
                          </motion.tr>
                        );
                      })}
                      {history.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Henüz kredi hareketi yok.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
