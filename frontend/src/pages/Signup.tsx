import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    businessName?: string;
    email?: string;
    password?: string;
  }>({});

  const validateForm = () => {
    const errors: { businessName?: string; email?: string; password?: string } = {};
    if (!businessName) {
      errors.businessName = 'Business name is required';
    } else if (businessName.trim().length < 2) {
      errors.businessName = 'Business name must be at least 2 characters';
    }

    if (!email) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email address is invalid';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
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
      await signup(email, password, businessName);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authPageContainer}>
      <div className="card" style={styles.authCard}>
        <div style={styles.authHeader}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1 className="nav-logo" style={{ fontSize: '2rem' }}>
              🐮 Acowale CRM
            </h1>
          </Link>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Create your business account
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="businessName">
              Business/Company Name
            </label>
            <input
              className="form-input"
              type="text"
              id="businessName"
              placeholder="Acme Corp"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={loading}
            />
            {fieldErrors.businessName && (
              <span className="error-msg">{fieldErrors.businessName}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              className="form-input"
              type="email"
              id="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            {fieldErrors.email && <span className="error-msg">{fieldErrors.email}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              className="form-input"
              type="password"
              id="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {fieldErrors.password && <span className="error-msg">{fieldErrors.password}</span>}
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Get Started'}
          </button>
        </form>

        <div style={styles.authFooter}>
          Already have an account?{' '}
          <Link to="/login" style={styles.authLink}>
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  authPageContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    backgroundColor: 'var(--bg-main)',
  },
  authCard: {
    maxWidth: '440px',
    width: '100%',
  },
  authHeader: {
    textAlign: 'center' as const,
    marginBottom: '28px',
  },
  authFooter: {
    marginTop: '24px',
    textAlign: 'center' as const,
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
  },
  authLink: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: 600,
  },
};
export default Signup;
