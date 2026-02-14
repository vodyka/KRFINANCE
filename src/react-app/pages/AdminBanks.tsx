import { useState } from 'react';
import { useGlobalBanks } from '@/react-app/hooks/use-global-banks';
import { GlobalBank } from '@/react-app/lib/finance-types';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Label } from '@/react-app/components/ui/label';
import { Card, CardContent } from '@/react-app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/react-app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/react-app/components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react';

export default function AdminBanks() {
  const { globalBanks, addGlobalBank, updateGlobalBank, deleteGlobalBank } = useGlobalBanks();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GlobalBank | null>(null);
  const [form, setForm] = useState({ codigo: '', nome: '', logoUrl: '' });
  const [logoPreview, setLogoPreview] = useState<string>('');

  const resetForm = () => {
    setForm({ codigo: '', nome: '', logoUrl: '' });
    setLogoPreview('');
  };

  const openNew = () => {
    resetForm();
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (bank: GlobalBank) => {
    setForm({
      codigo: bank.codigo,
      nome: bank.nome,
      logoUrl: bank.logoUrl || '',
    });
    setLogoPreview(bank.logoUrl || '');
    setEditing(bank);
    setOpen(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setForm(f => ({ ...f, logoUrl: result }));
      setLogoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.codigo || !form.nome) return;

    const bank: GlobalBank = {
      codigo: form.codigo,
      nome: form.nome,
      logoUrl: form.logoUrl || undefined,
    };

    if (editing) {
      updateGlobalBank(bank);
    } else {
      // Check if codigo already exists
      if (globalBanks.some(b => b.codigo === form.codigo)) {
        alert('Já existe um banco com este código');
        return;
      }
      addGlobalBank(bank);
    }

    setOpen(false);
    resetForm();
  };

  const handleDelete = (codigo: string) => {
    if (confirm('Tem certeza que deseja excluir este banco?')) {
      deleteGlobalBank(codigo);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Bancos</h2>
          <p className="text-sm text-gray-600">Configure a lista global de bancos disponíveis</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Banco
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Banco' : 'Novo Banco'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Código do Banco</Label>
                <Input
                  value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  placeholder="Ex: 001"
                  maxLength={3}
                  disabled={!!editing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Código de 3 dígitos (não pode ser alterado após criação)
                </p>
              </div>

              <div>
                <Label>Nome do Banco</Label>
                <Input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Banco do Brasil"
                />
              </div>

              <div>
                <Label>Logo do Banco</Label>
                <div className="mt-2 space-y-3">
                  {logoPreview && (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="h-16 w-auto rounded border border-gray-200 object-contain bg-white p-2"
                      />
                      <button
                        onClick={() => {
                          setForm(f => ({ ...f, logoUrl: '' }));
                          setLogoPreview('');
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recomendado: PNG ou SVG transparente, até 200KB
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {globalBanks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum banco cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                globalBanks.map(bank => (
                  <TableRow key={bank.codigo}>
                    <TableCell className="font-mono font-medium">{bank.codigo}</TableCell>
                    <TableCell>
                      {bank.logoUrl ? (
                        <img
                          src={bank.logoUrl}
                          alt={bank.nome}
                          className="h-8 w-auto object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem logo</span>
                      )}
                    </TableCell>
                    <TableCell>{bank.nome}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(bank)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(bank.codigo)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
