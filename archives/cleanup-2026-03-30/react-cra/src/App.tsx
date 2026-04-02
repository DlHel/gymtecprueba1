import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/shared/LoadingSpinner';

// Componente para rutas protegidas mejorado
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[] 
}> = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  
  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return <LoadingSpinner fullScreen message="Verificando autenticación..." />;
  }
  
  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Verificar roles si se especifican
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Redirigir al dashboard correspondiente según el rol
    const redirectPath = user.role === 'admin' ? '/admin' : '/user';
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};

// Componente de rutas públicas
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return <LoadingSpinner fullScreen message="Cargando..." />;
  }
  
  // Si ya está autenticado, redirigir al dashboard correspondiente
  if (isAuthenticated && user) {
    const redirectPath = user.role === 'admin' ? '/admin' : '/user';
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};

function AppContent() {
  const { loading } = useAuth();

  // Mostrar loading global mientras se inicializa la autenticación
  if (loading) {
    return <LoadingSpinner fullScreen message="Inicializando aplicación..." />;
  }

  return (
    <Routes>
      {/* Ruta pública - Login */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      {/* Rutas protegidas - Admin */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      {/* Rutas protegidas - User */}
      <Route path="/user/*" element={
        <ProtectedRoute allowedRoles={['user']}>
          <UserDashboard />
        </ProtectedRoute>
      } />
      
      {/* Ruta raíz - Redirigir según autenticación */}
      <Route path="/" element={<RootRedirect />} />
      
      {/* Ruta 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Componente para manejar la redirección de la ruta raíz
function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const redirectPath = user?.role === 'admin' ? '/admin' : '/user';
  return <Navigate to={redirectPath} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
