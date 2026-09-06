import React, { useState, useRef, useEffect } from "react";
import { Loader2, Send, MapPinned } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createMustateel, createCanal, createChakbandi, DIMENSIONS } from "@/lib/gisEngine";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Interactive AI map-drawing assistant. Asks the user step-by-step questions
// (mustateel lines, canal, chakbandi), then draws the full map when it has
// enough information.
const SYSTEM = `You are a cadastral map drawing assistant for a Pakistani irrigation map. You help the user draw "mustateel" (rectangular land parcels), a "canal" (watercourse along the top/bottom of mustateels), and a "chakbandi" (boundary line enclosing a group of mustateels) via a step-by-step Q&A in Roman Urdu.

Ask ONE clear question at a time. Gather this information:
1. FIRST mustateel line: start number, end number, and direction (left-to-right = "ltr", or right-to-left = "rtl").
2. EACH further line: which direction, numbering start-end, and which mustateel number it must start BELOW (e.g. below 855).
3. CANAL: which mustateel numbers the canal runs along, and whether along their top or bottom edge.
4. CHAKBANDI: which mustateel numbers the chakbandi boundary should enclose.

If the user gives partial info, fill reasonable defaults and ask only what is missing. Keep questions short.

When you have enough information, set "done": true and fill "spec". Otherwise "done": false and use "reply" to ask the next question.

spec shape:
- lines: array of { "start": number, "end": number, "below": number|null, "direction": "ltr"|"rtl" }. "below" is the mustateel NUMBER this line starts directly under; null/omit for the first line.
- canal: { "through": [mustateel numbers], "side": "top"|"bottom" }
- chakbandi: { "around": [mustateel numbers] }

Example final answer:
{ "reply": "نقشہ تیار ہے، اب ڈرائی کر رہا ہوں۔", "done": true, "spec": { "lines": [{"start":1,"end":15,"below":null,"direction":"ltr"},{"start":16,"end":30,"below":15,"direction":"rtl"}], "canal": {"through":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],"side":"top"}, "chakbandi": {"around":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]} } }`;

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
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM}\n\nConversation so far:\n${convo}\n\nNow respond according to the rules.`,
        response_json_schema: {
          type: "object",
          properties: {
            reply: { type: "string" },
            done: { type: "boolean" },
            spec: {
              type: "object",
              properties: {
                lines: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      start: { type: "number" },
                      end: { type: "number" },
                      below: { type: ["number", "null"] },
                      direction: { type: "string", enum: ["ltr", "rtl"] },
                    },
                    required: ["start", "end", "direction"],
                  },
                },
                canal: {
                  type: "object",
                  properties: {
                    through: { type: "array", items: { type: "number" } },
                    side: { type: "string", enum: ["top", "bottom"] },
                  },
                },
                chakbandi: {
                  type: "object",
                  properties: { around: { type: "array", items: { type: "number" } } },
                },
              },
            },
          },
          required: ["reply", "done"],
        },
      });
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