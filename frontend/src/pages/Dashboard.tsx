import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

interface FormItem {
  id: string;
  title: string;
  description: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  categories: string[];
  feedbackCount: number;
}

interface FeedbackItem {
  id: string;
  formId: string;
  formTitle: string;
  category: string;
  comment: string;
  email: string | null;
  rating: number | null;
  status: 'RECEIVED' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [forms, setForms] = useState<FormItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  
  const [selectedFormFilter, setSelectedFormFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Forms
      const formsRes = await fetch(`${API_BASE}/forms`, { credentials: 'include' });
      if (!formsRes.ok) throw new Error('Failed to fetch forms');
      const formsData = await formsRes.json();

      // Fetch Feedbacks
      const feedbackUrl = selectedFormFilter === 'all' 
        ? `${API_BASE}/feedback` 
        : `${API_BASE}/feedback?formId=${selectedFormFilter}`;
      
      const feedbackRes = await fetch(feedbackUrl, { credentials: 'include' });
      if (!feedbackRes.ok) throw new Error('Failed to fetch feedback data');
      const feedbackData = await feedbackRes.json();

      if (formsData.success) setForms(formsData.data);
      if (feedbackData.success) setFeedbacks(feedbackData.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred loading the dashboard.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedFormFilter]);

  const handleCopyLink = (slug: string, id: string) => {
    const publicUrl = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE}/feedback/${feedbackId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include'
      });

      if (response.ok) {
        // Update local state
        setFeedbacks(prev => 
          prev.map(f => f.id === feedbackId ? { ...f, status: newStatus as 'RECEIVED' | 'IN_PROGRESS' | 'RESOLVED' } : f)
        );
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Metrics Calculations
  const totalForms = forms.length;
  const activeForms = forms.filter(f => f.isActive).length;
  const totalFeedbacks = feedbacks.length;

  return (
    <div className="layout-container">
      {/* Navigation */}
      <nav className="nav-bar">
        <Link to="/dashboard" className="nav-logo">🐮 Acowale CRM</Link>
        <div className="nav-links">
          <span className="nav-user">
            Business: <strong>{user?.businessName}</strong> ({user?.email})
          </span>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-container">
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>Feedback Dashboard</h1>
            <p>Monitor your active forms and review incoming user suggestions.</p>
          </div>
          <Link to="/forms/new" className="btn btn-primary">
            ➕ Create New Form
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{totalForms}</div>
            <div className="metric-label">Total Forms</div>
          </div>
          <div className="metric-card" style={{ borderTop: '3px solid var(--success)' }}>
            <div className="metric-value">{activeForms}</div>
            <div className="metric-label">Active Forms</div>
          </div>
          <div className="metric-card" style={{ borderTop: '3px solid var(--primary)' }}>
            <div className="metric-value">{totalFeedbacks}</div>
            <div className="metric-label">Feedbacks Filtered</div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="main-grid">
          {/* Left Column: Form List */}
          <div>
            <div className="list-section-header">
              <h2>Your Feedback Forms</h2>
            </div>
            
            {loading && forms.length === 0 ? (
              <div className="spinner" style={{ margin: '40px auto' }}></div>
            ) : forms.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px var(--text-muted)' }}>
                <p style={{ color: 'var(--text-muted)' }}>No forms found. Create your first feedback form to get started!</p>
              </div>
            ) : (
              <div className="forms-list">
                {forms.map(form => (
                  <div key={form.id} className="form-item-card">
                    <div className="form-item-top">
                      <div>
                        <div className="form-item-title">{form.title}</div>
                        {form.description && <div className="form-item-desc">{form.description}</div>}
                      </div>
                      <span className={`form-item-status ${form.isActive ? 'status-active' : 'status-inactive'}`}>
                        {form.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="public-link-box">
                      <span className="public-link-text">{`${window.location.origin}/f/${form.slug}`}</span>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleCopyLink(form.slug, form.id)}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', minWidth: '85px' }}
                      >
                        {copiedId === form.id ? 'Copied! ✓' : 'Copy link'}
                      </button>
                    </div>

                    <div className="form-item-meta">
                      <span>Submissions: <strong>{form.feedbackCount}</strong></span>
                      <span>Created: {new Date(form.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="form-item-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <Link to={`/forms/${form.id}/analytics`} className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.85rem', textAlign: 'center', textDecoration: 'none' }}>
                        📊 View Analytics
                      </Link>
                      <Link to={`/forms/${form.id}/edit`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit Settings">
                        ✏️
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Feedback Submissions */}
          <div>
            <div className="list-section-header">
              <h2>Feedback Inbox</h2>
              <div>
                <select 
                  className="form-select" 
                  value={selectedFormFilter} 
                  onChange={(e) => setSelectedFormFilter(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
                >
                  <option value="all">All Forms</option>
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading && feedbacks.length === 0 ? (
              <div className="spinner" style={{ margin: '40px auto' }}></div>
            ) : feedbacks.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px var(--text-muted)' }}>
                <p style={{ color: 'var(--text-muted)' }}>No feedback submissions found.</p>
              </div>
            ) : (
              <div className="feedbacks-list">
                {feedbacks.map(feedback => (
                  <div key={feedback.id} className="feedback-card">
                    <div className="feedback-header">
                      <div className="feedback-meta">
                        <span className="feedback-form-title">{feedback.formTitle}</span>
                        <span className="feedback-email">{feedback.email || 'Anonymous Submitter'}</span>
                        <span className="feedback-date">{new Date(feedback.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="feedback-rating">
                        {feedback.rating ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ opacity: i < (feedback.rating || 0) ? 1 : 0.2 }}>★</span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No rating</span>
                        )}
                      </div>
                    </div>

                    <div className="feedback-comment">
                      {feedback.comment}
                    </div>

                    <div className="feedback-footer">
                      <span className="feedback-badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                        Category: <strong>{feedback.category}</strong>
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
                        <select
                          className="status-select-btn"
                          value={feedback.status}
                          onChange={(e) => handleStatusChange(feedback.id, e.target.value)}
                        >
                          <option value="RECEIVED">Received</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
