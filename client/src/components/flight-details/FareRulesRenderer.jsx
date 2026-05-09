import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import parse, { domToReact, attributesToProps } from 'html-react-parser';
import { FaPlane } from "react-icons/fa";
import { MdRefresh } from "react-icons/md";

export default function FareRulesRenderer({ rule }) {
  const htmlContent = rule?.rawHtml || "";

  const parsedContent = useMemo(() => {
    if (!htmlContent) return null;

    // 0. Pre-process
    const preProcessedHtml = htmlContent
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/(<br\s*\/?>\s*){3,}/gi, '<br/><br/>');

    // 1. Sanitization
    const sanitizedHtml = DOMPurify.sanitize(preProcessedHtml, {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'strong', 'b', 'i', 'em', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'fieldset', 'legend', 'u'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'colspan', 'rowspan', 'border'],
    });

    // 2. Rendering Options
    const options = {
      replace: (domNode) => {
        if (domNode.type === 'text') {
           const text = domNode.data;
           if (text.includes('   ') || text.includes('---') || text.includes('...')) {
               return <span className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600 font-mono tracking-tight">{text}</span>;
           }
           return text;
        }

        if (domNode.type !== 'tag') return;
        const { name, children, attribs } = domNode;
        const props = attributesToProps(attribs || {});

        switch (name) {
          case 'table':
            return (
              <div className="w-full overflow-x-auto my-6 rounded-2xl border border-slate-200 shadow-sm bg-white custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]" {...props}>
                  {domToReact(children, options)}
                </table>
              </div>
            );
          case 'th':
            return (
              <th className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest px-5 py-4 border-b border-slate-100 whitespace-nowrap" {...props}>
                {domToReact(children, options)}
              </th>
            );
          case 'td':
            return (
              <td className="px-5 py-4 text-sm font-semibold text-slate-700 border-b border-slate-100 bg-white align-top" {...props}>
                {domToReact(children, options)}
              </td>
            );
          default:
            return undefined;
        }
      },
    };

    return parse(sanitizedHtml, options);
  }, [htmlContent]);

  if (!rule) return null;

  return (
    <div className="fare-rules-universal-renderer bg-white rounded-2xl w-full">
      {/* Dynamic Summary Section (MiniFareRules) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Cancellation Summary */}
        {rule.cancellation && rule.cancellation.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shadow-sm">
                <FaPlane size={10} className="rotate-180" />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cancellation Policy</h4>
            </div>
            <div className="bg-red-50/30 border border-red-100 rounded-[1.5rem] overflow-hidden divide-y divide-red-100/50">
              {rule.cancellation.map((c, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between gap-4 transition-colors hover:bg-red-50/50">
                  <p className="text-xs font-bold text-slate-600 leading-snug">{c.timeRange}</p>
                  <span className="text-sm font-black text-red-600 shrink-0">{c.fee}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date Change Summary */}
        {rule.reissue && rule.reissue.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm">
                <MdRefresh size={11} className="rotate-90" />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date Change Policy</h4>
            </div>
            <div className="bg-blue-50/30 border border-blue-100 rounded-[1.5rem] overflow-hidden divide-y divide-blue-100/50">
              {rule.reissue.map((r, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between gap-4 transition-colors hover:bg-blue-50/50">
                  <p className="text-xs font-bold text-slate-600 leading-snug">{r.timeRange}</p>
                  <span className="text-sm font-black text-blue-700 shrink-0">{r.fee}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Separator */}
      <div className="flex items-center gap-4 py-8">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Detailed Airline Document</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>

      {/* Exhaustive HTML Document */}
      <div className="opacity-80 hover:opacity-100 transition-opacity duration-500">
        {parsedContent}
      </div>
    </div>
  );
}
