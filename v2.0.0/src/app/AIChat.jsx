import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Send, Plus, MessageSquare, Trash2, Loader2,
  Sparkles, X, Zap, Clock, ChevronRight, AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchChatConversations, createChatConversation,
  fetchChatMessages, sendChatMessage, deleteChatConversation,
  fetchCreditBalance,
} from "@/lib/api";
import { Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

/** Minimal markdown renderer: **bold**, *italic*, code blocks */
function renderContent(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    // Code block (single backtick)
    const parts = line.split(/(`[^`]+`)/g);
    return (
      <p key={i} className={line === "" ? "h-2" : "leading-relaxed"}>
        {parts.map((part, j) =>
          part.startsWith("`") && part.endsWith("`") ? (
            <code key={j} className="bg-zinc-200 text-zinc-800 rounded px-1 py-0.5 text-[13px] font-mono">
              {part.slice(1, -1)}
            </code>
          ) : (
            <span key={j} dangerouslySetInnerHTML={{
              __html: part
                .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                .replace(/\*([^*]+)\*/g, "<em>$1</em>")
            }} />
          )
        )}
      </p>
    );
  });
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Bugün";
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

// Group conversations by date
function groupConvsByDate(convs) {
  const groups = {};
  (convs || []).forEach(c => {
    const label = formatDate(c.updated_at || c.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(c);
  });
  return groups;
}

const QUICK_STARTERS = [
  "Türev konusunu adım adım anlat",
  "Paragraf çözme tekniklerini göster",
  "KPSS için çalışma planı yap",
  "Permütasyon formülleri nelerdir?",
  "Osmanlı'nın kuruluşunu özetle",
];

export default function AIChat() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [conversations, setConversations] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [credits, setCredits] = useState(null);
  const [noCreditsModal, setNoCreditsModal] = useState(false);
  const msgEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversations
  useEffect(() => {
    if (!user?.id) return;
    fetchChatConversations(user.id)
      .then(convs => {
        setConversations(convs);
        // Auto-select most recent
        if (convs?.length > 0 && !activeConv) {
          setActiveConv(convs[0]);
        }
      })
      .catch(() => setConversations([]));
  }, [user?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConv) return;
    fetchChatMessages(activeConv.id)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [activeConv?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Load credit balance
  const refreshCredits = useCallback(() => {
    if (!user) return;
    fetchCreditBalance().then(r => setCredits(r.balance)).catch(() => {});
  }, [user]);
  useEffect(() => { refreshCredits(); }, [refreshCredits]);

  const newConversation = async () => {
    try {
      const conv = await createChatConversation(user.id, "Yeni Sohbet");
      setConversations(c => [conv, ...(c || [])]);
      setActiveConv(conv);
      setMessages([]);
      setShowSidebar(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch { toast.error("Sohbet oluşturulamadı."); }
  };

  const send = async (textOverride) => {
    const content = (textOverride || input).trim();
    if (!content || !activeConv || sending) return;

    // Check credits
    if (credits !== null && credits < 1) {
      setNoCreditsModal(true);
      return;
    }

    setInput("");
    const tempId = `tmp-${Date.now()}`;
    setMessages(m => [...m, { role: "user", content, id: tempId, created_at: new Date().toISOString() }]);
    setSending(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const reply = await sendChatMessage(activeConv.id, user.id, content, history);
      const replyText = typeof reply === "string" ? reply : reply?.content || "";
      setMessages(m => [...m, { role: "assistant", content: replyText, id: `ai-${Date.now()}`, created_at: new Date().toISOString() }]);
      // Update convo in sidebar
      setConversations(c => (c || []).map(conv =>
        conv.id === activeConv.id
          ? { ...conv, title: conv.title === "Yeni Sohbet" ? content.slice(0, 40) : conv.title, updated_at: new Date().toISOString() }
          : conv
      ));
      // Refresh credits
      setCredits(prev => prev !== null ? Math.max(0, prev - 1) : null);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 402) {
        setNoCreditsModal(true);
        setMessages(m => m.filter(msg => msg.id !== tempId));
      } else {
        toast.error("AI yanıt veremedi, tekrar deneyin.");
      }
    } finally { setSending(false); }
  };

  const removeConv = async (convId, e) => {
    e.stopPropagation();
    try {
      await deleteChatConversation(convId);
      setConversations(c => (c || []).filter(c => c.id !== convId));
      if (activeConv?.id === convId) { setActiveConv(null); setMessages([]); }
    } catch { toast.error("Sohbet silinemedi."); }
  };

  if (conversations === null) return <Spinner />;

  const convGroups = groupConvsByDate(conversations);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="font-heading font-bold text-sm text-zinc-700">Sohbet Geçmişi</span>
        <button onClick={newConversation} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors">
          <Plus size={13} /> Yeni
        </button>
      </div>
      <div className="flex-1 overflow-auto space-y-4 pr-1">
        {Object.entries(convGroups).map(([dateLabel, convs]) => (
          <div key={dateLabel}>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1 mb-1">{dateLabel}</div>
            <div className="space-y-0.5">
              {convs.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => { setActiveConv(conv); setShowSidebar(false); }}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-colors ${activeConv?.id === conv.id ? "bg-violet-600/10 text-violet-700" : "text-zinc-600 hover:bg-zinc-100"}`}
                >
                  <MessageSquare size={13} className="shrink-0" />
                  <span className="truncate flex-1 text-sm">{conv.title}</span>
                  <button
                    onClick={(e) => removeConv(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="text-xs text-zinc-400 px-1">Henüz sohbet yok.</p>
        )}
      </div>
      {/* Credit info */}
      {credits !== null && (
        <div className={`mt-4 px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between ${credits <= 15 ? "bg-red-50 text-red-700" : "bg-zinc-50 text-zinc-600"}`}>
          <span className="flex items-center gap-1.5"><Zap size={12} /> {credits} kredi kaldı</span>
          <Link to="/app/kredi-al" className="underline font-bold">Yükle</Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-[calc(100vh-3.5rem)] -mt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-100 grid place-items-center">
            <Brain size={20} className="text-violet-600" />
          </div>
          <div>
            <div className="font-heading font-bold text-lg leading-none">AI Sohbet</div>
            <div className="text-xs text-zinc-400 mt-0.5">Sınav koçun her zaman burada</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {credits !== null && (
            <Link to="/app/kredi-al" className={`hidden md:flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full border transition-colors ${credits <= 15 ? "bg-red-50 text-red-600 border-red-200" : "bg-violet-50 text-violet-700 border-violet-200"}`}>
              <Zap size={12} /> {credits}
            </Link>
          )}
          <button onClick={() => setShowSidebar(true)} className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 text-sm font-medium">
            <MessageSquare size={15} /> Sohbetler
          </button>
          <button onClick={newConversation} className="flex items-center gap-1.5 bg-violet-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-violet-700 transition-colors text-sm">
            <Plus size={15} /> Yeni Sohbet
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-60 shrink-0">
          <Card className="p-3 h-full">
            <SidebarContent />
          </Card>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/40"
              onClick={() => setShowSidebar(false)}
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.25 }}
                onClick={e => e.stopPropagation()}
                className="absolute left-0 top-0 bottom-0 w-72 bg-white p-4 shadow-2xl"
              >
                <button onClick={() => setShowSidebar(false)} className="absolute top-3 right-3 p-1 text-zinc-400">
                  <X size={20} />
                </button>
                <SidebarContent />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {!activeConv ? (
            /* Welcome Screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-violet-100 grid place-items-center mb-4">
                <Sparkles size={28} className="text-violet-600" />
              </div>
              <h2 className="font-heading font-bold text-2xl mb-2">AI Sohbet Koçu</h2>
              <p className="text-zinc-500 max-w-sm mb-6 text-sm">Matematik problemleri, konu anlatımı, çalışma planı — her konuda yardım al. Her mesaj 1 kredi.</p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {QUICK_STARTERS.map(s => (
                  <button
                    key={s}
                    onClick={async () => { const c = await createChatConversation(user.id, s.slice(0,40)); setConversations(prev => [c, ...(prev||[])]); setActiveConv(c); setMessages([]); setTimeout(() => send(s), 300); }}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-violet-50 hover:text-violet-700 transition-colors flex items-center gap-1"
                  >
                    {s} <ChevronRight size={11} />
                  </button>
                ))}
              </div>
              <button onClick={newConversation} className="inline-flex items-center gap-2 bg-violet-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-violet-700 transition-colors">
                <Plus size={16} /> Sohbet Başlat
              </button>
            </div>
          ) : (
            <>
              {/* Conversation Title Bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100">
                <MessageSquare size={14} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-700 flex-1 truncate">{activeConv.title}</span>
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <Clock size={11} />
                  {formatDate(activeConv.updated_at || activeConv.created_at)}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-zinc-400 text-sm mb-4">Sorunu yaz, AI koçun yanıt versin.</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {QUICK_STARTERS.slice(0, 3).map(s => (
                        <button key={s} onClick={() => send(s)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <span className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 text-xs font-bold ${m.role === "user" ? "bg-zinc-800 text-white" : "bg-violet-100 text-violet-700"}`}>
                      {m.role === "user" ? (user?.name || "U").charAt(0).toUpperCase() : <Brain size={16} />}
                    </span>
                    <div className="max-w-[78%]">
                      <div className={`rounded-2xl px-4 py-3 text-[14px] space-y-1 ${m.role === "user" ? "bg-zinc-800 text-white rounded-tr-sm" : "bg-zinc-50 border border-zinc-100 text-zinc-800 rounded-tl-sm"}`}>
                        {renderContent(m.content)}
                      </div>
                      <div className={`text-[10px] text-zinc-400 mt-1 ${m.role === "user" ? "text-right" : "text-left"}`}>
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {sending && (
                  <div className="flex gap-3">
                    <span className="h-8 w-8 rounded-xl bg-violet-100 grid place-items-center shrink-0">
                      <Loader2 size={15} className="text-violet-600 animate-spin" />
                    </span>
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-zinc-50 border border-zinc-100">
                      <div className="flex gap-1 items-center h-5">
                        {[0, 1, 2].map(i => (
                          <motion.span key={i} animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={msgEndRef} />
              </div>

              {/* Input Bar */}
              <div className="border-t border-zinc-100 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Sorunuzu yazın... (Enter = gönder, Shift+Enter = yeni satır)"
                    rows={1}
                    className="flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white transition overflow-hidden"
                    style={{ maxHeight: "120px" }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || sending}
                    className="h-11 w-11 shrink-0 rounded-xl bg-violet-600 text-white grid place-items-center disabled:opacity-40 hover:bg-violet-700 transition-colors"
                  >
                    <Send size={17} />
                  </button>
                </div>
                {credits !== null && credits <= 15 && credits > 0 && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1 mt-1.5 px-1">
                    <AlertCircle size={11} /> {credits} krediniz kaldı. <Link to="/app/kredi-al" className="underline font-bold">Hemen yükle</Link>
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* No Credits Modal */}
      <AnimatePresence>
        {noCreditsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
            onClick={() => setNoCreditsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="h-16 w-16 rounded-2xl bg-violet-100 grid place-items-center mx-auto mb-4">
                <Zap size={32} className="text-violet-600" />
              </div>
              <h3 className="font-heading font-bold text-xl mb-2">Krediniz Tükendi!</h3>
              <p className="text-zinc-500 text-sm mb-6">
                AI Sohbet Koçu kullanmak için en az <strong>1 krediniz</strong> olmalı.
                Soru bankası ve denemeler sonsuza dek ücretsiz!
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setNoCreditsModal(false); nav("/app/kredi-al"); }}
                  className="w-full py-3 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Zap size={18} /> Kredi Satın Al
                </button>
                <button
                  onClick={() => setNoCreditsModal(false)}
                  className="w-full py-2.5 rounded-2xl bg-zinc-100 text-zinc-600 font-medium hover:bg-zinc-200 transition-colors text-sm"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
