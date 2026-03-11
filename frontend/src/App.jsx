import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';

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
        background: '#0f766e',
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
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
    </>
  );
}

export default App;
