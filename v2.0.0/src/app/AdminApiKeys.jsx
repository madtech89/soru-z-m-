import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key, Plus, Trash2, CheckCircle2, XCircle, Clock,
  Eye, EyeOff, RefreshCw, Loader2, Zap, Shield, ChevronDown
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, EASE } from "@/app/ui";
import { toast } from "sonner";

const PROVIDERS = [
  { id: "gemini", label: "Google Gemini", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  { id: "openai", label: "OpenAI (ChatGPT)", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { id: "deepseek", label: "DeepSeek", color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  { id: "groq", label: "Groq", color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  { id: "anthropic", label: "Anthropic Claude", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
];

const STATUS_CONFIG = {
  active: { label: "Aktif", icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50" },
  rate_limited: { label: "Rate Limited", icon: Clock, cls: "text-amber-600 bg-amber-50" },
  failed: { label: "Başarısız", icon: XCircle, cls: "text-red-600 bg-red-50" },
  inactive: { label: "Pasif", icon: XCircle, cls: "text-zinc-500 bg-zinc-100" },
};

function maskKey(k) {
  if (!k || k.length <= 10) return "••••••••";
  return `${k.slice(0, 6)}...••••...${k.slice(-4)}`;
}

export default function AdminApiKeys() {
  const [keys, setKeys] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showValues, setShowValues] = useState({});
  const [form, setForm] = useState({ provider: "gemini", name: "", key_value: "", priority: 1 });

  const loadAll = async () => {
    try {
      const [keysRes, statusRes] = await Promise.all([
        api.get("/admin/api-keys"),
        api.get("/admin/api-keys/status"),
      ]);
      setKeys(keysRes.data);
      setStatus(statusRes.data);
    } catch { toast.error("API anahtarları yüklenemedi"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.key_value.trim() || !form.name.trim()) return toast.error("Tüm alanları doldurun.");
    setAdding(true);
    try {
      await api.post("/admin/api-keys", form);
      toast.success("API anahtarı eklendi!");
      setForm({ provider: "gemini", name: "", key_value: "", priority: 1 });
      setShowAdd(false);
      loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Eklenemedi");
    } finally { setAdding(false); }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await api.patch(`/admin/api-keys/${id}`, { is_active: !isActive });
      loadAll();
      toast.success(isActive ? "Anahtar pasif yapıldı" : "Anahtar aktif edildi");
    } catch { toast.error("Güncellenemedi"); }
  };

  const deleteKey = async (id) => {
    if (!window.confirm("Bu API anahtarını silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/admin/api-keys/${id}`);
      loadAll();
      toast.success("Silindi");
    } catch { toast.error("Silinemedi"); }
  };

  const getProviderInfo = (id) => PROVIDERS.find(p => p.id === id) || PROVIDERS[0];
  const getLiveStatus = (provider, masked) => {
    if (!status) return null;
    const provStatus = status[provider];
    if (!provStatus) return null;
    const match = provStatus.keys?.find(k => k.masked === masked);
    return match;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="animate-spin text-violet-500" size={28} />
    </div>
  );

  // Group keys by provider
  const keysByProvider = {};
  keys.forEach(k => {
    if (!keysByProvider[k.provider]) keysByProvider[k.provider] = [];
    keysByProvider[k.provider].push(k);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-50">
            <Key size={20} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-ink">API Anahtar Yönetimi</h2>
            <p className="text-sm text-zinc-500">Sistem sırayla dener — biri başarısız olursa diğerine geçer.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-sm transition-colors">
            <RefreshCw size={14} /> Yenile
          </button>
          <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
            <Plus size={15} /> API Key Ekle
          </button>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-5 border-violet-200 bg-violet-50/30">
              <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
                <Shield size={16} className="text-violet-600" /> Yeni API Anahtarı Ekle
              </h3>
              <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Sağlayıcı (Provider)</label>
                  <div className="relative">
                    <select
                      value={form.provider}
                      onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 appearance-none"
                    >
                      {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Anahtar Adı (Etiket)</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="ör. Gemini Key #2"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">API Key Değeri</label>
                  <div className="relative">
                    <input
                      type={showValues["new"] ? "text" : "password"}
                      value={form.key_value}
                      onChange={e => setForm(f => ({ ...f, key_value: e.target.value }))}
                      placeholder="AIza... veya sk-..."
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 pr-10 font-mono"
                    />
                    <button type="button" onClick={() => setShowValues(v => ({ ...v, new: !v.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      {showValues["new"] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Öncelik (düşük = önce dene)</label>
                  <input
                    type="number" min={1} max={10}
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                  />
                </div>
                <div className="flex items-end justify-end gap-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm hover:bg-zinc-50">İptal</button>
                  <button type="submit" disabled={adding} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60">
                    {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ekle
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Status Summary */}
      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PROVIDERS.map(p => {
            const pStatus = status[p.id];
            const total = pStatus?.total_keys || 0;
            const active = pStatus?.active_keys || 0;
            return (
              <Card key={p.id} className={`p-3 border ${total > 0 ? p.color : "border-zinc-100"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`h-2 w-2 rounded-full ${total > 0 ? p.dot : "bg-zinc-300"}`} />
                  <span className="text-xs font-semibold">{p.label}</span>
                </div>
                <div className="text-lg font-black font-heading">{active}<span className="text-xs font-normal text-zinc-500">/{total}</span></div>
                <div className="text-[10px] text-zinc-500">aktif key</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Keys Table */}
      {PROVIDERS.map(p => {
        const pKeys = keysByProvider[p.id];
        if (!pKeys || pKeys.length === 0) return null;
        return (
          <Card key={p.id} className="overflow-hidden">
            <div className={`flex items-center gap-2 px-5 py-3 border-b border-zinc-100 ${p.color} bg-opacity-30`}>
              <span className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
              <span className="font-semibold text-sm">{p.label}</span>
              <span className="ml-auto text-xs text-zinc-500">{pKeys.length} anahtar</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Etiket</th>
                  <th className="px-4 py-2.5 text-left font-medium">Key</th>
                  <th className="px-4 py-2.5 text-left font-medium">Öncelik</th>
                  <th className="px-4 py-2.5 text-left font-medium">Canlı Durum</th>
                  <th className="px-4 py-2.5 text-left font-medium">Başarı/Hata</th>
                  <th className="px-4 py-2.5 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {pKeys.map((k, i) => {
                  const liveInfo = getLiveStatus(k.provider, k.masked_key);
                  const statusKey = !k.is_active ? "inactive" : (liveInfo?.status || "active");
                  const sc = STATUS_CONFIG[statusKey] || STATUS_CONFIG.active;
                  const StatusIcon = sc.icon;
                  return (
                    <motion.tr
                      key={k.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, ease: EASE }}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-ink">{k.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                            {showValues[k.id] ? k.masked_key : maskKey(k.masked_key)}
                          </code>
                          <button onClick={() => setShowValues(v => ({ ...v, [k.id]: !v[k.id] }))} className="text-zinc-400 hover:text-zinc-700">
                            {showValues[k.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{k.priority}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.cls}`}>
                          <StatusIcon size={11} /> {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        <span className="text-emerald-600 font-semibold">{liveInfo?.successes || 0}✓</span>
                        {" / "}
                        <span className="text-red-500 font-semibold">{liveInfo?.fails || 0}✗</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleActive(k.id, k.is_active)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${k.is_active ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                          >
                            {k.is_active ? "Pasif Yap" : "Aktif Et"}
                          </button>
                          <button onClick={() => deleteKey(k.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        );
      })}

      {keys.length === 0 && (
        <Card className="p-12 text-center">
          <Key size={32} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">Henüz API anahtarı eklenmemiş.</p>
          <p className="text-zinc-400 text-sm mt-1">Yukarıdaki "API Key Ekle" butonunu kullanın.</p>
        </Card>
      )}

      {/* How It Works */}
      <Card className="p-5 bg-zinc-50 border-dashed">
        <h3 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2"><Zap size={15} className="text-violet-600" /> Sistem Nasıl Çalışır?</h3>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-zinc-600">
          <div className="flex gap-2"><span className="font-black text-violet-600 shrink-0">1.</span> Öncelik sırasına (düşük → yüksek) göre aktif key'ler denenir.</div>
          <div className="flex gap-2"><span className="font-black text-violet-600 shrink-0">2.</span> Rate limit veya hata alınırsa otomatik sonraki key'e geçilir.</div>
          <div className="flex gap-2"><span className="font-black text-violet-600 shrink-0">3.</span> Tüm key'ler başarısızsa fallback yanıt döndürülür. Hiçbir istek kaybolmaz.</div>
        </div>
      </Card>
    </div>
  );
}
