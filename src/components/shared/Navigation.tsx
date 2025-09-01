import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navigation.css';

interface NavItem {
  path: string;
  label: string;
  icon?: string;
}

interface NavigationProps {
  items: NavItem[];
}

const Navigation: React.FC<NavigationProps> = ({ items }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h2>GymTec</h2>
        <div className="user-info">
          <span>{user?.name}</span>
          <span className="user-role">{user?.role}</span>
        </div>
      </div>
      
      <ul className="nav-menu">
        {items.map((item) => (
          <li key={item.path}>
            <Link 
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              {item.icon && <span className="nav-icon">{item.icon}</span>}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      
      <button onClick={handleLogout} className="btn-logout">
        Cerrar Sesión
      </button>
    </nav>
  );
};

export default Navigation;
