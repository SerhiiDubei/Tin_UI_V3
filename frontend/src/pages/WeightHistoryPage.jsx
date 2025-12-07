import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsAPI, projectsAPI } from '../services/api-v3';
import Button from '../components/Button';
import Card from '../components/Card';
import Loading from '../components/Loading';
import './WeightHistoryPage.css';

function WeightHistoryPage() {
  const { projectId, sessionId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [session, setSession] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedParams, setSelectedParams] = useState([]);
  const [showTop, setShowTop] = useState(10);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load project
      const projectResponse = await projectsAPI.getById(projectId);
      if (projectResponse.success) {
        setProject(projectResponse.data);
      }

      // Load session
      const sessionResponse = await sessionsAPI.getById(sessionId);
      if (sessionResponse.success) {
        setSession(sessionResponse.data);
      }

      // Load weight history
      const historyResponse = await sessionsAPI.getWeightHistory(sessionId);
      if (historyResponse.success) {
        setHistoryData(historyResponse.data);
        
        // Select top 5 parameters by default (most changed)
        const params = historyResponse.data.parameters || [];
        const topParams = params
          .map(param => {
            const history = historyResponse.data.history[param] || [];
            const firstWeight = history[0]?.weight || 100;
            const lastWeight = history[history.length - 1]?.weight || 100;
            return {
              param,
              change: Math.abs(lastWeight - firstWeight)
            };
          })
          .sort((a, b) => b.change - a.change)
          .slice(0, 5)
          .map(p => p.param);
        
        setSelectedParams(topParams);
      } else {
        throw new Error(historyResponse.error || 'Failed to load history');
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleParam = (param) => {
    if (selectedParams.includes(param)) {
      setSelectedParams(selectedParams.filter(p => p !== param));
    } else {
      setSelectedParams([...selectedParams, param]);
    }
  };

  const selectAll = () => {
    setSelectedParams(historyData.parameters);
  };

  const clearAll = () => {
    setSelectedParams([]);
  };

  if (loading) {
    return (
      <div className="weight-history-page">
        <Loading text="Завантаження історії ваг..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="weight-history-page">
        <Card>
          <div className="error-state">
            <h2>❌ Помилка</h2>
            <p>{error}</p>
            <Button onClick={() => navigate(-1)}>← Назад</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!historyData || historyData.snapshots.length === 0) {
    return (
      <div className="weight-history-page">
        <Card>
          <div className="empty-state">
            <h2>📊 Немає даних</h2>
            <p>Оцініть згенерований контент щоб побачити як змінюються ваги параметрів</p>
            <Button onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/generate`)}>
              🚀 Генерувати контент
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: historyData.snapshots.map((s, i) => `#${s.index}`),
    datasets: selectedParams.map((param, idx) => {
      const history = historyData.history[param] || [];
      const color = getParamColor(idx);
      
      return {
        label: formatParamName(param),
        data: history.map(h => h.weight),
        borderColor: color,
        backgroundColor: color + '20',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      };
    })
  };

  // Sort parameters by change amount
  const sortedParams = [...historyData.parameters].sort((a, b) => {
    const historyA = historyData.history[a] || [];
    const historyB = historyData.history[b] || [];
    const changeA = Math.abs((historyA[historyA.length - 1]?.weight || 100) - (historyA[0]?.weight || 100));
    const changeB = Math.abs((historyB[historyB.length - 1]?.weight || 100) - (historyB[0]?.weight || 100));
    return changeB - changeA;
  });

  return (
    <div className="weight-history-page">
      <div className="weight-history-container">
        {/* Header */}
        <div className="page-header">
          <div>
            <Button onClick={() => navigate(-1)} size="small">
              ← Назад
            </Button>
            <h1>📊 Історія змін ваг параметрів</h1>
            <div className="breadcrumbs">
              <span className="breadcrumb">{project?.name}</span>
              <span className="separator">›</span>
              <span className="breadcrumb">{session?.name || 'Session'}</span>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-box">
              <div className="stat-value">{historyData.snapshots.length}</div>
              <div className="stat-label">Оцінок</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{historyData.parameters.length}</div>
              <div className="stat-label">Параметрів</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <Card className="chart-card">
          <div className="chart-header">
            <h2>📈 Графік змін ваг</h2>
            <div className="chart-controls">
              <Button onClick={selectAll} size="small">Всі</Button>
              <Button onClick={clearAll} size="small">Очистити</Button>
            </div>
          </div>
          
          {selectedParams.length === 0 ? (
            <div className="empty-chart">
              <p>Виберіть параметри для відображення на графіку</p>
            </div>
          ) : (
            <div className="chart-wrapper">
              <SimpleLineChart data={chartData} snapshots={historyData.snapshots} />
            </div>
          )}
        </Card>

        {/* Parameters List */}
        <Card className="parameters-card">
          <div className="parameters-header">
            <h2>🎯 Параметри (сортовано за зміною)</h2>
            <div className="show-controls">
              <button 
                className={showTop === 10 ? 'active' : ''}
                onClick={() => setShowTop(10)}
              >
                Топ 10
              </button>
              <button 
                className={showTop === 20 ? 'active' : ''}
                onClick={() => setShowTop(20)}
              >
                Топ 20
              </button>
              <button 
                className={showTop === 999 ? 'active' : ''}
                onClick={() => setShowTop(999)}
              >
                Всі
              </button>
            </div>
          </div>

          <div className="parameters-grid">
            {sortedParams.slice(0, showTop).map((param, idx) => {
              const history = historyData.history[param] || [];
              const firstWeight = history[0]?.weight || 100;
              const lastWeight = history[history.length - 1]?.weight || 100;
              const change = lastWeight - firstWeight;
              const isSelected = selectedParams.includes(param);
              
              return (
                <div
                  key={param}
                  className={`param-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleParam(param)}
                >
                  <div className="param-header">
                    <div 
                      className="param-color" 
                      style={{ backgroundColor: getParamColor(selectedParams.indexOf(param)) }}
                    ></div>
                    <h3>{formatParamName(param)}</h3>
                  </div>
                  
                  <div className="param-stats">
                    <div className="param-stat">
                      <span className="label">Початок:</span>
                      <span className="value">{firstWeight}</span>
                    </div>
                    <div className="param-stat">
                      <span className="label">Зараз:</span>
                      <span className="value weight-current">{lastWeight}</span>
                    </div>
                    <div className="param-stat">
                      <span className="label">Зміна:</span>
                      <span className={`value weight-change ${change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'}`}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    </div>
                  </div>

                  <div className="param-progress">
                    <div 
                      className="param-progress-bar" 
                      style={{ 
                        width: `${(lastWeight / 200) * 100}%`,
                        backgroundColor: lastWeight > 100 ? '#27ae60' : lastWeight < 100 ? '#e74c3c' : '#95a5a6'
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Timeline */}
        <Card className="timeline-card">
          <h2>📅 Хронологія оцінок</h2>
          <div className="timeline">
            {historyData.snapshots.map((snapshot, idx) => (
              <div key={snapshot.contentId} className="timeline-item">
                <div className="timeline-marker">
                  <div className={`timeline-dot rating-${snapshot.rating >= 0 ? 'positive' : 'negative'}`}>
                    {snapshot.rating > 0 ? '+' : ''}{snapshot.rating}
                  </div>
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-index">#{snapshot.index}</span>
                    <span className="timeline-date">
                      {new Date(snapshot.timestamp).toLocaleString('uk-UA')}
                    </span>
                  </div>
                  {snapshot.comment && (
                    <div className="timeline-comment">
                      💬 {snapshot.comment}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Simple Line Chart Component (без додаткових бібліотек)
function SimpleLineChart({ data, snapshots }) {
  const canvasRef = React.useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data.datasets.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart dimensions
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Y-axis range (0-200 for weights)
    const minY = 0;
    const maxY = 200;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      
      // Y-axis labels
      const value = maxY - (maxY - minY) / 4 * i;
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), padding.left - 10, y + 4);
    }

    // Vertical grid lines
    const xStep = chartWidth / (data.labels.length - 1 || 1);
    data.labels.forEach((label, i) => {
      const x = padding.left + xStep * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
      
      // X-axis labels
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, height - padding.bottom + 20);
    });

    // Draw lines
    data.datasets.forEach(dataset => {
      ctx.strokeStyle = dataset.borderColor;
      ctx.fillStyle = dataset.backgroundColor;
      ctx.lineWidth = 2;

      // Draw line
      ctx.beginPath();
      dataset.data.forEach((value, i) => {
        const x = padding.left + xStep * i;
        const y = padding.top + chartHeight - ((value - minY) / (maxY - minY)) * chartHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw points
      ctx.fillStyle = dataset.borderColor;
      dataset.data.forEach((value, i) => {
        const x = padding.left + xStep * i;
        const y = padding.top + chartHeight - ((value - minY) / (maxY - minY)) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, dataset.pointRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw legend
    let legendX = padding.left;
    const legendY = 20;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    
    data.datasets.forEach(dataset => {
      // Color box
      ctx.fillStyle = dataset.borderColor;
      ctx.fillRect(legendX, legendY - 8, 12, 12);
      
      // Label
      ctx.fillStyle = '#333';
      ctx.fillText(dataset.label, legendX + 18, legendY + 2);
      
      legendX += ctx.measureText(dataset.label).width + 40;
    });

  }, [data, snapshots]);

  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={400}
      style={{ width: '100%', height: 'auto' }}
    />
  );
}

// Helper functions
function getParamColor(index) {
  const colors = [
    '#667eea', '#f56565', '#48bb78', '#ed8936', '#9f7aea',
    '#38b2ac', '#f687b3', '#4299e1', '#ed64a6', '#ecc94b',
    '#fc8181', '#68d391', '#f6ad55', '#b794f4', '#4fd1c5'
  ];
  return colors[index % colors.length];
}

function formatParamName(param) {
  const [category, value] = param.split('.');
  return `${category}: ${value.replace(/_/g, ' ')}`;
}

export default WeightHistoryPage;









