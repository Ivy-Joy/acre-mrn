//src/pages/Publications.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../lib/api';
import PublicationCard from '../components/PublicationCard';
import publicationsMock from '../mocks/publications.json';


const SearchIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function Publications() {
  const [pubs, setPubs] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    // We fetch inside an async function to keep it clean
    const loadData = async () => {
      try {
        const r = await api.get('/publications');
        if (isMounted && r.data && r.data.length > 0) setPubs(r.data);
      /*} catch (err) {
        console.error(err);
        if (isMounted) setPubs([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };*/
    // If backend returns data, use it
      if (isMounted && r.data && r.data.length > 0) {
        setPubs(r.data);
      } 
      // If backend returns empty, fallback to mock
      else if (isMounted) {
        console.log('Using mock publications (API empty)');
        setPubs(publicationsMock);
      }
    } catch (err) {
      console.error(err);
      console.warn('API failed — using mock data');
      if (isMounted) setPubs(publicationsMock);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

    loadData();
    return () => { isMounted = false; };
  }, []);

  // HEAVY LIFTING: Memoize the filtered list so it doesn't 
  // recalculate on every micro-render.
  const filtered = useMemo(() => {
    if (!q) return pubs;
    const query = q.toLowerCase();
    return pubs.filter(p => 
      (p.title || '').toLowerCase().includes(query) ||
      (p.doi || '').toLowerCase().includes(query) ||
      (p.matchedGrants || []).some(g => g.grantId?.toLowerCase().includes(query))
    );
  }, [pubs, q]);

  // Handle clear with a callback to prevent unnecessary re-renders
  const handleClear = useCallback(() => setQ(''), []);

  return (
    <div className="min-h-screen bg-slate-50/50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <p className="text-indigo-600 font-semibold text-sm tracking-wide uppercase mb-1">Archive</p>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Publications</h1>
            <p className="text-slate-500 text-sm mt-1">
              {loading ? 'Scanning...' : `Showing ${filtered.length} of ${pubs.length} records`}
            </p>
          </div>

          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by title, DOI, or grant ID..."
              className="block w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-slate-300 rounded-2xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-slate-400 font-medium">Loading library...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filtered.map(pub => (
                  <div key={pub._id || pub.doi} className="group transition-all duration-200 hover:-translate-y-1">
                    <PublicationCard pub={pub} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                  <SearchIcon />
                </div>
                <h3 className="text-slate-900 font-semibold">No results found</h3>
                <button onClick={handleClear} className="mt-6 text-sm font-bold text-indigo-600 hover:text-indigo-700">
                  Clear Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}