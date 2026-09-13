import React, { useState, useEffect, useRef } from "react";
import { X, Send, MessageCircle, Loader2, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

const ROOM = "help-support";
// Admin support number — used only for the "send via WhatsApp" deep link.
// The number itself is never shown to the user in the UI.
const ADMIN_WA = "923023538711";

export default function WhatsAppHelpChat({ open, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let unsub = () => {};
    setLoading(true);
    (async () => {
      try {
        const list = await base44.entities.ChatMessage.filter({ room: ROOM }, "created_date", 200);
        setMessages(list || []);
      } catch {}
      setLoading(false);
      unsub = base44.entities.ChatMessage.subscribe((event) => {
        if (!event.data || event.data.room !== ROOM) return;
        setMessages((prev) => {
          if (event.type === "delete") return prev.filter((m) => m.id !== event.data.id);
          const idx = prev.findIndex((m) => m.id === event.data.id);
          if (idx >= 0) { const n = [...prev]; n[idx] = event.data; return n; }
          return [...prev, event.data];
        });
      });
    })();
    return () => unsub();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        text: t,
        sender_id: user?.id || "",
        sender_name: user?.full_name || user?.email || "صارف",
        room: ROOM,
      });
      setText("");
    } catch {
      toast.error("پیغام نہیں بھیجا");
    }
    setSending(false);
  };

  if (!open) return null;

  const waLink = `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent("السلام علیکم، مجھے E-canal Map app کی مدد چاہیے۔")}`;

  return (
    <div className="fixed inset-0 z-[1300] flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col h-[80vh] sm:h-[600px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 bg-emerald-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <div>
              <p className="text-sm font-bold">مدد — ایڈمن سے رابطہ</p>
              <p className="text-[10px] text-emerald-100">ایپ کے اندر چیٹ — نمبر ظاہر نہیں ہوتا</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/20"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
          <p className="text-[10px] text-emerald-700">اپنا سوال لکھیں — ایڈمن جواب دے گا</p>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900">
            <Phone className="w-3 h-3" /> WhatsApp پر بھیجیں
          </a>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2 bg-slate-50">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">ابھی کوئی پیغام نہیں۔ اپنا سوال لکھیں۔</p>
          ) : messages.map((m) => {
            const mine = m.sender_id === user?.id || (user && m.created_by_id === user.id);
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>
                  {!mine && <p className="text-[9px] font-bold text-emerald-600 mb-0.5">{m.sender_name}</p>}
                  <p className="text-xs whitespace-pre-wrap">{m.text}</p>
                  <p className={`text-[8px] mt-0.5 ${mine ? "text-emerald-100" : "text-slate-400"}`}>{new Date(m.created_date).toLocaleTimeString("ur-PK", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="p-2 border-t border-slate-200 flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="اپنا سوال یہاں لکھیں..." dir="rtl"
            className="flex-1 h-10 rounded-full border border-slate-300 px-4 text-sm focus:outline-none focus:border-emerald-500" />
          <button onClick={send} disabled={sending || !text.trim()} className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}