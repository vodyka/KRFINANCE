import { useState } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { Category, CATEGORY_GROUPS } from "@/react-app/lib/finance-types";
import { generateId } from "@/react-app/lib/finance-utils";
import { Card, CardContent } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { Badge } from "@/react-app/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/react-app/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/react-app/components/ui/collapsible";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Lock, ChevronDown, BarChart3 } from "lucide-react";

export default function CategoriasPage() {
  const { categories, setCategories } = useFinanceData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", type: "despesa" as "receita" | "despesa", groupId: CATEGORY_GROUPS[0].id });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORY_GROUPS.map(g => [g.id, true]))
  );

  const resetForm = () => setForm({ name: "", type: "despesa", groupId: CATEGORY_GROUPS[0].id });
  const openNew = () => { resetForm(); setEditing(null); setOpen(true); };
  const openEdit = (c: Category) => {
    if (c.isDefault) return;
    setForm({ name: c.name, type: c.type, groupId: c.groupId });
    setEditing(c);
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    const entry: Category = {
      id: editing?.id || generateId(),
      name: form.name,
      type: form.type,
      groupId: form.groupId,
      isDefault: false,
    };
    if (editing) {
      setCategories(prev => prev.map(c => c.id === editing.id ? entry : c));
    } else {
      setCategories(prev => [...prev, entry]);
    }
    setOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat?.isDefault) return;
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas categorias financeiras</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-[#001429] hover:bg-[#001429]/90">
              <Plus className="h-4 w-4 mr-1" />Nova categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v: "receita" | "despesa") => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita (Entrada)</SelectItem>
                    <SelectItem value="despesa">Despesa (Saída)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grupo</Label>
                <Select value={form.groupId} onValueChange={v => setForm(f => ({ ...f, groupId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_GROUPS.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-[#001429] hover:bg-[#001429]/90" onClick={handleSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {CATEGORY_GROUPS.map(group => {
          const groupCategories = categories.filter(c => c.groupId === group.id);
          if (groupCategories.length === 0) return null;

          return (
            <Card key={group.id}>
              <Collapsible open={openGroups[group.id]} onOpenChange={() => toggleGroup(group.id)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm uppercase tracking-wide">{group.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">{groupCategories.length}</Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openGroups[group.id] ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-0 pb-2">
                    <div className="divide-y">
                      {groupCategories.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            {c.type === "receita" ? (
                              <ArrowUp className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <ArrowDown className="h-4 w-4 text-red-600 shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">{c.name}</span>
                            {c.isDefault && (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!c.isDefault && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {/* Categories without a group (user-created with old data) */}
        {(() => {
          const ungrouped = categories.filter(c => !CATEGORY_GROUPS.find(g => g.id === c.groupId));
          if (ungrouped.length === 0) return null;
          return (
            <Card>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Sem Grupo</span>
                </div>
                <div className="divide-y">
                  {ungrouped.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {c.type === "receita" ? (
                          <ArrowUp className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-red-600 shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">{c.name}</span>
                        {c.isDefault && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!c.isDefault && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })()}
      </div>
    </div>
  );
}
