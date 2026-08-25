import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, Loader2, Search, TrendingUp, Target, ArrowRight, ArrowLeft,
  MapPin, Clock, Award, Info, GraduationCap, Check, Building2, Filter,
  Sparkles, Star, Trash2, Download, Printer, CheckCircle2, ChevronDown,
  Percent, ArrowUpDown, SlidersHorizontal, Share2, BookOpen, X, School
} from "lucide-react";
import {
  fetchProgramRecommendations, fetchDistinctCities, fetchDistinctUniversities,
  fetchDistinctDepartments, SCORE_TYPES, TERCIH_EXAM_TYPES,
} from "@/lib/api";
import { PageHeader, Card, EASE } from "@/app/ui";
import { toast } from "sonner";

// TÜM 81 İL (A'dan Z'ye Eksiksiz Liste)
export const ALL_81_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
  "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];

// KAPSAMLI BÖLÜM VE ALAN LİSTESİ
export const MASTER_DEPARTMENTS = [
  // Sayısal
  "Tıp", "Diş Hekimliği", "Eczacılık", "Bilgisayar Mühendisliği", "Yazılım Mühendisliği",
  "Yapay Zeka ve Veri Mühendisliği", "Elektrik-Elektronik Mühendisliği", "Endüstri Mühendisliği",
  "Makine Mühendisliği", "Havacılık ve Uzay Mühendisliği", "İnşaat Mühendisliği", "Mekatronik Mühendisliği",
  "Kimya Mühendisliği", "Biyomühendislik", "Mimarlık", "Moleküler Biyoloji ve Genetik", "Hemşirelik",
  "Beslenme ve Diyetetik", "Fizyoterapi ve Rehabilitasyon", "Ebelik", "Veterinerlik",
  "İlköğretim Matematik Öğretmenliği", "Fen Bilgisi Öğretmenliği", "Bilişim Sistemleri Mühendisliği",
  // Eşit Ağırlık
  "Hukuk", "Psikoloji", "Yönetim Bilişim Sistemleri (YBS)", "İşletme", "İktisat",
  "Siyaset Bilimi ve Uluslararası İlişkiler", "Kamu Yönetimi", "Rehberlik ve Psikolojik Danışmanlık (PDR)",
  "Sınıf Öğretmenliği", "Uluslararası Ticaret ve Lojistik", "Maliye", "İç Mimarlık ve Çevre Tasarımı",
  "Çocuk Gelişimi", "Sosyal Hizmet", "Ekonometri", "Sosyoloji", "Sağlık Yönetimi",
  // Sözel
  "Özel Eğitim Öğretmenliği", "Türkçe Öğretmenliği", "Sosyal Bilgiler Öğretmenliği",
  "Türk Dili ve Edebiyatı", "Tarih", "İlahiyat", "İslami İlimler", "Halkla İlişkiler ve Tanıtım",
  "Radyo, Televizyon ve Sinema", "Yeni Medya ve İletişim", "Gastronomi ve Mutfak Sanatları",
  "Çizgi Film ve Animasyon", "Gazetecilik", "Coğrafya", "Görsel İletişim Tasarımı",
  // Dil
  "İngilizce Öğretmenliği", "Mütercim ve Tercümanlık (İngilizce)", "İngiliz Dili ve Edebiyatı",
  "Almanca Öğretmenliği", "Mütercim ve Tercümanlık (Almanca)", "Fransız Dili ve Edebiyatı",
  "Arapça Öğretmenliği", "Rus Dili ve Edebiyatı", "Amerikan Kültürü ve Edebiyatı",
  // TYT Önlisans (2 Yıllık)
  "İlk ve Acil Yardım (Paramedik)", "Anestezi", "Tıbbi Görüntüleme Teknikleri", "Tıbbi Laboratuvar Teknikleri",
  "Ağız ve Diş Sağlığı", "Optisyenlik", "Fizyoterapi (Önlisans)", "Bilgisayar Programcılığı",
  "Bilişim Güvenliği Teknolojisi", "Web Tasarımı ve Kodlama", "Siber Güvenlik", "Mekatronik (Önlisans)",
  "Elektrik (Önlisans)", "Uçak Teknolojisi", "Sivil Havacılık Kabin Hizmetleri", "Aşçılık", "Grafik Tasarımı (Önlisans)",
  "Adalet", "Lojistik", "Dış Ticaret", "Çocuk Gelişimi (Önlisans)"
];

