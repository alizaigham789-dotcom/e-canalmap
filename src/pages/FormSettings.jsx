import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, Settings2, LayoutGrid, Eye, EyeOff } from "lucide-react";

const FORM_TYPES = {
  parat_warabandi_header: "Header Fields",
  parat_warabandi_table: "Table Columns",
};

export default function FormSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["form-field-configs"],
    queryFn: () => base44.entities.FormFieldConfig.list("order", 100),
    enabled: !!currentUser,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FormFieldConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-field-configs"] });
      setEditingId(null);
      toast.success("Field updated");
    },
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md shadow-sm">
          <Settings2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2 font-heading">Admin Access Required</h2>
          <p className="text-sm text-slate-500 mb-4">Only admins can customize form fields.</p>
          <Link to="/"><Button variant="outline" className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
        </div>
      </div>
    );
  }

  const grouped = {};
  for (const c of configs) {
    if (!grouped[c.form_type]) grouped[c.form_type] = [];
    grouped[c.form_type].push(c);
  }

  const startEdit = (config) => {
    setEditingId(config.id);
    setEditValues({
      label_urdu: config.label_urdu || "",
      label_en: config.label_en || "",
      placeholder: config.placeholder || "",
      field_type: config.field_type || "text",
      width: config.width || "",
      visible: config.visible !== false,
    });
  };

  const saveEdit = (id) => {
    updateMutation.mutate({
      id,
      data: {
        label_urdu: editValues.label_urdu,
        label_en: editValues.label_en,
        placeholder: editValues.placeholder,
        field_type: editValues.field_type,
        width: editValues.width || null,
        visible: editValues.visible,
      },
    });
  };

  const cancelEdit = () => setEditingId(null);

  const toggleVisible = (config) => {
    updateMutation.mutate({ id: config.id, data: { visible: !config.visible } });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
              <Settings2 className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-base font-bold font-heading tracking-wide text-slate-800">Form Field Settings</h1>
              <p className="text-[10px] text-slate-400">Customize Parat Warabandi form labels and visibility</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
          </div>
        ) : (
          <Tabs defaultValue="parat_warabandi_header">
            <TabsList className="bg-white border border-slate-200 mb-6">
              {Object.entries(FORM_TYPES).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="text-xs gap-1.5 data-[state=active]:bg-slate-100">
                  <LayoutGrid className="w-3 h-3" /> {label} ({(grouped[key] || []).length})
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(FORM_TYPES).map(([formType, label]) => (
              <TabsContent key={formType} value={formType}>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span>#</span>
                    <span>English Label</span>
                    <span>Urdu Label (اردو)</span>
                    <span>Type</span>
                    <span>Visible</span>
                  </div>

                  {(grouped[formType] || []).map((config, idx) => (
                    <div key={config.id} className="border-b border-slate-100 last:border-b-0">
                      {editingId === config.id ? (
                        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-3 px-4 py-3 items-center bg-blue-50/50">
                          <span className="text-xs text-slate-500 font-mono">{idx + 1}</span>
                          <Input
                            value={editValues.label_en}
                            onChange={e => setEditValues({ ...editValues, label_en: e.target.value })}
                            className="h-8 text-xs bg-white"
                            placeholder="English label"
                          />
                          <Input
                            value={editValues.label_urdu}
                            onChange={e => setEditValues({ ...editValues, label_urdu: e.target.value })}
                            className="h-8 text-xs bg-white"
                            placeholder="اردو لیبل"
                            style={{ direction: "rtl", fontFamily: "serif" }}
                          />
                          <Select value={editValues.field_type} onValueChange={v => setEditValues({ ...editValues, field_type: v })}>
                            <SelectTrigger className="h-8 w-20 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <Switch checked={editValues.visible} onCheckedChange={v => setEditValues({ ...editValues, visible: v })} className="scale-75" />
                          </div>
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={() => saveEdit(config.id)} disabled={updateMutation.isPending}
                              className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white">
                              <Save className="w-3 h-3 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}
                              className="h-7 text-[10px] text-slate-500">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(config)}
                          className="w-full grid grid-cols-[auto_1fr_1fr_auto_auto] gap-3 px-4 py-3 items-center hover:bg-slate-50 transition-colors text-left"
                        >
                          <span className="text-xs text-slate-400 font-mono">{idx + 1}</span>
                          <div>
                            <span className="text-sm text-slate-800 font-medium">{config.label_en}</span>
                            {config.placeholder && <span className="text-[10px] text-slate-400 ml-2">placeholder: {config.placeholder}</span>}
                          </div>
                          <span className="text-sm text-slate-700" style={{ fontFamily: "serif" }}>{config.label_urdu}</span>
                          <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-500 capitalize">
                            {config.field_type || "text"}
                          </Badge>
                          <button onClick={(e) => { e.stopPropagation(); toggleVisible(config); }}
                            className="text-slate-400 hover:text-slate-600 p-1">
                            {config.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                        </button>
                      )}
                    </div>
                  ))}

                  {(grouped[formType] || []).length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-400">No fields configured yet.</div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  );
}