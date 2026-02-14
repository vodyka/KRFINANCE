import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/react-app/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/react-app/components/ui/table";
import { Badge } from "@/react-app/components/ui/badge";
import { Alert, AlertDescription } from "@/react-app/components/ui/alert";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { Company } from "@/react-app/lib/finance-types";
import { generateId } from "@/react-app/lib/finance-utils";
import { Plus, Pencil, Trash2, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { CnpjInput, validateCnpj, removeCnpjMask } from "@/react-app/components/CnpjInput";
import { useAuth } from "@getmocha/users-service/react";

export default function ConfiguracoesPage() {
  const { companies, setCompanies, activeCompanyId, setActiveCompanyId } = useFinanceData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", cnpj: "", address: "" });
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm({ name: "", cnpj: "", address: "" });
    setError("");
  };
  
  const openNew = () => {
    resetForm();
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (company: Company) => {
    setForm({
      name: company.name,
      cnpj: company.cnpj || "",
      address: company.address || "",
    });
    setEditing(company);
    setError("");
    setOpen(true);
  };

  const checkCnpjDuplicate = (cnpj: string, currentId?: string): { isDuplicate: boolean; ownerEmail?: string } => {
    if (!cnpj) return { isDuplicate: false };
    
    const cleanCnpj = removeCnpjMask(cnpj);
    
    // Verifica duplicatas nas empresas do próprio usuário
    const duplicateInOwnCompanies = companies.find(c => {
      if (c.id === currentId) return false; // Ignora a empresa sendo editada
      if (!c.cnpj) return false;
      return removeCnpjMask(c.cnpj) === cleanCnpj;
    });
    
    if (duplicateInOwnCompanies) {
      return { isDuplicate: true, ownerEmail: user?.email };
    }
    
    // Aqui você poderia verificar em um backend se o CNPJ está registrado
    // para outro usuário. Por enquanto, vamos simular essa verificação:
    // Em produção, isso seria uma chamada à API
    
    return { isDuplicate: false };
  };

  const handleSave = () => {
    setError("");
    
    if (!form.name) {
      setError("Nome da empresa é obrigatório");
      return;
    }
    
    // Validar CNPJ se foi preenchido
    if (form.cnpj) {
      if (!validateCnpj(form.cnpj)) {
        setError("CNPJ inválido. Por favor, verifique o formato XX.XXX.XXX/XXXX-XX");
        return;
      }
      
      // Verificar duplicatas
      const { isDuplicate, ownerEmail } = checkCnpjDuplicate(form.cnpj, editing?.id);
      
      if (isDuplicate && ownerEmail) {
        const maskedEmail = maskEmail(ownerEmail);
        setError(
          `O CNPJ ${form.cnpj} já está registrado no painel ${maskedEmail}. ` +
          `Por favor, se esse painel for seu entre e remova a empresa e volte e tente registrar novamente. ` +
          `Caso não seja, entre em contato com o suporte.`
        );
        return;
      }
    }
    
    const entry: Company = {
      id: editing?.id || generateId(),
      name: form.name,
      cnpj: form.cnpj || undefined,
      address: form.address || undefined,
    };

    if (editing) {
      setCompanies(prev => prev.map(c => c.id === editing.id ? entry : c));
    } else {
      setCompanies(prev => [...prev, entry]);
    }
    setOpen(false);
    resetForm();
  };

  const maskEmail = (email: string): string => {
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    // Mostra apenas as primeiras 4 letras e mascara o resto
    const visiblePart = username.slice(0, 4);
    const maskedPart = '*'.repeat(Math.max(username.length - 4, 3));
    
    return `${visiblePart}${maskedPart}@${domain}`;
  };

  const handleDelete = (id: string) => {
    // Don't allow deleting the active company or the last company
    if (id === activeCompanyId) {
      alert("Você não pode excluir a empresa ativa. Troque para outra empresa primeiro.");
      return;
    }
    if (companies.length === 1) {
      alert("Você precisa ter pelo menos uma empresa cadastrada.");
      return;
    }
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  const handleSetActive = (id: string) => {
    setActiveCompanyId(id);
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Configurações</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gerencie suas configurações e preferências
        </p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-4">
        <TabsList>
          <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
          <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="acesso">Perfil de Acesso</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
              <CardDescription>Gerencie suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esta seção será implementada em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assinatura">
          <Card>
            <CardHeader>
              <CardTitle>Assinatura</CardTitle>
              <CardDescription>Gerencie sua assinatura e pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esta seção será implementada em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="empresas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Empresas</CardTitle>
                <CardDescription>Gerencie suas empresas cadastradas</CardDescription>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNew} className="bg-[#001429] hover:bg-[#001429]/90">
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editing ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
                    <DialogDescription>
                      {editing ? "Atualize os dados da empresa" : "Cadastre uma nova empresa no sistema"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div>
                      <Label>Nome da Empresa *</Label>
                      <Input 
                        value={form.name} 
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                        placeholder="Ex: Empresa LTDA"
                      />
                    </div>
                    <div>
                      <Label>CNPJ</Label>
                      <CnpjInput
                        value={form.cnpj}
                        onChange={value => setForm(f => ({ ...f, cnpj: value }))}
                        placeholder="00.000.000/0000-00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Formato: XX.XXX.XXX/XXXX-XX
                      </p>
                    </div>
                    <div>
                      <Label>Endereço</Label>
                      <Input 
                        value={form.address} 
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
                        placeholder="Rua, Número, Cidade"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} className="bg-[#001429] hover:bg-[#001429]/90">
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map(company => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {company.name}
                        </div>
                      </TableCell>
                      <TableCell>{company.cnpj || "—"}</TableCell>
                      <TableCell>{company.address || "—"}</TableCell>
                      <TableCell>
                        {company.id === activeCompanyId ? (
                          <Badge className="bg-green-600/10 text-green-600 border-green-600/20 hover:bg-green-600/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSetActive(company.id)}
                          >
                            Ativar
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => openEdit(company)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {companies.length > 1 && company.id !== activeCompanyId && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive" 
                              onClick={() => handleDelete(company.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipe">
          <Card>
            <CardHeader>
              <CardTitle>Equipe</CardTitle>
              <CardDescription>Gerencie membros da sua equipe</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esta seção será implementada em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acesso">
          <Card>
            <CardHeader>
              <CardTitle>Perfil de Acesso</CardTitle>
              <CardDescription>Configure permissões e acessos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esta seção será implementada em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
