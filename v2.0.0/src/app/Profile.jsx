import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Target, FileCheck, Zap, Flame, Award, Clock, BookOpen,
  TrendingUp, AlertCircle, CheckCircle2, FileText, ChevronRight,
  Settings, BarChart3, ArrowUpRight, Sparkles, Loader2, Save
} from "lucide-react";
import {
  fetchDashboard, updateProfile, fetchUserBadges, getLevelInfo,
  fetchUserActivitySummary, fetchProficiency
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Spinner, EASE, LoginPrompt } from "@/app/ui";
import { statusColor, tone } from "@/lib/subjects";
import { toast } from "sonner";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "weak_topics", "tests", "notes", "settings"

  const [form, setForm] = useState({
    name: user?.name || "",
    username: user?.username || "",
    target_score: user?.target_score || "",
    daily_goal: user?.daily_goal || 20,
  });

  const [stats, setStats] = useState(null);
  const [activitySummary, setActivitySummary] = useState(null);
  const [proficiency, setProficiency] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [dashData, actData, profData, badgeData] = await Promise.allSettled([
        fetchDashboard(user.id),
        fetchUserActivitySummary(),
        fetchProficiency(user.id),
        fetchUserBadges(user.id),
      ]);

      if (dashData.status === "fulfilled") setStats(dashData.value);
      if (actData.status === "fulfilled") setActivitySummary(actData.value);
      if (profData.status === "fulfilled") setProficiency(profData.value || []);
      if (badgeData.status === "fulfilled") setBadges(badgeData.value || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile(user.id, {
        name: form.name,
        username: form.username,
        target_score: form.target_score ? Number(form.target_score) : null,
        daily_goal: Number(form.daily_goal),
      });
      updateUser({ ...user, ...updated, email: user.email });
      toast.success("Profil ve hedefler başarıyla güncellendi!");
    } catch {
      toast.error("Profil güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <LoginPrompt
        title="Kişisel Panelin için Giriş Yap"
        message="Eksik konularını, çözdüğün denemeleri, ders notu çalışma sürelerini ve istatistiklerini takip etmek için giriş yapmalısın."
      />
    );
  }

  const levelInfo = getLevelInfo(user?.xp || stats?.xp || 0);

  const weakTopicsList = proficiency.filter((p) => p.status !== "İyi");
  const testResults = activitySummary?.test_results || [];
  const noteActivities = activitySummary?.note_activities || [];
  const totalStudyMinutes = activitySummary?.total_study_minutes || 0;

  const statItems = [
    { icon: FileCheck, label: "Çözülen Soru", value: stats?.total_solved || 0, color: "#4F46E5" },
    { icon: Target, label: "Tamamlanan Deneme", value: testResults.length || stats?.total_tests || 0, color: "#10B981" },
    { icon: Clock, label: "Ders Notu Çalışma", value: `${totalStudyMinutes} dk`, color: "#F59E0B" },
    { icon: TrendingUp, label: "Seviye / XP", value: `Lv.${levelInfo.level} (${user?.xp || 0} XP)`, color: "#EC4899" },
    { icon: Flame, label: "Çalışma Serisi", value: `${stats?.streak || 1} gün`, color: "#F43F5E" },
    { icon: Award, label: "Kazanılan Rozet", value: badges.length, color: "#6366F1" },
  ];

  const inputCls = "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 outline-none focus:border-subject-matematik transition";

  return (
    <div className="space-y-6">
      {/* Profil Üst Başlık & Kullanıcı Özeti */}
      <div className="p-6 bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-subject-matematik text-white grid place-items-center font-heading font-extrabold text-2xl shadow-lg shadow-subject-matematik/30">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-extrabold text-2xl text-white">{user?.name}</h1>
                {user?.role === "admin" && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">@{user?.username} · {user?.email}</div>
              <div className="flex items-center gap-3 mt-2 text-xs text-indigo-200">
                <span>🎯 Hedef: <strong>{user?.target_score || 450} Puan</strong></span>
                <span>•</span>
                <span>📅 Günlük Hedef: <strong>{user?.daily_goal || 20} Soru</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === "overview" ? "bg-white text-zinc-900 shadow" : "text-zinc-300 hover:text-white"}`}
            >
              <BarChart3 size={14} /> Genel Özet
            </button>
            <button
              onClick={() => setActiveTab("weak_topics")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === "weak_topics" ? "bg-white text-zinc-900 shadow" : "text-zinc-300 hover:text-white"}`}
            >
              <AlertCircle size={14} /> Eksiklerim ({weakTopicsList.length})
            </button>
            <button
              onClick={() => setActiveTab("tests")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === "tests" ? "bg-white text-zinc-900 shadow" : "text-zinc-300 hover:text-white"}`}
            >
              <FileText size={14} /> Denemelerim ({testResults.length})
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === "notes" ? "bg-white text-zinc-900 shadow" : "text-zinc-300 hover:text-white"}`}
            >
              <Clock size={14} /> Not Çalışma ({totalStudyMinutes} dk)
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === "settings" ? "bg-white text-zinc-900 shadow" : "text-zinc-300 hover:text-white"}`}
            >
              <Settings size={14} /> Ayarlar
            </button>
          </div>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statItems.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, ease: EASE }}>
            <Card className="p-4">
              <c.icon size={16} style={{ color: c.color }} />
              <div className="font-heading font-extrabold text-xl mt-2 text-ink">{c.value}</div>
              <div className="text-[11px] font-medium text-zinc-500">{c.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 1. SEKME: GENEL ÖZET */}
      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Son Çözülen Denemeler Özeti */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="font-heading font-bold text-base text-ink flex items-center gap-2">
                  <FileText size={18} className="text-subject-matematik" /> Son Çözülen Deneme Sınavları
                </div>
                <button onClick={() => setActiveTab("tests")} className="text-xs font-bold text-subject-matematik hover:underline">
                  Tümünü Gör →
                </button>
              </div>

              {testResults.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 bg-zinc-50 rounded-2xl">
                  <FileText size={32} className="mx-auto text-zinc-300 mb-2" />
                  <div className="font-heading font-bold text-sm text-zinc-600">Henüz Deneme Sınavı Çözülmedi</div>
                  <p className="text-xs text-zinc-400 mt-1">Deneme sınavları çözerek netlerini ve puan gelişimini buradan takip edebilirsin.</p>
                  <Link to="/app/denemeler" className="inline-block mt-3 px-4 py-2 rounded-xl bg-ink text-white font-bold text-xs">
                    Deneme Çözmeye Başla
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {testResults.slice(0, 4).map((r) => (
                    <div key={r.id} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-heading font-bold text-sm text-ink">{r.test_name || "Genel Deneme"}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("tr-TR") : "Yakın zamanda"} · {r.total} Soru
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="font-heading font-extrabold text-sm text-emerald-600">{r.score ? `${r.score.toFixed(1)} Puan` : `%${r.success_rate || 0}`}</div>
                          <div className="text-[11px] text-zinc-500">{r.correct}D · {r.wrong}Y · {r.blank}B · <strong>{r.net} Net</strong></div>
                        </div>
                        <Link to={`/app/sonuc/${r.id}`} className="p-1.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:text-ink">
                          <ArrowUpRight size={16} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Son Ders Notu Çalışmaları */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="font-heading font-bold text-base text-ink flex items-center gap-2">
                  <Clock size={18} className="text-amber-500" /> Ders Notlarında Geçirilen Süreler
                </div>
                <button onClick={() => setActiveTab("notes")} className="text-xs font-bold text-subject-matematik hover:underline">
                  Tümünü Gör →
                </button>
              </div>

              {noteActivities.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 bg-zinc-50 rounded-2xl text-xs">
                  Henüz ders notu çalışması kaydedilmedi. Ders notlarını okudukça süreleriniz burada birikecektir.
                </div>
              ) : (
                <div className="space-y-2">
                  {noteActivities.slice(0, 3).map((a, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-heading font-bold text-xs text-ink truncate">{a.title}</div>
                        <div className="text-[11px] text-zinc-400">{a.subject_name}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs">
                          ⏱️ {a.minutes_spent} dk
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Eksik Konular Özeti & Hedef Durumu */}
          <div className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-heading font-bold text-sm text-ink flex items-center gap-1.5">
                  <AlertCircle size={16} className="text-rose-500" /> Kritik Eksiklerim
                </div>
                <button onClick={() => setActiveTab("weak_topics")} className="text-xs font-bold text-subject-matematik hover:underline">
                  Detay →
                </button>
              </div>

              {weakTopicsList.length === 0 ? (
                <div className="p-5 text-center text-zinc-400 bg-zinc-50 rounded-2xl text-xs">
                  Harika! Şu anda kritik zayıf konun bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {weakTopicsList.slice(0, 4).map((t) => (
                    <div key={t.topic_id} className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-ink truncate">{t.topic_name}</div>
                        <div className="text-[10px] text-zinc-500">{t.subject_name}</div>
                      </div>
                      <span className="text-xs font-extrabold text-rose-600 bg-white px-2 py-0.5 rounded-lg border border-rose-200">
                        %{t.proficiency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 border border-indigo-100 space-y-3">
              <div className="font-heading font-bold text-sm text-indigo-950 flex items-center gap-1.5">
                <Sparkles size={16} className="text-subject-matematik" /> AI Koç Tavsiyesi
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed">
                {weakTopicsList.length > 0
                  ? `"${weakTopicsList[0].topic_name}" konusunda eksiklerin var. Soru çözmeden önce ilgili ders notunu en az 10 dakika incelemeni tavsiye ederim.`
                  : "Düzenli soru çözmeye devam ediyorsun! Genel denemeler çözerek sınav kondisyonunu koruyabilirsin."}
              </p>
              <Link to="/app/ai-koc" className="inline-flex items-center gap-1 text-xs font-bold text-subject-matematik hover:underline">
                AI Koç ile Konuş →
              </Link>
            </Card>
          </div>
        </div>
      )}

      {/* 2. SEKME: EKSİKLERİM (ZAYIF KONU ANALİZİ) */}
      {activeTab === "weak_topics" && (
        <Card className="p-6 space-y-5">
          <div>
            <h3 className="font-heading font-extrabold text-lg text-ink">Eksik ve Zayıf Konu Analizi</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Çözdüğün soru ve denemelere göre başarı oranı düşük olan konular tespit edilir ve önceliklendirilir.
            </p>
          </div>

          {proficiency.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl space-y-2">
              <AlertCircle size={36} className="mx-auto text-zinc-300" />
              <div className="font-heading font-bold text-sm text-zinc-600">Henüz Yeterli Soru Verisi Yok</div>
              <p className="text-xs text-zinc-400">Soru bankasından veya denemelerden soru çözdükçe konu analizlerin burada görünecektir.</p>
              <Link to="/app/soru-bankasi" className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-ink text-white font-bold text-xs">
                Soru Bankasına Git
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {proficiency.map((t, idx) => {
                const sc = statusColor(t.status);
                const tn = tone(t.subject_slug);
                return (
                  <motion.div key={t.topic_id || idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02, ease: EASE }}>
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: tn.hex }} />
                          <span className="font-heading font-bold text-sm text-ink">{t.topic_name}</span>
                          <span className="text-xs text-zinc-400">· {t.subject_name}</span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          {t.solved} soru · {t.correct} doğru · {t.wrong} yanlış · {t.blank} boş · ortalama {t.avg_time}sn
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-heading font-extrabold text-xl" style={{ color: sc }}>%{t.proficiency}</div>
                          <div className="text-xs font-semibold" style={{ color: sc }}>{t.status}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/app/ders-notlari?topic_id=${t.topic_id}`}
                            className="px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:text-ink hover:border-zinc-300 flex items-center gap-1"
                          >
                            <BookOpen size={13} /> Notu Oku
                          </Link>
                          <Link
                            to={`/app/soru-bankasi?topic_id=${t.topic_id}`}
                            className="px-3 py-1.5 rounded-xl bg-ink text-white text-xs font-bold hover:bg-subject-matematik flex items-center gap-1"
                          >
                            Soru Çöz
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* 3. SEKME: GİRİLEN DENEMELER & SINAV GEÇMİŞİ */}
      {activeTab === "tests" && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-extrabold text-lg text-ink">Çözülen Deneme Sınavları Geçmişi</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Girdiğin tüm deneme sınavlarının netleri, puanları ve analizleri.</p>
            </div>
            <Link to="/app/denemeler" className="px-4 py-2 rounded-xl bg-ink text-white font-bold text-xs flex items-center gap-1.5">
              <FileText size={14} /> Yeni Deneme Çöz
            </Link>
          </div>

          {testResults.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl space-y-2">
              <FileText size={36} className="mx-auto text-zinc-300" />
              <div className="font-heading font-bold text-sm text-zinc-600">Henüz Tamamlanan Deneme Sınavı Yok</div>
              <p className="text-xs text-zinc-400">Deneme sınavları çözerek sınav provası yapabilirsin.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((r, idx) => (
                <div key={r.id || idx} className="p-4 rounded-2xl bg-white border border-zinc-200 hover:border-subject-matematik/40 transition flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-base text-ink">{r.test_name || "Genel Deneme Sınavı"}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700">
                        {r.total} Soru
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Tarih: {r.created_at ? new Date(r.created_at).toLocaleString("tr-TR") : "Bilinmiyor"}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-xs font-semibold text-zinc-600">
                      <span className="text-emerald-600 font-bold">{r.correct} Doğru</span>
                      <span className="text-rose-600 font-bold">{r.wrong} Yanlış</span>
                      <span className="text-zinc-400">{r.blank} Boş</span>
                      <span className="bg-zinc-100 px-2.5 py-1 rounded-xl text-ink font-extrabold">{r.net} Net</span>
                    </div>

                    <div className="text-right">
                      <div className="font-heading font-extrabold text-lg text-subject-matematik">
                        {r.score ? `${r.score.toFixed(1)} Puan` : `%${r.success_rate || 0}`}
                      </div>
                    </div>

                    <Link
                      to={`/app/sonuc/${r.id}`}
                      className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-ink hover:text-white transition font-bold text-xs flex items-center gap-1"
                    >
                      İncele <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 4. SEKME: DERS NOTU ÇALIŞMA SÜRELERİ */}
      {activeTab === "notes" && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-extrabold text-lg text-ink">Ders Notu Çalışma Süreleri</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Hangi ders notunu ne kadar süre incelediğiniz ve toplam çalışma saatiniz.
              </p>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 font-heading font-extrabold text-sm">
              Toplam: {totalStudyMinutes} Dakika ({((totalStudyMinutes || 0) / 60).toFixed(1)} Saat)
            </div>
          </div>

          {noteActivities.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl space-y-2">
              <Clock size={36} className="mx-auto text-zinc-300" />
              <div className="font-heading font-bold text-sm text-zinc-600">Henüz Not Çalışma Süresi Kaydedilmedi</div>
              <p className="text-xs text-zinc-400">Ders notları sekmesinden notları açıp inceledikçe süreleriniz otomatik olarak buraya eklenir.</p>
              <Link to="/app/ders-notlari" className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-ink text-white font-bold text-xs">
                Ders Notlarına Git
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {noteActivities.map((a, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white border border-zinc-200 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="font-heading font-bold text-sm text-ink truncate">{a.title}</div>
                    <div className="text-xs text-zinc-500">
                      Branş: <strong>{a.subject_name}</strong> · Son Çalışma: {a.last_studied_at ? new Date(a.last_studied_at).toLocaleDateString("tr-TR") : "Bugün"}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="px-4 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-heading font-extrabold text-sm">
                      ⏱️ {a.minutes_spent} Dakika
                    </span>
                    <Link
                      to="/app/ders-notlari"
                      className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 font-bold text-xs text-zinc-700"
                    >
                      Tekrar Oku
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 5. SEKME: AYARLAR & HEDEF GÜNCELLEME */}
      {activeTab === "settings" && (
        <Card className="p-6 max-w-2xl space-y-6">
          <div>
            <h3 className="font-heading font-extrabold text-lg text-ink">Profil ve Çalışma Hedefleri</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Sınav hedeflerinizi ve kişisel bilgilerinizi güncelleyin.</p>
          </div>

          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5">Ad Soyad</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5">Kullanıcı Adı</label>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5">Hedef Puan (Örn: 480)</label>
                <input
                  type="number"
                  value={form.target_score}
                  onChange={(e) => setForm((s) => ({ ...s, target_score: e.target.value }))}
                  className={inputCls}
                  placeholder="480"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5">Günlük Soru Hedefi</label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={form.daily_goal}
                  onChange={(e) => setForm((s) => ({ ...s, daily_goal: e.target.value }))}
                  className={inputCls}
                  placeholder="20"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-ink text-white font-bold text-sm flex items-center gap-2 hover:bg-subject-matematik transition shadow-md disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Değişiklikleri Kaydet
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
