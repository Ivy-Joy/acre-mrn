// src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import publicationsMock from '../mocks/publications.json';
import grantsMock from '../mocks/grants.json';
import { computeKPIs } from '../utils/computeKPIs';
import DonutChart from '../components/DonutChart';
import Sparkline from '../components/Sparkline';
import PublicationCard from '../components/PublicationCard';
import html2pdf from 'html2pdf.js';
import { FaDownload, FaFilePdf, FaGlobe, FaExclamationTriangle } from 'react-icons/fa';

function Stat({ label, value, hint, children }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-lg transition">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div>{children}</div>
      </div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  // For demo/pitch we use the frontend mocks; this is deterministic and reliable for Vercel.
  const [publications] = useState(publicationsMock);
  const [grants] = useState(grantsMock);
  const [loading] = useState(false);
  const [filter, setFilter] = useState({ search: '', year: 'all', onlyAmbiguous: false });

  const kpis = useMemo(() => computeKPIs({ publications, grants }), [publications, grants]);

  const recentPublications = useMemo(() => {
    // latest 6 by publishedAt
    return publications.slice().sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0,6);
  }, [publications]);

  const ambiguous = useMemo(() => kpis.ambiguous, [kpis.ambiguous]);

  const filteredPubs = useMemo(() => {
    const q = (filter.search || '').toLowerCase().trim();
    let out = publications.slice();
    if (filter.year !== 'all') {
      out = out.filter(p => new Date(p.publishedAt).getFullYear() === Number(filter.year));
    }
    if (filter.onlyAmbiguous) out = out.filter(p => (p.complianceScore || 0) < 55);
    if (q) out = out.filter(p => (p.title || '').toLowerCase().includes(q) || (p.doi || '').toLowerCase().includes(q) || (p.acknowledgementText || '').toLowerCase().includes(q));
    return out;
  }, [publications, filter]);

  const exportCSV = useCallback(() => {
    const rows = filteredPubs.map(p => ({
      doi: p.doi,
      title: p.title,
      compliance: p.complianceScore || '',
      matchedGrants: (p.matchedGrants || []).map(g => g.grantId || g).join('|'),
      publishedAt: p.publishedAt
    }));
    const header = Object.keys(rows[0] || {}).join(',');
    const csv = [header].concat(rows.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g,'""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `publications-export-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredPubs]);

  const generateDonorPdf = useCallback(async () => {
    // We'll render a simple donor report from the top publications on this page.
    const node = document.createElement('div');
    node.style.width = '800px';
    node.style.padding = '24px';
    node.style.fontFamily = 'Arial, Helvetica, sans-serif';
    node.innerHTML = `
      <h1 style="font-size:20px;">ACRE Donor Snapshot</h1>
      <p style="color:#666;">Generated ${new Date().toLocaleString()}</p>
      <hr />
      ${filteredPubs.slice(0,6).map(p => `
        <div style="margin-top:12px;">
          <div style="font-weight:700">${p.title}</div>
          <div style="font-size:12px;color:#444;">DOI: ${p.doi} • Compliance: ${p.complianceScore || 0}%</div>
          <div style="font-size:12px;color:#333;margin-top:6px;">${(p.acknowledgementText || '').slice(0,300)}</div>
        </div>
      `).join('')}
    `;
    const opt = {
      margin:       12,
      filename:     `acre-donor-snapshot-${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    await html2pdf().set(opt).from(node).save();
  }, [filteredPubs]);

  // build year options
  const years = useMemo(() => {
    const yrs = new Set(publications.map(p => (p.publishedAt ? new Date(p.publishedAt).getFullYear() : null)).filter(Boolean));
    return ['all', ...Array.from(yrs).sort((a,b)=>b-a)];
  }, [publications]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-indigo-600 font-semibold text-sm uppercase tracking-wide">Program Insights</p>
            <h1 className="text-4xl font-extrabold text-slate-900">Impact Dashboard</h1>
            <p className="text-sm text-slate-500 mt-2">At a glance: publication volume, compliance, and donor-ready metrics.</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md">
              <FaDownload /> Export CSV
            </button>
            <button onClick={generateDonorPdf} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              <FaFilePdf /> Donor PDF
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: KPIs */}
          <section className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat label="Total publications" value={kpis.totalPublications} hint="All tracked outputs">
                <div className="text-sm text-slate-400">Matched grants: <span className="font-semibold">{kpis.matchedGrants}</span></div>
              </Stat>

              <Stat label="Average compliance" value={`${kpis.avgCompliance}%`} hint="Data & acknowledgement completeness">
                <div className="text-sm text-slate-400">Policy outputs: <span className="font-semibold">{kpis.policyOutputs.length}</span></div>
              </Stat>

              <Stat label="Broken data links" value={publications.filter(p => (p.dataLinks||[]).some(dl => dl.status && dl.status !== 200)).length} hint="Links that need attention">
                <div className="text-sm text-slate-400">Ambiguous: <span className="font-semibold">{kpis.ambiguous.length}</span></div>
              </Stat>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold text-slate-500 uppercase">Publications trend</div>
                  <div className="text-lg font-bold text-slate-900">Recent by year</div>
                </div>
                <div className="text-sm text-slate-400">Last 6 years</div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <Sparkline data={kpis.recentByYear} />
                </div>
                <div className="w-56">
                  <DonutChart buckets={kpis.compliance} size={96} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Recent publications</div>
                  <div className="text-lg font-bold">Latest activity</div>
                </div>
                <div className="text-sm text-slate-400">{recentPublications.length} items</div>
              </div>

              <div className="grid gap-3">
                {recentPublications.map(pub => (
                  <div key={pub.doi} className="p-3 border border-slate-100 rounded-md flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{pub.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{pub.doi} • {new Date(pub.publishedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{pub.complianceScore || 0}%</div>
                      <div className="text-xs text-slate-400 mt-1">{(pub.matchedGrants||[]).length ? 'Matched' : 'Unmatched'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </section>

          {/* Right: quick actions & geo / authors */}
          <aside className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-slate-500 uppercase">Geographic spread</div>
                <div className="text-xs text-slate-400">Preview</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  {Object.entries(kpis.geo.countries || {}).length ? (
                    Object.entries(kpis.geo.countries).map(([c, v]) => (
                      <div key={c} className="flex items-center justify-between text-sm mb-2">
                        <div className="text-slate-700">{c}</div>
                        <div className="text-slate-500">{v}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400">Country-level data is limited for demo</div>
                  )}
                </div>
                <div className="w-16 text-center text-xs text-slate-400">
                  <FaGlobe size={18} />
                  <div className="mt-1 font-semibold">{kpis.totalPublications}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-slate-500 uppercase">Top authors</div>
                <div className="text-xs text-slate-400">Insights</div>
              </div>
              <div className="space-y-2">
                {kpis.top.map(a => (
                  <div key={a.name} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{a.name}</div>
                      <div className="text-xs text-slate-400">{a.count} publications</div>
                    </div>
                    <div className="text-xs text-slate-500">Profile</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-slate-500 uppercase">Ambiguous matches</div>
                <div className="text-xs text-rose-500 font-bold">{kpis.ambiguous.length}</div>
              </div>
              <div className="space-y-2">
                {kpis.ambiguous.slice(0,4).map(p => (
                  <div key={p.doi} className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 leading-tight truncate">{p.title}</div>
                      <div className="text-xs text-slate-400">{p.doi} • {p.complianceScore}%</div>
                    </div>
                  </div>
                ))}
                {kpis.ambiguous.length === 0 && (
                  <div className="text-xs text-slate-400">No ambiguous matches detected.</div>
                )}
              </div>
            </div>
          </aside>
        </main>

        {/* Full Publications list with filters */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">All publications</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search title, DOI, acknowledgement..."
                value={filter.search}
                onChange={e => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm w-64"
              />
              <select value={filter.year} onChange={e => setFilter(prev => ({...prev, year: e.target.value}))} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm">
                {years.map(y => <option key={y} value={y}>{y === 'all' ? 'All years' : y}</option>)}
              </select>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={filter.onlyAmbiguous} onChange={e => setFilter(prev => ({...prev, onlyAmbiguous: e.target.checked}))} />
                <span className="text-xs text-slate-500">Only ambiguous</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredPubs.map(pub => (
              <div key={pub.doi} className="group transition hover:-translate-y-1">
                <PublicationCard pub={pub} />
              </div>
            ))}
            {!filteredPubs.length && <div className="text-slate-400 p-8 bg-white rounded-lg border">No publications found.</div>}
          </div>
        </section>

      </div>
    </div>
  );
}
