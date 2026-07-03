import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

interface FormDetails {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  categories: string[];
}

interface AnalyticsData {
  totalCount: number;
  averageRating: number;
  categoryDistribution: Record<string, number>;
  statusBreakdown: Record<string, number>;
  trend: Array<{ date: string; count: number }>;
}

interface FeedbackSubmission {
  id: string;
  category: string;
  comment: string;
  email: string | null;
  rating: number | null;
  status: 'RECEIVED' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// -------------------------------------------------------------
// Donut Chart Component
// -------------------------------------------------------------
const DonutChart: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [_, val]) => sum + val, 0);

  if (total === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: 'var(--text-muted)',
        }}
      >
        No category data available
      </div>
    );
  }

  const colors = ['#818cf8', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#a855f7'];
  const radius = 60;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div style={{ position: 'relative', width: '180px', height: '180px' }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={strokeWidth}
          />
          {entries.map(([key, val], idx) => {
            const pct = val / total;
            const strokeDashoffset = circumference - pct * circumference;
            const rotation = accumulatedPercent * 360;
            accumulatedPercent += pct;

            return (
              <circle
                key={key}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={colors[idx % colors.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: '90px 90px',
                  transition: 'stroke-dashoffset 0.5s ease',
                }}
              />
            );
          })}
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            {total}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Feedback</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px 16px',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {entries.map(([key, val], idx) => (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: colors[idx % colors.length],
              }}
            ></span>
            <span style={{ color: 'var(--text-muted)' }}>{key}:</span>
            <strong style={{ color: 'var(--text-main)' }}>
              {val} ({Math.round((val / total) * 100)}%)
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Line Chart Component (30-day Trend)
// -------------------------------------------------------------
const TrendChart: React.FC<{ trend: Array<{ date: string; count: number }> }> = ({ trend }) => {
  if (trend.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '220px',
          color: 'var(--text-muted)',
        }}
      >
        No trend data available
      </div>
    );
  }

  const width = 500;
  const height = 200;
  const paddingLeft = 30;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const counts = trend.map((t) => t.count);
  const maxCount = Math.max(...counts, 4);

  const points = trend.map((t, index) => {
    const x = paddingLeft + (index / (trend.length - 1 || 1)) * chartWidth;
    const y = paddingTop + chartHeight - (t.count / maxCount) * chartHeight;
    return { x, y, date: t.date, count: t.count };
  });

  const pathD = points.reduce((acc, p, index) => {
    return acc + (index === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, '');

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
      : '';

  const gridLines = Array.from({ length: 4 }).map((_, idx) => {
    const yVal = paddingTop + (idx / 3) * chartHeight;
    const countVal = Math.round(maxCount - (idx / 3) * maxCount);
    return { y: yVal, val: countVal };
  });

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: '400px' }}
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {gridLines.map((line, idx) => (
          <g key={idx}>
            <text x="5" y={line.y + 3} fill="var(--text-muted)" fontSize="9" textAnchor="start">
              {line.val}
            </text>
            <line
              x1={paddingLeft}
              y1={line.y}
              x2={width - paddingRight}
              y2={line.y}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="3"
            />
          </g>
        ))}

        {areaD && <path d={areaD} fill="url(#trendGradient)" />}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#818cf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p, idx) => {
          const isKeyPoint =
            idx === 0 || idx === Math.floor(points.length / 2) || idx === points.length - 1;
          const formattedDate = p.date.split('-').slice(1).join('/');

          return (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#818cf8" strokeWidth="2" />
              <title>{`${p.date}: ${p.count} submissions`}</title>
              {isKeyPoint && (
                <text
                  x={p.x}
                  y={height - 5}
                  fill="var(--text-muted)"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {formattedDate}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// -------------------------------------------------------------
// Main Analytics Dashboard Component
// -------------------------------------------------------------
export const Analytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // API states
  const [form, setForm] = useState<FormDetails | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Filters & Page state
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // UI state
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset page on new search
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // Fetch Form details & Analytics on mount / id change
  useEffect(() => {
    if (!id) return;

    const fetchCoreDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Form settings details
        const formRes = await fetch(`${API_BASE}/forms/${id}`, { credentials: 'include' });
        if (!formRes.ok) {
          if (formRes.status === 404) throw new Error('Form not found or access denied');
          throw new Error('Failed to retrieve form configurations');
        }
        const formData = await formRes.json();

        // 2. Fetch Aggregated Analytics
        const analyticsRes = await fetch(`${API_BASE}/forms/${id}/analytics?days=30`, {
          credentials: 'include',
        });
        if (!analyticsRes.ok) throw new Error('Failed to load form analytics');
        const analyticsData = await analyticsRes.json();

        if (formData.success) setForm(formData.data);
        if (analyticsData.success) setAnalytics(analyticsData.data);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'An error occurred loading analytics data.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchCoreDetails();
  }, [id]);

  // Fetch feedback submissions list whenever search, filters, or pages change
  useEffect(() => {
    if (!id) return;

    const fetchSubmissionsList = async () => {
      try {
        setTableLoading(true);
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: '5',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (categoryFilter) queryParams.append('category', categoryFilter);
        if (statusFilter) queryParams.append('status', statusFilter);
        if (debouncedSearch) queryParams.append('search', debouncedSearch);

        const response = await fetch(`${API_BASE}/forms/${id}/feedback?${queryParams.toString()}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch submissions list');

        const resData = await response.json();
        if (resData.success) {
          setSubmissions(resData.data);
          setPagination(resData.meta);
        }
      } catch (err: unknown) {
        console.error('Error fetching submissions list:', err);
      } finally {
        setTableLoading(false);
      }
    };

    fetchSubmissionsList();
  }, [id, categoryFilter, statusFilter, debouncedSearch, currentPage]);

  const handleStatusChange = async (submissionId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE}/feedback/${submissionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });

      if (response.ok) {
        // Update list status locally
        setSubmissions((prev) =>
          prev.map((item) =>
            item.id === submissionId
              ? { ...item, status: newStatus as 'RECEIVED' | 'IN_PROGRESS' | 'RESOLVED' }
              : item,
          ),
        );

        // Update aggregated count locally
        if (analytics) {
          const updatedBreakdown = { ...analytics.statusBreakdown };
          // Increment new status, decrement old status if present
          const oldItem = submissions.find((item) => item.id === submissionId);
          if (oldItem) {
            const oldStatus = oldItem.status;
            if (updatedBreakdown[oldStatus]) updatedBreakdown[oldStatus]--;
            updatedBreakdown[newStatus] = (updatedBreakdown[newStatus] || 0) + 1;
            setAnalytics({ ...analytics, statusBreakdown: updatedBreakdown });
          }
        }
      } else {
        const resData = await response.json();
        alert(resData.error || 'Failed to update submission status');
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

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Analyzing submission metrics...</p>
      </div>
    );
  }

  if (error || !form || !analytics) {
    return (
      <div className="layout-container">
        <nav className="nav-bar">
          <Link to="/dashboard" className="nav-logo">
            🐮 Acowale CRM
          </Link>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </nav>
        <main className="dashboard-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div
            className="alert alert-danger"
            style={{ maxWidth: '500px', margin: '0 auto 24px auto' }}
          >
            {error || 'Form metrics could not be loaded.'}
          </div>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  // Breakdown statistics values
  const totalSubmissions = analytics.totalCount;
  const averageRating = analytics.averageRating
    ? Number(analytics.averageRating).toFixed(1)
    : 'N/A';
  const receivedCount = analytics.statusBreakdown.RECEIVED || 0;
  const inProgressCount = analytics.statusBreakdown.IN_PROGRESS || 0;

  return (
    <div className="layout-container">
      {/* Navigation */}
      <nav className="nav-bar">
        <Link to="/dashboard" className="nav-logo">
          🐮 Acowale CRM
        </Link>
        <div className="nav-links">
          <span className="nav-user">
            Business: <strong>{user?.businessName}</strong> ({user?.email})
          </span>
          <button
            className="btn btn-secondary"
            onClick={handleLogout}
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="dashboard-container">
        {/* Header Section */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            to="/dashboard"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div
          className="dashboard-header"
          style={{ alignItems: 'flex-start', marginBottom: '32px' }}
        >
          <div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}
            >
              <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                {form.title} Metrics
              </h1>
              <span
                className={`form-item-status ${form.isActive ? 'status-active' : 'status-inactive'}`}
              >
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {form.description && <p style={{ color: 'var(--text-muted)' }}>{form.description}</p>}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href={`${window.location.origin}/f/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              🔗 Public Page
            </a>
            <Link
              to={`/forms/${form.id}/edit`}
              className="btn btn-primary"
              style={{ textDecoration: 'none' }}
            >
              ✏️ Edit Form Settings
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="metrics-grid" style={{ marginBottom: '32px' }}>
          <div className="metric-card">
            <div className="metric-value">{totalSubmissions}</div>
            <div className="metric-label">Total Feedback</div>
          </div>
          <div className="metric-card" style={{ borderTop: '3px solid var(--warning)' }}>
            <div className="metric-value">{receivedCount}</div>
            <div className="metric-label">Received</div>
          </div>
          <div className="metric-card" style={{ borderTop: '3px solid #818cf8' }}>
            <div className="metric-value">{inProgressCount}</div>
            <div className="metric-label">In Progress</div>
          </div>
          <div className="metric-card" style={{ borderTop: '3px solid var(--accent)' }}>
            <div
              className="metric-value"
              style={{ color: averageRating !== 'N/A' ? 'var(--warning)' : 'inherit' }}
            >
              {averageRating !== 'N/A' ? `${averageRating} ★` : 'N/A'}
            </div>
            <div className="metric-label">Avg Rating</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="main-grid" style={{ marginBottom: '40px' }}>
          {/* Donut Chart Card */}
          <div className="card">
            <h3
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                fontSize: '1.15rem',
                marginBottom: '24px',
              }}
            >
              Category Distribution
            </h3>
            <DonutChart data={analytics.categoryDistribution} />
          </div>

          {/* Line Chart Card */}
          <div className="card">
            <h3
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                fontSize: '1.15rem',
                marginBottom: '24px',
              }}
            >
              30-Day Submission Trend
            </h3>
            <TrendChart trend={analytics.trend} />
          </div>
        </div>

        {/* Recent Submissions Section */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700 }}>
              Feedback Responses
            </h2>

            {/* Filters Row */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                flex: 1,
                justifyContent: 'flex-end',
                maxWidth: '800px',
              }}
            >
              {/* Search Bar */}
              <div className="search-input-wrapper" style={{ maxWidth: '240px' }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search comments or email..."
                  className="form-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
                />
              </div>

              {/* Category Filter */}
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <option value="">All Categories</option>
                {form.categories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <option value="">All Statuses</option>
                <option value="RECEIVED">Received</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {/* Submissions Table */}
          {tableLoading && submissions.length === 0 ? (
            <div className="spinner" style={{ margin: '40px auto' }}></div>
          ) : submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No feedback submissions match your criteria.
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Category</th>
                      <th>Submitter</th>
                      <th>Rating</th>
                      <th style={{ width: '45%' }}>Comment</th>
                      <th>Submitted Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id}>
                        {/* Status Select Column */}
                        <td>
                          <select
                            className={`status-pill status-${sub.status}`}
                            value={sub.status}
                            onChange={(e) => handleStatusChange(sub.id, e.target.value)}
                            style={{ cursor: 'pointer', border: 'none', outline: 'none' }}
                          >
                            <option
                              value="RECEIVED"
                              style={{ background: '#121826', color: 'var(--text-main)' }}
                            >
                              Received
                            </option>
                            <option
                              value="IN_PROGRESS"
                              style={{ background: '#121826', color: 'var(--text-main)' }}
                            >
                              In Progress
                            </option>
                            <option
                              value="RESOLVED"
                              style={{ background: '#121826', color: 'var(--text-main)' }}
                            >
                              Resolved
                            </option>
                          </select>
                        </td>

                        {/* Category */}
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>
                            {sub.category}
                          </span>
                        </td>

                        {/* Submitter */}
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                            {sub.email || (
                              <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                Anonymous
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Rating */}
                        <td>
                          {sub.rating ? (
                            <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>
                              {'★'.repeat(sub.rating)}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: 'var(--text-muted)',
                                fontSize: '0.8rem',
                                fontStyle: 'italic',
                              }}
                            >
                              None
                            </span>
                          )}
                        </td>

                        {/* Truncated Comment */}
                        <td>
                          <span
                            title={sub.comment}
                            style={{
                              display: 'block',
                              maxWidth: '380px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sub.comment}
                          </span>
                        </td>

                        {/* Created At */}
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="pagination-controls">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Showing page <strong>{pagination.page}</strong> of{' '}
                    <strong>{pagination.totalPages}</strong> ({pagination.total} total responses)
                  </span>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      ← Previous
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))
                      }
                      disabled={currentPage === pagination.totalPages}
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;
