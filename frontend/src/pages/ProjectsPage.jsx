import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsAPI } from '../services/api-v3';
import Button from '../components/Button';
import Card from '../components/Card';
import Loading from '../components/Loading';
import './ProjectsPage.css';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    category: '',
    description: ''
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getAll(user.id);
      if (response.success) {
        setProjects(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async () => {
    if (!newProject.name.trim() || !newProject.category.trim()) {
      alert('Будь ласка, введіть назву та категорію проєкту');
      return;
    }

    try {
      const response = await projectsAPI.create({
        userId: user.id,  // Backend очікує camelCase 'userId'
        name: newProject.name,
        tag: newProject.category,
        description: newProject.description
      });

      if (response.success) {
        setProjects([response.data, ...projects]);
        setShowCreateModal(false);
        setNewProject({ name: '', category: '', description: '' });
        
        // Перехід до Sessions після створення проєкту
        navigate(`/projects/${response.data.id}/sessions`);
      }
    } catch (err) {
      alert('Помилка створення проєкту: ' + err.message);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Видалити проєкт? Всі сесії будуть також видалені.')) {
      return;
    }

    try {
      await projectsAPI.delete(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      alert('Помилка видалення: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="projects-page">
        <Loading text="Завантаження проєктів..." />
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="projects-container">
        <div className="projects-header">
          <div>
            <h1>📁 Мої Проєкти</h1>
            <p>Керуйте своїми AI проєктами та сесіями генерації</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="large">
            ➕ Створити Проєкт
          </Button>
        </div>

        {error && (
          <div className="error-banner">
            ❌ {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h2>Немає проєктів</h2>
            <p>Створіть свій перший проєкт для початку роботи з AI генерацією</p>
            <Button onClick={() => setShowCreateModal(true)} size="large">
              🚀 Створити перший проєкт
            </Button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <Card key={project.id} className="project-card">
                <div className="project-card-header">
                  <div className="project-info">
                    <span className="project-category-badge">{project.category}</span>
                    <h3 className="project-name">{project.name}</h3>
                  </div>
                  <button
                    className="project-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    title="Видалити проєкт"
                  >
                    🗑️
                  </button>
                </div>

                {project.description && (
                  <p className="project-description">{project.description}</p>
                )}

                <div className="project-stats">
                  <div className="stat-item">
                    <span className="stat-icon">📊</span>
                    <span className="stat-value">{project.sessions_count || 0}</span>
                    <span className="stat-label">Сесій</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">🖼️</span>
                    <span className="stat-value">{project.generations_count || 0}</span>
                    <span className="stat-label">Контенту</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">⭐</span>
                    <span className="stat-value">{project.ratings_count || 0}</span>
                    <span className="stat-label">Оцінок</span>
                  </div>
                </div>

                <div className="project-meta">
                  <span className="meta-date">
                    Створено: {new Date(project.created_at).toLocaleDateString('uk-UA')}
                  </span>
                </div>

                <div className="project-actions">
                  <Button
                    onClick={() => navigate(`/projects/${project.id}/sessions`)}
                    variant="primary"
                    size="small"
                  >
                    Відкрити →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Створити новий проєкт</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Назва проєкту *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Наприклад: Dating Photos 2024"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Категорія *</label>
                <select
                  className="form-select"
                  value={newProject.category}
                  onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                >
                  <option value="">Оберіть категорію</option>
                  <option value="dating">💑 Dating</option>
                  <option value="cars">🚗 Cars</option>
                  <option value="insurance">🛡️ Insurance</option>
                  <option value="nature">🌲 Nature</option>
                  <option value="food">🍔 Food</option>
                  <option value="architecture">🏛️ Architecture</option>
                  <option value="space">🚀 Space</option>
                  <option value="general">🎨 General</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Опис (необов'язково)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Опишіть мету вашого проєкту..."
                  rows={3}
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Скасувати
              </Button>
              <Button onClick={handleCreateProject}>
                Створити проєкт
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
