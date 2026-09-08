import React, { useState, useRef, useEffect } from "react";
import { Loader2, Send, MapPinned } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createMustateel, createCanal, createChakbandi, DIMENSIONS } from "@/lib/gisEngine";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Interactive AI map-drawing assistant. Asks the user step-by-step questions
// (mustateel lines, canal, chakbandi), then draws the full map when it has
// enough information. The LLM call runs server-side (ai-map-draw function).

export default function AiMapDrawChat({ zoom, pan, canvasRef, objects = [], onAddObjects }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "السلام علیکم! پہلی مستطیل لائن کہاں سے کہاں تک بنانی ہے؟ (مثلاً 1 سے 15) اور کونسی سمت میں — بائیں سے دائیں (ltr) یا دائیں سے بائیں (rtl)؟" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [messages, busy]);

  const mustW = DIMENSIONS.MUSTATEEL.width;
  const mustH = DIMENSIONS.MUSTATEEL.height;

  const origin = () => {
    let ox = 0, oy = 0;
    const canvas = canvasRef?.current?.getCanvas?.();
    if (canvas && zoom) {
      const worldLeft = -pan.x / zoom;
      const worldTop = -pan.y / zoom;
      ox = Math.round(worldLeft / mustW) * mustW + mustW;
      oy = Math.round(worldTop / mustH) * mustH + mustH;
    }
    return { ox, oy };
  };

  const findMust = (label, pool) => pool.find(o => o.type === "mustateel" && String(o.label) === String(label));

  const drawLine = (cfg, pool) => {
    const start = Number(cfg.start) || 0;
    const end = Number(cfg.end) || start;
    const count = Math.max(1, end - start + 1);
    const { ox, oy } = origin();
    const anchor = (cfg.below != null && cfg.below !== "") ? findMust(cfg.below, pool) : null;
    let x = anchor ? anchor.x : ox;
    let y = anchor ? anchor.y + mustH : oy;
    const dir = cfg.direction === "rtl" ? -1 : 1;
    const gen = [];
    for (let i = 0; i < count; i++) {
      const o = createMustateel(x, y);
      o.label = String(start + i);
      gen.push(o);
      x += dir * mustW;
    }
    return gen;
  };

  // Build all map objects from a final spec. Mustateel lines are drawn first so
  // the canal / chakbandi can be positioned relative to them by mustateel number.
  const buildSpec = (spec) => {
    const pool = [...objects.filter(o => o.type === "mustateel")];
    const all = [];
    (spec.lines || []).forEach(l => {
      const gen = drawLine(l, pool);
      all.push(...gen);
      pool.push(...gen);
    });
    if (spec.canal && Array.isArray(spec.canal.through) && spec.canal.through.length) {
      const ms = spec.canal.through.map(n => findMust(n, pool)).filter(Boolean);
      if (ms.length) {
        const minX = Math.min(...ms.map(m => m.x));
        const maxX = Math.max(...ms.map(m => m.x + mustW));
        const side = spec.canal.side || "top";
        const y = side === "bottom" ? Math.max(...ms.map(m => m.y + mustH)) : Math.min(...ms.map(m => m.y));
        all.push(createCanal([{ x: minX, y }, { x: maxX, y }], spec.canal.name || "Canal"));
      }
    }
    if (spec.chakbandi && Array.isArray(spec.chakbandi.around) && spec.chakbandi.around.length) {
      const ms = spec.chakbandi.around.map(n => findMust(n, pool)).filter(Boolean);
      if (ms.length) {
        const minX = Math.min(...ms.map(m => m.x));
        const minY = Math.min(...ms.map(m => m.y));
        const maxX = Math.max(...ms.map(m => m.x + mustW));
        const maxY = Math.max(...ms.map(m => m.y + mustH));
        all.push(createChakbandi([{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }, { x: minX, y: minY }], spec.chakbandi.name || "Chakbandi"));
      }
    }
    return all;
  };

  const handleSend = async () => {
    if (!input.trim() || busy) return;
    const userText = input.trim();
    setInput("");
    const next = [...messages, { role: "user", text: userText }];
    setMessages(next);
    setBusy(true);
    try {
      const convo = next.map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.text}`).join("\n");
      const { data: res } = await base44.functions.invoke('ai-map-draw', { conversation: convo });
      const reply = res?.reply || "...";
      setMessages(m => [...m, { role: "assistant", text: reply }]);
      if (res?.done && res?.spec) {
        const all = buildSpec(res.spec);
        if (all.length > 0) {
          onAddObjects(all);
          toast.success(`نقشہ تیار — ${all.length} آبجیکٹس ڈرائی ہو گئے`);
        } else {
          toast.warning("AI نے کوئی آبجیکٹ نہیں بنایا");
        }
      }
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", text: "❌ خرابی: " + (e?.message || "نامعلوم") }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div ref={scrollRef} className="h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar bg-slate-50/60 rounded-lg p-2.5 border border-slate-100">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${m.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 text-slate-400 px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1.5 text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin" /> سوچ رہا ہوں…
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          placeholder="اپنا جواب لکھیں…"
          className="h-9 text-xs"
          disabled={busy}
        />
        <button onClick={handleSend} disabled={busy || !input.trim()}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] text-slate-400 flex items-center gap-1">
        <MapPinned className="w-3 h-3" /> AI مرحلہ وار مستطیل، نہر اور چکبندی کے بارے میں پوچھے گا پھر مکمل نقشہ خودکار بنائے گا۔
      </p>
    </div>
  );
}