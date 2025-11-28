import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, sessionsAPI } from '../services/api-v3';
import Loading from '../components/Loading';
import Card from '../components/Card';
import './DashboardPage.css';

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalSessions: 0,
    totalGenerations: 0,
    totalRatings: 0
  });

  const userId = user?.id;

  const loadDashboardData = useCallback(async () => {
    if (!userId) {
      console.log('No userId, skipping dashboard load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Loading dashboard for user:', userId);

      // Load all user projects
      const projectsResponse = await projectsAPI.getAll(userId);
      
      console.log('Projects response:', projectsResponse);

      if (!projectsResponse.success) {
        throw new Error(projectsResponse.error || 'Failed to load projects');
      }

      const projectsList = projectsResponse.data || [];
      setProjects(projectsList);

      // Load sessions for each project and calculate stats
      const stats = { totalSessions: 0, totalGenerations: 0, totalRatings: 0 };
      const allSessions = [];

      for (const project of projectsList) {
        try {
          const sessionsResponse = await sessionsAPI.getByProject(project.id);
          if (sessionsResponse.success && sessionsResponse.data) {
            const projectSessions = sessionsResponse.data;
            stats.totalSessions += projectSessions.length;
            
            // Add project info to sessions
            projectSessions.forEach(session => {
              allSessions.push({
                ...session,
                projectName: project.name,
                projectTag: project.tag,
                projectId: project.id
              });
              
              // Count generations and ratings if available
              if (session.generations_count) stats.totalGenerations += session.generations_count;
              if (session.ratings_count) stats.totalRatings += session.ratings_count;
            });
          }
        } catch (err) {
          console.error(`Failed to load sessions for project ${project.id}:`, err);
        }
      }

      // Sort sessions by date and get recent 5
      allSessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentSessions(allSessions.slice(0, 5));

      setStats({
        totalProjects: projectsList.length,
        totalSessions: stats.totalSessions,
        totalGenerations: stats.totalGenerations,
        totalRatings: stats.totalRatings
      });

      console.log('Dashboard loaded successfully');
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Невідома помилка');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleCreateProject = () => {
    navigate('/projects');
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}/sessions`);
  };

  const handleSessionClick = (projectId, sessionId) => {
    navigate(`/projects/${projectId}/sessions/${sessionId}/generate`);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Loading text="Завантаження Dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <Card className="error-card">
          <p>{error}</p>
          <button onClick={loadDashboardData} className="retry-btn">Спробувати знову</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>📊 Dashboard</h1>
        <p className="dashboard-subtitle">Загальна інформація по всіх проектах і сесіях</p>
      </div>

      {/* Overall Statistics */}
      <section className="dashboard-section">
        <h2>📈 Загальна статистика</h2>
        <div className="stats-grid">
          <Card className="stat-card">
            <div className="stat-icon">📁</div>
            <div className="stat-value">{stats.totalProjects}</div>
            <div className="stat-label">Проектів</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-icon">📂</div>
            <div className="stat-value">{stats.totalSessions}</div>
            <div className="stat-label">Сесій</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-icon">🎨</div>
            <div className="stat-value">{stats.totalGenerations}</div>
            <div className="stat-label">Генерацій</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-value">{stats.totalRatings}</div>
            <div className="stat-label">Оцінок</div>
          </Card>
        </div>
      </section>

      {/* Projects Overview */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>📁 Мої проекти</h2>
          <button onClick={handleCreateProject} className="create-btn">
            + Створити проект
          </button>
        </div>
        
        {projects.length === 0 ? (
          <Card className="empty-state">
            <div className="empty-icon">📁</div>
            <p>У вас ще немає проектів</p>
            <button onClick={handleCreateProject} className="create-btn-large">
              Створити перший проект
            </button>
          </Card>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <Card 
                key={project.id} 
                className="project-card"
                onClick={() => handleProjectClick(project.id)}
              >
                <div className="project-tag">{project.tag}</div>
                <h3>{project.name}</h3>
                {project.description && <p className="project-description">{project.description}</p>}
                <div className="project-meta">
                  <span>📂 {project.sessions_count || 0} сесій</span>
                  <span>🎨 {project.generations_count || 0} генерацій</span>
                </div>
                <div className="project-date">
                  Створено: {new Date(project.created_at).toLocaleDateString('uk-UA')}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <section className="dashboard-section">
          <h2>📂 Останні сесії</h2>
          <div className="sessions-list">
            {recentSessions.map(session => (
              <Card 
                key={session.id}
                className="session-card"
                onClick={() => handleSessionClick(session.projectId, session.id)}
              >
                <div className="session-info">
                  <div className="session-name">{session.name}</div>
                  <div className="session-project">
                    <span className="project-tag-small">{session.projectTag}</span>
                    <span>{session.projectName}</span>
                  </div>
                  {session.user_prompt && (
                    <div className="session-prompt">
                      💬 {session.user_prompt}
                    </div>
                  )}
                </div>
                <div className="session-stats">
                  <span>🎨 {session.generations_count || 0}</span>
                  <span>⭐ {session.ratings_count || 0}</span>
                  <span>📅 {new Date(session.created_at).toLocaleDateString('uk-UA')}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Quick Start Guide */}
      {projects.length === 0 && (
        <section className="dashboard-section">
          <Card className="guide-card">
            <h2>🚀 Швидкий старт</h2>
            <div className="guide-steps">
              <div className="guide-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Створіть проект</h3>
                  <p>Проект - це контейнер для ваших генерацій. Наприклад: "Dating профіль", "Машини", "Дизайн логотипів"</p>
                </div>
              </div>
              <div className="guide-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Створіть сесію</h3>
                  <p>Сесія - це робоча сесія в межах проекту. Тут AI буде навчатись на ваших оцінках</p>
                </div>
              </div>
              <div className="guide-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Генеруйте і оцінюйте</h3>
                  <p>Генеруйте контент, оцінюйте результати. Система навчиться і наступні генерації будуть кращими!</p>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

export default DashboardPage;
