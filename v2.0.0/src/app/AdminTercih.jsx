import { useState, useEffect, useCallback } from "react";
import {
  Building2, Plus, Search, Trash2, Edit2, Download, Upload, CheckCircle2,
  AlertCircle, Loader2, Sparkles, Filter, X, ArrowUpDown
} from "lucide-react";
import {
  fetchAdminTercihPrograms, createAdminTercihProgram,
  updateAdminTercihProgram, deleteAdminTercihProgram, bulkImportAdminTercih,
  fetchDistinctCities
} from "@/lib/api";
import { Card } from "@/app/ui";
import { toast } from "sonner";


const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 transition";

export default function AdminTercih() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [scoreTypeFilter, setScoreTypeFilter] = useState("");
  const [cities, setCities] = useState([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    university: "",
    faculty: "",
    program: "",
    score_type: "SAY",
    exam_type: "YKS",
    city: "",
    duration_years: 4,
    scholarship: "",
    score_2025: "",
    rank_2025: "",
    quota: "",
    status: "active"
  });

  // Bulk Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminTercihPrograms({
        page,
        page_size: 25,
        search: search || undefined,
        city: cityFilter || undefined,
        score_type: scoreTypeFilter || undefined
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      toast.error("Veriler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [page, search, cityFilter, scoreTypeFilter]);

  useEffect(() => {
    loadData();
    fetchDistinctCities().then(setCities).catch(() => {});
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      university: "",
      faculty: "",
      program: "",
      score_type: "SAY",
      exam_type: "YKS",
      city: "",
      duration_years: 4,
      scholarship: "",
      score_2025: "",
      rank_2025: "",
      quota: "",
      status: "active"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      university: item.university,
      faculty: item.faculty || "",
      program: item.program,
      score_type: item.score_type || "SAY",
      exam_type: item.exam_type || "YKS",
      city: item.city || "",
      duration_years: item.duration_years || 4,
      scholarship: item.scholarship || "",
      score_2025: item.score_2025 || "",
      rank_2025: item.rank_2025 || "",
      quota: item.quota || "",
      status: item.status || "active"
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        score_2025: Number(formData.score_2025) || 0,
        rank_2025: Number(formData.rank_2025) || 0,
        quota: Number(formData.quota) || 0,
        duration_years: Number(formData.duration_years) || 4,
      };

      if (editingItem) {
        await updateAdminTercihProgram(editingItem.id, payload);
        toast.success("Program başarıyla güncellendi.");
      } else {
        await createAdminTercihProgram(payload);
        toast.success("Yeni üniversite programı eklendi.");
      }
      setIsModalOpen(false);
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Kaydedilemedi.");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}" programını silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteAdminTercihProgram(id);
      toast.success("Program silindi.");
      loadData();
    } catch (e) {
      toast.error("Silinemedi.");
    }
  };

  const handleBulkImport = async () => {
    if (!bulkJson.trim()) return toast.error("Lütfen JSON verisi yapıştırın.");
    setBulkLoading(true);
    try {
      const parsed = JSON.parse(bulkJson);
      const list = Array.isArray(parsed) ? parsed : parsed.programs || [];
      if (!list.length) throw new Error("Geçerli bir dizi bulunamadı.");

      const res = await bulkImportAdminTercih(list);
      toast.success(`🎉 ${res.count} adet program başarıyla içe aktarıldı.`);
      setIsBulkOpen(false);
      setBulkJson("");
      loadData();
    } catch (e) {
      toast.error("JSON parse hatası: Lütfen geçerli bir JSON dizisi girin.");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-ink">Tercih Robotu & Üniversite Veritabanı</h2>
            <p className="text-xs text-zinc-500">
              Türkiye geneli üniversite, fakülte, bölüm taban puan ve başarı sıralamalarını yönetin ({total} aktif kayıt).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50 transition"
          >
            <Upload size={14} /> Toplu JSON Yükle
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-xs font-bold text-white hover:bg-violet-700 transition"
          >
            <Plus size={14} /> Yeni Program Ekle
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Üniversite, bölüm, fakülte veya şehir ara (virgülle ayırabilirsiniz)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={scoreTypeFilter}
              onChange={(e) => { setScoreTypeFilter(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-zinc-200 outline-none focus:border-violet-600 font-semibold text-zinc-700"
            >
              <option value="">Tüm Puan Türleri</option>
              <option value="SAY">SAY (Sayısal)</option>
              <option value="EA">EA (Eşit Ağırlık)</option>
              <option value="SÖZ">SÖZ (Sözel)</option>
              <option value="DİL">DİL (Yabancı Dil)</option>
              <option value="TYT">TYT (2 Yıllık Önlisans)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
              className="w-full py-2 px-3 text-xs rounded-xl border border-zinc-200 outline-none focus:border-violet-600 font-semibold text-zinc-700"
            >
              <option value="">Tüm Şehirler ({cities.length})</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Üniversite & Fakülte</th>
                <th className="px-4 py-3">Bölüm / Program</th>
                <th className="px-4 py-3">Puan Türü</th>
                <th className="px-4 py-3">Şehir</th>
                <th className="px-4 py-3 text-right">2025 Taban</th>
                <th className="px-4 py-3 text-right">Başarı Sırası</th>
                <th className="px-4 py-3 text-right">Kontenjan</th>
                <th className="px-4 py-3 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-zinc-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-violet-600" />
                    Yükleniyor...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    Kriterlere uygun üniversite programı bulunamadı.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/80 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-ink">{item.university}</div>
                      <div className="text-[11px] text-zinc-400">{item.faculty || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-800">{item.program}</div>
                      {item.scholarship && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-bold">
                          {item.scholarship}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-zinc-100 text-zinc-700">
                        {item.score_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 font-medium">{item.city}</td>
                    <td className="px-4 py-3 text-right font-bold text-violet-700">
                      {Number(item.score_2025 || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-700">
                      {item.rank_2025 ? item.rank_2025.toLocaleString("tr-TR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-600">{item.quota || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition"
                          title="Düzenle"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.program)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 25 && (
          <div className="p-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Toplam {total} kayıt (Sayfa {page} / {Math.ceil(total / 25)})</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50 font-bold"
              >
                Önceki
              </button>
              <button
                disabled={page >= Math.ceil(total / 25)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50 font-bold"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-heading font-bold text-base text-ink">
                {editingItem ? "Programı Düzenle" : "Yeni Üniversite Programı Ekle"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-zinc-400 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-zinc-700 block mb-1">Üniversite Adı *</label>
                  <input
                    required
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    placeholder="Örn: Boğaziçi Üniversitesi"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Fakülte</label>
                  <input
                    value={formData.faculty}
                    onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                    placeholder="Örn: Mühendislik Fakültesi"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Bölüm / Program Adı *</label>
                  <input
                    required
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    placeholder="Örn: Bilgisayar Mühendisliği"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Şehir *</label>
                  <input
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Örn: İstanbul"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Puan Türü</label>
                  <select
                    value={formData.score_type}
                    onChange={(e) => setFormData({ ...formData, score_type: e.target.value })}
                    className={inputCls}
                  >
                    <option value="SAY">SAY (Sayısal)</option>
                    <option value="EA">EA (Eşit Ağırlık)</option>
                    <option value="SÖZ">SÖZ (Sözel)</option>
                    <option value="DİL">DİL (Yabancı Dil)</option>
                    <option value="TYT">TYT (Önlisans)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">2025 Taban Puan</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.score_2025}
                    onChange={(e) => setFormData({ ...formData, score_2025: e.target.value })}
                    placeholder="Örn: 520.45"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">2025 Başarı Sırası</label>
                  <input
                    type="number"
                    value={formData.rank_2025}
                    onChange={(e) => setFormData({ ...formData, rank_2025: e.target.value })}
                    placeholder="Örn: 3500"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Kontenjan</label>
                  <input
                    type="number"
                    value={formData.quota}
                    onChange={(e) => setFormData({ ...formData, quota: e.target.value })}
                    placeholder="Örn: 80"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Burs / Durum</label>
                  <input
                    value={formData.scholarship}
                    onChange={(e) => setFormData({ ...formData, scholarship: e.target.value })}
                    placeholder="Örn: Burslu, Ücretsiz, %50 İndirimli"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-heading font-bold text-base text-ink">Toplu Program İçe Aktar (JSON)</h3>
              <button onClick={() => setIsBulkOpen(false)} className="p-1 text-zinc-400 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                Yeni yıl YÖK Atlas veya ÖSYM kılavuz verilerini aşağıdaki JSON formatında yapıştırarak tek seferde sisteme aktarabilirsiniz:
              </p>
              <pre className="bg-zinc-900 text-zinc-200 p-3 rounded-xl text-[10px] overflow-x-auto">
{`[
  {
    "university": "Boğaziçi Üniversitesi",
    "faculty": "Mühendislik Fakültesi",
    "program": "Yazılım Mühendisliği",
    "score_type": "SAY",
    "city": "İstanbul",
    "score_2025": 540.2,
    "rank_2025": 850,
    "quota": 60
  }
]`}
              </pre>

              <textarea
                rows={8}
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder="JSON dizisini buraya yapıştırın..."
                className="w-full p-3 font-mono text-xs rounded-xl border border-zinc-200 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBulkOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-bold hover:bg-zinc-50 text-xs"
              >
                Kapat
              </button>
              <button
                onClick={handleBulkImport}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 text-xs disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Verileri İçe Aktar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
