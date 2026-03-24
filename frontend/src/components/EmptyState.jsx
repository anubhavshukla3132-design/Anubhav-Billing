import React from 'react';

const illustrations = {
  invoices: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <rect x="25" y="15" width="70" height="90" rx="8" fill="#e0e7ff" stroke="#818cf8" strokeWidth="2"/>
      <rect x="35" y="30" width="50" height="6" rx="3" fill="#c7d2fe"/>
      <rect x="35" y="42" width="35" height="6" rx="3" fill="#c7d2fe"/>
      <rect x="35" y="54" width="50" height="6" rx="3" fill="#c7d2fe"/>
      <rect x="35" y="66" width="25" height="6" rx="3" fill="#c7d2fe"/>
      <rect x="35" y="82" width="50" height="10" rx="5" fill="#818cf8" opacity="0.4"/>
    </svg>
  ),
  medicines: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <rect x="30" y="35" width="60" height="55" rx="10" fill="#d1fae5" stroke="#34d399" strokeWidth="2"/>
      <rect x="45" y="25" width="30" height="15" rx="6" fill="#a7f3d0" stroke="#34d399" strokeWidth="2"/>
      <path d="M52 55 L60 65 L70 50" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  patients: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="45" r="18" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2"/>
      <ellipse cx="60" cy="88" rx="30" ry="16" fill="#bae6fd" stroke="#38bdf8" strokeWidth="2"/>
      <circle cx="60" cy="42" r="7" fill="#7dd3fc"/>
    </svg>
  ),
  default: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="40" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2"/>
      <path d="M50 60 L55 65 L70 50" stroke="#64748b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};

export default function EmptyState({ type = 'default', title = 'No data found', message = 'There are no records to display yet.' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-illustration">
        {illustrations[type] || illustrations.default}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
    </div>
  );
}
