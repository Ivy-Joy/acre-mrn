import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary flex items-center justify-center text-white font-bold">AI</div>
          <div>
            <div className="text-lg font-semibold">ACRE</div>
            <div className="text-xs text-gray-500">Grant Integrity & Compliance</div>
          </div>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/" className="text-slate-700 hover:underline">Dashboard</Link>
          <Link to="/publications" className="text-slate-700 hover:underline">Publications</Link>
          <Link to="/grants" className="text-slate-700 hover:underline">Grants</Link>
        </nav>
      </div>
    </header>
  );
}
