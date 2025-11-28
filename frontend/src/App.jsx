import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import SessionsPage from './pages/SessionsPage';
import GeneratePageV3 from './pages/GeneratePageV3';
import GalleryPage from './pages/GalleryPage';
import GeneratePage from './pages/GeneratePage';
import SwipePage from './pages/SwipePage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import WeightHistoryPage from './pages/WeightHistoryPage';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/generate" replace />;
  }

  return children;
}

function Navigation() {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  // Don't show nav on login page
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="app-navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo" onClick={closeMenu}>
          <span className="logo-icon">🔥</span>
          <span className="logo-text">AI Feedback</span>
        </Link>

        <button className="nav-toggle" onClick={toggleMenu} aria-label="Toggle menu">
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
          <Link
            to="/projects"
            className={`nav-link ${isActive('/projects') || location.pathname.startsWith('/projects') ? 'nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">📁</span>
            <span>Projects</span>
          </Link>
          <Link
            to="/dashboard"
            className={`nav-link ${isActive('/dashboard') ? 'nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </Link>
          {isAdmin() && (
            <Link
              to="/admin"
              className={`nav-link ${isActive('/admin') ? 'nav-link-active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">👑</span>
              <span>Admin</span>
            </Link>
          )}
          <Link
            to="/settings"
            className={`nav-link ${isActive('/settings') ? 'nav-link-active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </Link>
          <button
            className="nav-link logout-link"
            onClick={() => {
              logout();
              closeMenu();
            }}
          >
            <span className="nav-icon">🚪</span>
            <span>Logout ({user?.username})</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Navigation />
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/projects" replace />
              </ProtectedRoute>
            }
          />
          
          {/* V3 Routes - Projects/Sessions */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/projects/:projectId/sessions"
            element={
              <ProtectedRoute>
                <SessionsPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/projects/:projectId/sessions/:sessionId/generate"
            element={
              <ProtectedRoute>
                <GeneratePageV3 />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/projects/:projectId/sessions/:sessionId/gallery"
            element={
              <ProtectedRoute>
                <GalleryPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/projects/:projectId/sessions/:sessionId/weights"
            element={
              <ProtectedRoute>
                <WeightHistoryPage />
              </ProtectedRoute>
            }
          />
          
          {/* V2 Routes (legacy) */}}
          <Route
            path="/generate"
            element={
              <ProtectedRoute>
                <GeneratePage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/swipe"
            element={
              <ProtectedRoute>
                <SwipePage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
