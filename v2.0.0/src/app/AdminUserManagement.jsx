import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Filter, Shield, Crown, CheckCircle, Clock,
  FileCheck, Target, ChevronLeft, ChevronRight, Edit3, X,
  Save, RefreshCw, Calendar, Mail, Sparkles, UserCheck
} from "lucide-react";
import { fetchAdminUsers, updateUserPlan } from "@/lib/api";
import { Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [editPlan, setEditPlan] = useState("free");
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 15 };
      if (search.trim()) params.search = search.trim();
      if (planFilter) params.plan = planFilter;

      const data = await fetchAdminUsers(params);
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    try {
      await updateUserPlan(selectedUser.id, { plan: editPlan });
      toast.success(`${selectedUser.name} kullanıcısının üyelik planı "${editPlan.toUpperCase()}" olarak güncellendi!`);
      setSelectedUser(null);
      loadUsers();
    } catch {
      toast.error("Üyelik planı güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const openPlanModal = (u) => {
    setSelectedUser(u);
    setEditPlan(u.plan || "free");
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-extrabold text-lg text-ink flex items-center gap-2">
              <Users size={20} className="text-subject-matematik" /> Kayıtlı Kullanıcı & Üye Yönetimi
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Platforma üye olan tüm öğrencilerin detaylı çalışma verileri, çözdüğü sorular, girdiği denemeler ve üyelik planları (Free / Ücretli Pro).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="İsim, e-posta veya kullanıcı adı..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2 rounded-xl border border-zinc-300 text-xs outline-none focus:border-subject-matematik w-64"
              />
            </div>

            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs outline-none focus:border-subject-matematik"
            >
              <option value="">Tüm Üyelik Planları</option>
              <option value="free">Ücretsiz (Free)</option>
              <option value="pro">Ücretli (Pro)</option>
              <option value="vip">Özel / Premium (VIP)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Kullanıcı Tablosu */}
      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <Card className="p-12 text-center text-zinc-400">
          <Users size={36} className="mx-auto text-zinc-300 mb-2" />
          <div className="font-heading font-bold text-sm text-zinc-600">Kullanıcı Bulunamadı</div>
          <p className="text-xs text-zinc-400 mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Kullanıcı</th>
                  <th className="p-4">Üyelik Planı</th>
                  <th className="p-4 text-center">Çözülen Soru</th>
                  <th className="p-4 text-center">Girdiği Deneme</th>
                  <th className="p-4 text-center">Not Çalışma (dk)</th>
                  <th className="p-4 text-center">Hedef Puan</th>
                  <th className="p-4">Kayıt Tarihi</th>
                  <th className="p-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((u) => {
                  const isPaid = u.plan === "pro" || u.plan === "vip" || u.plan === "premium";
                  return (
                    <tr key={u.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-subject-matematik/10 text-subject-matematik font-bold text-sm grid place-items-center">
                            {(u.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-heading font-bold text-sm text-ink flex items-center gap-1.5">
                              {u.name}
                              {u.role === "admin" && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-900 text-white">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400">@{u.username || "kullanici"} · {u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                            isPaid
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {isPaid ? <Crown size={12} className="text-amber-600" /> : <UserCheck size={12} />}
                          {u.plan ? u.plan.toUpperCase() : "FREE"}
                        </span>
                      </td>

                      <td className="p-4 text-center font-heading font-bold text-ink">
                        {u.solved_questions || 0}
                      </td>

                      <td className="p-4 text-center font-heading font-bold text-emerald-600">
                        {u.completed_tests || 0}
                      </td>

                      <td className="p-4 text-center font-heading font-bold text-amber-600">
                        ⏱️ {u.study_minutes || 0} dk
                      </td>

                      <td className="p-4 text-center font-semibold text-zinc-600">
                        {u.target_score ? `${u.target_score} Puan` : "-"}
                      </td>

                      <td className="p-4 text-zinc-400 text-[11px]">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("tr-TR") : "-"}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => openPlanModal(u)}
                          className="px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-ink hover:text-white hover:border-ink transition text-xs inline-flex items-center gap-1"
                        >
                          <Edit3 size={12} /> Planı Düzenle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sayfalama */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-zinc-500">
              Toplam <strong className="text-ink">{total}</strong> kayıtlı üye listeleniyor
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold px-2">Sayfa {page} / {Math.ceil(total / 15) || 1}</span>
              <button
                disabled={page >= Math.ceil(total / 15)}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Üyelik Planı Düzenleme Modalı */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUser(null)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-xl bg-amber-100 text-amber-900 grid place-items-center">
                    <Crown size={18} />
                  </span>
                  <h4 className="font-heading font-extrabold text-base text-ink">Üyelik Planı Yönetimi</h4>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg text-zinc-400 hover:text-ink">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl text-xs space-y-1">
                <div>Kullanıcı: <strong className="text-ink">{selectedUser.name}</strong></div>
                <div className="text-zinc-400">E-posta: {selectedUser.email}</div>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">Yeni Üyelik Planı</label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-bold outline-none focus:border-subject-matematik"
                  >
                    <option value="free">Ücretsiz (Free Plan)</option>
                    <option value="pro">Pro Üye (Ücretli / Sınırsız Soru & Deneme)</option>
                    <option value="vip">VIP Premium (Özel AI Koçluk + Sınırsız Arşiv)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-ink text-white text-xs font-bold hover:bg-subject-matematik transition flex items-center gap-1.5"
                  >
                    {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />} Planı Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
