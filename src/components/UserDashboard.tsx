import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './UserDashboard.css';

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const path = location.pathname.split('/').pop() || 'overview';
    setActiveSection(path);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (section: string) => {
    setActiveSection(section);
  };

  return (
    <div className="user-dashboard">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>GymTec</h2>
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">Usuario</span>
          </div>
        </div>
        
        <ul className="nav-menu">
          <li className={activeSection === 'overview' ? 'active' : ''}>
            <Link to="/user" onClick={() => handleNavigation('overview')}>
              <i className="icon-home"></i> Inicio
            </Link>
          </li>
          <li className={activeSection === 'profile' ? 'active' : ''}>
            <Link to="/user/profile" onClick={() => handleNavigation('profile')}>
              <i className="icon-profile"></i> Mi Perfil
            </Link>
          </li>
          <li className={activeSection === 'classes' ? 'active' : ''}>
            <Link to="/user/classes" onClick={() => handleNavigation('classes')}>
              <i className="icon-classes"></i> Mis Clases
            </Link>
          </li>
          <li className={activeSection === 'schedule' ? 'active' : ''}>
            <Link to="/user/schedule" onClick={() => handleNavigation('schedule')}>
              <i className="icon-calendar"></i> Horario
            </Link>
          </li>
          <li className={activeSection === 'payments' ? 'active' : ''}>
            <Link to="/user/payments" onClick={() => handleNavigation('payments')}>
              <i className="icon-payment"></i> Pagos
            </Link>
          </li>
        </ul>
        
        <button onClick={handleLogout} className="btn-logout">
          <i className="icon-logout"></i> Cerrar Sesión
        </button>
      </nav>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<UserOverview />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/classes" element={<UserClasses />} />
          <Route path="/schedule" element={<UserSchedule />} />
          <Route path="/payments" element={<UserPayments />} />
        </Routes>
      </main>
    </div>
  );
};

// Componentes placeholder para las secciones
const UserOverview: React.FC = () => (
  <div className="section-content">
    <h1>Bienvenido a GymTec</h1>
    <div className="user-stats">
      <div className="stat-card">
        <h3>Clases Este Mes</h3>
        <p className="stat-number">8</p>
      </div>
      <div className="stat-card">
        <h3>Próxima Clase</h3>
        <p className="stat-text">Yoga - Mañana 10:00 AM</p>
      </div>
    </div>
  </div>
);

const UserProfile: React.FC = () => (
  <div className="section-content">
    <h1>Mi Perfil</h1>
    {/* ...contenido del perfil... */}
  </div>
);

const UserClasses: React.FC = () => (
  <div className="section-content">
    <h1>Mis Clases</h1>
    {/* ...contenido de clases... */}
  </div>
);

const UserSchedule: React.FC = () => (
  <div className="section-content">
    <h1>Mi Horario</h1>
    {/* ...contenido del horario... */}
  </div>
);

const UserPayments: React.FC = () => (
  <div className="section-content">
    <h1>Mis Pagos</h1>
    {/* ...contenido de pagos... */}
  </div>
);

export default UserDashboard;
