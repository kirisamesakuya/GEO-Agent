import { X } from 'lucide-react';
import type { MarketplaceAgreement } from '../../../lib/marketplace-agreements';

interface Props { agreement: MarketplaceAgreement | null; onClose: () => void }

export default function MarketplaceAgreementModal({ agreement, onClose }: Props) {
  if (!agreement) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
    <button type="button" className="absolute inset-0 bg-slate-950/45" aria-label="关闭协议" onClick={onClose} />
    <section className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="marketplace-agreement-title">
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div><h2 id="marketplace-agreement-title" className="text-base font-bold text-slate-900">{agreement.title}</h2><p className="mt-1 text-xs text-slate-500">版本号：{agreement.version}</p></div>
        <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="关闭" onClick={onClose}><X className="h-5 w-5" /></button>
      </header>
      <div className="max-h-[calc(85vh-152px)] overflow-y-auto px-6 py-5 text-sm leading-7 text-slate-700">
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-slate-600">{agreement.summary}</p>
        <div className="mt-5 space-y-5">{agreement.sections.map((section) => <section key={section.title}><h3 className="font-semibold text-slate-900">{section.title}</h3>{section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-2">{paragraph}</p>)}</section>)}</div>
      </div>
      <footer className="border-t border-slate-100 px-6 py-4 text-right"><button type="button" className="geo-btn-primary text-sm" onClick={onClose}>我已阅读</button></footer>
    </section>
  </div>;
}
