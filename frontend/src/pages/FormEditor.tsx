import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const FormEditor: React.FC = () => {
  const { user, logout } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // Form fields state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([
    'General',
    'Bug Report',
    'Feature Request',
  ]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Status & states
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; categories?: string }>({});

  // Success payoff state (upon creation)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch existing form data if in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    const fetchFormDetails = async () => {
      try {
        setFetching(true);
        setError(null);

        const response = await fetch(`${API_BASE}/forms/${id}`, { credentials: 'include' });
        if (!response.ok) {
          if (response.status === 403) throw new Error('You do not have access to this form');
          throw new Error('Failed to retrieve form details');
        }

        const data = await response.json();
        if (data.success) {
          setTitle(data.data.title);
          setDescription(data.data.description || '');
          setCategories(data.data.categories);
          setIsActive(data.data.isActive);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An error occurred fetching form details.';
        setError(msg);
      } finally {
        setFetching(false);
      }
    };

    fetchFormDetails();
  }, [id, isEditMode]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCategory = newCategoryInput.trim();
    if (!cleanCategory) return;
    if (categories.includes(cleanCategory)) {
      setFieldErrors((prev) => ({ ...prev, categories: 'Category already exists' }));
      return;
    }
    setCategories([...categories, cleanCategory]);
    setNewCategoryInput('');
    setFieldErrors((prev) => ({ ...prev, categories: undefined }));
  };

  const handleRemoveCategory = (indexToRemove: number) => {
    if (categories.length <= 1) {
      setFieldErrors((prev) => ({ ...prev, categories: 'Form must have at least one category' }));
      return;
    }
    setCategories(categories.filter((_, idx) => idx !== indexToRemove));
    setFieldErrors((prev) => ({ ...prev, categories: undefined }));
  };

  const validateForm = () => {
    const errors: { title?: string; categories?: string } = {};
    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (categories.length === 0) {
      errors.categories = 'At least one category is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) return;

    setLoading(true);
    try {
      const url = isEditMode ? `${API_BASE}/forms/${id}` : `${API_BASE}/forms`;
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          categories,
          isActive,
        }),
        credentials: 'include',
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to save form');
      }

      if (isEditMode) {
        // Redirection on update
        navigate('/dashboard');
      } else {
        // Show the Payoff screen for creation
        setCreatedSlug(resData.data.slug);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving the form.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdSlug) return;
    const publicUrl = `${window.location.origin}/f/${createdSlug}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Render Payoff Screen
  if (createdSlug) {
    const shareUrl = `${window.location.origin}/f/${createdSlug}`;
    return (
      <div style={styles.payoffContainer}>
        <div className="card" style={styles.payoffCard}>
          <div style={{ fontSize: '4.5rem', marginBottom: '16px' }}>🚀</div>
          <h1
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 800,
              fontSize: '2rem',
              marginBottom: '12px',
            }}
          >
            Your Feedback Form is Live!
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.5 }}>
            Form <strong>"{title}"</strong> has been successfully created. Copy the unique link
            below and share it with your users to start collecting structured feedback immediately.
          </p>

          <div style={styles.urlBox}>
            <div style={styles.urlText}>{shareUrl}</div>
            <button
              className="btn btn-primary"
              onClick={handleCopyLink}
              style={{ minWidth: '110px' }}
            >
              {copied ? 'Copied! ✓' : 'Copy link'}
            </button>
          </div>

          <div
            style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px' }}
          >
            <Link to="/dashboard" className="btn btn-secondary">
              Go to Dashboard
            </Link>
            <button
              className="btn btn-primary"
              onClick={() => {
                // Reset form state to create another one
                setTitle('');
                setDescription('');
                setCategories(['General', 'Bug Report', 'Feature Request']);
                setCreatedSlug(null);
              }}
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Main Content */}
      <main className="dashboard-container" style={{ maxWidth: '680px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link
            to="/dashboard"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}
          >
            ← Back to Dashboard
          </Link>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="card">
          <h2
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '1.75rem',
              fontWeight: 800,
              marginBottom: '24px',
            }}
          >
            {isEditMode ? 'Edit Feedback Form' : 'Create Feedback Form'}
          </h2>

          {fetching ? (
            <div className="spinner" style={{ margin: '40px auto' }}></div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Title */}
              <div className="form-group">
                <label className="form-label" htmlFor="title">
                  Form Title
                </label>
                <input
                  className="form-input"
                  type="text"
                  id="title"
                  placeholder="e.g. Customer Satisfaction Survey"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.title && <span className="error-msg">{fieldErrors.title}</span>}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="description">
                  Description (Optional)
                </label>
                <textarea
                  className="form-textarea"
                  id="description"
                  placeholder="Tell your customers what this feedback is for..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Categories Section */}
              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label className="form-label">Custom Submission Categories</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Define the categories users can pick when submitting feedback (e.g. Bug, Feature
                  Request).
                </p>

                {/* Add Category Formlet */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Add category name..."
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-secondary" onClick={handleAddCategory} type="button">
                    Add
                  </button>
                </div>
                {fieldErrors.categories && (
                  <span className="error-msg">{fieldErrors.categories}</span>
                )}

                {/* Categories Pills */}
                <div className="category-pills">
                  {categories.map((cat, idx) => (
                    <span key={idx} className="category-pill">
                      {cat}
                      <span
                        className="category-pill-remove"
                        onClick={() => handleRemoveCategory(idx)}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Toggle (Only in Edit Mode or both) */}
              <div
                className="form-group"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '32px',
                }}
              >
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label
                  htmlFor="isActive"
                  className="form-label"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Accepting Responses (Active)
                </label>
              </div>

              {/* Submit Actions */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <Link to="/dashboard" className="btn btn-secondary" style={{ minWidth: '100px' }}>
                  Cancel
                </Link>
                <button
                  className="btn btn-primary"
                  type="submit"
                  style={{ minWidth: '120px' }}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Launch Form'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

const styles = {
  payoffContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    backgroundColor: 'var(--bg-main)',
  },
  payoffCard: {
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center' as const,
    padding: '48px 32px',
  },
  urlBox: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    border: '1px dashed var(--primary)',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
  },
  urlText: {
    fontFamily: 'monospace',
    fontSize: '0.95rem',
    color: '#818cf8',
    wordBreak: 'break-all' as const,
    textAlign: 'left' as const,
    flex: 1,
  },
};

export default FormEditor;
