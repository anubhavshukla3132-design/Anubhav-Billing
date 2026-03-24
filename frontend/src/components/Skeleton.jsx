import React from 'react';

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr className="skeleton-row">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i}><div className="skeleton-line" /></td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-line-sm" />
      <div className="skeleton-line skeleton-line-lg" />
      <div className="skeleton-line skeleton-line-sm" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <table>
      <thead>
        <tr>{Array.from({ length: cols }, (_, i) => <th key={i}><div className="skeleton-line skeleton-line-sm" /></th>)}</tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => <SkeletonRow key={i} cols={cols} />)}
      </tbody>
    </table>
  );
}
