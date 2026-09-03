import React, { useState } from "react";
import { MessagesSquare, Send, Users } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";

const ROLES = ["Canal Patwaris", "Zilladars", "Deputy Collectors", "Irrigation Officers", "Department Staff"];

const SAMPLE = [
  { id: 1, name: "Zilladar Office", text: "Mogha inspection scheduled at 10:00 AM.", self: false },
  { id: 2, name: "You", text: "Acknowledged. Field team en route.", self: true },
];

export default function GroupChat() {
  const [messages, setMessages] = useState(SAMPLE);
  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim()) return;
    setMessages([...messages, { id: Date.now(), name: "You", text: draft.trim(), self: true }]);
    setDraft("");
  };

  return (
    <ModuleShell title="GROUP CHAT" titleUrdu="گروپ چیٹ" Icon={MessagesSquare} gradient="from-violet-400 to-purple-300">
      <div className="flex items-center gap-2 mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
        <Users className="w-4 h-4 text-violet-500" strokeWidth={2.2} />
        <p className="text-[11px] text-slate-500 truncate">{ROLES.join(" · ")}</p>
      </div>
      <div className="space-y-3 mb-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.self ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                m.self ? "bg-gradient-to-br from-violet-500 to-purple-400 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200/70"
              }`}
            >
              {!m.self && <p className="text-[10px] font-bold text-violet-500 mb-0.5">{m.name}</p>}
              <p className="text-xs leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
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
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center shadow-md shadow-violet-500/25"
          >
            <Send className="w-4 h-4 text-white" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </ModuleShell>
  );
}