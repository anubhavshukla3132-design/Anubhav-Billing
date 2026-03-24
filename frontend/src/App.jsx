import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Records from './pages/Records.jsx';

const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'https://anubhav-billing-1jso.onrender.com';

function ProtectedRoute({ element: Element }) {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
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
        // Retry quickly in case server is just waking up.
        retryTimer = setTimeout(checkSession, 1500);
      }
    }

    checkSession();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [navigate]);

  if (!authReady) return null; // Or a very subtle loading indicator
  return <Element />;
}

function LoginGate() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
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
  }, [navigate]);

  if (!authChecked) return null;
  if (authed) return null; 
  return <Login />;
}


function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginGate />} />
        <Route path="/" element={<ProtectedRoute element={Records} />} />
        <Route path="/billing" element={<ProtectedRoute element={Dashboard} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
