import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI, sessionsAPI } from '../services/api-v3';
import Button from '../components/Button';
import Card from '../components/Card';
import Loading from '../components/Loading';
import './SessionsPage.css';

function SessionsPage() {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSession, setNewSession] = useState({ 
    name: '', 
    useDynamicParameters: false 
  });
  const { projectId } = useParams();
  const navigate = useNavigate();

  const loadProjectAndSessions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load project details
      const projectResponse = await projectsAPI.getById(projectId);
      if (projectResponse.success) {
        setProject(projectResponse.data);
      }

      // Load sessions
      const sessionsResponse = await sessionsAPI.getByProject(projectId);
      if (sessionsResponse.success) {
        setSessions(sessionsResponse.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectAndSessions();
  }, [loadProjectAndSessions]);

  const handleCreateSession = async () => {
    if (!newSession.name.trim()) {
      alert('Будь ласка, введіть назву сесії');
      return;
    }

    try {
      const response = await sessionsAPI.create({
        projectId: projectId,  // Backend очікує camelCase
        userId: user.id,       // Backend вимагає userId
        name: newSession.name,
        useDynamicParameters: newSession.useDynamicParameters || false
      });

      if (response.success) {
        // Backend повертає { data: { session, parameters, weights } }
        const createdSession = response.data.session || response.data;
        setSessions([createdSession, ...sessions]);
        setShowCreateModal(false);
        setNewSession({ name: '', useDynamicParameters: false });
        
        // Navigate to generation page
        navigate(`/projects/${projectId}/sessions/${createdSession.id}/generate`);
      }
    } catch (err) {
      alert('Помилка створення сесії: ' + err.message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Видалити сесію? Весь контент та оцінки будуть видалені.')) {
      return;
    }

    try {
      await sessionsAPI.delete(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      alert('Помилка видалення: ' + err.message);
    }
  };

  const handleRenameSession = async (sessionId, currentName) => {
    const newName = prompt('Нова назва сесії:', currentName);
    if (!newName || newName === currentName) return;

    try {
      const response = await sessionsAPI.update(sessionId, { name: newName });
      if (response.success) {
        setSessions(sessions.map(s => 
          s.id === sessionId ? { ...s, name: newName } : s
        ));
      }
    } catch (err) {
      alert('Помилка перейменування: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="sessions-page">
        <Loading text="Завантаження сесій..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="sessions-page">
        <div className="error-container">
          <h2>❌ Проєкт не знайдено</h2>
          <Button onClick={() => navigate('/projects')}>← Назад до проєктів</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sessions-page">
      <div className="sessions-container">
        {/* Project Header */}
        <div className="sessions-header">
          <div>
            <Button
              variant="secondary"
              size="small"
              onClick={() => navigate('/projects')}
              style={{ marginBottom: '1rem' }}
            >
              ← Назад до проєктів
            </Button>
            <h1>📊 {project.name}</h1>
            <div className="project-meta-header">
              <span className="category-badge">{project.category}</span>
              {project.description && <p className="project-desc">{project.description}</p>}
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="large">
            ➕ Нова Сесія
          </Button>
        </div>

        {error && (
          <div className="error-banner">
            ❌ {error}
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h2>Немає сесій</h2>
            <p>Створіть першу сесію для генерації AI контенту</p>
            <Button onClick={() => setShowCreateModal(true)} size="large">
              🚀 Створити першу сесію
            </Button>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map((session, index) => (
              <Card key={session.id} className="session-card">
                <div className="session-card-header">
                  <div className="session-info">
                    <span className="session-number">Сесія {index + 1}</span>
                    <h3 className="session-name">{session.name}</h3>
                  </div>
                  <div className="session-header-actions">
                    <button
                      className="session-action-btn"
                      onClick={() => handleRenameSession(session.id, session.name)}
                      title="Перейменувати"
                    >
                      ✏️
                    </button>
                    <button
                      className="session-action-btn delete"
                      onClick={() => handleDeleteSession(session.id)}
                      title="Видалити"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="session-stats">
                  <div className="stat-item">
                    <span className="stat-icon">🖼️</span>
                    <div>
                      <div className="stat-value">{session.generations_count || 0}</div>
                      <div className="stat-label">Контенту</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">⭐</span>
                    <div>
                      <div className="stat-value">{session.ratings_count || 0}</div>
                      <div className="stat-label">Оцінок</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">📊</span>
                    <div>
                      <div className="stat-value">{session.parameters_count || 0}</div>
                      <div className="stat-label">Параметрів</div>
                    </div>
                  </div>
                </div>

                <div className="session-meta">
                  <span>Створено: {new Date(session.created_at).toLocaleDateString('uk-UA')}</span>
                  {session.updated_at && session.updated_at !== session.created_at && (
                    <span>Оновлено: {new Date(session.updated_at).toLocaleDateString('uk-UA')}</span>
                  )}
                </div>

                <div className="session-actions">
                  <Button
                    onClick={() => navigate(`/projects/${projectId}/sessions/${session.id}/gallery`)}
                    variant="secondary"
                    size="small"
                  >
                    🖼️ Галерея
                  </Button>
                  {session.ratings_count > 0 && (
                    <Button
                      onClick={() => navigate(`/projects/${projectId}/sessions/${session.id}/weights`)}
                      variant="secondary"
                      size="small"
                    >
                      📊 Ваги
                    </Button>
                  )}
                  <Button
                    onClick={() => navigate(`/projects/${projectId}/sessions/${session.id}/generate`)}
                    variant="primary"
                    size="small"
                  >
                    {session.generations_count > 0 ? '▶️ Продовжити' : '🚀 Почати'} →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Створити нову сесію</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Назва сесії</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Наприклад: Сесія ${sessions.length + 1} - ${project.category}`}
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={newSession.useDynamicParameters}
                    onChange={(e) => setNewSession({ ...newSession, useDynamicParameters: e.target.checked })}
                    style={{ width: 'auto', marginRight: '5px' }}
                  />
                  <span>
                    🧪 Динамічні параметри (експериментально)
                  </span>
                </label>
                <small style={{ display: 'block', marginTop: '5px', color: '#6b7280', fontSize: '0.875rem' }}>
                  Параметри створюються на основі вашого контенту (фото, промпти) замість універсальних
                </small>
              </div>

              <div className="info-box">
                <strong>💡 Про сесії:</strong>
                <ul>
                  <li>Кожна сесія має власний набір параметрів та ваг</li>
                  <li>Ваги фіксуються на початку сесії</li>
                  <li>Агент вчиться на основі ваших оцінок</li>
                  <li>Нова сесія успадковує знання з попередніх</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Скасувати
              </Button>
              <Button onClick={handleCreateSession}>
                Створити і почати →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionsPage;