export function normalizeTurkish(text) {
  if (!text) return "";
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/i̇/g, "i")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

export function matchTurkish(source, query) {
  if (!query) return true;
  if (!source) return false;
  return normalizeTurkish(source).includes(normalizeTurkish(query));
}

const inputCls = "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 transition text-sm font-semibold shadow-sm";

function StepDots({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full grid place-items-center text-xs font-black transition-colors ${i < step ? "bg-violet-600 text-white" : i === step ? "bg-ink text-white shadow-md shadow-ink/20" : "bg-zinc-100 text-zinc-400"}`}>
            {i < step ? <Check size={14} /> : i + 1}
          </div>
          {i < total - 1 && <div className={`h-0.5 w-8 sm:w-12 rounded-full ${i < step ? "bg-violet-600" : "bg-zinc-200"}`} />}
        </div>
      ))}
    </div>
  );
}

function ProgramCard({ program, index, onToggleBasket, isInBasket, userRank }) {
  const cat = program.recommendation_category || "likely";
  const prob = program.probability || 50;

  const config = {
    guaranteed: {
      bg: "bg-emerald-500/5",
      border: "border-emerald-200",
      badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
      text: "text-emerald-700",
      label: "Çok Yüksek / Güvenli",
      icon: Target,
    },
    likely: {
      bg: "bg-violet-500/5",
      border: "border-violet-200",
      badgeBg: "bg-violet-100 text-violet-800 border-violet-300",
      text: "text-violet-700",
      label: "Yüksek İhtimal / İdeal",
      icon: TrendingUp,
    },
    reach: {
      bg: "bg-amber-500/5",
      border: "border-amber-200",
      badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
      text: "text-amber-700",
      label: "Dengeli / Sürpriz",
      icon: Compass,
    },
    dream: {
      bg: "bg-rose-500/5",
      border: "border-rose-200",
      badgeBg: "bg-rose-100 text-rose-800 border-rose-300",
      text: "text-rose-700",
      label: "Riskli / Hayal",
      icon: Sparkles,
    },
  }[cat] || {
    bg: "bg-zinc-50",
    border: "border-zinc-200",
    badgeBg: "bg-zinc-100 text-zinc-800 border-zinc-300",
    text: "text-zinc-700",
    label: "Belirsiz",
    icon: Compass,
  };

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.3, ease: EASE }}
      className={`rounded-2xl border ${config.border} ${config.bg} p-5 hover:shadow-md transition-all relative overflow-hidden group bg-white`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Sol Bilgiler */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${config.badgeBg} flex items-center gap-1.5`}>
              <Icon size={12} /> {config.label} (%{prob} Kazanma İhtimali)
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
              {program.score_type}
            </span>
            {program.scholarship && (
              <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                {program.scholarship}
              </span>
            )}
          </div>

          <h3 className="font-heading font-black text-base text-ink leading-snug pt-0.5">
            {program.program}
          </h3>

          <div className="text-xs font-semibold text-zinc-600 flex items-center gap-1.5">
            <Building2 size={13} className="text-zinc-400 shrink-0" />
            <span>{program.university}</span>
            {program.faculty && <span className="text-zinc-400">· {program.faculty}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1"><MapPin size={12} className="text-violet-600" /> {program.city}</span>
            {program.duration_years > 0 && (
              <span className="flex items-center gap-1"><Clock size={12} className="text-zinc-400" /> {program.duration_years} Yıl</span>
            )}
            {program.quota > 0 && <span className="flex items-center gap-1"><Award size={12} className="text-amber-500" /> Kontenjan: {program.quota}</span>}
            
            {userRank > 0 && program.rank_diff !== undefined && (
              <span className={`font-bold ${program.rank_diff >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                {program.rank_diff >= 0 ? `+${program.rank_diff.toLocaleString("tr-TR")} sıra avantaj` : `${program.rank_diff.toLocaleString("tr-TR")} sıra geride`}
              </span>
            )}
          </div>
        </div>

        {/* Sağ İstatistikler & Buton */}
        <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-100 shrink-0">
          <div className="flex gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Taban Puan</div>
              <div className="font-heading font-black text-lg text-violet-700">
                {Number(program.score_2025 || 0).toFixed(2)}
              </div>
            </div>

            <div className="text-right pl-4 border-l border-zinc-200">
              <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Başarı Sırası</div>
              <div className="font-mono font-black text-sm text-ink">
                {program.rank_2025 ? program.rank_2025.toLocaleString("tr-TR") : "—"}
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleBasket(program)}
            className={`p-2.5 rounded-xl border transition flex items-center justify-center gap-1.5 text-xs font-bold ${
              isInBasket
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
            }`}
            title={isInBasket ? "Sepetten Çıkar" : "Tercih Sepetime Ekle"}
          >
            <Star size={16} className={isInBasket ? "fill-white" : ""} />
            <span className="hidden sm:inline">{isInBasket ? "Listemde" : "Listeme Ekle"}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function TercihRobotu() {
  const [step, setStep] = useState(0);
  const [examType, setExamType] = useState("YKS");
  const [scoreType, setScoreType] = useState("SAY");
  const [score, setScore] = useState("");
  const [rank, setRank] = useState("");

  // Search & Filter states
  const [selectedCities, setSelectedCities] = useState([]);
  const [citySearchInput, setCitySearchInput] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  const [selectedDepts, setSelectedDepts] = useState([]);
  const [deptSearchInput, setDeptSearchInput] = useState("");
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);

  // Results state
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Results Controls
  const [sortBy, setSortBy] = useState("chance");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [resultSearch, setResultSearch] = useState("");

  // Tercih Sepeti (Basket)
  const [basket, setBasket] = useState(() => {
    try {
      const saved = localStorage.getItem("hedefmatik_tercih_basket") || localStorage.getItem("netor_tercih_basket");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isBasketModalOpen, setIsBasketModalOpen] = useState(false);

  const cityInputRef = useRef(null);
  const deptInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("hedefmatik_tercih_basket", JSON.stringify(basket));
  }, [basket]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (cityInputRef.current && !cityInputRef.current.contains(event.target)) {
        setIsCityDropdownOpen(false);
      }
      if (deptInputRef.current && !deptInputRef.current.contains(event.target)) {
        setIsDeptDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sınav türü değiştikçe uygun varsayılan puan türünü ayarla
  const currentScoreTypes = useMemo(() => {
    if (examType === "YKS") {
      return [
        { key: "SAY", label: "Sayısal (SAY)", desc: "Tıp, Mühendislik, Mimarlık, Sağlık" },
        { key: "EA", label: "Eşit Ağırlık (EA)", desc: "Hukuk, Psikoloji, YBS, İşletme, PDR" },
        { key: "SÖZ", label: "Sözel (SÖZ)", desc: "Özel Eğitim, Türkçe Öğrt., İlahiyat, Gastronomi" },
        { key: "DİL", label: "Yabancı Dil (DİL)", desc: "İngilizce Öğretmenliği, Mütercim-Tercümanlık" },
        { key: "TYT", label: "TYT (Önlisans 2 Yıllık)", desc: "İlk ve Acil Yardım, Anestezi, Bilgisayar Prog." },
      ];
    } else if (examType === "LGS") {
      return [
        { key: "LGS", label: "LGS Merkezi Sınav Puanı", desc: "Fen, Anadolu, Sosyal Bilimler ve Proje Liseleri" },
      ];
    } else if (examType === "KPSS") {
      return [
        { key: "KPSS-Lisans", label: "KPSS Lisans (P3 Puanı)", desc: "Merkezi Memur, Mühendis, Sağlıkçı Atamaları" },
        { key: "KPSS-Onlisans", label: "KPSS Önlisans (P93 Puanı)", desc: "Paramedik, Tıbbi Sekreter, Zabıt Kâtibi Atamaları" },
        { key: "KPSS-Egitim", label: "KPSS Öğretmenlik (ÖABT / P121)", desc: "Milli Eğitim Bakanlığı Öğretmen Atama Taban Puanları" },
        { key: "KPSS-A", label: "KPSS Alan (A Grubu - P48/P23)", desc: "Gelir Uzman Yardımcılığı (GUY), SGK Denetmenliği" },
      ];
    } else if (examType === "DGS") {
      return [
        { key: "SAY", label: "DGS Sayısal", desc: "Mühendislik, Mimarlık ve Sağlık Lisans Tamamlama" },
        { key: "EA", label: "DGS Eşit Ağırlık", desc: "Hukuk, İşletme, YBS ve İİBF Lisans Tamamlama" },
        { key: "SÖZ", label: "DGS Sözel", desc: "İletişim, Gastronomi, İlahiyat Lisans Tamamlama" },
      ];
    }
    return SCORE_TYPES;
  }, [examType]);

  useEffect(() => {
    if (currentScoreTypes.length > 0) {
      setScoreType(currentScoreTypes[0].key);
    }
  }, [currentScoreTypes]);

  // Şehir Arama / Filtreleme Dropdown Listesi (Tüm 81 il arasından, Türkçe duyarsız)
  const filteredCities = useMemo(() => {
    if (!citySearchInput.trim()) return ALL_81_CITIES.slice(0, 15);
    return ALL_81_CITIES.filter((c) => matchTurkish(c, citySearchInput));
  }, [citySearchInput]);

  // Bölüm Arama / Filtreleme Dropdown Listesi (Tüm ana bölümler arasından, Türkçe duyarsız)
  const filteredDepts = useMemo(() => {
    if (!deptSearchInput.trim()) return MASTER_DEPARTMENTS.slice(0, 15);
    return MASTER_DEPARTMENTS.filter((d) => matchTurkish(d, deptSearchInput));
  }, [deptSearchInput]);


  const toggleCity = (c) => {
    setSelectedCities((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const toggleDept = (d) => {
    setSelectedDepts((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const handleAddCustomCities = () => {
    if (!citySearchInput.trim()) return;
    const parts = citySearchInput.split(",").map(s => s.trim()).filter(Boolean);
    setSelectedCities((prev) => Array.from(new Set([...prev, ...parts])));
    setCitySearchInput("");
    setIsCityDropdownOpen(false);
  };

  const handleAddCustomDepts = () => {
    if (!deptSearchInput.trim()) return;
    const parts = deptSearchInput.split(",").map(s => s.trim()).filter(Boolean);
    setSelectedDepts((prev) => Array.from(new Set([...prev, ...parts])));
    setDeptSearchInput("");
    setIsDeptDropdownOpen(false);
  };

  const toggleBasket = (program) => {
    setBasket((prev) => {
      const exists = prev.some((p) => p.id === program.id);
      if (exists) {
        toast.success("Program tercih listenden çıkarıldı.");
        return prev.filter((p) => p.id !== program.id);
      } else {
        if (prev.length >= 24) {
          toast.error("ÖSYM kuralı gereği en fazla 24 tercih ekleyebilirsiniz!");
          return prev;
        }
        toast.success("⭐ Program tercih listene eklendi!");
        return [...prev, program];
      }
    });
  };

  const canNext = () => {
    if (step === 0) return !!examType;
    if (step === 1) return !!scoreType;
    if (step === 2) {
      const s = parseFloat(score.replace(",", "."));
      const r = parseInt(rank, 10);
      return (s >= 50 && s <= 600) || (r > 0);
    }
    return true;
  };

  const next = () => {
    if (step === 2) {
      const s = parseFloat(score.replace(",", "."));
      const r = parseInt(rank, 10);
      if ((!s || s < 50 || s > 600) && (!r || r <= 0)) {
        setError("Lütfen geçerli bir yerleştirme puanı veya başarı sırası giriniz.");
        return;
      }
      setError("");
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      compute();
    }
  };

  const compute = async () => {
    const s = parseFloat(score.replace(",", "."));
    const r = parseInt(rank, 10);
    setError("");
    setBusy(true);
    setResults(null);

    try {
      const filters = {
        cities: selectedCities,
        programs: selectedDepts,
        sortBy,
        categoryFilter
      };

      const data = await fetchProgramRecommendations(scoreType, s || 0, r || 0, filters);
      setResults({ ...data, userScore: s, userRank: r });
    } catch (err) {
      setError("Öneriler hesaplanırken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  // Filtered & Sorted live items
  const displayItems = useMemo(() => {
    if (!results || !results.all) return [];
    let list = [...results.all];

    if (categoryFilter !== "all") {
      list = list.filter((p) => p.recommendation_category === categoryFilter);
    }

    if (resultSearch.trim()) {
      const terms = resultSearch.split(",").map(t => t.trim()).filter(Boolean);
      list = list.filter((p) => {
        const text = `${p.university} ${p.faculty} ${p.program} ${p.city}`;
        return terms.some(term => matchTurkish(text, term));
      });
    }

    if (sortBy === "chance") {
      list.sort((a, b) => (b.probability || 0) - (a.probability || 0));
    } else if (sortBy === "rank_asc") {
      list.sort((a, b) => (a.rank_2025 || 999999) - (b.rank_2025 || 999999));
    } else if (sortBy === "score_desc") {
      list.sort((a, b) => (b.score_2025 || 0) - (a.score_2025 || 0));
    } else if (sortBy === "quota_desc") {
      list.sort((a, b) => (b.quota || 0) - (a.quota || 0));
    }

    return list;
  }, [results, categoryFilter, resultSearch, sortBy]);

  const reset = () => {
    setStep(0);
    setScore("");
    setRank("");
    setSelectedCities([]);
    setSelectedDepts([]);
    setResults(null);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="yök atlas & ösym"
          title="Merkezi Akıllı Tercih Robotu"
          sub="81 ildeki tüm üniversite bölümlerini, liseleri ve KPSS kadrolarını kazanma ihtimali sıralamasıyla listele."
        />

        {basket.length > 0 && (
          <button
            onClick={() => setIsBasketModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition"
          >
            <Star size={16} className="fill-white" />
            <span>Tercih Sepetim ({basket.length}/24)</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!results ? (
          <motion.div key="wizard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StepDots step={step} total={4} />

            <div className="max-w-2xl">
              {/* Step 0: Exam Type */}
              {step === 0 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-violet-600 font-bold text-xs">
                      <GraduationCap size={16} /> Adım 1: Sınav Türü
                    </div>
                    <h2 className="font-heading font-extrabold text-xl text-ink">Hangi sınav için tercih yapacaksın?</h2>
                    <div className="space-y-3">
                      {TERCIH_EXAM_TYPES.map((et) => {
                        const on = examType === et.key;
                        return (
                          <button
                            key={et.key}
                            onClick={() => setExamType(et.key)}
                            className={`w-full text-left rounded-2xl p-4 border-2 transition-all flex items-center justify-between ${
                              on ? "border-violet-600 bg-violet-50/50 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300"
                            }`}
                          >
                            <div>
                              <div className="font-heading font-bold text-sm text-ink">{et.label}</div>
                              <div className="text-xs text-zinc-500 mt-0.5">{et.desc}</div>
                            </div>
                            {on && <span className="h-6 w-6 rounded-full bg-violet-600 grid place-items-center text-white"><Check size={14} /></span>}
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Step 1: Score Type */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-violet-600 font-bold text-xs">
                      <Target size={16} /> Adım 2: Puan Türü
                    </div>
                    <h2 className="font-heading font-extrabold text-xl text-ink">Puan türünü seç</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {currentScoreTypes.map((st) => {
                        const on = scoreType === st.key;
                        return (
                          <button
                            key={st.key}
                            onClick={() => setScoreType(st.key)}
                            className={`text-left rounded-2xl p-4 border-2 transition-all ${
                              on ? "border-violet-600 bg-violet-50/50 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-heading font-bold text-sm text-ink">{st.label}</span>
                              {on && <span className="h-5 w-5 rounded-full bg-violet-600 grid place-items-center text-white"><Check size={12} /></span>}
                            </div>
                            <p className="text-xs text-zinc-500">{st.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Step 2: Score & Rank */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-violet-600 font-bold text-xs">
                      <Award size={16} /> Adım 3: Puan & Başarı Sıralaması
                    </div>
                    <h2 className="font-heading font-extrabold text-xl text-ink">Sınav sonucunu gir</h2>
                    <p className="text-xs text-zinc-500">
                      Başarı sıranı veya puanını girerek en doğru kazanma olasılığı hesaplamasını başlat.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="text-xs font-bold text-zinc-700 block mb-1">
                          {examType === "LGS" ? "LGS Başarı Sırası / Yüzdelik Dilim" : "Merkezi Başarı Sıralaması *"}
                        </label>
                        <input
                          type="number"
                          placeholder="Örn: 24500"
                          value={rank}
                          onChange={(e) => { setRank(e.target.value); setError(""); }}
                          className={inputCls}
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-700 block mb-1">Yerleştirme Puanı (İsteğe bağlı)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={examType === "LGS" ? "Örn: 485.50" : "Örn: 465.80"}
                          value={score}
                          onChange={(e) => { setScore(e.target.value); setError(""); }}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
                  </Card>
                </motion.div>
              )}

              {/* Step 3: Multi-City & Multi-Department Filter */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                  <Card className="p-6 space-y-5">
                    <div className="flex items-center gap-2 text-violet-600 font-bold text-xs">
                      <Filter size={16} /> Adım 4: 81 İl ve Bölüm Seçimi (Opsiyonel)
                    </div>
                    <h2 className="font-heading font-extrabold text-xl text-ink">Hedef şehir ve bölümlerini belirle</h2>
                    <p className="text-xs text-zinc-500">
                      Tüm 81 il veya bölümler arasından arayabilir, virgülle birden fazla ekleyebilir ya da boş bırakarak tüm uygun seçenekleri listeleyebilirsiniz.
                    </p>

                    {/* 81 İl Arama & Dropdown */}
                    <div className="space-y-2 relative" ref={cityInputRef}>
                      <label className="text-xs font-bold text-zinc-700 block flex items-center justify-between">
                        <span>Şehir Filtresi ({selectedCities.length} seçili)</span>
                        {selectedCities.length > 0 && (
                          <button onClick={() => setSelectedCities([])} className="text-[11px] text-rose-500 font-bold hover:underline">
                            Seçimleri Temizle
                          </button>
                        )}
                      </label>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            value={citySearchInput}
                            onChange={(e) => {
                              setCitySearchInput(e.target.value);
                              setIsCityDropdownOpen(true);
                            }}
                            onFocus={() => setIsCityDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCustomCities();
                              }
                            }}
                            placeholder="81 il arasından arayın veya virgülle ayırın (Örn: İstanbul, Ankara, İzmir, Bursa, Trabzon)..."
                            className="w-full text-xs rounded-xl border border-zinc-200 px-3 py-2.5 outline-none focus:border-violet-600 font-medium"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomCities}
                          className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition"
                        >
                          Ekle
                        </button>
                      </div>

                      {/* Dropdown Suggestions */}
                      {isCityDropdownOpen && filteredCities.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-30 max-h-60 overflow-y-auto p-2 divide-y divide-zinc-50">
                          <div className="space-y-1">
                            {filteredCities.map((c) => {
                              const isSelected = selectedCities.includes(c);
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => toggleCity(c)}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                                    isSelected ? "bg-violet-50 text-violet-700 font-bold" : "hover:bg-zinc-50 text-zinc-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`h-4 w-4 rounded border grid place-items-center ${isSelected ? "bg-violet-600 border-violet-600 text-white" : "border-zinc-300 bg-white"}`}>
                                      {isSelected && <Check size={10} />}
                                    </div>
                                    <span>{c}</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-400">81 İl</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Sticky Dropdown Footer */}
                          <div className="sticky bottom-0 bg-white pt-2 pb-1 px-2 border-t border-zinc-100 flex items-center justify-between mt-2">
                            <span className="text-[11px] font-bold text-zinc-500">{selectedCities.length} şehir seçili</span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCityDropdownOpen(false);
                                setCitySearchInput("");
                              }}
                              className="px-3.5 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 shadow-sm transition"
                            >
                              ✓ Tamam / Kapat
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Seçili Şehir Rozetleri */}
                      {selectedCities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedCities.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-800 text-xs font-bold border border-violet-200"
                            >
                              <MapPin size={11} /> {c}
                              <button onClick={() => toggleCity(c)} className="hover:text-rose-600">
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bölüm Arama & Dropdown */}
                    <div className="space-y-2 pt-3 border-t border-zinc-100 relative" ref={deptInputRef}>
                      <label className="text-xs font-bold text-zinc-700 block flex items-center justify-between">
                        <span>Bölüm / Program Filtresi ({selectedDepts.length} seçili)</span>
                        {selectedDepts.length > 0 && (
                          <button onClick={() => setSelectedDepts([])} className="text-[11px] text-rose-500 font-bold hover:underline">
                            Seçimleri Temizle
                          </button>
                        )}
                      </label>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            value={deptSearchInput}
                            onChange={(e) => {
                              setDeptSearchInput(e.target.value);
                              setIsDeptDropdownOpen(true);
                            }}
                            onFocus={() => setIsDeptDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCustomDepts();
                              }
                            }}
                            placeholder="Bölüm arayın veya virgülle ayırın (Örn: Bilgisayar, Tıp, Yazılım, Hukuk, Psikoloji)..."
                            className="w-full text-xs rounded-xl border border-zinc-200 px-3 py-2.5 outline-none focus:border-violet-600 font-medium"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomDepts}
                          className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition"
                        >
                          Ekle
                        </button>
                      </div>

                      {/* Dropdown Suggestions */}
                      {isDeptDropdownOpen && filteredDepts.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-30 max-h-60 overflow-y-auto p-2 divide-y divide-zinc-50">
                          <div className="space-y-1">
                            {filteredDepts.map((d) => {
                              const isSelected = selectedDepts.includes(d);
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => toggleDept(d)}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                                    isSelected ? "bg-violet-50 text-violet-700 font-bold" : "hover:bg-zinc-50 text-zinc-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`h-4 w-4 rounded border grid place-items-center ${isSelected ? "bg-violet-600 border-violet-600 text-white" : "border-zinc-300 bg-white"}`}>
                                      {isSelected && <Check size={10} />}
                                    </div>
                                    <span>{d}</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-400">Program</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Sticky Dropdown Footer */}
                          <div className="sticky bottom-0 bg-white pt-2 pb-1 px-2 border-t border-zinc-100 flex items-center justify-between mt-2">
                            <span className="text-[11px] font-bold text-zinc-500">{selectedDepts.length} bölüm seçili</span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDeptDropdownOpen(false);
                                setDeptSearchInput("");
                              }}
                              className="px-3.5 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 shadow-sm transition"
                            >
                              ✓ Tamam / Kapat
                            </button>
                          </div>
                        </div>
                      )}


                      {/* Seçili Şehir Rozetleri */}
                      {selectedCities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedCities.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-800 text-xs font-bold border border-violet-200"
                            >
                              <MapPin size={11} /> {c}
                              <button onClick={() => toggleCity(c)} className="hover:text-rose-600">
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bölüm Arama & Dropdown */}
                    <div className="space-y-2 pt-3 border-t border-zinc-100 relative" ref={deptInputRef}>
                      <label className="text-xs font-bold text-zinc-700 block flex items-center justify-between">
                        <span>Bölüm / Program Filtresi ({selectedDepts.length} seçili)</span>
                        {selectedDepts.length > 0 && (
                          <button onClick={() => setSelectedDepts([])} className="text-[11px] text-rose-500 font-bold hover:underline">
                            Seçimleri Temizle
                          </button>
                        )}
                      </label>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            value={deptSearchInput}
                            onChange={(e) => {
                              setDeptSearchInput(e.target.value);
                              setIsDeptDropdownOpen(true);
                            }}
                            onFocus={() => setIsDeptDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCustomDepts();
                              }
                            }}
                            placeholder="Bölüm arayın veya virgülle ayırın (Örn: Bilgisayar, Tıp, Yazılım, Hukuk, Psikoloji)..."
                            className="w-full text-xs rounded-xl border border-zinc-200 px-3 py-2.5 outline-none focus:border-violet-600 font-medium"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomDepts}
                          className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition"
                        >
                          Ekle
                        </button>
                      </div>

                      {/* Dropdown Suggestions */}
                      {isDeptDropdownOpen && filteredDepts.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1.5 divide-y divide-zinc-50">
                          {filteredDepts.map((d) => {
                            const isSelected = selectedDepts.includes(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  toggleDept(d);
                                  setDeptSearchInput("");
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                                  isSelected ? "bg-violet-50 text-violet-700" : "hover:bg-zinc-50 text-zinc-700"
                                }`}
                              >
                                <span>{d}</span>
                                {isSelected && <Check size={14} className="text-violet-600" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Seçili Bölüm Rozetleri */}
                      {selectedDepts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedDepts.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200"
                            >
                              <BookOpen size={11} /> {d}
                              <button onClick={() => toggleDept(d)} className="hover:text-rose-600">
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-ink disabled:opacity-30 transition"
                >
                  <ArrowLeft size={16} /> Geri
                </button>

                <button
                  onClick={next}
                  disabled={!canNext()}
                  className="flex items-center gap-2 bg-violet-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-violet-700 transition disabled:opacity-40 shadow-lg shadow-violet-600/20 text-xs"
                >
                  {step === 3 ? (
                    busy ? <Loader2 className="animate-spin" size={16} /> : <><Search size={16} /> Tercih Listesini Oluştur</>
                  ) : (
                    <>İleri <ArrowRight size={16} /></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Results View */
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Top Summary & Actions Card */}
            <Card className="p-6 bg-gradient-to-r from-violet-600/5 via-indigo-600/5 to-transparent border-violet-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Sınav & Puan Türü</div>
                    <div className="font-heading font-black text-sm text-ink">{examType} ({scoreType})</div>
                  </div>
                  {results.userRank > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400">Sıralamanız</div>
                      <div className="font-mono font-black text-base text-violet-700">
                        {results.userRank.toLocaleString("tr-TR")}
                      </div>
                    </div>
                  )}
                  {results.userScore > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400">Puanınız</div>
                      <div className="font-heading font-black text-base text-ink">{results.userScore.toFixed(2)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Eşleşen Program</div>
                    <div className="font-heading font-black text-base text-emerald-600">{displayItems.length} Bölüm</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={reset}
                    className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50"
                  >
                    Yeni Tercih Araması
                  </button>
                </div>
              </div>
            </Card>

            {/* Filter & Sort Toolbar */}
            <Card className="p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  {[
                    ["all", "Tümü"],
                    ["guaranteed", "🟢 Güvenli (%90+)"],
                    ["likely", "🟣 İdeal (%75)"],
                    ["reach", "🟡 Sürpriz (%50)"],
                    ["dream", "🔴 Hayal (%20)"],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setCategoryFilter(k)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                        categoryFilter === k
                          ? "bg-violet-600 text-white shadow-sm"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {/* Search & Sort Controls */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-60">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      value={resultSearch}
                      onChange={(e) => setResultSearch(e.target.value)}
                      placeholder="Sonuçlarda ara (virgülle ayırın)..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 outline-none focus:border-violet-600 font-medium"
                    />
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="py-1.5 px-3 text-xs rounded-xl border border-zinc-200 outline-none font-bold text-zinc-700 bg-white"
                  >
                    <option value="chance">🎯 İhtimal Sıralaması</option>
                    <option value="rank_asc">📈 Başarı Sırasına Göre</option>
                    <option value="score_desc">🏆 Taban Puana Göre</option>
                    <option value="quota_desc">👥 Kontenjana Göre</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Program List */}
            {displayItems.length === 0 ? (
              <Card className="p-12 text-center text-zinc-400 space-y-3">
                <p className="text-sm font-semibold">Aradığınız kriterlere uygun üniversite programı veya lise bulunamadı.</p>
                <button onClick={() => { setCategoryFilter("all"); setResultSearch(""); }} className="text-xs font-bold text-violet-600 hover:underline">
                  Filtreleri Temizle
                </button>
              </Card>
            ) : (
              <div className="space-y-3">
                {displayItems.map((prog, idx) => (
                  <ProgramCard
                    key={prog.id}
                    program={prog}
                    index={idx}
                    userRank={results.userRank}
                    onToggleBasket={toggleBasket}
                    isInBasket={basket.some((p) => p.id === prog.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tercih Sepeti Modal (24 Tercih Listesi) */}
      {isBasketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                <h3 className="font-heading font-black text-base text-ink">
                  ÖSYM Tercih Listem ({basket.length}/24)
                </h3>
              </div>
              <button onClick={() => setIsBasketModalOpen(false)} className="text-xs font-bold text-zinc-400 hover:text-ink">
                Kapat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-100">
              {basket.map((p, idx) => (
                <div key={p.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-violet-100 text-violet-800 font-black grid place-items-center shrink-0 text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-ink">{p.program}</div>
                      <div className="text-[11px] text-zinc-400">{p.university} · {p.city}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-violet-700">{Number(p.score_2025 || 0).toFixed(2)}</div>
                      <div className="text-[10px] text-zinc-400">{p.rank_2025 ? p.rank_2025.toLocaleString("tr-TR") : "—"}</div>
                    </div>
                    <button
                      onClick={() => toggleBasket(p)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg transition"
                      title="Listeden Çıkar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
              >
                <Printer size={14} /> Yazdır / PDF
              </button>

              <button
                onClick={() => {
                  const text = basket.map((p, i) => `${i + 1}. ${p.program} - ${p.university} (${p.city}) | Taban Sıra: ${p.rank_2025 || "-"}`).join("\n");
                  navigator.clipboard.writeText(text);
                  toast.success("Tercih listeniz panoya kopyalandı!");
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 shadow-md shadow-violet-600/20"
              >
                <Download size={14} /> Listeyi Kopyala
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
