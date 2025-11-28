import React, { useState, useEffect, useCallback } from 'react';
import { projectsAPI, sessionsAPI } from '../services/api-v3';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Loading from '../components/Loading';
import './SettingsPage.css';

function SettingsPage() {
  const { user } = useAuth();
  const [userId] = useState(user?.id || 'demo-user-123');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadUserStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Завантажити всі проекти користувача
      const projectsResponse = await projectsAPI.getAll(userId);
      
      if (projectsResponse.success) {
        const projects = projectsResponse.data;
        
        let totalSessions = 0;
        let totalGenerations = 0;
        let totalRatings = 0;
        let positiveRatings = 0;
        let negativeRatings = 0;
        
        // Підрахувати статистику з кожного проекту
        for (const project of projects) {
          totalSessions += project.sessions_count || 0;
          totalGenerations += project.generations_count || 0;
          totalRatings += project.ratings_count || 0;
          
          // Отримати деталі сесій для підрахунку позитивних/негативних оцінок
          const sessionsResponse = await sessionsAPI.getByProject(project.id);
          if (sessionsResponse.success) {
            for (const session of sessionsResponse.data) {
              // Можна додатково підрахувати позитивні/негативні з content_v3
              // Але це потребує додаткового API
            }
          }
        }
        
        setStats({
          totalProjects: projects.length,
          totalSessions,
          totalGenerations,
          totalRatings,
          positiveRatings,
          negativeRatings,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to load user stats:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  const handleExportData = () => {
    const data = {
      userId,
      stats,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tin-ai-data-${userId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>⚙️ Settings</h1>

        {/* User Profile */}
        <Card title="👤 User Profile" className="settings-card">
          <div className="setting-group">
            <p><strong>Username:</strong> {user?.username}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role}</p>
            <p><strong>User ID:</strong> <code>{userId}</code></p>
          </div>
        </Card>

        {/* Stats Summary */}
        <Card title="📊 Ваша статистика" className="settings-card">
          {loading ? (
            <Loading size="small" text="Завантаження статистики..." />
          ) : stats ? (
            <div className="insights-summary">
              <div className="insight-stat">
                <span className="stat-label">Проектів:</span>
                <span className="stat-value">{stats.totalProjects || 0}</span>
              </div>
              <div className="insight-stat">
                <span className="stat-label">Сесій:</span>
                <span className="stat-value">{stats.totalSessions || 0}</span>
              </div>
              <div className="insight-stat">
                <span className="stat-label">Згенеровано:</span>
                <span className="stat-value">{stats.totalGenerations || 0}</span>
              </div>
              <div className="insight-stat">
                <span className="stat-label">Оцінок:</span>
                <span className="stat-value">{stats.totalRatings || 0}</span>
              </div>
              <div className="insight-stat">
                <span className="stat-label">Оновлено:</span>
                <span className="stat-value">
                  {stats.updatedAt
                    ? new Date(stats.updatedAt).toLocaleString('uk-UA')
                    : 'Ніколи'}
                </span>
              </div>
            </div>
          ) : (
            <p className="empty-message">Немає даних. Почніть генерувати контент!</p>
          )}
        </Card>

        {/* Data Management */}
        <Card title="📊 Управління даними" className="settings-card">
          <div className="setting-group">
            <div className="action-buttons">
              <Button 
                variant="secondary" 
                onClick={handleExportData}
                disabled={!stats}
              >
                📥 Експортувати дані
              </Button>
            </div>
            <p className="setting-description">
              Експортуйте свої дані для збереження резервної копії статистики та налаштувань.
            </p>
          </div>
        </Card>

        {/* About */}
        <Card title="ℹ️ Про систему" className="settings-card">
          <div className="about-content">
            <h3>TIN AI Platform V3</h3>
            <p>
              AI-платформа що навчається на ваших уподобаннях і генерує персоналізований контент.
              Система використовує динамічні ваги параметрів для покращення результатів з кожною оцінкою.
            </p>
            <div className="tech-stack">
              <h4>Технології:</h4>
              <ul>
                <li>Frontend: React 18</li>
                <li>Backend: Node.js + Express</li>
                <li>Database: PostgreSQL (Supabase)</li>
                <li>AI: OpenAI GPT-4o + Replicate (Seedream 4, Flux, etc.)</li>
                <li>Learning: Dynamic Weight System</li>
              </ul>
            </div>
            <div className="version-info">
              <p><strong>Версія:</strong> 3.0.0</p>
              <p><strong>Особливості V3:</strong></p>
              <ul>
                <li>✅ Проекти та сесії для організації</li>
                <li>✅ Streaming генерація (перше фото за 1-2 хв)</li>
                <li>✅ Система ваг з instant оновленням</li>
                <li>✅ Коментарі з високим пріоритетом</li>
                <li>✅ Візуалізація історії навчання</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SettingsPage;
