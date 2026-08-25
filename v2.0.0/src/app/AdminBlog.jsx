import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, Edit3, Sparkles, RefreshCw, Eye, Calendar, FileText,
  CheckCircle2, AlertCircle, Rocket, BookOpen, Layers, Terminal, X,
  Pause, Play, ChevronRight, Search, Filter, ExternalLink
} from "lucide-react";
import {
  api as apiClient,
  fetchDepartmentCatalog,
  startDepartmentArticlesGen,
  fetchDepartmentArticlesStatus,
  cancelDepartmentArticlesGen
} from "@/lib/api";
import { Card, Spinner, Empty } from "@/app/ui";
import { toast } from "sonner";

export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("list"); // "list", "create", "edit"
  const [activeId, setActiveId] = useState(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // AI Bölüm Rehberi Makale Fabrikası State
  const [isDeptGenOpen, setIsDeptGenOpen] = useState(false);
  const [deptCatalog, setDeptCatalog] = useState(null);
  const [selectedScoreTypes, setSelectedScoreTypes] = useState(["SAY", "EA", "SÖZ", "DİL", "TYT"]);
  const [skipExisting, setSkipExisting] = useState(true);
  const [genStatus, setGenStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const logContainerRef = useRef(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    summary: "",
    content: "",
    category: "Gündem",
    image_url: "",
    seo_keywords: "",
    status: "published",
  });

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/blog?limit=100");
      setPosts(res.data || []);
    } catch {
      toast.error("Blog yazıları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Load Department Catalog when generator modal is opened
  useEffect(() => {
    if (isDeptGenOpen && !deptCatalog) {
      fetchDepartmentCatalog()
        .then(setDeptCatalog)
        .catch(() => toast.error("Bölüm kataloğu yüklenemedi."));
    }
  }, [isDeptGenOpen, deptCatalog]);

  // Polling for generation status
  useEffect(() => {
    let interval = null;
    if (isPolling) {
      interval = setInterval(async () => {
        try {
          const status = await fetchDepartmentArticlesStatus();
          setGenStatus(status);
          if (!status.running) {
            setIsPolling(false);
            loadPosts();
            if (status.processed > 0) {
              toast.success(`🎉 Makale üretimi tamamlandı! Toplam ${status.processed} makale yayınlandı.`);
            }
          }
        } catch {
          // ignore transient errors
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, loadPosts]);

  // Auto scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [genStatus?.logs]);

  const handleStartDeptGeneration = async () => {
    if (selectedScoreTypes.length === 0) {
      return toast.error("Lütfen en az bir puan türü seçin!");
    }
    try {
      const res = await startDepartmentArticlesGen({
        score_types: selectedScoreTypes,
        skip_existing: skipExisting,
      });
      if (res.ok) {
        toast.success("🚀 AI Bölüm Makalesi üretimi başlatıldı!");
        setIsPolling(true);
      } else {
        toast.info(res.message || "İşlem zaten çalışıyor.");
        setIsPolling(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Makale üretimi başlatılamadı.");
    }
  };

  const handleCancelDeptGeneration = async () => {
    try {
      await cancelDepartmentArticlesGen();
      toast.info("Durdurma talebi iletildi.");
    } catch {
      toast.error("İptal edilemedi.");
    }
  };

  const handleCreate = () => {
    setForm({
      title: "",
      summary: "",
      content: "",
      category: "Gündem",
      image_url: "",
      seo_keywords: "",
      status: "published",
    });
    setMode("create");
  };

  const handleEdit = (p) => {
    setForm({
      title: p.title || "",
      summary: p.summary || "",
      content: p.content || "",
      category: p.category || "Gündem",
      image_url: p.image_url || "",
      seo_keywords: p.seo_keywords || "",
      status: p.status || "published",
    });
    setActiveId(p.id);
    setMode("edit");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu blog yazısını kalıcı olarak silmek istediğinizden emin misiniz?")) return;
    try {
      await apiClient.delete(`/admin/blog/${id}`);
      toast.success("Blog yazısı başarıyla silindi!");
      loadPosts();
    } catch {
      toast.error("Silinemedi.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return toast.error("Başlık ve İçerik alanları zorunludur.");

    try {
      if (mode === "create") {
        await apiClient.post("/admin/blog", form);
        toast.success("Blog yazısı başarıyla eklendi!");
      } else {
        await apiClient.put(`/admin/blog/${activeId}`, form);
        toast.success("Blog yazısı başarıyla güncellendi!");
      }
      setMode("list");
      loadPosts();
    } catch {
      toast.error("Kaydedilemedi.");
    }
  };

  const handleTriggerAuto = async () => {
    setAutoBusy(true);
    try {
      const res = await apiClient.post("/admin/blog/trigger-auto");
      toast.success(`🎉 Başarılı! AI yeni blog yazısı üretti: "${res.data.post.title}"`);
      loadPosts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Otomatik blog üretilemedi.");
    } finally {
      setAutoBusy(false);
    }
  };

  const toggleScoreType = (st) => {
    setSelectedScoreTypes((prev) =>
      prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]
    );
  };

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.summary && p.summary.toLowerCase().includes(q)) ||
        (p.seo_keywords && p.seo_keywords.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-600 transition";

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-black text-ink">Blog, Gündem & Bölüm Rehberi</h2>
          <p className="text-xs text-zinc-500">Müşteri trafiği ve SEO sıralamaları için yapay zeka makale fabrikası ve blog yöneticisi.</p>
        </div>
        {mode === "list" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsDeptGenOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-500/20 transition"
            >
              <Rocket size={15} />
              🚀 Bölüm SEO Makale Fabrikası
            </button>
            <button
              onClick={handleTriggerAuto}
              disabled={autoBusy}
              className="px-4 py-2.5 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 text-xs font-bold flex items-center gap-1.5 hover:bg-violet-100 transition disabled:opacity-50"
            >
              {autoBusy ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
              Gündem Yazısı Üret
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2.5 rounded-xl bg-ink text-white text-xs font-bold flex items-center gap-1.5 hover:bg-black shadow-md shadow-zinc-950/20 transition"
            >
              <Plus size={14} /> Manuel Blog Ekle
            </button>
          </div>
        )}
      </div>

      {/* AI BÖLÜM REHBERİ MAKALE FABRİKASI MODALI */}
      {isDeptGenOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 grid place-items-center">
                  <Rocket size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-ink">
                    AI Tüm Bölümler İçin SEO Makale Fabrikası
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Tek tıkla tüm üniversite bölümleri için maaş, taban puan, gelecek ve iş imkanı makaleleri üretir.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeptGenOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-ink rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Puan Türü Seçimi */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 block">
                  1. Üretilecek Puan Türlerini Seçin:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    ["SAY", "Sayısal (22 Bölüm)"],
                    ["EA", "Eşit Ağırlık (16 Bölüm)"],
                    ["SÖZ", "Sözel (12 Bölüm)"],
                    ["DİL", "Yabancı Dil (8 Bölüm)"],
                    ["TYT", "TYT Önlisans (15 Bölüm)"],
                  ].map(([st, label]) => {
                    const on = selectedScoreTypes.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleScoreType(st)}
                        className={`p-3 rounded-2xl border text-left transition ${
                          on
                            ? "bg-violet-50 border-violet-600 text-violet-800 shadow-sm"
                            : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{st}</span>
                          <div className={`h-4 w-4 rounded grid place-items-center text-[10px] ${on ? "bg-violet-600 text-white" : "border border-zinc-300"}`}>
                            {on && <CheckCircle2 size={12} />}
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-medium">{label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seçenekler */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-ink">Mevcut Yazıları Atla (Önerilen)</div>
                  <div className="text-[11px] text-zinc-400">Daha önce oluşturulmuş bölümleri tekrar üretmeyerek API kotasını korur.</div>
                </div>
                <input
                  type="checkbox"
                  checked={skipExisting}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                  className="h-4 w-4 rounded accent-violet-600 cursor-pointer"
                />
              </div>

              {/* İlerleme Durumu & Terminal Log Ekranı */}
              {genStatus && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">
                      {genStatus.running ? "⏳ Makaleler Üretiliyor..." : "Tamamlandı"}
                    </span>
                    <span className="font-mono font-bold text-violet-700">
                      {genStatus.processed} / {genStatus.total} (%
                      {genStatus.total > 0 ? Math.round((genStatus.processed / genStatus.total) * 100) : 0})
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden border border-zinc-200">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full transition-all duration-300"
                      style={{
                        width: `${genStatus.total > 0 ? (genStatus.processed / genStatus.total) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  {/* Terminal Console */}
                  <div
                    ref={logContainerRef}
                    className="bg-zinc-950 text-emerald-400 font-mono text-[11px] p-3 rounded-2xl h-44 overflow-y-auto space-y-1 shadow-inner"
                  >
                    <div className="text-zinc-500">// HedefMatik AI Article Generator Console Logs...</div>
                    {genStatus.logs?.map((l, idx) => (
                      <div key={idx} className="leading-tight">{l}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Alt Aksiyon Butonları */}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
              <span className="text-xs text-zinc-400 font-medium">
                {selectedScoreTypes.length} puan türü seçili
              </span>

              <div className="flex gap-2">
                {genStatus?.running ? (
                  <button
                    onClick={handleCancelDeptGeneration}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition"
                  >
                    Üretimi Durdur
                  </button>
                ) : null}

                <button
                  onClick={handleStartDeptGeneration}
                  disabled={genStatus?.running || selectedScoreTypes.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition shadow-lg shadow-violet-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Rocket size={14} />
                  {genStatus?.running ? "Üretim Sürüyor..." : "⚡ Tek Tıkla Bölüm Makalelerini Yazdır"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "list" ? (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  ["all", "Tümü"],
                  ["Bölüm & Meslek Rehberi", "🎓 Bölüm & Meslek Rehberi"],
                  ["Gündem", "🔥 Gündem & Haberler"],
                  ["Sınav Rehberi", "📚 Sınav Rehberi"],
                  ["Eğitim", "💡 Eğitim"],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setSelectedCategory(k)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                      selectedCategory === k
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Yazılarda ara..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 outline-none focus:border-violet-600 font-medium"
                />
              </div>
            </div>
          </Card>

          {loading ? (
            <Spinner />
          ) : filteredPosts.length === 0 ? (
            <Empty text="Filtrelere uygun blog yazısı bulunamadı." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map((p) => (
                <Card key={p.id} className="p-5 flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-transform border border-zinc-200/80 bg-white">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        p.category === "Bölüm & Meslek Rehberi"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-violet-50 text-violet-700 border border-violet-200"
                      }`}>
                        {p.category}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">{p.author || "HedefMatik AI"}</span>
                    </div>
                    <h3 className="font-heading font-black text-sm text-ink line-clamp-2 leading-snug">{p.title}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{p.summary}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
                    <div className="flex items-center gap-3 text-zinc-400">
                      <span className="flex items-center gap-1"><Eye size={12} /> {p.views || 0}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> {p.created_at?.split("T")[0]}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-ink transition" title="Düzenle">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition" title="Sil">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-2">
              <h3 className="font-bold text-ink text-base">{mode === "create" ? "Yeni Blog Girişi" : "Blog Yazısını Düzenle"}</h3>
              <button
                type="button"
                onClick={() => setMode("list")}
                className="text-xs font-bold text-zinc-500 hover:underline"
              >
                Geri Dön
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-600 block mb-1">Blog Başlığı *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                  placeholder="Başlık girin..."
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-zinc-600 block mb-1">Kategori</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="Bölüm & Meslek Rehberi">Bölüm & Meslek Rehberi</option>
                    <option value="Gündem">Gündem</option>
                    <option value="Sınav Rehberi">Sınav Rehberi</option>
                    <option value="Eğitim">Eğitim</option>
                    <option value="Haberler">Haberler</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 block mb-1">Durum</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="published">Yayınlandı (Aktif)</option>
                    <option value="draft">Taslak (Gizli)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1">Kapak Görseli URL</label>
              <input
                value={form.image_url}
                onChange={(e) => setForm((s) => ({ ...s, image_url: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1">Meta Özet / Açıklama *</label>
              <input
                required
                value={form.summary}
                onChange={(e) => setForm((s) => ({ ...s, summary: e.target.value }))}
                placeholder="Google arama sonuçlarında görünecek 1-2 cümlelik özet..."
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1">Blog İçeriği (Markdown) *</label>
              <textarea
                required
                rows={12}
                value={form.content}
                onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
                placeholder="Blog içeriğini buraya yazın..."
                className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-violet-600 transition font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 block mb-1">SEO Kelimeleri (virgülle ayırın)</label>
              <input
                value={form.seo_keywords}
                onChange={(e) => setForm((s) => ({ ...s, seo_keywords: e.target.value }))}
                placeholder="sınav hazırlığı, yks rehberi, net artırma..."
                className={inputCls}
              />
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <button
                type="button"
                onClick={() => setMode("list")}
                className="px-5 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-xs hover:bg-zinc-50 font-bold"
              >
                İptal Et
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-ink text-white text-xs font-bold hover:bg-black"
              >
                Değişiklikleri Kaydet
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
