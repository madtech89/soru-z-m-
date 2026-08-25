import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Eye, Share2, Sparkles, BookOpen, User, Copy, Check } from "lucide-react";
import { Card, Spinner, Empty, EASE } from "@/app/ui";
import { MarkdownRenderer } from "@/app/NoteStudio";
import { toast } from "sonner";

export default function BlogDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001/api";

  useEffect(() => {
    setLoading(true);
    fetch(`${apiUrl}/blog/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setPost(data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug, apiUrl]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Yazı linki panoya kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 grid place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 space-y-4">
        <Empty text="Aradığınız blog yazısı bulunamadı." />
        <Link to="/blog" className="px-5 py-2.5 bg-violet-600 text-white font-bold rounded-xl text-xs">
          Tüm Yazılara Dön
        </Link>
      </div>
    );
  }

  // Calculate read time (avg 200 words per minute)
  const wordCount = post.content ? post.content.split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.round(wordCount / 180));

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Article Hero Header */}
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-8 space-y-6">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-ink font-bold transition-colors">
          <ArrowLeft size={14} /> Blog Listesine Dön
        </Link>

        <div className="space-y-4">
          <span className="inline-block px-3 py-1 bg-violet-100 text-violet-700 font-bold text-[10px] rounded-full uppercase tracking-wider">
            {post.category}
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-ink leading-tight tracking-tight">
            {post.title}
          </h1>

          {/* Meta Info bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 border-b border-zinc-200 pb-5">
            <div className="flex items-center gap-1.5 font-medium">
              <User size={14} className="text-zinc-400" />
              <span>Yazar: <strong>{post.author || "HedefMatik AI"}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar size={14} className="text-zinc-400" />
              <span>{post.created_at?.split("T")[0]}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Eye size={14} className="text-zinc-400" />
              <span>{post.views || 0} okuma</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <BookOpen size={14} className="text-zinc-400" />
              <span>{readTime} dk okuma süresi</span>
            </div>
            <button
              onClick={handleShare}
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-[11px] font-bold text-zinc-600 transition"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              {copied ? "Kopyalandı!" : "Paylaş"}
            </button>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      <div className="max-w-4xl mx-auto px-5 sm:px-8 mt-6">
        <div className="rounded-3xl overflow-hidden shadow-sm aspect-video max-h-[420px] bg-zinc-100">
          <img
            src={post.image_url || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop"}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Article Content Layout */}
      <div className="max-w-4xl mx-auto px-5 sm:px-8 mt-8 grid md:grid-cols-12 gap-8 items-start">
        {/* Left content block */}
        <div className="md:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
          {post.summary && (
            <p className="text-sm font-semibold text-zinc-500 italic border-l-4 border-violet-500 pl-4 py-1 leading-relaxed">
              {post.summary}
            </p>
          )}

          {/* Actual Markdown Body */}
          <div className="prose prose-zinc max-w-none text-zinc-700 leading-relaxed text-sm sm:text-base">
            <MarkdownRenderer content={post.content} />
          </div>
        </div>

        {/* Right sidebar block (Call-To-Action conversion widget) */}
        <div className="md:col-span-4 sticky top-6 space-y-4">
          <Card className="p-6 bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950 text-white rounded-3xl border border-white/5 space-y-4 text-center">
            <span className="h-12 w-12 rounded-2xl bg-violet-600 text-white grid place-items-center mx-auto shadow-lg shadow-violet-500/20">
              <Sparkles size={22} className="animate-pulse" />
            </span>
            <div className="space-y-1">
              <h4 className="font-heading font-black text-base">Sınava Yapay Zekayla Hazırlan!</h4>
              <p className="text-xs text-zinc-400">
                HedefMatik AI, hatalarını analiz eder, sana özel çalışma planı sunar ve eksiklerini kapatır.
              </p>
            </div>
            <Link
              to="/register"
              className="block w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 font-heading font-extrabold text-xs text-white shadow-md shadow-violet-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Ücretsiz Üye Ol & Dene →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
