import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser } from 'backend/src/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, businessName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on boot
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include', // Include cookie session as fallback
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data?.user) {
            setUser(resData.data.user);
          } else {
            localStorage.removeItem('token');
          }
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Session restoration failed:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const resData = await response.json();

    if (!response.ok || !resData.success) {
      throw new Error(resData.error || 'Failed to log in');
    }

    if (resData.data?.token) {
      localStorage.setItem('token', resData.data.token);
    }
    setUser(resData.data.user);
  };

  const signup = async (email: string, password: string, businessName: string) => {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, businessName }),
      credentials: 'include',
    });

    const resData = await response.json();

    if (!response.ok || !resData.success) {
      throw new Error(resData.error || 'Failed to sign up');
    }

    if (resData.data?.token) {
      localStorage.setItem('token', resData.data.token);
    }
    setUser(resData.data.user);
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
