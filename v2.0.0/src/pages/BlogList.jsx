import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Filter, ArrowRight, ArrowLeft, Sparkles, BookOpen, Clock, Calendar, Eye } from "lucide-react";
import { PageHeader, Card, Spinner, Empty, EASE } from "@/app/ui";

const CATEGORIES = ["Tümü", "Gündem", "Sınav Rehberi", "Eğitim", "Haberler"];

export default function BlogList() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState("Tümü");
  const [searchQuery, setSearchQuery] = useState("");
  const apiUrl = import.meta.env.VITE_API_URL || "/api";

  useEffect(() => {
    setLoading(true);
    const catParam = selectedCat !== "Tümü" ? `&category=${encodeURIComponent(selectedCat)}` : "";
    fetch(`${apiUrl}/blog?limit=100${catParam}`)
      .then((res) => res.json())
      .then((data) => setBlogs(data || []))
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false));
  }, [selectedCat, apiUrl]);

  const filteredBlogs = blogs.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Blog Header & Hero Banner */}
      <div className="bg-ink text-white py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 space-y-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Anasayfa'ya Dön
          </Link>
          <div className="space-y-2">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={14} /> HedefMatik Rehber & Gündem
            </span>
            <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tight leading-none">
              Sınav Gündemi & Başarı Portalı
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
              YKS, KPSS, MEB gelişmeleri, yapay zeka çalışma teknikleri ve rehber içeriklerle sınav maratonuna akıllıca hazırlanın.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 mt-10 space-y-6">
        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm">
          {/* Categories Tab */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1.5 md:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                  selectedCat === cat
                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                    : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[280px]">
            <Search size={16} className="absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Yazı ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold outline-none focus:border-violet-600 transition"
            />
          </div>
        </div>

        {/* Blog Post List Grid */}
        {loading ? (
          <div className="py-20"><Spinner /></div>
        ) : filteredBlogs.length === 0 ? (
          <Empty text="Aradığınız kriterlere uygun blog yazısı bulunamadı." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, ease: EASE }}
              >
                <Link
                  to={`/blog/${b.slug}`}
                  className="group flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
                >
                  <div className="relative overflow-hidden aspect-video bg-zinc-100">
                    <img
                      src={b.image_url || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop"}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 px-3 py-1 bg-violet-600 text-white font-bold text-[10px] rounded-full uppercase tracking-wider shadow-sm">
                      {b.category}
                    </span>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {b.created_at?.split("T")[0]}</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {b.views || 0} okuma</span>
                      </div>
                      <h3 className="font-heading font-bold text-lg text-ink group-hover:text-violet-600 transition-colors line-clamp-2 leading-snug">
                        {b.title}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                        {b.summary}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-ink group-hover:text-violet-600 transition-colors pt-2">
                      Yazıyı Oku <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
