import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import ManualApprovalsTab from "@/components/admin/ManualApprovalsTab";
import { Shield, Map, Users, ArrowLeft, Pencil, Globe, Layers, Settings2, Calculator, Save, CreditCard } from "lucide-react";

const STATUS_COLORS = {
  draft: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  in_progress: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  review: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  approved: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

export default function AdminPanel() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: maps = [] } = useQuery({
    queryKey: ["maps-admin"],
    queryFn: () => base44.entities.LandMap.list("-created_date", 100),
  });

  const { data: formulas = [] } = useQuery({
    queryKey: ["formulas-admin"],
    queryFn: () => base44.entities.FormulaConfig.list(),
  });

  const updateMapMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LandMap.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maps-admin"] });
      toast.success("Map updated");
    },
  });

  const updateFormulaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FormulaConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formulas-admin"] });
      queryClient.invalidateQueries({ queryKey: ["formula-configs"] });
      toast.success("Formula updated");
    },
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
        <Card className="max-w-md bg-slate-900 border-slate-700 text-white">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 font-heading">Admin Access Required</h2>
            <p className="text-sm text-slate-500 mb-4">You need admin privileges to access this page.</p>
            <Link to="/">
              <Button variant="outline" className="gap-1.5 border-slate-700 text-slate-300">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    total: maps.length,
    published: maps.filter(m => m.status === "published").length,
    totalParcels: maps.reduce((s, m) => s + (m.total_parcels || 0), 0),
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <header className="border-b border-slate-800 bg-[#0d1420]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-white hover:bg-slate-700/60">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <h1 className="text-base font-bold font-heading tracking-wide">Admin Panel</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Maps", value: stats.total, icon: Map, borderCls: "border-blue-500/20", iconCls: "text-blue-500", textCls: "text-blue-400" },
            { label: "Published", value: stats.published, icon: Globe, borderCls: "border-emerald-500/20", iconCls: "text-emerald-500", textCls: "text-emerald-400" },
            { label: "Total Parcels", value: stats.totalParcels, icon: Layers, borderCls: "border-amber-500/20", iconCls: "text-amber-500", textCls: "text-amber-400" },
          ].map(({ label, value, icon: Icon, borderCls, iconCls, textCls }) => (
            <div key={label} className={`rounded-xl border ${borderCls} bg-slate-900/60 p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{label}</span>
                <Icon className={`w-4 h-4 ${iconCls}`} />
              </div>
              <p className={`text-2xl font-bold font-heading ${textCls}`}>{value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="maps">
          <TabsList className="bg-slate-900 border border-slate-700 mb-4">
            <TabsTrigger value="maps" className="gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
              <Map className="w-3.5 h-3.5" /> Maps ({maps.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
              <Users className="w-3.5 h-3.5" /> Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="formulas" className="gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
              <Calculator className="w-3.5 h-3.5" /> Formulas
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
              <Settings2 className="w-3.5 h-3.5" /> Settings
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
              <CreditCard className="w-3.5 h-3.5" /> Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="maps">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-500">Title</TableHead>
                    <TableHead className="text-xs text-slate-500">Location</TableHead>
                    <TableHead className="text-xs text-slate-500">Parcels</TableHead>
                    <TableHead className="text-xs text-slate-500">Status</TableHead>
                    <TableHead className="text-xs text-slate-500">Created</TableHead>
                    <TableHead className="text-xs text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maps.map((map) => (
                    <TableRow key={map.id} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell className="text-sm font-medium text-white">{map.title || "Untitled"}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {[map.village, map.district].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-300">{map.total_parcels || 0}</TableCell>
                      <TableCell>
                        <Select
                          value={map.status || "draft"}
                          onValueChange={(v) => updateMapMutation.mutate({ id: map.id, data: { status: v } })}
                        >
                          <SelectTrigger className={`h-6 w-28 text-[10px] border rounded-full px-2 font-medium ${STATUS_COLORS[map.status || "draft"]} bg-transparent`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700 text-xs">
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {map.created_date ? new Date(map.created_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Link to={`/editor?id=${map.id}`}>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:text-blue-400">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-500">Name</TableHead>
                    <TableHead className="text-xs text-slate-500">Email</TableHead>
                    <TableHead className="text-xs text-slate-500">Role</TableHead>
                    <TableHead className="text-xs text-slate-500">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell className="text-sm font-medium text-white">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-400">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize border ${u.role === "admin" ? "border-blue-500/40 text-blue-400 bg-blue-500/10" : "border-slate-600 text-slate-400"}`}>
                          {u.role || "user"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="formulas">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <h3 className="text-sm font-semibold text-white font-heading flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-400" /> Water Time Formula Engine
              </h3>
              <p className="text-xs text-slate-500">
                These values control the automatic water time calculation in Parat Warabandi.
                Changes take effect immediately — no code changes needed.
              </p>
              <div className="space-y-4">
                {[
                  { key: "water_time_per_acre", label: "Minutes per Acre", desc: "Default: 6 minutes per acre", unit: "minutes" },
                  { key: "water_time_per_kanal", label: "Minutes per Kanal", desc: "Default: 0.75 minutes per kanal", unit: "minutes" },
                ].map(({ key, label, desc, unit }) => {
                  const formula = formulas.find(f => f.formula_key === key);
                  if (!formula) return null;
                  return (
                    <div key={key} className="flex items-center gap-4 p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{label}</p>
                        <p className="text-[11px] text-slate-500">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          defaultValue={formula.value}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val > 0 && val !== formula.value) {
                              updateFormulaMutation.mutate({ id: formula.id, data: { value: val } });
                            }
                          }}
                          className="w-20 h-8 bg-slate-900 border border-slate-600 rounded-md px-2 text-center text-sm text-white focus:border-blue-500 focus:outline-none font-mono"
                        />
                        <span className="text-[11px] text-slate-500 w-12">{unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <h3 className="text-sm font-semibold text-white mb-4 font-heading">Form Settings</h3>
              <Link to="/form-settings">
                <Button variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                  <Settings2 className="w-4 h-4" /> Manage Parat Warabandi Form Fields
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions">
            <ManualApprovalsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}