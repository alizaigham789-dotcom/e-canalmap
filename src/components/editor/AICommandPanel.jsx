import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Loader2, Wand2 } from "lucide-react";
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

const SYSTEM_PROMPT = `You are a GIS command parser for a Pakistani cadastral (chakbandi) mapping system.
Parse the user's natural language commands into a structured JSON array of actions.

Supported actions:
1. create_mustateels — Create numbered mustateel (land parcel) blocks in a grid.
   Extract start and end numbers from phrases like "draw mustateel 5531 to 5539".
   Fields: {action:"create_mustateels", start:<number>, end:<number>, mogaNumber:"<optional>"}
2. draw_chakbandi — Draw chakbandi boundary cross-mark lines around mustateel edges.
   Fields: {action:"draw_chakbandi", mogaNumber:"<optional>", name:"<optional>"}
3. draw_mouza — Draw mouza (village) boundary around all mustateels.
   Fields: {action:"draw_mouza"}
4. draw_canal — Draw main canal. Extract direction and position.
   Fields: {action:"draw_canal", direction:"horizontal"|"vertical", position:"top"|"bottom"|"left"|"right", name:"<optional>"}
5. draw_khal — Draw khal (minor canal / distributary).
   Fields: {action:"draw_khal", position:"top"|"bottom"}
6. draw_road — Draw road.
   Fields: {action:"draw_road", position:"top"|"bottom"}
7. place_moga — Place moga (outlet) on the canal. Extract number and side (L/R).
   Example: "moga 13223 R" → {action:"place_moga", number:"13223", side:"R"}
8. label_acres — Set acreage label on a specific mustateel.
   Fields: {action:"label_acres", mustateelNumber:<number>, acres:<number>, outOfMouza:<number optional>}

Rules:
- Parse each line or sentence as a separate command.
- If a command doesn't match any action, skip it.
- Default direction for canal is "horizontal", default position is "top".
- Default side for moga is "R".
- Return ONLY a JSON object: {"commands":[...]}`;

export default function AICommandPanel({ objects, onApply, onClose }) {
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!command.trim()) return;
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}

Current map has ${objects.length} object(s).

User commands:
"""
${command}
"""`,
        response_json_schema: {
          type: "object",
          properties: {
            commands: { type: "array", items: { type: "object" } },
          },
        },
      });

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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1420] border border-slate-700 rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-white font-heading tracking-wider">AI MAP COMMAND</span>
            <span className="text-[10px] text-slate-500">— type to draw</span>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-white" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          <p className="text-xs text-slate-400">
            Type commands in natural language — one per line. The AI parses them and draws the map automatically.
          </p>

          {/* Examples */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button key={ex}
                onClick={() => setCommand(ex)}
                className="text-[10px] px-2 py-1 bg-slate-800 text-slate-400 rounded border border-slate-700 hover:text-purple-400 hover:border-purple-600 transition-all">
                {ex}
              </button>
            ))}
          </div>

          {/* Command input */}
          <textarea
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder={"e.g.\ndraw mustateel 5531 to 5539\ndraw chakbandi\ndraw mouza\ndraw canal at top\nmoga 13223 R"}
            rows={7}
            autoFocus
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none"
          />

          <div className="text-[10px] text-slate-500">
            💡 Write multiple commands on separate lines for a complete map in one go. Press Ctrl+Z after to undo.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700">
          <span className="text-[10px] text-slate-500">{objects.length} existing object(s)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300" onClick={onClose}>
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