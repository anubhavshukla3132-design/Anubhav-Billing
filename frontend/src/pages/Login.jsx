import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  "https://anubhav-billing-1jso.onrender.com";

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.body.classList.add('login-page');
    return () => document.body.classList.remove('login-page');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please try again.');
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-left">
        <div className="left-content">
          <div className="left-chant">जय श्री राम</div>
          <div className="left-brand">Anubhav Billing</div>
          <div className="left-tagline">Medical PDF Invoices</div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrap">
          <div className="form-header">
            <h1>Sign in</h1>
            <p>Use the administrator credentials provided for your store.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className={`error-message ${error ? 'show' : ''}`}>
              <div className="error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v5" />
                  <path d="M12 16h.01" />
                </svg>
              </div>
              <span className="error-text">{error}</span>
            </div>

            <div className="form-row">
              <span className="field-label">Username</span>
              <div className="field-control">
                <div className="input-wrap">
                  <input
                    id="username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Username"
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <span className="field-label">Password</span>
              <div className="field-control">
                <div className="input-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <button className={`primary-btn ${loading ? 'loading' : ''}`} type="submit" disabled={loading}>
              <span className="btn-label">{loading ? 'Signing in...' : 'Sign In'}</span>
              <span className="btn-spinner"></span>
            </button>
          </form>

          <div className="form-footer">
            <p>Authorized personnel only. Unauthorized access is prohibited.</p>
            <div className="secured">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Secured session
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
