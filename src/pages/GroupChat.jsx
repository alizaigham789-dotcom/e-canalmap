import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessagesSquare, Send, Users, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import ModuleShell from "@/components/ModuleShell";

const ROLES = ["Canal Patwaris", "Zilladars", "Deputy Collectors", "Irrigation Officers", "Department Staff"];
const ROOM = "main";

function timeLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function GroupChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const listEndRef = useRef(null);
  const listRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  // Load recent messages, then subscribe to new ones in realtime
  useEffect(() => {
    let unsub = null;
    (async () => {
      try {
        const list = await base44.entities.ChatMessage.filter({ room: ROOM }, "-created_date", 200);
        setMessages(list.reverse());
      } catch (e) {
        console.warn("chat load failed", e);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
      // Realtime: any new message in this room appears instantly for everyone
      unsub = base44.entities.ChatMessage.subscribe((event) => {
        if (event.type === "create") {
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.data.id)) return prev;
            return [...prev, event.data];
          });
          scrollToBottom();
        } else if (event.type === "delete") {
          setMessages((prev) => prev.filter((m) => m.id !== event.data.id));
        } else if (event.type === "update") {
          setMessages((prev) => prev.map((m) => (m.id === event.data.id ? event.data : m)));
        }
      });
    })();
    return () => { if (unsub) unsub(); };
  }, [scrollToBottom]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await base44.entities.ChatMessage.create({
        text,
        sender_name: user?.full_name || user?.email || "You",
        sender_id: user?.id || "",
        room: ROOM,
      });
    } catch (e) {
      // Restore draft so the user can retry
      setDraft(text);
      console.warn("chat send failed", e);
    }
  };

  const isSelf = (m) => (user && m.sender_id === user.id) || (user && m.created_by_id === user.id);

  return (
    <ModuleShell title="GROUP CHAT" titleUrdu="گروپ چیٹ" Icon={MessagesSquare} gradient="from-violet-400 to-purple-300">
      <div className="flex items-center gap-2 mb-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
        <Users className="w-4 h-4 text-violet-500" strokeWidth={2.2} />
        <p className="text-[11px] text-slate-500 truncate flex-1">{ROLES.join(" · ")}</p>
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
        </span>
      </div>

      {/* Message list — WhatsApp style */}
      <div
        ref={listRef}
        className="flex-1 min-h-[40vh] overflow-y-auto touch-scroll rounded-2xl bg-slate-50 ring-1 ring-slate-200/60 p-3 space-y-2 mb-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-center">
            <MessagesSquare className="w-6 h-6 mb-1.5 opacity-50" />
            <p className="text-xs">No messages yet — be the first to say hello!</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = isSelf(m);
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm ${
                    mine
                      ? "bg-gradient-to-br from-violet-500 to-purple-400 text-white rounded-br-md"
                      : "bg-white text-slate-700 ring-1 ring-slate-200/70 rounded-bl-md"
                  }`}
                >
                  {!mine && (
                    <p className="text-[10px] font-bold text-violet-500 mb-0.5">
                      {m.sender_name || "Unknown"}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`text-[9px] mt-0.5 text-right ${mine ? "text-white/70" : "text-slate-400"}`}>
                    {timeLabel(m.created_date)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Composer */}
      <div className="fixed bottom-20 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            className="flex-1 bg-transparent text-sm px-2 outline-none"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center shadow-md shadow-violet-500/25 disabled:opacity-40"
          >
            <Send className="w-4 h-4 text-white" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </ModuleShell>
  );
}