import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import './LoginPage.css';

function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        // Registration
        if (password !== confirmPassword) {
          throw new Error('Паролі не співпадають');
        }

        if (password.length < 6) {
          throw new Error('Пароль має бути мінімум 6 символів');
        }

        await register(username, email, password, fullName);
        navigate('/projects');
      } else {
        // Login
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        // Save user data
        login(data.user);

        // Redirect based on role
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/projects');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setUsername('');
    setEmail('');
    setFullName('');
    setPassword('');
    setConfirmPassword('');
  };

  // Quick login buttons for testing
  const quickLogin = async (role) => {
    const credentials = role === 'admin' 
      ? { username: 'admin', password: 'admin123' }
      : { username: 'testuser', password: 'test123' };
    
    setUsername(credentials.username);
    setPassword(credentials.password);
    
    // Auto-submit after setting values
    setTimeout(() => {
      const form = document.getElementById('login-form');
      if (form) form.requestSubmit();
    }, 100);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🔥 AI Feedback Platform</h1>
          <p>{isRegisterMode ? 'Створіть новий акаунт' : 'Увійдіть для генерації контенту'}</p>
        </div>

        <Card className="login-card">
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-btn ${!isRegisterMode ? 'active' : ''}`}
              onClick={() => !isRegisterMode || toggleMode()}
            >
              🔐 Логін
            </button>
            <button
              type="button"
              className={`mode-btn ${isRegisterMode ? 'active' : ''}`}
              onClick={() => isRegisterMode || toggleMode()}
            >
              ✨ Реєстрація
            </button>
          </div>

          <form id="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegisterMode ? "Оберіть username" : "Введіть username"}
                required
                autoComplete="username"
              />
            </div>

            {isRegisterMode && (
              <>
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fullName">Повне ім'я (необов'язково)</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ваше ім'я"
                    autoComplete="name"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="password">Пароль *</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegisterMode ? "Мінімум 6 символів" : "Введіть пароль"}
                required
                autoComplete={isRegisterMode ? "new-password" : "current-password"}
              />
            </div>

            {isRegisterMode && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Підтвердіть пароль *</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторіть пароль"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <Button 
              type="submit" 
              fullWidth 
              disabled={loading || !username || !password || (isRegisterMode && (!email || !confirmPassword))}
            >
              {loading 
                ? '🔄 Завантаження...' 
                : isRegisterMode 
                  ? '✨ Зареєструватися' 
                  : '🚀 Увійти'}
            </Button>
          </form>

          {!isRegisterMode && (
            <div className="quick-login-section">
              <p className="quick-login-title">Швидкий вхід (для тестування):</p>
              <div className="quick-login-buttons">
                <Button 
                  variant="secondary" 
                  size="small"
                  onClick={() => quickLogin('user')}
                  disabled={loading}
                >
                  👤 Login as User
                </Button>
                <Button 
                  variant="warning" 
                  size="small"
                  onClick={() => quickLogin('admin')}
                  disabled={loading}
                >
                  👑 Login as Admin
                </Button>
              </div>
            </div>
          )}
        </Card>

        {!isRegisterMode && (
          <div className="login-info">
            <h3>Тестові акаунти:</h3>
            <ul>
              <li><strong>Admin:</strong> username: <code>admin</code>, password: <code>admin123</code></li>
              <li><strong>User:</strong> username: <code>testuser</code>, password: <code>test123</code></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
