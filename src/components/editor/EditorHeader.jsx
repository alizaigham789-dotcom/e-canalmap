import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Globe, Download, Loader2, Pencil, Check, X, Square, StopCircle } from "lucide-react";

const STATUS_COLORS = {
  draft: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  in_progress: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  review: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  approved: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

export default function EditorHeader({
  mapData, onSave, onStatusChange, isSaving,
  activeTool, onStopDrawing, canalDraftActive,
  onExport
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const startEdit = () => {
    setTitleDraft(mapData?.title || "");
    setEditingTitle(true);
  };

  const commitTitle = () => {
    setEditingTitle(false);
    if (titleDraft.trim()) onSave({ title: titleDraft.trim() });
  };

  const drawingTools = ["acre", "mustateel", "muraba", "canal", "outlet"];
  const isDrawing = drawingTools.includes(activeTool);

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 shadow-sm">
      <Link to="/">
        <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </Link>

      <div className="w-px h-6 bg-slate-200" />

      {/* Title */}
      <div className="flex items-center gap-1.5 min-w-0">
        {editingTitle ? (
          <div className="flex items-center gap-1">
            <Input
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditingTitle(false); }}
              className="h-7 text-sm bg-slate-50 border-slate-300 text-slate-800 w-48 focus:border-blue-500"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="w-6 h-6 text-emerald-400 hover:bg-emerald-500/10" onClick={commitTitle}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="w-6 h-6 text-slate-500" onClick={() => setEditingTitle(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <button onClick={startEdit} className="flex items-center gap-1.5 group">
            <span className="text-sm font-semibold text-slate-800 font-heading truncate max-w-[180px]">
              {mapData?.title || "Untitled Map"}
            </span>
            <Pencil className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        )}
      </div>

      {/* Status badge */}
      <Select value={mapData?.status || "draft"} onValueChange={onStatusChange}>
        <SelectTrigger className={`h-6 w-28 text-[10px] border rounded-full px-2 font-medium ${STATUS_COLORS[mapData?.status || "draft"]} bg-transparent`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 text-xs">
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="review">Review</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="published">Published</SelectItem>
        </SelectContent>
      </Select>

      {/* Location */}
      {(mapData?.village || mapData?.district) && (
        <span className="text-xs text-slate-500 hidden md:inline truncate">
          {[mapData.village, mapData.district].filter(Boolean).join(", ")}
        </span>
      )}

      <div className="flex-1" />

      {/* Stop drawing */}
      {(isDrawing || canalDraftActive) && (
        <Button
          size="sm"
          variant="outline"
          onClick={onStopDrawing}
          className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-1.5"
        >
          <StopCircle className="w-3.5 h-3.5" /> Stop Drawing
        </Button>
      )}

      {/* Export */}
      <Button
        variant="ghost" size="sm"
        onClick={onExport}
        className="h-7 text-xs text-slate-500 hover:text-slate-800 gap-1.5 hidden sm:flex"
      >
        <Download className="w-3.5 h-3.5" /> Export
      </Button>

      {/* Save */}
      <Button
        size="sm"
        onClick={() => onSave()}
        disabled={isSaving}
        className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
      >
        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save
      </Button>
    </header>
  );
}