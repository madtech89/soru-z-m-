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
  { id: "groq", label: "Groq Cloud (Llama 3.3)", color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  { id: "openrouter", label: "OpenRouter (Free & Multi-Model)", color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  { id: "openai", label: "OpenAI (ChatGPT)", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { id: "deepseek", label: "DeepSeek", color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  { id: "mistral", label: "Mistral AI", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
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
  const [testingKeyId, setTestingKeyId] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [auditData, setAuditData] = useState(null);

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

  const handleRunFullAudit = async () => {
    setAuditing(true);
    toast.info("Tüm API anahtarları sitenin fonksiyonlarına (Soru, Koç, Blog) göre test ediliyor...");
    try {
      const res = await api.post("/admin/api-keys/audit");
      if (res.data.ok) {
        setAuditData(res.data.results);
        toast.success(`Denetim tamamlandı! Toplam ${res.data.total_tested} anahtar incelendi.`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Denetim testi gerçekleştirilemedi.");
    } finally {
      setAuditing(false);
    }
  };

  const handleTestKey = async (id) => {
    setTestingKeyId(id);
    try {
      const res = await api.post(`/admin/api-keys/${id}/audit`);
      if (res.data.ok) {
        toast.success(`Test Başarılı! (${res.data.result.latency_ms}ms) Model: ${res.data.result.tested_model}`);
      } else {
        toast.error(res.data.result?.error || "Test başarısız oldu.");
      }
      loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Test isteği gönderilemedi.");
    } finally {
      setTestingKeyId(null);
    }
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

  const keysByProvider = PROVIDERS.reduce((acc, p) => {
    acc[p.id] = keys.filter(k => k.provider === p.id);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-ink flex items-center gap-2">
            <Shield className="text-violet-600" size={22} />
            Yapay Zekâ API Anahtarları & Denetim Laboratuvarı
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Soru üretimi, koçluk, blog ve müfredat için çoklu sağlayıcı, otomatik model uyumlama ve denetim havuzu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunFullAudit}
            disabled={auditing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 shadow-sm transition-colors disabled:opacity-60"
          >
            {auditing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            {auditing ? "Denetleniyor..." : "🔬 Kapsamlı API Denetimi Yap"}
          </button>
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={13} /> Yenile
          </button>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 shadow-sm"
          >
            <Plus size={14} /> API Key Ekle
          </button>
        </div>
      </div>

      {/* Audit Results Panel */}
      {auditData && (
        <Card className="p-5 border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Zap className="text-amber-600" size={16} />
              Canlı API Denetim & Yetenek Sonuçları
            </h3>
            <button onClick={() => setAuditData(null)} className="text-xs text-zinc-500 hover:text-zinc-800">Kapat</button>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {auditData.map((item, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-zinc-200 text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">{item.provider}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_healthy ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {item.is_healthy ? `${item.latency_ms}ms (Sağlıklı)` : "Hatalı"}
                  </span>
                </div>
                <div className="font-mono text-zinc-500 text-[11px] truncate">{item.masked}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.capabilities?.question_gen ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-zinc-100 text-zinc-400"}`}>
                    Soru: {item.capabilities?.question_gen ? "✓" : "✗"}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.capabilities?.coach_chat ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-zinc-100 text-zinc-400"}`}>
                    Koç: {item.capabilities?.coach_chat ? "✓" : "✗"}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.capabilities?.blog_writer ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-zinc-100 text-zinc-400"}`}>
                    Blog: {item.capabilities?.blog_writer ? "✓" : "✗"}
                  </span>
                </div>
                {item.error && <p className="text-[10px] text-red-600 line-clamp-2 mt-1">{item.error}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Modal/Card */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ ease: EASE }}
          >
            <Card className="p-5 border-violet-200 bg-violet-50/30">
              <h3 className="font-bold text-sm text-ink mb-4">Yeni API Anahtarı Ekle</h3>
              <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Sağlayıcı</label>
                  <select
                    value={form.provider}
                    onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">Etiket / İsim</label>
                  <input
                    type="text"
                    placeholder="Örn: Gemini Ücretsiz 1, Groq Ana Key..."
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600 block mb-1">API Anahtarı (Gizli tutulur)</label>
                  <div className="relative">
                    <input
                      type={showValues["new"] ? "text" : "password"}
                      placeholder="AI API Key yapıştırın (AIzaSy..., gsk_..., sk-...)"
                      value={form.key_value}
                      onChange={e => setForm(f => ({ ...f, key_value: e.target.value }))}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-violet-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowValues(v => ({ ...v, new: !v.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {showValues["new"] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end sm:col-span-2 gap-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:underline">İptal</button>
                  <button type="submit" disabled={adding} className="px-6 py-2 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-700">
                    {adding ? "Ekleniyor..." : "Kaydet"}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
                  const isTesting = testingKeyId === k.id;
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleTestKey(k.id)}
                            disabled={isTesting}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-60 transition-colors"
                            title="Anahtarı canlı test et"
                          >
                            {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                            {isTesting ? "Test..." : "Test Et"}
                          </button>
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
