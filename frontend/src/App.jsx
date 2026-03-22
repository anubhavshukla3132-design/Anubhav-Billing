import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Records from './pages/Records.jsx';

const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'https://anubhav-billing-1jso.onrender.com';

function useServerStatus() {
  const [status, setStatus] = useState('checking'); // checking | waiting | ready

  useEffect(() => {
    let timer;
    let cancelled = false;

    async function ping() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!cancelled) setStatus(res.ok ? 'ready' : 'waiting');
      } catch (_err) {
        if (!cancelled) setStatus('waiting');
      }

      if (cancelled) return;
      // Keep pinging every 2.5s until ready, then every 8s to catch drops.
      const nextDelay = status === 'ready' ? 8000 : 2500;
      timer = setTimeout(ping, nextDelay);
    }

    ping();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [status]);

  return status;
}

function WaitingScreen({ message = 'Server is starting, please wait a moment…' }) {
  return (
    <div className="server-wait-shell">
      <div className="server-wait-card">
        <div className="ping-dot" />
        <h2>Server is booting</h2>
        <p>{message}</p>
        <small>As soon as the server is ready, we’ll take you to the login page.</small>
      </div>
    </div>
  );
}

function ProtectedRoute({ element: Element }) {
  const status = useServerStatus();
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (status !== 'ready') return;
    let cancelled = false;
    let retryTimer;

    async function checkSession() {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (cancelled) return;
        if (res.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        if (!res.ok) throw new Error('Failed to load session');
        setAuthReady(true);
      } catch (_err) {
        if (cancelled) return;
        // Retry quickly in case server just came up.
        retryTimer = setTimeout(checkSession, 1500);
      }
    }

    checkSession();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [status, navigate]);

  if (status !== 'ready') return <WaitingScreen />;
  if (!authReady) return <WaitingScreen message="Checking session…" />;
  return <Element />;
}

function LoginGate() {
  const status = useServerStatus();
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (status !== 'ready') return;
    let cancelled = false;
    let retryTimer;

    async function checkSession() {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (cancelled) return;
        if (res.ok) {
          setAuthed(true);
          setAuthChecked(true);
          navigate('/', { replace: true });
          return;
        }
      } catch (_err) {
        // ignore and retry
      }
      if (cancelled) return;
      setAuthed(false);
      setAuthChecked(true);
      retryTimer = setTimeout(checkSession, 1500);
    }

    checkSession();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [status, navigate]);

  if (status !== 'ready') return <WaitingScreen />;
  if (!authChecked) return <WaitingScreen message="Checking session…" />;
  if (authed) return null; // navigate will have triggered
  return <Login />;
}

function InstallPrompt() {
  const [promptEvent, setPromptEvent] = React.useState(null);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setPromptEvent(e);
    }
    function handleInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (installed || !promptEvent) return null;

  const install = async () => {
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') setPromptEvent(null);
  };

  return (
    <button
      onClick={install}
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 50,
        background: '#1d4ed8',
        color: '#fff',
        border: 'none',
        borderRadius: '999px',
        padding: '10px 14px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        fontWeight: 700,
        letterSpacing: 0.2
      }}
    >
      Install app
    </button>
  );
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginGate />} />
        <Route path="/" element={<ProtectedRoute element={Dashboard} />} />
        <Route path="/records" element={<ProtectedRoute element={Records} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
