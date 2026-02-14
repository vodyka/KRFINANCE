import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAdminAuth } from '@/react-app/contexts/AdminAuthContext';
import { Button } from '@/react-app/components/ui/button';
import { LogOut, Building2, Users } from 'lucide-react';
import AdminBanks from '@/react-app/pages/AdminBanks';
import AdminUsers from '@/react-app/pages/AdminUsers';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, adminLogout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'bancos'>('usuarios');

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('/administrador');
    }
  }, [isAdminAuthenticated, navigate]);

  const handleLogout = () => {
    adminLogout();
    navigate('/administrador');
  };

  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-[#001429] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Painel Administrativo</h1>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'usuarios'
                  ? 'border-[#001429] text-[#001429]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários
              </div>
            </button>
            <button
              onClick={() => setActiveTab('bancos')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'bancos'
                  ? 'border-[#001429] text-[#001429]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Gerenciar Bancos
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'usuarios' && <AdminUsers />}
        {activeTab === 'bancos' && <AdminBanks />}
      </div>
    </div>
  );
}
