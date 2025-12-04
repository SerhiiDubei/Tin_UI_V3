import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Loading from '../components/Loading';
import './AdminPage.css';

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [allContent, setAllContent] = useState([]);
  const [allRatings, setAllRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // users, content, ratings
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(u =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, users]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

      // Load all data (content_v3 includes ratings in content_v3.rating field)
      const [usersRes, contentRes] = await Promise.all([
        fetch(`${API_URL}/admin/users`).then(r => r.json()),
        fetch(`${API_URL}/admin/all-content`).then(r => r.json())
      ]);

      if (usersRes.success) setUsers(usersRes.data || []);
      if (contentRes.success) {
        const content = contentRes.data || [];
        setAllContent(content);
        // Extract ratings from content (rating field in content_v3)
        // All ratings are stored in content_v3.rating and synced to session_ratings
        const ratings = content.filter(c => c.rating !== null && c.rating !== undefined);
        setAllRatings(ratings);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getUserStats = (userId) => {
    const userContent = allContent.filter(c => c.user_id === userId);
    // Ratings from content_v3 (which are synced to session_ratings)
    const ratings = userContent.filter(c => c.rating !== null && c.rating !== undefined);
    
    const likes = ratings.filter(c => c.rating === 1 || c.rating === 3).length;
    const dislikes = ratings.filter(c => c.rating === -1 || c.rating === -3).length;
    
    return {
      contentCount: userContent.length,
      ratingsCount: ratings.length,
      likes: likes,
      dislikes: dislikes
    };
  };

  const loadUserDetails = async (userId) => {
    try {
      setLoadingDetails(true);
      setSelectedUser(userId);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

      const response = await fetch(`${API_URL}/admin/users/${userId}/details`);
      const result = await response.json();

      if (result.success) {
        setUserDetails(result.data);
      } else {
        console.error('Failed to load user details:', result.error);
      }
    } catch (err) {
      console.error('Error loading user details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeUserModal = () => {
    setSelectedUser(null);
    setUserDetails(null);
  };

  const handleMigrateUrls = async () => {
    if (!window.confirm('Migrate all existing Replicate URLs to permanent Supabase Storage?\n\nThis may take several minutes depending on the amount of content.')) {
      return;
    }

    try {
      setMigrating(true);
      setMigrationResult(null);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

      const response = await fetch(`${API_URL}/admin/migrate-urls`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        setMigrationResult({
          success: true,
          message: `Migration completed! ${result.data.migrated} URLs migrated successfully.`,
          data: result.data
        });
        // Reload content to show new URLs
        await loadAdminData();
      } else {
        setMigrationResult({
          success: false,
          message: `Migration failed: ${result.error}`
        });
      }
    } catch (err) {
      console.error('Migration error:', err);
      setMigrationResult({
        success: false,
        message: `Migration failed: ${err.message}`
      });
    } finally {
      setMigrating(false);
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  if (loading) {
    return (
      <div className="admin-page">
        <Loading fullScreen text="Loading admin data..." />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>👑 Admin Dashboard</h1>
            <p>Manage users and monitor system activity</p>
          </div>
          <Button 
            onClick={() => {
              logout();
              window.location.href = '/login';
            }} 
            variant="secondary"
            size="small"
          >
            🚪 Вийти
          </Button>
        </div>

        {/* System Maintenance */}
        <Card title="🔧 System Maintenance" className="maintenance-card">
          <div className="maintenance-section">
            <div className="maintenance-info">
              <h3>📦 URL Migration (One-Time Only)</h3>
              <p>
                <strong>⚠️ Only for OLD content generated before 27.10.2025!</strong><br/>
                New photos automatically save correctly. This migration is only needed once 
                to preserve old photos (if they're still active).
              </p>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                ✅ All new content automatically uses permanent storage - no action needed!
              </p>
              {migrationResult && (
                <div className={`migration-result ${migrationResult.success ? 'success' : 'error'}`}>
                  <p>{migrationResult.message}</p>
                  {migrationResult.data && (
                    <div className="migration-stats">
                      <span>Total: {migrationResult.data.total}</span>
                      <span>Migrated: {migrationResult.data.migrated}</span>
                      <span>Failed: {migrationResult.data.failed}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              className="btn-primary migrate-btn"
              onClick={handleMigrateUrls}
              disabled={migrating}
            >
              {migrating ? '🔄 Migrating...' : '📦 Migrate URLs to Permanent Storage'}
            </button>
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="stats-overview">
          <Card className="stat-card-admin">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </Card>
          <Card className="stat-card-admin">
            <div className="stat-icon">🖼️</div>
            <div className="stat-value">{allContent.length}</div>
            <div className="stat-label">Total Content</div>
          </Card>
          <Card className="stat-card-admin">
            <div className="stat-icon">⭐</div>
            <div className="stat-value">{allRatings.length}</div>
            <div className="stat-label">Total Ratings</div>
          </Card>
          <Card className="stat-card-admin">
            <div className="stat-icon">📊</div>
            <div className="stat-value">
              {allRatings.length > 0 
                ? `${((allRatings.filter(r => r.rating === 1 || r.rating === 3).length / allRatings.length) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <div className="stat-label">Positive Rate</div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users ({users.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            🖼️ Content ({allContent.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratings')}
          >
            ⭐ Ratings ({allRatings.length})
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card title="👥 Users Management" className="data-card">
            {/* Search */}
            <div className="search-section">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Search by username, email, or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="search-results">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="empty-message">No users found</p>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Content</th>
                      <th>Ratings</th>
                      <th>Like Rate</th>
                      <th>Created</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUsers.map((u) => {
                        const stats = getUserStats(u.id);
                        const likeRate = stats.ratingsCount > 0 
                          ? ((stats.likes / stats.ratingsCount) * 100).toFixed(1) 
                          : '0';
                        return (
                          <tr key={u.id}>
                            <td>
                              <strong>{u.username}</strong>
                              {u.id === user?.id && <span className="badge me">You</span>}
                            </td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td>{stats.contentCount}</td>
                            <td>{stats.ratingsCount}</td>
                            <td>{likeRate}%</td>
                            <td>{formatDate(u.created_at)}</td>
                            <td>{formatDate(u.last_login_at)}</td>
                            <td>
                              <button
                                className="btn-details"
                                onClick={() => loadUserDetails(u.id)}
                              >
                                📊 Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      ← Previous
                    </button>
                    <span className="pagination-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <Card title="🖼️ All Generated Content" className="data-card">
            {allContent.length === 0 ? (
              <p className="empty-message">No content generated yet</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>Prompt</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Rating</th>
                      <th>Session</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allContent.slice(0, 50).map((c) => {
                      const contentUser = users.find(u => u.id === c.user_id);
                      const getRatingBadge = (rating) => {
                        if (rating === 3) return '⭐ Superlike';
                        if (rating === 1) return '👍 Like';
                        if (rating === -1) return '👎 Dislike';
                        if (rating === -3) return '🔄 Reroll';
                        return '-';
                      };
                      return (
                        <tr key={c.id}>
                          <td>
                            <img 
                              src={c.url} 
                              alt="preview" 
                              className="content-preview"
                            />
                          </td>
                          <td className="prompt-cell">
                            {c.original_prompt || 'N/A'}
                          </td>
                          <td>{contentUser?.username || 'Unknown'}</td>
                          <td>{c.type || 'image'}</td>
                          <td>{getRatingBadge(c.rating)}</td>
                          <td className="prompt-cell">{c.session_id?.substring(0, 8) || '-'}</td>
                          <td>{formatDate(c.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Ratings Tab */}
        {activeTab === 'ratings' && (
          <Card title="⭐ All Ratings" className="data-card">
            {allRatings.length === 0 ? (
              <p className="empty-message">No ratings yet</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>User</th>
                      <th>Prompt</th>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Rated At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRatings.slice(0, 100).map((r) => {
                      const ratingUser = users.find(u => u.id === r.user_id);
                      const getRatingDisplay = (rating) => {
                        if (rating === 3) return { text: '⭐ Superlike', class: 'direction-up' };
                        if (rating === 1) return { text: '👍 Like', class: 'direction-right' };
                        if (rating === -1) return { text: '👎 Dislike', class: 'direction-left' };
                        if (rating === -3) return { text: '🔄 Reroll', class: 'direction-down' };
                        return { text: '-', class: '' };
                      };
                      const ratingDisplay = getRatingDisplay(r.rating);
                      return (
                        <tr key={r.id}>
                          <td>
                            <img 
                              src={r.url} 
                              alt="preview" 
                              className="content-preview"
                            />
                          </td>
                          <td>{ratingUser?.username || 'Unknown'}</td>
                          <td className="prompt-cell">
                            {r.original_prompt || 'N/A'}
                          </td>
                          <td>
                            <span className={`direction-badge ${ratingDisplay.class}`}>
                              {ratingDisplay.text}
                            </span>
                          </td>
                          <td className="comment-cell">
                            {r.comment || '-'}
                          </td>
                          <td>{formatDate(r.rated_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={closeUserModal}>
          <div className="modal-content user-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 User Details</h2>
              <button className="modal-close" onClick={closeUserModal}>✕</button>
            </div>

            {loadingDetails ? (
              <div className="modal-body">
                <Loading text="Loading user details..." />
              </div>
            ) : userDetails ? (
              <div className="modal-body user-details-content">
                {/* User Info */}
                <div className="details-section">
                  <h3>📋 Basic Information</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Username:</span>
                      <span className="detail-value">{userDetails.user.username}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{userDetails.user.email}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Full Name:</span>
                      <span className="detail-value">{userDetails.user.full_name || 'Not provided'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Role:</span>
                      <span className={`badge ${userDetails.user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {userDetails.user.role}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">{formatDate(userDetails.user.created_at)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Login:</span>
                      <span className="detail-value">{formatDate(userDetails.user.last_login_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="details-section">
                  <h3>📊 Statistics</h3>
                  <div className="stats-grid-modal">
                    <div className="stat-box">
                      <div className="stat-icon-small">📁</div>
                      <div className="stat-number">{userDetails.stats.totalProjects}</div>
                      <div className="stat-name">Projects</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-icon-small">📂</div>
                      <div className="stat-number">{userDetails.stats.totalSessions}</div>
                      <div className="stat-name">Sessions</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-icon-small">🎨</div>
                      <div className="stat-number">{userDetails.stats.totalContent}</div>
                      <div className="stat-name">Content</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-icon-small">⭐</div>
                      <div className="stat-number">{userDetails.stats.totalRatings}</div>
                      <div className="stat-name">Ratings</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-icon-small">👍</div>
                      <div className="stat-number">{userDetails.stats.likes}</div>
                      <div className="stat-name">Likes</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-icon-small">👎</div>
                      <div className="stat-number">{userDetails.stats.dislikes}</div>
                      <div className="stat-name">Dislikes</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-icon-small">⭐</div>
                      <div className="stat-number">{userDetails.stats.superlikes}</div>
                      <div className="stat-name">Superlikes</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-icon-small">🔄</div>
                      <div className="stat-number">{userDetails.stats.rerolls}</div>
                      <div className="stat-name">Rerolls</div>
                    </div>
                  </div>
                </div>

                {/* Projects */}
                <div className="details-section">
                  <h3>📁 Projects ({userDetails.projects.length})</h3>
                  {userDetails.projects.length === 0 ? (
                    <p className="empty-text">No projects yet</p>
                  ) : (
                    <div className="projects-list-modal">
                      {userDetails.projects.slice(0, 5).map(project => (
                        <div key={project.id} className="project-item-modal">
                          <div className="project-info-modal">
                            <span className="project-tag-modal">{project.tag}</span>
                            <strong>{project.name}</strong>
                            {project.description && (
                              <p className="project-desc-modal">{project.description}</p>
                            )}
                          </div>
                          <div className="project-date-modal">
                            {new Date(project.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      {userDetails.projects.length > 5 && (
                        <p className="more-text">...and {userDetails.projects.length - 5} more</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="details-section">
                  <h3>🎨 Recent Content ({userDetails.recentContent.length})</h3>
                  {userDetails.recentContent.length === 0 ? (
                    <p className="empty-text">No content generated yet</p>
                  ) : (
                    <div className="content-grid-modal">
                      {userDetails.recentContent.slice(0, 8).map(content => {
                        const getRatingEmoji = (rating) => {
                          if (rating === 3) return '⭐';
                          if (rating === 1) return '👍';
                          if (rating === -1) return '👎';
                          if (rating === -3) return '🔄';
                          return '⚪';
                        };
                        return (
                          <div key={content.id} className="content-item-modal">
                            <img 
                              src={content.url} 
                              alt="content" 
                              className="content-image-modal"
                            />
                            <div className="content-stats-modal">
                              <span>{getRatingEmoji(content.rating)}</span>
                              <span>{content.rated_at ? new Date(content.rated_at).toLocaleDateString() : 'Not rated'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="modal-body">
                <p className="empty-message">Failed to load user details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
