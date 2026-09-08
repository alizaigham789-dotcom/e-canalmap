import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Loader2, Wand2, Lightbulb } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { interpretCommands } from "@/lib/commandInterpreter";

const EXAMPLES = [
  "draw mustateel 5531 to 5539",
  "draw chakbandi on mustateel lines",
  "draw mouza line",
  "draw canal horizontal at top",
  "moga 13223 R",
];

// AI command parser — the LLM call runs server-side (ai-map-command function).

export default function AICommandPanel({ objects, onApply, onClose }) {
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!command.trim()) return;
    setLoading(true);
    try {
      const { data: result } = await base44.functions.invoke('ai-map-command', { command, objectCount: objects.length });

      const commands = result.commands || [];
      if (commands.length === 0) {
        toast.warning("No commands detected — try: draw mustateel 5531 to 5539");
        setLoading(false);
        return;
      }

      const { newObjects, updates } = interpretCommands(commands, objects);

      if (newObjects.length === 0 && updates.length === 0) {
        toast.info("Commands parsed but nothing generated. Draw mustateels first.");
      } else {
        onApply(newObjects, updates);
        toast.success(`AI generated ${newObjects.length} object(s)${updates.length ? `, ${updates.length} update(s)` : ""} — Ctrl+Z to undo`);
        onClose();
      }
    } catch (err) {
      toast.error("AI command failed: " + (err.message || "unknown error"));
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 font-heading tracking-wide block leading-tight">AI Map Command</span>
              <span className="text-[10px] text-slate-500">Type to draw — natural language</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-4 bg-slate-50">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Lightbulb className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Type commands in natural language — one per line. The AI parses them and draws the map automatically.
              You can chain multiple commands for a complete map in one go.
            </p>
          </div>

          {/* Examples */}
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 block">Quick Examples</span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button key={ex}
                  onClick={() => setCommand(ex)}
                  className="text-[10px] px-2.5 py-1.5 bg-white text-slate-600 rounded-lg border border-slate-200 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-all shadow-sm">
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Command input */}
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 block">Your Commands</span>
            <textarea
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder={"e.g.\ndraw mustateel 5531 to 5539\ndraw chakbandi\ndraw mouza\ndraw canal at top\nmoga 13223 R"}
              rows={7}
              autoFocus
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none shadow-sm"
            />
          </div>

          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Write multiple commands on separate lines for a complete map. Press Ctrl+Z after to undo.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white rounded-b-2xl">
          <span className="text-[10px] text-slate-500">{objects.length} existing object(s)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-slate-300 text-slate-600" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
              onClick={handleExecute} disabled={loading || !command.trim()}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {loading ? "Generating..." : "Generate Map"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}