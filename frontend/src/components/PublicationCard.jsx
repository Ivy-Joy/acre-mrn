import React from 'react';
import ComplianceBadge from './ComplianceBadge';

function DataLinkList({ dataLinks }) {
  if (!dataLinks || !dataLinks.length) {
    return <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">No data links verified</div>;
  }

  return (
    <div className="flex gap-2 flex-wrap mt-3">
      {dataLinks.map((dl, i) => {
        const isOk = dl.status == 200 || dl.status === '200';
        const fileName = dl.url.split('/').pop() || 'Link';
        
        return (
          <a 
            key={i} 
            href={dl.url} 
            target="_blank" 
            rel="noreferrer" 
            className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all hover:shadow-sm ${
              isOk 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700 hover:bg-emerald-50' 
                : 'bg-rose-50/50 border-rose-100 text-rose-700 hover:bg-rose-50'
            }`}
          >
            <span className="opacity-70 mr-1.5">{isOk ? '✓' : '⚠'}</span>
            {fileName} • {dl.status || 'err'}
          </a>
        );
      })}
    </div>
  );
}

export default function PublicationCard({ pub }) {
  const grants = pub.matchedGrants?.map(g => g.grantId).join(', ') || 'Unmatched';
  const authors = (pub.authors || []).map(a => a.name).join(', ');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 group">
      <div className="flex justify-between items-start gap-6">
        <div className="min-w-0 flex-1">
          {/* Grant Tag */}
          <div className="inline-flex items-center gap-1.5 mb-2">
            <div className={`w-1.5 h-1.5 rounded-full ${pub.matchedGrants?.length ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {grants}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-slate-900 text-xl leading-tight group-hover:text-indigo-600 transition-colors truncate">
            {pub.title || 'Untitled Publication'}
          </h3>

          {/* DOI & Authors */}
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span className="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              DOI: <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noreferrer" className="hover:text-indigo-600 underline decoration-slate-200 underline-offset-2">{pub.doi}</a>
            </span>
            <span className="text-slate-300">|</span>
            <span className="truncate italic">
              {authors || 'No authors listed'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <ComplianceBadge score={pub.complianceScore || 0} />
          <div className="mt-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Revision v{pub.version || 1}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-50">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acknowledgement Extract</span>
          <p className="text-sm text-slate-600 leading-relaxed italic">
            "{pub.acknowledgementText ? pub.acknowledgementText.slice(0, 180) + '...' : 'No acknowledgement text captured'}"
          </p>
        </div>
        
        <DataLinkList dataLinks={pub.dataLinks} />
      </div>
    </div>
  );
}