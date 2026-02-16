// src/components/PublicationCard.jsx
import React, { useState, useRef, useCallback } from 'react';
import ComplianceBadge from './ComplianceBadge';
import { FaExternalLinkAlt, FaFilePdf, FaFlag, FaCheck } from 'react-icons/fa';

/**
 * PublicationCard
 * Props:
 *  - pub: publication object
 *  - onView(doi) -> optional callback for View action
 *  - onGenerate(pub) -> optional callback for Generate Report action
 *  - onFlag(pub, flagged) -> optional callback for Flag action
 */
export default function PublicationCard({ pub, onView, onGenerate, onFlag }) {
  const [flagged, setFlagged] = useState(false);
  const cardRef = useRef();

  const grants = (pub.matchedGrants || []).map(g => (typeof g === 'string' ? g : g.grantId)).filter(Boolean).join(', ') || 'Unmatched';
  const authors = (pub.authors || []).map(a => a.name).join(', ');
  const doiUrl = pub.doi ? `https://doi.org/${pub.doi}` : null;

  const handleView = useCallback(() => {
    if (typeof onView === 'function') return onView(pub);
    if (doiUrl) window.open(doiUrl, '_blank', 'noopener');
    else alert('No DOI available to view.');
  }, [onView, doiUrl, pub]);

  const handleGenerate = useCallback(async () => {
    if (typeof onGenerate === 'function') return onGenerate(pub);
    // Default: attempt client-side HTML -> PDF snapshot using html2pdf (if available)
    try {
      const html2pdf = (await import('html2pdf.js')).default || (await import('html2pdf.js'));
      const node = cardRef.current;
      if (!node) return alert('No card element found for PDF generation.');
      const opt = {
        margin: 10,
        filename: `${(pub.doi || 'publication').replace(/[^a-z0-9_\-]/gi, '_')}-report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(node).save();
    } catch (err) {
      // graceful fallback
      // eslint-disable-next-line no-console
      console.warn('html2pdf not available or failed', err);
      alert('PDF generation failed (html2pdf missing). You can install html2pdf.js for client-side PDF exports.');
    }
  }, [onGenerate, pub]);

  const handleFlag = useCallback(() => {
    const next = !flagged;
    setFlagged(next);
    if (typeof onFlag === 'function') onFlag(pub, next);
  }, [flagged, onFlag, pub]);

  return (
    <article ref={cardRef} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 group">
      <div className="flex justify-between items-start gap-6">
        <div className="min-w-0 flex-1">
          {/* Grant Tag */}
          <div className="inline-flex items-center gap-2 mb-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${pub.matchedGrants?.length ? 'bg-indigo-500' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {grants}
            </span>
            {pub.collections?.length ? (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-50 border border-slate-100 text-slate-500">{pub.collections.join(', ')}</span>
            ) : null}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-900 text-lg md:text-xl leading-tight group-hover:text-indigo-600 transition-colors truncate">
            {pub.title || 'Untitled Publication'}
          </h3>

          {/* DOI & Authors */}
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
            <span className="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              DOI: {pub.doi ? (
                <a href={doiUrl} target="_blank" rel="noreferrer" className="hover:text-indigo-600 underline decoration-slate-200 underline-offset-2">
                  {pub.doi}
                </a>
              ) : <span className="italic text-slate-400">n/a</span>}
            </span>

            <span className="text-slate-300">|</span>
            <span className="truncate italic text-sm">{authors || 'No authors listed'}</span>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <ComplianceBadge score={pub.complianceScore || 0} />
          <div className="mt-2 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Revision {String(pub.version || '1')}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-50">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acknowledgement Extract</span>
          <p className="text-sm text-slate-600 leading-relaxed italic">
            {pub.acknowledgementText ? `"${pub.acknowledgementText.slice(0, 220)}${pub.acknowledgementText.length > 220 ? '...' : ''}"` : 'No acknowledgement text captured'}
          </p>
        </div>

        {/* Data links */}
        <div className="mt-4">
          {(!pub.dataLinks || !pub.dataLinks.length) ? (
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No data links verified</div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {pub.dataLinks.map((dl,i) => {
                const isOk = dl.status === 200 || dl.status === '200';
                const short = (dl.url || '').split('/').pop() || dl.url;
                return (
                  <a key={i} href={dl.url} target="_blank" rel="noreferrer" className={`text-[12px] font-medium px-2.5 py-1 rounded-md border transition-all hover:shadow-sm ${isOk ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-50' : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-50'}`}>
                    <span className="opacity-80 mr-1.5">{isOk ? '✓' : '⚠'}</span>
                    {short} • {dl.status || 'err'}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleView} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm hover:shadow-sm" aria-label={`Open ${pub.doi || pub.title}`}>
              <FaExternalLinkAlt /> View
            </button>

            <button onClick={handleGenerate} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700" aria-label="Generate report">
              <FaFilePdf /> Generate report
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleFlag} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${flagged ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-white border border-slate-200'}`} aria-pressed={flagged} aria-label="Flag ambiguous">
              {flagged ? <FaCheck /> : <FaFlag />} {flagged ? 'Flagged' : 'Flag ambiguous'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
