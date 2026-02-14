import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/react-app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/react-app/components/ui/table';
import { Badge } from '@/react-app/components/ui/badge';
import { Input } from '@/react-app/components/ui/input';
import { Search, Users, Calendar, LogIn, CreditCard, Clock } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  registeredAt: string;
  lastLoginAt: string;
  plan: 'free' | 'bronze' | 'silver' | 'gold';
  accessDaysRemaining: number;
}

// Dados mockados - em produção viriam de uma API
const mockUsers: User[] = [
  {
    id: '1',
    email: 'usuario1@example.com',
    name: 'João Silva',
    registeredAt: '2024-01-15T10:30:00Z',
    lastLoginAt: '2024-02-13T14:20:00Z',
    plan: 'free',
    accessDaysRemaining: 25,
  },
  {
    id: '2',
    email: 'usuario2@example.com',
    name: 'Maria Santos',
    registeredAt: '2024-01-20T15:45:00Z',
    lastLoginAt: '2024-02-12T09:15:00Z',
    plan: 'bronze',
    accessDaysRemaining: 15,
  },
  {
    id: '3',
    email: 'usuario3@example.com',
    name: 'Pedro Oliveira',
    registeredAt: '2024-02-01T08:00:00Z',
    lastLoginAt: '2024-02-13T16:30:00Z',
    plan: 'silver',
    accessDaysRemaining: 45,
  },
];

const planLabels: Record<User['plan'], string> = {
  free: 'Gratuito (30 dias)',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

const planColors: Record<User['plan'], string> = {
  free: 'bg-gray-100 text-gray-700',
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-slate-100 text-slate-700',
  gold: 'bg-yellow-100 text-yellow-700',
};

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: mockUsers.length,
    free: mockUsers.filter((u) => u.plan === 'free').length,
    paid: mockUsers.filter((u) => u.plan !== 'free').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plano Gratuito</p>
                <p className="text-2xl font-bold">{stats.free}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planos Pagos</p>
                <p className="text-2xl font-bold">{stats.paid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usuários Cadastrados</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data Cadastro
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Último Login
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Plano
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Dias Restantes
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{formatDate(user.registeredAt)}</TableCell>
                      <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                      <TableCell>
                        <Badge className={planColors[user.plan]}>
                          {planLabels[user.plan]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={user.accessDaysRemaining <= 7 ? 'text-red-600 font-semibold' : ''}>
                            {user.accessDaysRemaining} dias
                          </span>
                          {user.accessDaysRemaining <= 7 && (
                            <Badge variant="destructive" className="text-xs">
                              Expirando
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {filteredUsers.length} de {mockUsers.length} usuários
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Os dados de usuários são sincronizados automaticamente com o sistema de autenticação.
            Usuários com menos de 7 dias restantes são destacados em vermelho.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
