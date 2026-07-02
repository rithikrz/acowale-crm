import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email address is invalid';
    }
    if (!password) {
      errors.password = 'Password is required';
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
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
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
            <h1 className="nav-logo" style={{ fontSize: '2rem' }}>🐮 Acowale CRM</h1>
          </Link>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Log in to manage your forms</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
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
            <label className="form-label" htmlFor="password">Password</label>
            <input
              className="form-input"
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {fieldErrors.password && <span className="error-msg">{fieldErrors.password}</span>}
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.authFooter}>
          Don't have an account? <Link to="/signup" style={styles.authLink}>Sign up here</Link>
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
export default Login;
