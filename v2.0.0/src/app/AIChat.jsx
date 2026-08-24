import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Send, Plus, MessageSquare, Trash2, Loader2, Sparkles, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchChatConversations, createChatConversation, fetchChatMessages, sendChatMessage, deleteChatConversation } from "@/lib/api";
import { PageHeader, Card, Spinner, EASE } from "@/app/ui";
import { toast } from "sonner";

export default function AIChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const msgEndRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchChatConversations(user.id).then(setConversations).catch(() => setConversations([]));
  }, [user?.id]);

  useEffect(() => {
    if (!activeConv) return;
    fetchChatMessages(activeConv.id).then(setMessages).catch(() => setMessages([]));
  }, [activeConv]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const newConversation = async () => {
    try {
      const conv = await createChatConversation(user.id, "Yeni Sohbet");
      setConversations((c) => [conv, ...(c || [])]);
      setActiveConv(conv);
      setMessages([]);
      setShowSidebar(false);
    } catch { toast.error("Sohbet oluşturulamadı."); }
  };

  const send = async () => {
    if (!input.trim() || !activeConv) return;
    const content = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content, id: Date.now() }]);
    setSending(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const reply = await sendChatMessage(activeConv.id, user.id, content, history);
      setMessages((m) => [...m, { role: "assistant", content: reply, id: Date.now() + 1 }]);
      setConversations((c) => (c || []).map((conv) => conv.id === activeConv.id ? { ...conv, updated_at: new Date().toISOString() } : conv));
    } catch {
      toast.error("AI yanıt veremedi.");
    } finally { setSending(false); }
  };

  const removeConv = async (convId) => {
    try {
      await deleteChatConversation(convId);
      setConversations((c) => (c || []).filter((c) => c.id !== convId));
      if (activeConv?.id === convId) { setActiveConv(null); setMessages([]); }
    } catch { toast.error("Sohbet silinemedi."); }
  };

  if (conversations === null) return <Spinner />;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="font-editorial italic text-subject-ai mb-1">— ai sohbet koçu</div>
          <h1 className="font-heading font-extrabold tracking-tighter text-3xl">AI Sohbet</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSidebar(true)} className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 text-sm font-medium">
            <MessageSquare size={15} /> Sohbetler
          </button>
          <button onClick={newConversation} className="flex items-center gap-2 bg-subject-ai text-white font-semibold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity">
            <Plus size={16} /> Yeni Sohbet
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar - desktop */}
        <div className="hidden lg:flex flex-col w-64 shrink-0">
          <Card className="p-3 flex-1 overflow-auto">
            <div className="space-y-1">
              {(conversations || []).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors ${activeConv?.id === conv.id ? "bg-subject-ai/10 text-subject-ai font-medium" : "text-zinc-600 hover:bg-black/5"}`}
                >
                  <MessageSquare size={15} className="shrink-0" />
                  <span className="truncate flex-1">{conv.title}</span>
                </button>
              ))}
              {conversations.length === 0 && <p className="text-xs text-zinc-400 px-3 py-2">Henüz sohbet yok.</p>}
            </div>
          </Card>
        </div>

        {/* Sidebar - mobile drawer */}
        {showSidebar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowSidebar(false)}>
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.28 }} onClick={(e) => e.stopPropagation()} className="absolute left-0 top-0 bottom-0 w-72 bg-white p-4 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="font-heading font-bold">Sohbetler</span>
                <button onClick={() => setShowSidebar(false)}><X size={20} className="text-zinc-400" /></button>
              </div>
              <div className="space-y-1">
                {(conversations || []).map((conv) => (
                  <div key={conv.id} className="flex items-center gap-1">
                    <button onClick={() => { setActiveConv(conv); setShowSidebar(false); }} className={`flex-1 text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${activeConv?.id === conv.id ? "bg-subject-ai/10 text-subject-ai" : "text-zinc-600"}`}>
                      <MessageSquare size={15} /> <span className="truncate">{conv.title}</span>
                    </button>
                    <button onClick={() => removeConv(conv.id)} className="p-2 text-zinc-300 hover:text-subject-turkce"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Chat area */}
        <Card className="flex-1 flex flex-col min-h-0">
          {!activeConv ? (
            <div className="flex-1 grid place-items-center p-8 text-center">
              <div>
                <span className="h-16 w-16 rounded-2xl bg-subject-ai/15 grid place-items-center mx-auto mb-4">
                  <Brain size={28} className="text-subject-ai" />
                </span>
                <h3 className="font-heading font-bold text-xl mb-2">AI Sohbet Koçu</h3>
                <p className="text-zinc-500 max-w-sm mx-auto">Sınav hazırlığınla ilgili her türlü soruyu sorabilirsin. Matematik problemleri, konu anlatımı, çalışma planı ve daha fazlası.</p>
                <button onClick={newConversation} className="mt-6 inline-flex items-center gap-2 bg-subject-ai text-white font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
                  <Sparkles size={16} /> Sohbet Başlat
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-zinc-400 text-sm mb-4">Sorunu yaz, AI koçun yanıt versin.</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {["Matematik konusunda yardım", "Çalışma planı oluştur", "Paragraf sorusu çöz"].map((s) => (
                        <button key={s} onClick={() => setInput(s)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-subject-ai/10 hover:text-subject-ai transition-colors">{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <span className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${m.role === "user" ? "bg-ink text-white" : "bg-subject-ai/15 text-subject-ai"}`}>
                      {m.role === "user" ? (user?.name || "U").charAt(0).toUpperCase() : <Brain size={16} />}
                    </span>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "bg-ink text-white" : "bg-zinc-50 text-zinc-700"}`}>
                      {m.content.split("\n").map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </motion.div>
                ))}
                {sending && (
                  <div className="flex gap-3">
                    <span className="h-8 w-8 rounded-lg bg-subject-ai/15 grid place-items-center shrink-0"><Loader2 size={16} className="text-subject-ai animate-spin" /></span>
                    <div className="rounded-2xl px-4 py-3 bg-zinc-50 text-zinc-400 text-sm">Yazıyor...</div>
                  </div>
                )}
                <div ref={msgEndRef} />
              </div>

              <div className="border-t border-zinc-200 p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Sorunu yaz..."
                    className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:border-subject-ai transition"
                  />
                  <button onClick={send} disabled={!input.trim() || sending} className="h-11 w-11 rounded-xl bg-subject-ai text-white grid place-items-center disabled:opacity-40 hover:opacity-90 transition-opacity">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
