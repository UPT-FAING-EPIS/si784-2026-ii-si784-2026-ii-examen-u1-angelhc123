import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../utils/format';

export default function Layout() {
  const { user, isAuthenticated, isOrganizer, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const close = () => setOpen(false);
  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <div className="app">
      <header className="navbar">
        <div className="container navbar__inner">
          <Link to="/" className="brand" onClick={close}>
            <span className="brand__logo" aria-hidden="true">🏆</span>
            TorneoPro
          </Link>

          <button type="button" className="navbar__toggle" onClick={() => setOpen((o) => !o)} aria-label="Menú">
            ☰
          </button>

          <nav className={`navbar__links${open ? ' navbar__links--open' : ''}`}>
            <NavLink to="/tournaments" onClick={close}>Torneos</NavLink>
            <NavLink to="/calendar" onClick={close}>Calendario</NavLink>
            {isAuthenticated && <NavLink to="/dashboard" onClick={close}>Mi panel</NavLink>}
            {isAuthenticated && <NavLink to="/teams" onClick={close}>Mis equipos</NavLink>}
            {isOrganizer && <NavLink to="/organizer" onClick={close}>Organizador</NavLink>}

            <div className="navbar__user">
              {isAuthenticated ? (
                <>
                  <span className="navbar__name" title={user.email}>
                    {user.fullName}
                    <small>{ROLE_LABELS[user.role]}</small>
                  </span>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" onClick={close}>Ingresar</NavLink>
                  <Link to="/register" className="btn btn--primary btn--sm" onClick={close}>
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">TorneoPro · Plataforma de torneos deportivos en línea</div>
      </footer>
    </div>
  );
}
