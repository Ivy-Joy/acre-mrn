import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/api';
import PublicationCard from '../components/PublicationCard';

// Subtle Stat Card Component
const StatCard = ({ label, value, trend, trendColor }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm transition-all hover:shadow-md hover:border-indigo-100">
    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
    <div className="flex items-baseline gap-2">
      <div className="text-3xl font-light text-slate-900">{value}</div>
      {trend && <span className={`text-xs font-medium ${trendColor}`}>{trend}</span>}
    </div>
  </div>
);

export default function Dashboard() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // Prevents state updates on unmounted components

    const fetchData = async () => {
      try {
        const r = await api.get('/publications');
        if (isMounted) {
          setPublications(r.data || []);
        }
      } catch (err) {
        console.error('Failed to load publications', err);
        if (isMounted) setPublications([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, []);

  // Use memoization for derived data to keep the render phase pure
  const stats = useMemo(() => {
    const top = publications.slice(0, 6);
    
    const brokenLinks = publications.filter(p => 
      (p.dataLinks || []).some(dl => dl.status !== 200 && dl.status !== '200')
    ).length;

    const avgCompliance = publications.length 
      ? Math.round(publications.reduce((s, p) => s + (p.complianceScore || 0), 0) / publications.length) 
      : 0;

    return { top, brokenLinks, avgCompliance };
  }, [publications]);

  return (
    <div className="min-h-screen bg-slate-50/50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header Section */}
        <header className="mb-10 flex justify-between items-end">
          <div>
            <p className="text-indigo-600 font-semibold text-sm tracking-wide uppercase mb-1">Overview</p>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium italic">
            Refreshed {new Date().toLocaleDateString()}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard 
            label="Total Publications" 
            value={publications.length} 
            trend="Active" 
            trendColor="text-emerald-600"
          />
          <StatCard 
            label="Avg Compliance Score" 
            value={`${stats.avgCompliance}%`} 
            trend={stats.avgCompliance > 80 ? "High" : "Needs Review"}
            trendColor={stats.avgCompliance > 80 ? "text-emerald-600" : "text-amber-600"}
          />
          <StatCard 
            label="Broken Data Links" 
            value={stats.brokenLinks} 
            trend={stats.brokenLinks > 0 ? "Critical" : "Stable"}
            trendColor={stats.brokenLinks > 0 ? "text-rose-600" : "text-emerald-600"}
          />
        </div>

        {/* Publications Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Recent Publications</h2>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              View All →
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-slate-300 rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-slate-400 text-sm font-medium tracking-wide">Synchronizing records...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {stats.top.length ? (
                stats.top.map(pub => (
                  <div key={pub._id} className="group transition-all duration-200 hover:-translate-y-1">
                    <PublicationCard pub={pub} />
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <p className="text-slate-400">No publications found in the database.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}