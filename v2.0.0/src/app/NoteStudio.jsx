import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Heading1, Heading2, Heading3, Bold, Italic, List, ListOrdered,
  Image as ImageIcon, Link as LinkIcon, Upload, AlertTriangle, Lightbulb,
  Bookmark, Table, Eye, Edit3, CheckCircle2, PlayCircle, FileText,
  Sparkles, Trash2, X, Plus, ExternalLink, Maximize2, SplitSquareVertical,
} from "lucide-react";
import { uploadFile } from "@/lib/api";
import { toast } from "sonner";

export function MarkdownRenderer({ content = "", className = "" }) {
  if (!content) return <p className="text-zinc-400 italic text-sm">İçerik henüz girilmedi.</p>;

  const lines = content.split("\n");
  const rendered = [];
  let inList = false;
  let listItems = [];
  let inTable = false;
  let tableRows = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      rendered.push(
        <ul key={`list-${rendered.length}`} className="my-3 space-y-1.5 list-disc list-inside text-zinc-700 text-sm">
          {listItems.map((it, idx) => (
            <li key={idx} className="leading-relaxed">{it}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      const header = tableRows[0];
      const rows = tableRows.slice(1).filter((r) => !r.every((c) => c.includes("---") || c === ""));
      rendered.push(
        <div key={`table-${rendered.length}`} className="my-4 overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-100 text-zinc-800 font-bold">
              <tr>
                {header.map((c, i) => (
                  <th key={i} className="px-3.5 py-2.5 border-b border-zinc-200">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {rows.map((r, ri) => (
                <tr key={ri} className="hover:bg-zinc-50/70">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3.5 py-2 text-zinc-700">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      inTable = true;
      const cols = trimmed.split("|").slice(1, -1).map((c) => c.trim());
      tableRows.push(cols);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // List detection
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(trimmed.slice(2));
      continue;
    } else if (inList) {
      flushList();
    }

    if (!trimmed) {
      rendered.push(<div key={`blank-${i}`} className="h-2" />);
      continue;
    }

    // Headers
    if (trimmed.startsWith("# ")) {
      rendered.push(
        <h2 key={i} className="font-heading font-extrabold text-2xl text-ink mt-5 mb-2 pb-1 border-b border-zinc-100">
          {trimmed.slice(2)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      rendered.push(
        <h3 key={i} className="font-heading font-bold text-xl text-ink mt-4 mb-2">
          {trimmed.slice(3)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      rendered.push(
        <h4 key={i} className="font-heading font-bold text-base text-subject-matematik mt-3 mb-1">
          {trimmed.slice(4)}
        </h4>
      );
      continue;
    }

    // Callout boxes (Tip, Warning, Important, Formula)
    if (trimmed.startsWith("> [!TIP]") || trimmed.startsWith("💡 ")) {
      const text = trimmed.replace(/^> \[\!TIP\]\s*/, "").replace(/^💡\s*/, "");
      rendered.push(
        <div key={i} className="my-3 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-sm flex gap-3 items-start">
          <Lightbulb size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block text-emerald-900 mb-0.5">Önemli İpucu & Pratik Yol</span>
            {text}
          </div>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith("> [!WARNING]") || trimmed.startsWith("⚠️ ")) {
      const text = trimmed.replace(/^> \[\!WARNING\]\s*/, "").replace(/^⚠️\s*/, "");
      rendered.push(
        <div key={i} className="my-3 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-sm flex gap-3 items-start">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block text-amber-900 mb-0.5">Sık Yapılan Hata / Dikkat</span>
            {text}
          </div>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith("> [!NOTE]") || trimmed.startsWith("📌 ") || trimmed.startsWith("$$")) {
      const text = trimmed.replace(/^> \[\!NOTE\]\s*/, "").replace(/^📌\s*/, "").replace(/^\$\$\s*/, "").replace(/\$\$$/, "");
      rendered.push(
        <div key={i} className="my-3 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 text-sm flex gap-3 items-start">
          <Bookmark size={18} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-mono">
            <span className="font-bold font-sans block text-indigo-900 mb-0.5">Formül / Kural Kutusu</span>
            {text}
          </div>
        </div>
      );
      continue;
    }

    // Images: ![alt](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      rendered.push(
        <figure key={i} className="my-4 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 p-1.5 shadow-sm">
          <img src={src} alt={alt || "Ders Görseli"} className="w-full h-auto max-h-96 object-contain rounded-xl mx-auto" />
          {alt && <figcaption className="text-center text-xs text-zinc-500 py-1.5 font-medium">{alt}</figcaption>}
        </figure>
      );
      continue;
    }

    // Regular paragraphs with bold/italic parsing
    rendered.push(
      <p key={i} className="my-1.5 text-sm text-zinc-700 leading-relaxed">
        {trimmed}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className={`space-y-1 ${className}`}>{rendered}</div>;
}

export default function NoteStudio({ note, setNote, isSubmitting, onSubmit }) {
  const [activeView, setActiveView] = useState("split"); // "edit", "preview", "split"
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const insertAtCursor = (prefix, suffix = "", defaultText = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = note.content || "";
    const selected = currentVal.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    setNote((prev) => ({ ...prev, content: nextVal }));

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file);
      const url = res.url || res.path;
      // If it's an image, insert into markdown
      if (file.type.startsWith("image/")) {
        const imgMd = `\n![${file.name.split(".")[0]}](${url})\n`;
        setNote((prev) => ({
          ...prev,
          content: (prev.content || "") + imgMd,
          file_path: prev.file_path || url,
          file_name: prev.file_name || file.name,
        }));
        toast.success("Görsel yüklendi ve içeriğe eklendi!");
      } else {
        // Document (PDF etc)
        setNote((prev) => ({
          ...prev,
          file_path: url,
          file_name: file.name,
        }));
        toast.success("Doküman eklendi!");
      }
    } catch (err) {
      toast.error("Dosya yüklenirken hata oluştu: " + (err.message || "Bilinmeyen hata"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setImageModalOpen(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrl) return;
    const imgMd = `\n![${imageAlt || "Konu Anlatım Görseli"}](${imageUrl})\n`;
    setNote((prev) => ({
      ...prev,
      content: (prev.content || "") + imgMd,
    }));
    setImageUrl("");
    setImageAlt("");
    setImageModalOpen(false);
    toast.success("Görsel bağlantısı eklendi!");
  };

  return (
    <div className="space-y-4">
      {/* Üst Bar: Görünüm Modu ve Hızlı Bilgi */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900 text-white rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-xl bg-subject-matematik grid place-items-center text-white">
            <Sparkles size={16} />
          </span>
          <div>
            <div className="font-heading font-bold text-sm">Profesyonel Dizgi & Not Stüdyosu</div>
            <div className="text-[11px] text-zinc-400">ÖSYM standartlarında tipografi, formül ve görsel entegrasyonu</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveView("edit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${activeView === "edit" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-white"}`}
          >
            <Edit3 size={13} /> Editör
          </button>
          <button
            type="button"
            onClick={() => setActiveView("split")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${activeView === "split" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-white"}`}
          >
            <SplitSquareVertical size={13} /> Bölünmüş
          </button>
          <button
            type="button"
            onClick={() => setActiveView("preview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${activeView === "preview" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-white"}`}
          >
            <Eye size={13} /> Canlı Önizleme
          </button>
        </div>
      </div>

      {/* Dizgi Araç Çubuğu (Toolbar) */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-100 border border-zinc-200 rounded-2xl">
        {/* Başlıklar */}
        <button
          type="button"
          onClick={() => insertAtCursor("\n## ", "\n", "Ana Başlık")}
          title="Ana Başlık (H2)"
          className="p-2 rounded-xl text-zinc-700 hover:bg-white hover:shadow-sm font-bold text-xs flex items-center gap-1"
        >
          <Heading1 size={15} /> Başlık
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor("\n### ", "\n", "Alt Başlık")}
          title="Alt Başlık (H3)"
          className="p-2 rounded-xl text-zinc-700 hover:bg-white hover:shadow-sm font-bold text-xs flex items-center gap-1"
        >
          <Heading2 size={15} /> Alt Başlık
        </button>

        <div className="h-5 w-px bg-zinc-300 mx-1" />

        {/* Metin Formatlama */}
        <button
          type="button"
          onClick={() => insertAtCursor("**", "**", "kalın metin")}
          title="Kalın"
          className="p-2 rounded-xl text-zinc-700 hover:bg-white hover:shadow-sm font-bold text-xs"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor("*", "*", "italik metin")}
          title="İtalik"
          className="p-2 rounded-xl text-zinc-700 hover:bg-white hover:shadow-sm font-bold text-xs"
        >
          <Italic size={15} />
        </button>

        <div className="h-5 w-px bg-zinc-300 mx-1" />

        {/* Listeler */}
        <button
          type="button"
          onClick={() => insertAtCursor("\n- ", "\n", "Madde")}
          title="Madde İşaretli Liste"
          className="p-2 rounded-xl text-zinc-700 hover:bg-white hover:shadow-sm text-xs"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor("\n| Özellik | TYT | AYT |\n|---|---|---|\n| Değer 1 | A | B |\n", "")}
          title="Karşılaştırma Tablosu"
          className="p-2 rounded-xl text-zinc-700 hover:bg-white hover:shadow-sm font-bold text-xs flex items-center gap-1"
        >
          <Table size={15} /> Tablo
        </button>

        <div className="h-5 w-px bg-zinc-300 mx-1" />

        {/* Özel Kutular */}
        <button
          type="button"
          onClick={() => insertAtCursor("\n> [!TIP] ", "\n", "Bu soru kalıbında önce türev alıp kökleri bulun.")}
          title="Önemli İpucu Kutusu"
          className="px-2.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold text-xs flex items-center gap-1"
        >
          <Lightbulb size={13} /> İpucu
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor("\n> [!WARNING] ", "\n", "Paydayı sıfır yapan değerleri tanım kümesinden çıkarmayı unutmayın!")}
          title="Dikkat / Uyarı Kutusu"
          className="px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 font-bold text-xs flex items-center gap-1"
        >
          <AlertTriangle size={13} /> Dikkat
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor("\n> [!NOTE] ", "\n", "sin²(x) + cos²(x) = 1")}
          title="Formül Kutusu"
          className="px-2.5 py-1.5 rounded-xl bg-indigo-100 text-indigo-800 hover:bg-indigo-200 font-bold text-xs flex items-center gap-1"
        >
          <Bookmark size={13} /> Formül
        </button>

        <div className="h-5 w-px bg-zinc-300 mx-1" />

        {/* Görsel Ekle Butonu */}
        <button
          type="button"
          onClick={() => setImageModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-ink text-white hover:bg-subject-matematik font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
        >
          <ImageIcon size={14} /> Görsel Ekle (Link / Dosya)
        </button>
      </div>

      {/* Editör & Önizleme Bölgesi */}
      <div className={`grid gap-4 ${activeView === "split" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Sol / Editör Paneli */}
        {(activeView === "edit" || activeView === "split") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 px-1">
              <span>Dizgi Metni (Markdown & Formül Destekli)</span>
              <span>{(note.content || "").length} karakter</span>
            </div>
            <textarea
              ref={textareaRef}
              rows={16}
              value={note.content}
              onChange={(e) => setNote((s) => ({ ...s, content: e.target.value }))}
              placeholder={`# Konu Başlığı\n\n## 1. Giriş ve Temel Kavramlar\nBuraya konu anlatımı açıklamasını yazabilirsiniz...\n\n> [!TIP] Önemli ipucu kutusu buraya yazılır.\n\n> [!NOTE] Formül: E = m * c^2\n\n![Açıklama](/uploads/gorsel.png)`}
              className="w-full p-4 rounded-2xl border border-zinc-300 bg-white font-mono text-sm leading-relaxed outline-none focus:border-subject-matematik focus:ring-4 focus:ring-subject-matematik/10 transition shadow-inner resize-y"
            />
          </div>
        )}

        {/* Sağ / Canlı Önizleme Paneli */}
        {(activeView === "preview" || activeView === "split") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 px-1">
              <span>Canlı Kitap Dizgisi Önizlemesi</span>
              <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Kusursuz Dizgi</span>
            </div>
            <div className="p-6 rounded-2xl border border-zinc-200 bg-paper shadow-sm min-h-[380px] max-h-[500px] overflow-y-auto">
              <h2 className="font-heading font-extrabold text-2xl text-ink mb-1">{note.title || "Ders Notu Başlığı"}</h2>
              {note.description && <p className="text-sm text-zinc-500 italic mb-4">{note.description}</p>}

              {/* Ek Video / Dosya Önizlemeleri */}
              {note.video_url && (
                <div className="my-4 rounded-xl overflow-hidden border border-zinc-200 bg-black aspect-video flex items-center justify-center text-white text-xs">
                  <PlayCircle size={32} className="text-rose-500" />
                  <span className="ml-2 font-bold">Video: {note.video_url}</span>
                </div>
              )}

              {note.file_path && (
                <div className="my-3 p-3 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center gap-2 text-xs font-bold text-zinc-700">
                  <FileText size={16} className="text-subject-matematik" />
                  <span>Ek Doküman: {note.file_name || note.file_path}</span>
                </div>
              )}

              <MarkdownRenderer content={note.content} />
            </div>
          </div>
        )}
      </div>

      {/* Görsel Ekleme Modalı (Hem Dosya Hem Link) */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-subject-matematik/10 text-subject-matematik grid place-items-center">
                  <ImageIcon size={18} />
                </span>
                <h3 className="font-heading font-bold text-base text-ink">Ders Notuna Görsel Ekle</h3>
              </div>
              <button onClick={() => setImageModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>

            {/* Seçenek 1: Bilgisayardan Dosya Yükle */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-dashed border-zinc-300 text-center space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-bold text-ink shadow-sm hover:border-subject-matematik hover:text-subject-matematik transition ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Upload size={16} />
                {uploading ? "Yükleniyor..." : "Bilgisayardan Görsel / PDF Seç"}
              </label>
              <p className="text-[11px] text-zinc-400">PNG, JPG, WEBP veya PDF formatları desteklenir.</p>
            </div>

            {/* Ayırıcı */}
            <div className="flex items-center gap-3 text-xs font-bold text-zinc-400">
              <div className="h-px bg-zinc-200 flex-1" />
              <span>VEYA BAĞLANTI GİRİN</span>
              <div className="h-px bg-zinc-200 flex-1" />
            </div>

            {/* Seçenek 2: Web Linki ile Ekle */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">Görsel URL Adresi</label>
                <input
                  type="url"
                  placeholder="https://example.com/resim.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-subject-matematik"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-600 mb-1">Görsel Başlığı / Alt Açıklama (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Şekil 1: Hücre Bölünmesi Aşamaları"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none focus:border-subject-matematik"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImageModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-500 hover:bg-zinc-100"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!imageUrl}
                  className="px-5 py-2 rounded-xl bg-ink text-white text-sm font-bold hover:bg-subject-matematik disabled:opacity-50 transition"
                >
                  Bağlantıyı Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
