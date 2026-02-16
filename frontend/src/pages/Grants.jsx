//src/pages/Grants.jsx
import React, { useEffect, useState } from 'react';
import api from '../lib/api';

export default function Grants() {
  const [grants, setGrants] = useState([]);
  const [form, setForm] = useState({ grantId: '', programme: 'DELTAS', piName: '', piOrcid: '', institution: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchGrants = async () => {
      try {
        const r = await api.get('/grants');
        if (isMounted) setGrants(r.data || []);
      } catch (err) {
        console.error(err);
        if (isMounted) setGrants([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGrants();
    return () => { isMounted = false; };
  }, []);

  const createGrant = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/grants', form);
      // Update state only after a successful API response
      setGrants(prev => [r.data.grant, ...prev]);
      setForm({ grantId: '', programme: 'DELTAS', piName: '', piOrcid: '', institution: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to add grant');
    }
  };

  // Memoized change handler to keep inputs snappy
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header Section */}
        <header className="mb-10">
          <p className="text-indigo-600 font-semibold text-sm tracking-wide uppercase mb-1">Funding</p>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Grants Management</h1>
        </header>

        {/* Creation Form Card */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-800">Register New Grant</h2>
          </div>
          
          <form onSubmit={createGrant} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Grant ID</label>
              <input 
                placeholder="e.g. DEL-15-011" 
                value={form.grantId} 
                onChange={e => handleChange('grantId', e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white transition-all outline-none" 
                required 
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">PI Name</label>
              <input 
                placeholder="Full Name" 
                value={form.piName} 
                onChange={e => handleChange('piName', e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white transition-all outline-none" 
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">PI ORCID</label>
              <input 
                placeholder="0000-0000-0000-0000" 
                value={form.piOrcid} 
                onChange={e => handleChange('piOrcid', e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white transition-all outline-none" 
              />
            </div>
            <div className="flex items-end">
              <button className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98]">
                Add Grant
              </button>
            </div>
          </form>
        </section>

        {/* Grants List */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-800">Active Grants</h2>
            <div className="h-px flex-1 bg-slate-200 mx-6 opacity-50"></div>
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              {grants.length} Records
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center bg-white rounded-2xl border border-slate-100 shadow-sm">
               <div className="animate-pulse space-y-4 w-full px-12">
                  <div className="h-12 bg-slate-50 rounded-xl w-full"></div>
                  <div className="h-12 bg-slate-50 rounded-xl w-full"></div>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {grants.map(g => (
                <div 
                  key={g._id} 
                  className="group bg-white border border-slate-200 p-6 rounded-2xl flex justify-between items-center transition-all hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100 shadow-sm">
                      {g.programme?.substring(0, 2) || 'GR'}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-lg">{g.grantId}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded tracking-tighter">
                          {g.programme}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">{g.piName}</span> 
                        {g.institution && <span className="mx-2 text-slate-300">|</span>}
                        <span className="italic">{g.institution}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden sm:block text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fiscal Year</div>
                    <div className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                      {g.startDate ? new Date(g.startDate).getFullYear() : '2024'}
                    </div>
                  </div>
                </div>
              ))}
              
              {!grants.length && (
                <div className="text-center py-24 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-slate-400 font-medium tracking-tight">No funding records found in the archive.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}