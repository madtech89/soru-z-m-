import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  GraduationCap,
  Clock,
  HelpCircle,
  Layers,
  ListTree,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  RefreshCw,
  Zap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Scale
} from "lucide-react";
import { Card } from "@/app/ui";
import { discoverAiExam, provisionAiExam, fetchExamDistributionAudit, EXAM_CATEGORIES } from "@/lib/api";
import { toast } from "sonner";

export default function AdminExamArchitect({ onCurriculumCreated }) {
  const [examNameInput, setExamNameInput] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [blueprint, setBlueprint] = useState(null);
  const [activeTab, setActiveTab] = useState("wizard"); // "wizard" | "audit"
  const [auditList, setAuditList] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState(null);

  const quickPicks = [
    "MSÜ (Milli Savunma Üniversitesi Askeri Öğrenci Sınavı)",
    "Kaymakamlık Adaylığı Sınavı",
    "Adli Yargı Hakim ve Savcı Yardımcılığı Sınavı",
    "İSG (İş Sağlığı ve Güvenliği) Sınavı",
    "E-KPSS (Engelli Kamu Personeli Seçme Sınavı)",
    "DGS (Dikey Geçiş Sınavı)",
    "ALES (Akademik Personel ve Lisansüstü Eğitimi Giriş Sınavı)",
    "TUS (Tıpta Uzmanlık Eğitimi Giriş Sınavı)"
  ];

  const loadAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetchExamDistributionAudit();
      setAuditList(res.audit || []);
    } catch (err) {
      toast.error("Denetim raporu yüklenemedi.");
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === "audit") {
      loadAudit();
    }
  }, [activeTab]);

  const handleDiscover = async (nameToDiscover) => {
    const target = nameToDiscover || examNameInput;
    if (!target.trim()) {
      return toast.error("Lütfen bir sınav adı girin.");
    }
    setDiscovering(true);
    setBlueprint(null);
    try {
      const data = await discoverAiExam({
        exam_name: target.trim(),
        target_year: 2026,
        additional_notes: additionalNotes.trim() || null
      });
      setBlueprint(data);
      if (data.subjects?.length > 0) {
        setExpandedSubject(0);
      }
      toast.success(`🎉 ${target} 2026 müfredatı ve soru dağılımı başarıyla çıkarıldı!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sınav müfredatı çıkarılırken bir hata oluştu.");
    } finally {
      setDiscovering(false);
    }
  };

  const handleProvision = async () => {
    if (!blueprint || !blueprint.name) {
      return toast.error("Kurulacak bir sınav taslağı bulunamadı.");
    }
    setProvisioning(true);
    try {
      const res = await provisionAiExam(blueprint);
      toast.success(
        `🚀 "${res.name}" sınavı başarıyla kuruldu! (${res.subjects_created} Ders, ${res.topics_created} Ana Konu, ${res.subtopics_created} Alt Konu eklendi)`
      );
      setBlueprint(null);
      setExamNameInput("");
      setAdditionalNotes("");
      if (onCurriculumCreated) onCurriculumCreated();
      if (activeTab === "audit") loadAudit();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sınav sisteme kurulurken hata oluştu.");
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Sparkles className="text-indigo-600" size={22} /> AI Sınav & Müfredat Mimarı
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            2026 ÖSYM ve kurum sınavları için tek tıkla müfredat çıkarma, soru dağılımı ve süre planlama
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("wizard")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "wizard" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            ✨ Yeni Sınav Keşfet & Kur
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "audit" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            📊 Soru & Süre Dağılımı Denetimi
          </button>
        </div>
      </div>

      {activeTab === "wizard" && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Sol Kolon: Keşif Formu */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-3">
                <Zap size={16} /> 2026 AI Sınav Keşif Sihirbazı
              </div>
              <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
                Eklemek istediğiniz sınavın adını yazın. AI Koçumuz 2026 ÖSYM ve kurum müfredatına göre tüm dersleri, konu konu çıkmış soru ağırlıklarını, toplam süreyi ve soru başına ideal saniyeyi otomatik çıkarır.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Sınav Adı</label>
                  <input
                    type="text"
                    value={examNameInput}
                    onChange={(e) => setExamNameInput(e.target.value)}
                    placeholder="Örn: MSÜ, Kaymakamlık, DGS, Hakimlik, İSG..."
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">Özel Notlar / Ek Talimatlar (Opsiyonel)</label>
                  <textarea
                    rows={2}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Örn: Yalnızca Genel Yetenek oturumu olsun, 4 yanlış 1 doğru kuralı geçerli olsun..."
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Hızlı Seçim Rozetleri */}
                <div>
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Hızlı Örnekler</div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPicks.map((qp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setExamNameInput(qp);
                          handleDiscover(qp);
                        }}
                        className="text-[11px] bg-white border border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-zinc-700 px-2.5 py-1 rounded-lg font-medium transition text-left"
                      >
                        {qp.split("(")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={discovering || !examNameInput.trim()}
                  onClick={() => handleDiscover()}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-4 py-3 rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 text-sm transition"
                >
                  {discovering ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>2026 Müfredatı ve Soru Dağılımı Taranıyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Müfredat & Soru Dağılımını Çıkar</span>
                    </>
                  )}
                </button>
              </div>
            </Card>
          </div>

          {/* Sağ Kolon: Keşif Sonucu Önizlemesi & Tek Tıkla Kurulum */}
          <div className="lg:col-span-7">
            {blueprint ? (
              <div className="space-y-4">
                {/* Sınav Genel Parametreleri Kartı */}
                <Card className="p-5 border-zinc-200">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                          {blueprint.category || "Genel"}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {blueprint.scoring_type || "Ağırlıklı Standart Puan"}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 mt-1.5">{blueprint.name}</h3>
                      <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{blueprint.description}</p>
                    </div>
                  </div>

                  {/* Metrik Rozetleri */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-150">
                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500">
                        <Clock size={13} /> Toplam Süre
                      </div>
                      <div className="text-base font-bold text-zinc-800 mt-0.5">{blueprint.total_duration} dk</div>
                    </div>
                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500">
                        <HelpCircle size={13} /> Soru Başına Süre
                      </div>
                      <div className="text-base font-bold text-zinc-800 mt-0.5">{blueprint.seconds_per_question} sn</div>
                    </div>
                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500">
                        <Layers size={13} /> Toplam Soru
                      </div>
                      <div className="text-base font-bold text-zinc-800 mt-0.5">{blueprint.total_questions} Soru</div>
                    </div>
                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500">
                        <Scale size={13} /> Yanlış Cezası
                      </div>
                      <div className="text-base font-bold text-zinc-800 mt-0.5">
                        {blueprint.wrong_penalty === 0 ? "Yok" : `${blueprint.wrong_penalty} Net`}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Dersler & Konu Soru Dağılımları */}
                <Card className="p-5 border-zinc-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <BookOpen size={16} className="text-indigo-600" /> Dersler & Konu Dağılımları ({blueprint.subjects?.length || 0} Ders)
                    </h4>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {blueprint.subjects?.map((s, sIdx) => {
                      const isExpanded = expandedSubject === sIdx;
                      return (
                        <div key={sIdx} className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                          <div
                            onClick={() => setExpandedSubject(isExpanded ? null : sIdx)}
                            className="flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100/80 cursor-pointer transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                {sIdx + 1}
                              </span>
                              <span className="font-bold text-xs text-zinc-800">{s.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                                {s.question_count || 0} Soru
                              </span>
                              <span className="text-[11px] font-medium text-zinc-500">
                                {s.seconds_per_question || blueprint.seconds_per_question} sn/soru
                              </span>
                              {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-3 bg-white space-y-2 border-t border-zinc-150">
                              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                                Konu Soru Dağılımı ({s.topics?.length || 0} Konu)
                              </div>
                              {s.topics?.map((t, tIdx) => (
                                <div key={tIdx} className="p-2 rounded-lg bg-zinc-50 border border-zinc-150 text-xs">
                                  <div className="flex items-center justify-between font-bold text-zinc-800">
                                    <span>{t.name}</span>
                                    <div className="flex items-center gap-2">
                                      {t.importance && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                          t.importance.includes("Çok") ? "bg-red-100 text-red-700" :
                                          t.importance.includes("Yüksek") ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                        }`}>
                                          {t.importance}
                                        </span>
                                      )}
                                      <span className="text-indigo-600 font-bold">
                                        ~{t.typical_question_count || 1} Soru
                                      </span>
                                    </div>
                                  </div>
                                  {t.subtopics?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-zinc-200/60">
                                      {t.subtopics.map((st, stIdx) => (
                                        <span key={stIdx} className="text-[10px] bg-white border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-600">
                                          {st}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Tek Tıkla Sisteme Kur Butonu */}
                <div className="flex items-center gap-3">
                  <button
                    disabled={provisioning}
                    onClick={handleProvision}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-60 text-sm transition"
                  >
                    {provisioning ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Sınav ve Müfredat Veritabanına Yazılıyor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>🚀 Sınavı ve Tüm Müfredatı Sisteme Kur (Dersler, Konular, Alt Konular, Süreler)</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlueprint(null)}
                    className="px-4 py-3.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold transition"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <Card className="p-12 border-dashed border-zinc-300 text-center flex flex-col items-center justify-center min-h-[320px]">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <Sparkles size={28} />
                </div>
                <h4 className="font-bold text-zinc-800 text-base">Henüz Sınav Müfredatı Çıkarılmadı</h4>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Sol taraftaki forma dilediğiniz sınavın adını yazın veya hızlı örneklerden birine tıklayın. AI Koçumuz saniyeler içinde tüm 2026 yapısını önünüze getirsin.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB: Soru & Süre Dağılımı Denetimi */}
      {activeTab === "audit" && (
        <Card className="p-5 border-zinc-200">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                <Scale size={18} className="text-indigo-600" /> Mevcut Sınavların Soru Dağılımı ve Süre Denetim Tablosu
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Sistemdeki tüm sınavların soru sayıları, konu ağırlıkları ve sınav sürelerinin ÖSYM standartlarına uygunluğu
              </p>
            </div>
            <button
              onClick={loadAudit}
              disabled={loadingAudit}
              className="flex items-center gap-1.5 text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg transition"
            >
              <RefreshCw size={14} className={loadingAudit ? "animate-spin" : ""} /> Yenile
            </button>
          </div>

          {loadingAudit ? (
            <div className="py-12 text-center text-zinc-400 flex flex-col items-center">
              <Loader2 className="animate-spin mb-2" size={24} /> Denetim raporu hazırlanıyor...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-bold">
                    <th className="py-2.5 px-3">Sınav Adı</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-center">Ders Sayısı</th>
                    <th className="py-2.5 px-3 text-center">Konu Sayısı</th>
                    <th className="py-2.5 px-3 text-center">Havuzdaki Soru</th>
                    <th className="py-2.5 px-3 text-center">Toplam Süre</th>
                    <th className="py-2.5 px-3 text-center">Soru Başına Süre</th>
                    <th className="py-2.5 px-3 text-center">Puanlama Durumu</th>
                    <th className="py-2.5 px-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150">
                  {auditList.map((item) => (
                    <tr key={item.exam_id} className="hover:bg-zinc-50/80 transition">
                      <td className="py-3 px-3 font-bold text-zinc-800">{item.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-bold text-[10px] uppercase">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-zinc-700">{item.subjects_count}</td>
                      <td className="py-3 px-3 text-center font-semibold text-zinc-700">{item.topics_count}</td>
                      <td className="py-3 px-3 text-center font-bold text-indigo-600">{item.total_questions_in_bank}</td>
                      <td className="py-3 px-3 text-center font-medium text-zinc-700">
                        {item.total_duration !== "Belirtilmemiş" ? `${item.total_duration} dk` : (
                          <span className="text-zinc-400 italic">Tanımsız</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-medium text-zinc-700">
                        {item.seconds_per_question !== "Belirtilmemiş" ? `${item.seconds_per_question} sn` : (
                          <span className="text-zinc-400 italic">Tanımsız</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.has_scoring_configured ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 size={13} /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-[11px]">
                            <AlertTriangle size={13} /> Standart
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setExamNameInput(item.name);
                            setActiveTab("wizard");
                            handleDiscover(item.name);
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition inline-flex items-center gap-1"
                        >
                          <Sparkles size={12} /> AI İle Güncelle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
