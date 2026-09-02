import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileQuestion, Upload, Plus, Trash2, Search, Filter, Sparkles,
  Download, CheckCircle2, AlertCircle, RefreshCw, Layers, Calendar,
  Check, ChevronLeft, ChevronRight, Wand2, Clock, BarChart2, BookOpen,
  FileText, FileUp, Edit3, ArrowRight, PlayCircle
} from "lucide-react";

import {
  fetchAdminQuestions, bulkCreateQuestions, deleteQuestion,
  autoGenerateTest, fetchExams, fetchSubjects, fetchTopics, fetchSubtopics,
  extractQuestionsFromPDF, bulkImportCategorizedQuestions, generateQuestionsWithAI
} from "@/lib/api";
import { Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

export default function QuestionBankStudio({ exams = [], onRefreshStats }) {
  const [subTab, setSubTab] = useState("list"); // "list", "ai_generate", "pdf_import", "bulk_upload", "auto_test"

  // AI Question Generator State
  const [aiExam, setAiExam] = useState("");
  const [aiSubject, setAiSubject] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiSubtopic, setAiSubtopic] = useState("");
  const [aiCount, setAiCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState("orta");
  const [aiStyle, setAiStyle] = useState("standard");
  const [aiCustomInstructions, setAiCustomInstructions] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState([]);

  const [aiSubjects, setAiSubjects] = useState([]);
  const [aiTopics, setAiTopics] = useState([]);
  const [aiSubtopics, setAiSubtopics] = useState([]);


  // Question List State
  const [questions, setQuestions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterExam, setFilterExam] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterSubtopic, setFilterSubtopic] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);

  // PDF Extraction State
  const [pdfExam, setPdfExam] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [savingExtracted, setSavingExtracted] = useState(false);

  // Bulk Upload State
  const [bulkExam, setBulkExam] = useState("");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkTopic, setBulkTopic] = useState("");
  const [bulkSubjects, setBulkSubjects] = useState([]);
  const [bulkTopics, setBulkTopics] = useState([]);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // Auto Test Generator State
  const [autoExam, setAutoExam] = useState("");

  const [autoTestName, setAutoTestName] = useState("");
  const [autoDuration, setAutoDuration] = useState(135);
  const [autoDifficulty, setAutoDifficulty] = useState("orta");
  const [autoSubjects, setAutoSubjects] = useState([]);
  const [subjectCounts, setSubjectCounts] = useState({});
  const [genResult, setGenResult] = useState(null);
  const [autoBusy, setAutoBusy] = useState(false);

  // Load subject/topic cascading for filter
  useEffect(() => {
    if (filterExam) {
      fetchSubjects(filterExam).then(setSubjects).catch(() => setSubjects([]));
    } else {
      setSubjects([]);
      setFilterSubject("");
    }
  }, [filterExam]);

  useEffect(() => {
    if (filterExam && filterSubject) {
      fetchTopics(filterExam, filterSubject).then(setTopics).catch(() => setTopics([]));
    } else {
      setTopics([]);
      setFilterTopic("");
    }
  }, [filterExam, filterSubject]);

  useEffect(() => {
    if (filterTopic) {
      fetchSubtopics(filterTopic).then(setSubtopics).catch(() => setSubtopics([]));
    } else {
      setSubtopics([]);
      setFilterSubtopic("");
    }
  }, [filterTopic]);

  // Load bulk cascading
  useEffect(() => {
    if (bulkExam) {
      fetchSubjects(bulkExam).then((r) => {
        setBulkSubjects(r);
        if (r[0]) setBulkSubject(r[0].id);
      }).catch(() => setBulkSubjects([]));
    } else {
      setBulkSubjects([]);
      setBulkSubject("");
    }
  }, [bulkExam]);

  useEffect(() => {
    if (bulkExam && bulkSubject) {
      fetchTopics(bulkExam, bulkSubject).then((r) => {
        setBulkTopics(r);
        if (r[0]) setBulkTopic(r[0].id);
      }).catch(() => setBulkTopics([]));
    } else {
      setBulkTopics([]);
      setBulkTopic("");
    }
  }, [bulkExam, bulkSubject]);

  // Load AI Generator Subjects
  useEffect(() => {
    if (aiExam) {
      fetchSubjects(aiExam).then((r) => {
        setAiSubjects(r);
        if (r[0]) setAiSubject(r[0].id);
        else setAiSubject("");
      }).catch(() => setAiSubjects([]));
    } else {
      setAiSubjects([]);
      setAiSubject("");
    }
  }, [aiExam]);

  // Load AI Generator Topics
  useEffect(() => {
    if (aiExam && aiSubject) {
      fetchTopics(aiExam, aiSubject).then((r) => {
        setAiTopics(r);
        if (r[0]) setAiTopic(r[0].id);
        else setAiTopic("");
      }).catch(() => setAiTopics([]));
    } else {
      setAiTopics([]);
      setAiTopic("");
    }
  }, [aiExam, aiSubject]);

  // Load AI Generator Subtopics
  useEffect(() => {
    if (aiTopic) {
      fetchSubtopics(aiTopic).then((r) => {
        setAiSubtopics(r);
        setAiSubtopic("");
      }).catch(() => setAiSubtopics([]));
    } else {
      setAiSubtopics([]);
      setAiSubtopic("");
    }
  }, [aiTopic]);

  // Handle AI Question Generation
  const handleAIGenerateQuestions = async (e) => {
    e.preventDefault();
    if (!aiExam || !aiSubject || !aiTopic) {
      return toast.error("Lütfen Sınav, Ders ve Konu seçimini tamamlayın.");
    }

    setAiGenerating(true);
    setAiGeneratedQuestions([]);
    try {
      const res = await generateQuestionsWithAI({
        exam_id: aiExam,
        subject_id: aiSubject,
        topic_id: aiTopic,
        subtopic_id: aiSubtopic || null,
        count: Number(aiCount) || 5,
        difficulty: aiDifficulty,
        style: aiStyle,
        custom_instructions: aiCustomInstructions || null,
      });

      setAiGeneratedQuestions(res.questions || []);
      toast.success(`🎉 Harika! ${res.created_count} adet yepyeni özgün soru üretildi ve doğrudan soru bankasına kaydedildi.`);
      if (onRefreshStats) onRefreshStats();
      loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Soru üretimi sırasında hata oluştu.");
    } finally {
      setAiGenerating(false);
    }
  };


  // Load Auto Test Subjects
  useEffect(() => {
    if (autoExam) {
      const selectedExamObj = exams.find((e) => e.id === autoExam);
      const isTYT = selectedExamObj?.name?.includes("TYT");
      const isAYT = selectedExamObj?.name?.includes("AYT");
      const isLGS = selectedExamObj?.name?.includes("LGS");

      setAutoTestName(`2026 ${selectedExamObj?.name || "Sınav"} Genel Deneme #${Math.floor(Math.random() * 90 + 10)}`);
      setAutoDuration(isTYT ? 165 : isAYT ? 180 : isLGS ? 155 : 120);

      fetchSubjects(autoExam).then((subjs) => {
        setAutoSubjects(subjs);
        const counts = {};
        subjs.forEach((s) => {
          if (s.name.includes("Türkçe") || s.name.includes("Matematik")) {
            counts[s.id] = isTYT ? 40 : isAYT ? 40 : isLGS ? 20 : 30;
          } else if (s.name.includes("Fen") || s.name.includes("Sosyal") || s.name.includes("Fizik")) {
            counts[s.id] = isTYT ? 20 : isAYT ? 14 : isLGS ? 20 : 20;
          } else {
            counts[s.id] = 15;
          }
        });
        setSubjectCounts(counts);
      }).catch(() => setAutoSubjects([]));
    }
  }, [autoExam, exams]);

  // Fetch Questions
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: 20,
      };
      if (filterExam) params.exam_id = filterExam;
      if (filterSubject) params.subject_id = filterSubject;
      if (filterTopic) params.topic_id = filterTopic;
      if (filterSubtopic) params.subtopic_id = filterSubtopic;
      if (filterDifficulty) params.difficulty = filterDifficulty;
      if (filterYear) params.year = filterYear;
      if (searchQuery) params.search = searchQuery;

      const data = await fetchAdminQuestions(params);
      setQuestions(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      toast.error("Sorular yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [filterExam, filterSubject, filterTopic, filterSubtopic, filterDifficulty, filterYear, searchQuery, page]);

  useEffect(() => {
    if (subTab === "list") {
      loadQuestions();
    }
  }, [loadQuestions, subTab]);

  // Delete Question
  const handleDeleteQ = async (id) => {
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    try {
      await deleteQuestion(id);
      toast.success("Soru silindi.");
      loadQuestions();
      if (onRefreshStats) onRefreshStats();
    } catch {
      toast.error("Soru silinemedi.");
    }
  };

  // Bulk CSV parser
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || "";
      setBulkText(text);
      toast.info("CSV içeriği yapıştırma alanına aktarıldı. İnceleyip onaylayabilirsiniz.");
    };
    reader.readAsText(file);
  };

  // Submit Bulk Questions
  const handleBulkSubmit = async () => {
    if (!bulkExam) return toast.error("Lütfen hedef sınavı seçin.");
    if (!bulkText.trim()) return toast.error("Lütfen soru içeriği girin veya CSV yükleyin.");

    setBulkBusy(true);
    try {
      const parsedQuestions = [];
      const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);

      // JSON format detection
      if (bulkText.trim().startsWith("[") && bulkText.trim().endsWith("]")) {
        const jsonList = JSON.parse(bulkText);
        parsedQuestions.push(...jsonList);
      } else {
        // CSV parsing (comma or semicolon)
        const isHeader = lines[0].toLowerCase().includes("soru") || lines[0].toLowerCase().includes("question");
        const startIdx = isHeader ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
          const delimiter = lines[i].includes(";") ? ";" : ",";
          const parts = lines[i].split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ""));
          if (parts.length >= 6) {
            parsedQuestions.push({
              question_text: parts[0],
              option_a: parts[1] || "",
              option_b: parts[2] || "",
              option_c: parts[3] || "",
              option_d: parts[4] || "",
              option_e: parts[5] || "",
              correct_answer: (parts[6] || "A").toUpperCase(),
              explanation: parts[7] || "",
              difficulty: parts[8] || "orta",
              year: Number(parts[9]) || 2024,
              source: parts[10] || "Toplu Yükleme",
            });
          }
        }
      }

      if (parsedQuestions.length === 0) {
        toast.error("Geçerli soru satırı ayrıştırılamadı. Formatı kontrol edin.");
        setBulkBusy(false);
        return;
      }

      const res = await bulkCreateQuestions({
        exam_id: bulkExam,
        subject_id: bulkSubject || null,
        topic_id: bulkTopic || null,
        questions: parsedQuestions,
      });

      toast.success(`${res.count || parsedQuestions.length} adet soru başarıyla soru bankasına eklendi!`);
      setBulkText("");
      setSubTab("list");
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      toast.error("Toplu soru yüklenirken hata oluştu: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setBulkBusy(false);
    }
  };

  // Download Sample CSV
  const downloadSampleCSV = () => {
    const csvContent =
      "soru_metni,secenek_a,secenek_b,secenek_c,secenek_d,secenek_e,dogru_cevap,aciklama,zorluk,yil,kaynak\n" +
      '"f(x) = 2x + 4 olduğuna göre f(3) kaçtır?","8","9","10","11","12","C","2*3 + 4 = 10","kolay","2024","2024-TYT Çıkmış"\n' +
      '"Aşağıdakilerden hangisi bir türev kuralıdır?","f(x)=c ise f\'=0","f\'=c","f\'=x","f\'=2x","f\'=x^2","A","Sabit fonksiyonun türevi 0\'dır.","orta","2023","2023-AYT Çıkmış"';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "hedefmatik_ornek_soru_sablonu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Auto Test Generator
  const handleAutoGenerate = async (e) => {
    e.preventDefault();
    if (!autoExam) return toast.error("Lütfen bir sınav türü seçin.");
    setAutoBusy(true);
    setGenResult(null);

    try {
      const res = await autoGenerateTest({
        exam_id: autoExam,
        name: autoTestName,
        duration_minutes: Number(autoDuration) || 120,
        difficulty: autoDifficulty,
        subject_counts: subjectCounts,
      });

      setGenResult(res);
      toast.success(`Harika! ${res.question_count} sorulu deneme başarıyla oluşturuldu.`);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      toast.error("Deneme oluşturulamadı: " + (err.response?.data?.detail || err.message));
    } finally {
      setAutoBusy(false);
    }
  };

  // PDF Extraction Handler
  const handleExtractPDF = async (e) => {
    e.preventDefault();
    if (!pdfExam) return toast.error("Lütfen hedef sınav türünü seçin.");
    if (!pdfFile) return toast.error("Lütfen bir PDF soru kitapçığı dosyası seçin.");

    setPdfExtracting(true);
    setExtractedQuestions([]);
    try {
      const res = await extractQuestionsFromPDF(pdfFile, pdfExam);
      if (!res.questions || res.questions.length === 0) {
        toast.error("PDF dosyasından soru metni tespit edilemedi. Dosyanın taranabilir metin içerdiğinden emin olun.");
      } else {
        setExtractedQuestions(res.questions);
        toast.success(`Harika! PDF'ten ${res.questions.length} adet soru ayıklandı ve branşlarına göre sınıflandırıldı.`);
      }
    } catch (err) {
      toast.error("PDF ayıklanırken hata oluştu: " + (err.response?.data?.detail || err.message));
    } finally {
      setPdfExtracting(false);
    }
  };

  // Save Extracted Questions
  const handleSaveExtractedQuestions = async () => {
    if (!extractedQuestions.length) return;
    setSavingExtracted(true);
    try {
      const res = await bulkImportCategorizedQuestions({
        exam_id: pdfExam,
        questions: extractedQuestions,
      });
      toast.success(`Mükemmel! ${res.count} adet soru ilgili ders ve konularına kayıpsız aktarıldı.`);
      setExtractedQuestions([]);
      setPdfFile(null);
      setSubTab("list");
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      toast.error("Sorular kaydedilemedi: " + (err.response?.data?.detail || err.message));
    } finally {
      setSavingExtracted(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-subject-matematik transition";

  return (
    <div className="space-y-6">
      {/* Üst Sekmeler */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900 text-white rounded-3xl">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-2xl bg-subject-matematik grid place-items-center text-white font-bold">
            <FileQuestion size={20} />
          </span>
          <div>
            <div className="font-heading font-extrabold text-base">Gelişmiş Soru Bankası & Deneme Motoru</div>
            <div className="text-xs text-zinc-400">PDF'ten akıllı soru ayıklama, toplu CSV yükleme ve rastgele deneme sihirbazı</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-800 p-1 rounded-2xl flex-wrap">
          <button
            onClick={() => setSubTab("list")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${subTab === "list" ? "bg-white text-zinc-900 shadow-md" : "text-zinc-400 hover:text-white"}`}
          >
            <Layers size={14} /> Soru Havuzu ({totalCount})
          </button>
          <button
            onClick={() => setSubTab("ai_generate")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${subTab === "ai_generate" ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30" : "text-violet-300 hover:text-white bg-violet-950/40"}`}
          >
            <Sparkles size={14} /> 🤖 AI Özgün Soru Üretici
          </button>
          <button
            onClick={() => setSubTab("pdf_import")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${subTab === "pdf_import" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-zinc-400 hover:text-white"}`}
          >
            📑 PDF Soru Ayıklayıcı
          </button>
          <button
            onClick={() => setSubTab("bulk_upload")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${subTab === "bulk_upload" ? "bg-white text-zinc-900 shadow-md" : "text-zinc-400 hover:text-white"}`}
          >
            <Upload size={14} /> CSV / Toplu Yükle
          </button>
          <button
            onClick={() => setSubTab("auto_test")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${subTab === "auto_test" ? "bg-subject-matematik text-white shadow-md shadow-subject-matematik/20" : "text-zinc-400 hover:text-white"}`}
          >
            <Wand2 size={14} /> Akıllı Deneme Sihirbazı
          </button>
        </div>

      </div>


      {/* 0. SEKME: AI İLE ÖZGÜN SORU ÜRETİCİ */}
      {subTab === "ai_generate" && (
        <div className="space-y-6">
          <Card className="p-6 border-2 border-violet-200 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/30 shadow-sm">
            <div className="flex items-center gap-3 mb-5 border-b border-violet-100 pb-4">
              <span className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 grid place-items-center text-white shadow-lg shadow-violet-300">
                <Sparkles size={22} />
              </span>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-ink flex items-center gap-2">
                  AI Özgün Soru Üretim Stüdyosu
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 uppercase tracking-wider">
                    ÖSYM 2026 Uyumlu
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Mevcut soru kalıplarının dışına çıkan, özgün, 5 şıklı ve detaylı açıklamalı sorular üreterek soru havuzuna kaydedin.
                </p>
              </div>
            </div>

            <form onSubmit={handleAIGenerateQuestions} className="space-y-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sınav Seçimi */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1.5">1. Sınav Türü *</label>
                  <select
                    value={aiExam}
                    onChange={(e) => setAiExam(e.target.value)}
                    className={inputCls}
                    required
                  >
                    <option value="">Sınav seçiniz</option>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                {/* Ders Seçimi */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1.5">2. Ders / Branş *</label>
                  <select
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    className={inputCls}
                    required
                    disabled={!aiExam}
                  >
                    <option value="">Ders seçiniz</option>
                    {aiSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Konu Seçimi */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1.5">3. Ana Konu *</label>
                  <select
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className={inputCls}
                    required
                    disabled={!aiSubject}
                  >
                    <option value="">Konu seçiniz</option>
                    {aiTopics.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Alt Konu Seçimi */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1.5">4. Alt Konu (Opsiyonel)</label>
                  <select
                    value={aiSubtopic}
                    onChange={(e) => setAiSubtopic(e.target.value)}
                    className={inputCls}
                    disabled={!aiTopic || aiSubtopics.length === 0}
                  >
                    <option value="">{aiSubtopics.length > 0 ? "Alt konu seçiniz (Tümü)" : "Alt konu yok"}</option>
                    {aiSubtopics.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Soru Ayarları Satırı */}
              <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-violet-100">
                {/* Soru Sayısı */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1.5">Üretilecek Soru Sayısı</label>
                  <div className="flex items-center gap-2">
                    {[5, 10, 20, 50].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setAiCount(cnt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          aiCount === cnt ? "bg-violet-600 text-white shadow-sm" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {cnt} Soru
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={aiCount}
                      onChange={(e) => setAiCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                      className="w-20 px-2 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold text-center outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                {/* Zorluk Dağılımı */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1.5">Hedef Zorluk Seviyesi</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className={inputCls}
                  >
                    <option value="mix">🎲 Karma (%30 Kolay, %40 Orta, %30 Zor)</option>
                    <option value="kolay">🟢 Kolay (Temel Kavram)</option>
                    <option value="orta">🟡 Orta (ÖSYM Standardı)</option>
                    <option value="zor">🔴 Zor (Ayırt Edici / Eleme)</option>
                  </select>
                </div>

                {/* Soru Tarzı */}
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1.5">Soru Formatı & Stili</label>
                  <select
                    value={aiStyle}
                    onChange={(e) => setAiStyle(e.target.value)}
                    className={inputCls}
                  >
                    <option value="standard">📝 Standart ÖSYM Soru Kalıbı</option>
                    <option value="new_generation">🌟 Yeni Nesil (Hikayeli / Beceri Temelli)</option>
                    <option value="conceptual">🧠 Kavramsal & Tuzaklı Bilgi Soruları</option>
                  </select>
                </div>
              </div>

              {/* Özel Talimat */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1.5">Özel İstek / Talimat (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="ör. Soru köklerinde 'kesinlikle' veya 'hangisi söylenemez' kalıpları ağırlıklı olsun..."
                  value={aiCustomInstructions}
                  onChange={(e) => setAiCustomInstructions(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Eylem Butonu */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-violet-100">
                <div className="text-xs text-zinc-500">
                  ⚡ Üretilen tüm sorular anında MySQL <strong>questions</strong> tablosuna ilgili sınav ve konuyla bağlanır.
                </div>
                <button
                  type="submit"
                  disabled={aiGenerating || !aiExam || !aiSubject || !aiTopic}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white font-heading font-extrabold text-sm flex items-center gap-2.5 hover:opacity-95 transition shadow-xl shadow-violet-300 disabled:opacity-50"
                >
                  {aiGenerating ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Yapay Zeka Soruları Üretiyor ve Kaydediyor...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      {aiCount} Adet Özgün Soru Üret ve Soru Bankasına Ekle →
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>

          {/* Üretilen Sorular Canlı Önizleme */}
          {aiGeneratedQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-heading font-bold text-base text-ink">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                  Yeni Üretilen ve Kaydedilen Sorular ({aiGeneratedQuestions.length} Soru)
                </div>
                <button
                  onClick={() => setSubTab("list")}
                  className="text-xs font-bold text-violet-600 hover:text-violet-800 underline"
                >
                  Soru Havuzunda Gör →
                </button>
              </div>

              <div className="space-y-3">
                {aiGeneratedQuestions.map((q, idx) => (
                  <Card key={q.id || idx} className="p-5 border border-zinc-200 hover:border-violet-300 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-zinc-900 text-white font-bold text-xs grid place-items-center">
                          {idx + 1}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          q.difficulty === "kolay" ? "bg-emerald-100 text-emerald-800" :
                          q.difficulty === "zor" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {q.difficulty?.toUpperCase()}
                        </span>
                        <span className="text-xs text-zinc-400">Doğru Cevap: <strong className="text-emerald-600 font-bold font-mono">{q.correct_answer}</strong></span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700">
                        AI Özgün Üretim
                      </span>
                    </div>

                    <p className="font-heading font-semibold text-sm text-ink mb-3 leading-relaxed">
                      {q.question_text}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-2 text-xs mb-3">
                      {["A", "B", "C", "D", "E"].map((opt) => {
                        const optText = q[`option_${opt.toLowerCase()}`];
                        if (!optText) return null;
                        const isCorrect = q.correct_answer === opt;
                        return (
                          <div
                            key={opt}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isCorrect ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold" : "bg-zinc-50 border-zinc-200 text-zinc-700"
                            }`}
                          >
                            <span className={`h-5 w-5 rounded-md grid place-items-center text-[10px] font-black ${
                              isCorrect ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-600"
                            }`}>
                              {opt}
                            </span>
                            <span className="flex-1">{optText}</span>
                            {isCorrect && <Check size={14} className="text-emerald-600" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-600">
                        <strong className="text-violet-700 font-bold block mb-0.5">💡 Çözüm & Açıklama:</strong>
                        {q.explanation}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* 1. SEKME: SORU HAVUZU VE FİLTRELEME */}
      {subTab === "list" && (

        <div className="space-y-4">
          {/* Filtreleme Çubuğu */}
          <Card className="p-5">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Soru metni veya kaynak ara..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-300 text-sm outline-none focus:border-subject-matematik"
                  />
                </div>
              </div>

              <div>
                <select
                  value={filterExam}
                  onChange={(e) => { setFilterExam(e.target.value); setFilterSubject(""); setFilterTopic(""); setFilterSubtopic(""); setPage(1); }}
                  className={inputCls}
                >
                  <option value="">1. Tüm Sınavlar</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={filterSubject}
                  onChange={(e) => { setFilterSubject(e.target.value); setFilterTopic(""); setFilterSubtopic(""); setPage(1); }}
                  className={inputCls}
                  disabled={!filterExam}
                >
                  <option value="">2. Tüm Dersler</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={filterTopic}
                  onChange={(e) => { setFilterTopic(e.target.value); setFilterSubtopic(""); setPage(1); }}
                  className={inputCls}
                  disabled={!filterSubject}
                >
                  <option value="">3. Tüm Ana Konular</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={filterSubtopic}
                  onChange={(e) => { setFilterSubtopic(e.target.value); setPage(1); }}
                  className={inputCls}
                  disabled={!filterTopic || subtopics.length === 0}
                >
                  <option value="">4. Tüm Alt Konular ({subtopics.length})</option>
                  {subtopics.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={filterDifficulty}
                  onChange={(e) => { setFilterDifficulty(e.target.value); setPage(1); }}
                  className={inputCls}
                >
                  <option value="">Zorluk (Tümü)</option>
                  <option value="kolay">Kolay</option>
                  <option value="orta">Orta</option>
                  <option value="zor">Zor</option>
                </select>
              </div>

              <div>
                <select
                  value={filterYear}
                  onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
                  className={inputCls}
                >
                  <option value="">Yıl (2005 - 2026)</option>
                  {Array.from({ length: 22 }, (_, i) => 2026 - i).map((y) => (
                    <option key={y} value={y}>{y} Yılı Çıkmış / Özgün</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Soru Kartları Listesi */}
          {loading ? (
            <Spinner />
          ) : questions.length === 0 ? (
            <Card className="p-12 text-center text-zinc-400 space-y-3">
              <FileQuestion size={40} className="mx-auto text-zinc-300" />
              <div className="font-heading font-bold text-lg text-zinc-600">Seçilen kriterlere uygun soru bulunamadı</div>
              <p className="text-xs text-zinc-400">Filtreleri değiştirebilir veya "Toplu Soru Yükle" sekmesinden yeni sorular ekleyebilirsiniz.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, ease: EASE }}
                >
                  <Card className="p-5 hover:border-subject-matematik/40 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700">
                            #{((page - 1) * 20) + idx + 1}
                          </span>
                          {q.year && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {q.year} Çıkmış
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                            {q.source || "Özgün Soru"}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600">
                            Zorluk: {q.difficulty}
                          </span>
                        </div>

                        <div className="font-heading font-bold text-sm text-ink leading-relaxed whitespace-pre-line">
                          {q.question_text}
                        </div>

                        {/* Şıklar */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs pt-1">
                          {["a", "b", "c", "d", "e"].map((optKey) => {
                            const optText = q[`option_${optKey}`];
                            if (!optText) return null;
                            const isCorrect = q.correct_answer === optKey.toUpperCase();
                            return (
                              <div
                                key={optKey}
                                className={`p-2 rounded-xl border font-medium ${isCorrect ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold" : "bg-zinc-50 border-zinc-200 text-zinc-700"}`}
                              >
                                <span className="font-bold mr-1">{optKey.toUpperCase()})</span> {optText}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 italic">
                            <span className="font-bold text-zinc-700 not-italic">Çözüm / Açıklama:</span> {q.explanation}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteQ(q.id)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Soruyu Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}

              {/* Sayfalama */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-xs text-zinc-500 font-medium">
                  Toplam <span className="font-bold text-ink">{totalCount}</span> soru listeleniyor (Sayfa {page} / {Math.ceil(totalCount / 20) || 1})
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={page >= Math.ceil(totalCount / 20)}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. SEKME: PDF İLE AKILLI SORU AYIKLAMA VE BRANŞLAMA */}
      {subTab === "pdf_import" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <div>
              <h3 className="font-heading font-extrabold text-lg text-ink flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-600" /> PDF Soru Kitapçığı Ayrıştırıcı & Akıllı Branş Dağıtıcı
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Yüklediğiniz PDF deneme kitapçığındaki veya çıkmış soru arşivindeki tüm soruları sıfır kayıpla ayıklar; şıkları, doğru cevabı, dersi ve konusunu otomatik tespit ederek önizleme masasına döker.
              </p>
            </div>

            <form onSubmit={handleExtractPDF} className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">Hedef Sınav Türü *</label>
                  <select
                    value={pdfExam}
                    onChange={(e) => setPdfExam(e.target.value)}
                    className={inputCls}
                    required
                  >
                    <option value="">Hedef sınav seçin (Örn: YKS TYT, AYT, KPSS, LGS...)</option>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">PDF Soru Kitapçığı Dosyası *</label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
                <div className="text-[11px] text-zinc-400">
                  Desteklenen Format: Çok sayfalı PDF kitapçıkları, çıkmış sınavlar ve branş testleri.
                </div>
                <button
                  type="submit"
                  disabled={pdfExtracting || !pdfExam || !pdfFile}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  {pdfExtracting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Yapay Zekâ PDF'i Analiz Ediyor...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> PDF'ten Soruları Ayıkla & Sınıflandır
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>

          {/* ÇIKARILAN SORULAR ÖNİZLEME VE ONAY MASASI */}
          {extractedQuestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div>
                  <div className="font-heading font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    {extractedQuestions.length} Adet Soru Başarıyla Ayıklandı ve Sınıflandırıldı!
                  </div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    Soruların metnini ve otomatik atanan branş/konu etiketlerini kontrol edin, ardından tek tıkla veritabanına aktarın.
                  </div>
                </div>

                <button
                  onClick={handleSaveExtractedQuestions}
                  disabled={savingExtracted}
                  className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {savingExtracted ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" /> Soru Bankasına Aktarılıyor...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={15} /> Tüm Soruları İlgili Branşlara Kaydet
                    </>
                  )}
                </button>
              </div>

              {/* Soru Kartları */}
              <div className="grid gap-3">
                {extractedQuestions.map((q, idx) => (
                  <Card key={idx} className="p-4 space-y-3 hover:border-indigo-300 transition">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-900 text-white text-xs font-bold">
                          Soru {idx + 1}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 text-xs font-extrabold border border-indigo-200">
                          📚 {q.subject_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-semibold">
                          📌 {q.topic_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                          Doğru Cevap: {q.correct_answer}
                        </span>
                        <button
                          onClick={() => setExtractedQuestions((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Bu Soruyu Çıkar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-ink font-medium leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                      {q.question_text}
                    </div>

                    {/* Şıklar */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 text-[11px]">
                      {["a", "b", "c", "d", "e"].map((letter) => {
                        const optVal = q[`option_${letter}`];
                        if (!optVal) return null;
                        const isCorrect = q.correct_answer === letter.toUpperCase();
                        return (
                          <div
                            key={letter}
                            className={`p-2 rounded-xl border ${
                              isCorrect
                                ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-900"
                                : "bg-white border-zinc-200 text-zinc-600"
                            }`}
                          >
                            <span className="font-bold mr-1">{letter.toUpperCase()})</span> {optVal}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-zinc-500 bg-zinc-50 p-2 rounded-xl italic">
                        <strong>Çözüm:</strong> {q.explanation}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* 3. SEKME: TOPLU SORU YÜKLEME (CSV / JSON / METİN) */}
      {subTab === "bulk_upload" && (
        <Card className="p-6 max-w-4xl space-y-6">
          <div>
            <h3 className="font-heading font-extrabold text-lg text-ink">Toplu Soru Yükleme Sihirbazı</h3>
            <p className="text-xs text-zinc-500 mt-0.5">CSV dosyasından veya kopyaladığınız soru listesinden tek tıkla yüzlerce soruyu sisteme aktarın.</p>
          </div>

          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">Hedef Sınav ve Branş Seçimi</span>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">Hedef Sınav *</label>
                <select value={bulkExam} onChange={(e) => setBulkExam(e.target.value)} className={inputCls}>
                  <option value="">Sınav seçin</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">Ders (Opsiyonel)</label>
                <select value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} className={inputCls} disabled={!bulkExam}>
                  <option value="">Ders seçin</option>
                  {bulkSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">Konu (Opsiyonel)</label>
                <select value={bulkTopic} onChange={(e) => setBulkTopic(e.target.value)} className={inputCls} disabled={!bulkSubject}>
                  <option value="">Konu seçin</option>
                  {bulkTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Dosya Yükleme & Şablon İndirme */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv,.txt,.json"
                onChange={handleCSVUpload}
                id="bulk-file-input"
                className="hidden"
              />
              <label
                htmlFor="bulk-file-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-white text-xs font-bold hover:bg-subject-matematik transition shadow-sm"
              >
                <Upload size={14} /> CSV / Dosya Seç
              </label>
              <span className="text-xs text-indigo-950 font-medium">Bilgisayarınızdan CSV veya JSON dosyası yükleyin</span>
            </div>

            <button
              type="button"
              onClick={downloadSampleCSV}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-subject-matematik hover:underline"
            >
              <Download size={14} /> Örnek CSV Şablonunu İndir (.csv)
            </button>
          </div>

          {/* Metin / Yapıştırma Alanı */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-600">CSV veya JSON Formatında Soru Verisi</label>
            <textarea
              rows={12}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`"Soru Metni","A Şıkkı","B Şıkkı","C Şıkkı","D Şıkkı","E Şıkkı","A","Çözüm açıklaması","orta","2024","2024-TYT Çıkmış"\n"İkinci Soru...","A","B","C","D","E","B","Çözüm...","kolay","2023","2023-AYT"`}
              className="w-full p-4 rounded-2xl border border-zinc-300 bg-white font-mono text-xs leading-relaxed outline-none focus:border-subject-matematik focus:ring-4 focus:ring-subject-matematik/10 transition"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={bulkBusy || !bulkText.trim()}
              onClick={handleBulkSubmit}
              className="px-6 py-3 rounded-2xl bg-ink text-white font-bold text-sm flex items-center gap-2 hover:bg-subject-matematik transition disabled:opacity-50 shadow-md shadow-ink/10"
            >
              {bulkBusy ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />} Soruları Topluca Yükle
            </button>
          </div>
        </Card>
      )}

      {/* 3. SEKME: AKILLI DENEME SİHİRBAZI (OTOMATİK VE DENGELİ SORU SEÇİCİ) */}
      {subTab === "auto_test" && (
        <Card className="p-6 max-w-4xl space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-subject-matematik text-white grid place-items-center">
                <Wand2 size={18} />
              </span>
              <h3 className="font-heading font-extrabold text-lg text-ink">Akıllı Otomatik Deneme Oluşturucu</h3>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Seçilen sınav türünün soru havuzundaki sorulardan resmi branş dağılımına uygun olarak <strong>rastgele ve dengeli sorular seçilerek</strong> gerçek formatta deneme oluşturulur ve kendi sınav türü altında yayınlanır.
            </p>
          </div>

          {/* Hızlı Sınav Şablonları */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">⚡ Hızlı Standart Şablonlar</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const tyt = exams.find((e) => e.name.includes("TYT"));
                  if (tyt) setAutoExam(tyt.id);
                  setAutoTestName("2026 YKS TYT Altın Deneme Sınavı");
                  setAutoDuration(165);
                }}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:border-subject-matematik text-xs font-bold text-zinc-700"
              >
                🎯 Standart TYT (120 Soru / 165 Dk)
              </button>
              <button
                type="button"
                onClick={() => {
                  const ayt = exams.find((e) => e.name.includes("AYT"));
                  if (ayt) setAutoExam(ayt.id);
                  setAutoTestName("2026 YKS AYT Alan Deneme Sınavı");
                  setAutoDuration(180);
                }}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:border-subject-matematik text-xs font-bold text-zinc-700"
              >
                🎯 Standart AYT (80 Soru / 180 Dk)
              </button>
              <button
                type="button"
                onClick={() => {
                  const lgs = exams.find((e) => e.name.includes("LGS"));
                  if (lgs) setAutoExam(lgs.id);
                  setAutoTestName("2026 LGS Pro Deneme Sınavı");
                  setAutoDuration(155);
                }}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:border-subject-matematik text-xs font-bold text-zinc-700"
              >
                🎯 Standart LGS (90 Soru / 155 Dk)
              </button>
              <button
                type="button"
                onClick={() => {
                  const kpss = exams.find((e) => e.name.includes("KPSS"));
                  if (kpss) setAutoExam(kpss.id);
                  setAutoTestName("2026 KPSS GY-GK Genel Deneme");
                  setAutoDuration(130);
                }}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:border-subject-matematik text-xs font-bold text-zinc-700"
              >
                🎯 Standart KPSS (120 Soru / 130 Dk)
              </button>
            </div>
          </div>

          <form onSubmit={handleAutoGenerate} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5">Hedef Sınav Soru Havuzu *</label>
                <select
                  required
                  value={autoExam}
                  onChange={(e) => setAutoExam(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Soru havuzu seçin (Örn: TYT, AYT, LGS, KPSS)</option>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.name} Soru Havuzu</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5">Deneme Sınavı Başlığı *</label>
                <input
                  required
                  value={autoTestName}
                  onChange={(e) => setAutoTestName(e.target.value)}
                  className={inputCls}
                  placeholder="Örn: 2026 TYT Altın Deneme Sınavı #1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5">Sınav Süresi (Dakika)</label>
                <div className="relative">
                  <Clock size={15} className="absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={autoDuration}
                    onChange={(e) => setAutoDuration(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-300 text-sm outline-none focus:border-subject-matematik"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1.5">Zorluk Seviyesi</label>
                <select
                  value={autoDifficulty}
                  onChange={(e) => setAutoDifficulty(e.target.value)}
                  className={inputCls}
                >
                  <option value="orta">Dengeli / ÖSYM Standart (Orta)</option>
                  <option value="kolay">Başlangıç Seviyesi (Kolay)</option>
                  <option value="zor">İleri Düzey / Zor</option>
                </select>
              </div>
            </div>

            {/* Ders Dağılımı Ayarları */}
            {autoSubjects.length > 0 && (
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Branş Başına Rastgele Seçilecek Soru Sayıları</span>
                  <span className="text-xs font-extrabold text-subject-matematik bg-subject-matematik/10 px-3 py-1 rounded-full">
                    Toplam: {Object.values(subjectCounts).reduce((a, b) => a + Number(b || 0), 0)} Soru
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {autoSubjects.map((s) => (
                    <div key={s.id} className="p-3 bg-white rounded-xl border border-zinc-200 space-y-1">
                      <div className="text-xs font-bold text-zinc-700 truncate">{s.name}</div>
                      <input
                        type="number"
                        min="1"
                        max="80"
                        value={subjectCounts[s.id] || ""}
                        onChange={(e) => setSubjectCounts((prev) => ({ ...prev, [s.id]: Number(e.target.value) || 0 }))}
                        className="w-full text-center py-1.5 rounded-lg border border-zinc-200 text-sm font-bold text-ink outline-none focus:border-subject-matematik"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={autoBusy || !autoExam}
                className="px-8 py-3.5 rounded-2xl bg-ink text-white font-bold text-sm flex items-center gap-2.5 hover:bg-subject-matematik transition shadow-lg shadow-ink/10 disabled:opacity-50"
              >
                {autoBusy ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />} Soru Havuzundan Seç ve Denemeyi Oluştur
              </button>
            </div>
          </form>

          {/* Oluşturulan Deneme Başarı Özeti & Hızlı Başlatma */}
          {genResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-heading font-bold text-base text-emerald-900">
                  <CheckCircle2 size={22} className="text-emerald-600" />
                  "{genResult.test?.name}" Deneme Sınavı Yayına Alındı!
                </div>
                <span className="px-3 py-1 bg-emerald-200 text-emerald-900 rounded-full text-xs font-bold">
                  {genResult.question_count} Soru · {genResult.test?.duration_minutes} Dk
                </span>
              </div>

              <div className="text-xs text-emerald-800">
                Sorular ilgili sınavın soru havuzundaki ders ve alt konulardan rastgele seçilerek bu denemeye bağlandı. Öğrenciler kendi sınav kategorilerinde bu denemeyi çözebilirler.
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(genResult.breakdown || {}).map(([sname, count]) => (
                  <span key={sname} className="px-3 py-1 bg-white rounded-xl text-xs font-bold text-emerald-900 border border-emerald-200">
                    {sname}: {count} Soru
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-emerald-200">
                <Link
                  to={`/app/deneme/${genResult.test?.id}`}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
                >
                  <PlayCircle size={15} /> Denemeyi Hemen İncele / Başlat
                </Link>
                <Link
                  to="/app/denemeler"
                  className="px-5 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold text-xs hover:bg-emerald-100 transition flex items-center gap-1.5"
                >
                  <BookOpen size={15} /> Tüm Denemeler Sayfasına Git
                </Link>
              </div>
            </motion.div>
          )}
        </Card>
      )}
    </div>
  );
}

