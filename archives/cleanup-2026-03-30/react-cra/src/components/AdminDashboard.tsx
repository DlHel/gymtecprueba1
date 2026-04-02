import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    // Establecer sección activa basada en la ruta actual
    const path = location.pathname.split('/').pop() || 'overview';
    setActiveSection(path);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (section: string) => {
    setActiveSection(section);
    // No usar navigate aquí si estamos usando Routes anidadas
  };

  return (
    <div className="admin-dashboard">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>GymTec Admin</h2>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
        </div>
        
        <ul className="nav-menu">
          <li className={activeSection === 'overview' ? 'active' : ''}>
            <Link to="/admin" onClick={() => handleNavigation('overview')}>
              <i className="icon-dashboard"></i> Dashboard
            </Link>
          </li>
          <li className={activeSection === 'users' ? 'active' : ''}>
            <Link to="/admin/users" onClick={() => handleNavigation('users')}>
              <i className="icon-users"></i> Usuarios
            </Link>
          </li>
          <li className={activeSection === 'classes' ? 'active' : ''}>
            <Link to="/admin/classes" onClick={() => handleNavigation('classes')}>
              <i className="icon-classes"></i> Clases
            </Link>
          </li>
          <li className={activeSection === 'equipment' ? 'active' : ''}>
            <Link to="/admin/equipment" onClick={() => handleNavigation('equipment')}>
              <i className="icon-equipment"></i> Equipamiento
            </Link>
          </li>
          <li className={activeSection === 'reports' ? 'active' : ''}>
            <Link to="/admin/reports" onClick={() => handleNavigation('reports')}>
              <i className="icon-reports"></i> Reportes
            </Link>
          </li>
        </ul>
        
        <button onClick={handleLogout} className="btn-logout">
          <i className="icon-logout"></i> Cerrar Sesión
        </button>
      </nav>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/classes" element={<AdminClasses />} />
          <Route path="/equipment" element={<AdminEquipment />} />
          <Route path="/reports" element={<AdminReports />} />
        </Routes>
      </main>
    </div>
  );
};

// Componentes placeholder para las secciones
const AdminOverview: React.FC = () => (
  <div className="section-content">
    <h1>Panel de Control</h1>
    <div className="stats-grid">
      <div className="stat-card">
        <h3>Usuarios Activos</h3>
        <p className="stat-number">150</p>
      </div>
      <div className="stat-card">
        <h3>Clases Hoy</h3>
        <p className="stat-number">12</p>
      </div>
      <div className="stat-card">
        <h3>Equipos en Mantenimiento</h3>
        <p className="stat-number">3</p>
      </div>
    </div>
  </div>
);

const AdminUsers: React.FC = () => (
  <div className="section-content">
    <h1>Gestión de Usuarios</h1>
    {/* ...contenido de gestión de usuarios... */}
  </div>
);

const AdminClasses: React.FC = () => (
  <div className="section-content">
    <h1>Gestión de Clases</h1>
    {/* ...contenido de gestión de clases... */}
  </div>
);

const AdminEquipment: React.FC = () => (
  <div className="section-content">
    <h1>Gestión de Equipamiento</h1>
    {/* ...contenido de gestión de equipamiento... */}
  </div>
);

const AdminReports: React.FC = () => (
  <div className="section-content">
    <h1>Reportes</h1>
    {/* ...contenido de reportes... */}
  </div>
);

export default AdminDashboard;
