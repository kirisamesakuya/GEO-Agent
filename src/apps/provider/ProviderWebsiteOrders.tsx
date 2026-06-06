import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface WebsiteOrder {
  id: string;
  brandName: string;
  status: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  previewUrl?: string | null;
  revisionReason?: string | null;
  request?: {
    pageType: string;
    goal: string;
    previewHtml?: string;
  };
}

interface Props {
  providerId: string;
  providerName: string;
  approved: boolean;
  embedded?: boolean;
}

export default function ProviderWebsiteOrders({ providerId, providerName, approved, embedded }: Props) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<WebsiteOrder[]>([]);
  const [selected, setSelected] = useState<WebsiteOrder | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  const load = () => {
    fetch(`/api/provider/website-orders?providerId=${providerId}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  };

  useEffect(() => {
    load();
  }, [providerId]);

  const selectOrder = async (id: string) => {
    const res = await fetch(`/api/provider/website-orders/${id}`);
    const data = await res.json();
    setSelected(data.order ?? null);
    if (data.order) {
      setPreviewUrl(String(data.order.previewUrl ?? ''));
    }
  };

  const claim = async () => {
    if (!selected || !approved) return;
    const res = await fetch(`/api/provider/website-orders/${selected.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, providerName }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('已认领网站订单', 'success');
    load();
    void selectOrder(selected.id);
  };

  const deliver = async () => {
    if (!selected || !previewUrl.trim()) return;
    const res = await fetch(`/api/provider/website-orders/${selected.id}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, previewUrl, deliveryNote }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('交付已提交，等待验收', 'success');
    setDeliveryNote('');
    load();
    void selectOrder(selected.id);
  };

  const isMine = (o: WebsiteOrder) => o.assigneeId === providerId;
  const canClaim = (o: WebsiteOrder) => !o.assigneeId && o.status === 'pending';
  const canDeliver = (o: WebsiteOrder) =>
    isMine(o) && (o.status === 'in_progress' || o.status === 'revision');

  return (
    <div className="space-y-4">
      <div>
        <h1 className={`font-bold text-gray-900 flex items-center gap-2 ${embedded ? 'text-xl' : 'text-lg'}`}>
          <Globe className="w-5 h-5 text-brand" /> 网站订单
        </h1>
        <p className="text-xs text-gray-400 mt-1">认领网页设计/技术交付订单，提交预览链接</p>
      </div>

      <div className="flex gap-4 min-h-[420px]">
        <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-y-auto max-h-[520px]">
            {orders.length === 0 ? (
              <p className="p-4 text-xs text-gray-400">暂无网站订单</p>
            ) : (
              orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => void selectOrder(o.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                    selected?.id === o.id ? 'bg-brand-light/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium truncate text-gray-900">{o.request?.pageType ?? '网页'}</p>
                  <p className="text-xs mt-1 text-gray-400">
                    {o.brandName} · {o.status}
                    {!o.assigneeId ? ' · 待认领' : isMine(o) ? '' : ' · 已指派他人'}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 overflow-y-auto">
          {!selected ? (
            <p className="text-sm text-gray-400 py-12 text-center">选择网站订单</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900">{selected.request?.pageType ?? '网站订单'}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {selected.brandName} · {selected.status}
                </p>
                <p className="text-sm mt-3 text-gray-700">{selected.request?.goal}</p>
              </div>
              {selected.request?.previewHtml && (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-medium border-b border-gray-50 bg-gray-50">AI 预览参考</div>
                  <iframe title="preview" className="w-full h-56 bg-white" sandbox="" srcDoc={selected.request.previewHtml} />
                </div>
              )}
              {selected.revisionReason && (
                <div className="p-4 border-l-4 border-amber-400 bg-amber-50/50 rounded-xl text-sm">
                  <p className="text-xs font-bold text-amber-800 mb-1">返修要求</p>
                  <p>{selected.revisionReason}</p>
                </div>
              )}
              {canClaim(selected) && (
                <button
                  type="button"
                  className="provider-btn-primary text-sm"
                  disabled={!approved}
                  onClick={() => void claim()}
                >
                  {approved ? '认领此单' : '需先通过入驻审核'}
                </button>
              )}
              {canDeliver(selected) && (
                <div className="space-y-2">
                  <input
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                    placeholder="交付预览链接（必填）"
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                  />
                  <input
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="交付说明"
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                  />
                  <button type="button" className="provider-btn-primary text-sm w-full" onClick={() => void deliver()}>
                    提交交付
                  </button>
                </div>
              )}
              {isMine(selected) && selected.status === 'pending_review' && (
                <p className="text-sm p-4 bg-amber-50 rounded-xl text-amber-800">已提交交付，等待商家/平台验收</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
