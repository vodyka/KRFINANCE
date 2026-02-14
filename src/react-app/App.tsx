import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import { AdminAuthProvider } from "@/react-app/contexts/AdminAuthContext";
import LoginPage from "@/react-app/pages/Login";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import AdminLogin from "@/react-app/pages/AdminLogin";
import AdminPanel from "@/react-app/pages/AdminPanel";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import DashboardPage from "@/react-app/pages/Dashboard";
import LancamentosPage from "@/react-app/pages/Lancamentos";
import ExtratosPage from "@/react-app/pages/Extratos";
import ContasPage from "@/react-app/pages/Contas";
import CategoriasPage from "@/react-app/pages/Categorias";
import CentroCustoPage from "@/react-app/pages/CentroCusto";
import ClientesFornecedoresPage from "@/react-app/pages/ClientesFornecedores";
import ConfiguracoesPage from "@/react-app/pages/Configuracoes";
import ContasPagarPage from "@/react-app/pages/ContasPagar";
import ContasReceberPage from "@/react-app/pages/ContasReceber";
import DividasPage from "@/react-app/pages/Dividas";

export default function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/administrador" element={<AdminLogin />} />
            <Route path="/administrador/painel" element={<AdminPanel />} />
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="lancamentos" element={<LancamentosPage />} />
              <Route path="contas-pagar" element={<ContasPagarPage />} />
              <Route path="contas-receber" element={<ContasReceberPage />} />
              <Route path="dividas" element={<DividasPage />} />
              <Route path="extratos" element={<ExtratosPage />} />
              <Route path="contas" element={<ContasPage />} />
              <Route path="categorias" element={<CategoriasPage />} />
              <Route path="centro-custo" element={<CentroCustoPage />} />
              <Route path="clientes-fornecedores" element={<ClientesFornecedoresPage />} />
              <Route path="configuracoes" element={<ConfiguracoesPage />} />
            </Route>
          </Routes>
        </Router>
      </AdminAuthProvider>
    </AuthProvider>
  );
}
