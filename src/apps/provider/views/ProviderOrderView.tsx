import { useState, useEffect, useRef } from 'react';
import { Upload, Send, Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_CHIP,
  SETTLEMENT_LABEL,
  matchesSearch,
  PLATFORM_SHORT,
} from '../lib/provider-ui';
import {
  isArticleContentOrder,
  DELIVERY_STAGE_LABEL,
  DELIVERY_REVIEW_STATUS_LABEL,
} from '../../../lib/task-order-flow';

const TABS = [
  { id: '', label: '全部' },
  { id: 'executing', label: '进行中' },
  { id: 'pending_review', label: '待验收/审稿' },
  { id: 'revision', label: '返修中' },
  { id: 'completed', label: '已完成' },
] as const;

interface OrderDeliveryRow {
  content: string;
  link?: string | null;
  attachments?: string | null;
  createdAt: string;
  stage?: string;
  reviewStatus?: string | null;
  reviewNote?: string | null;
}

interface Order {
  id: string;
  title: string;
  type?: string;
  platform: string;
  brandName?: string;
  budget: number;
  status: string;
  deliverable: string;
  acceptance: string;
  deliveries?: OrderDeliveryRow[];
  revisions?: Array<{ reason: string; createdAt: string; status?: string }>;
  settlement?: { status: string; amount: number } | null;
}

type AttachmentItem = { type: 'screenshot' | 'file'; name: string; url: string };

interface Props {
  providerId: string;
  searchQuery: string;
  activeOrderId: string | null;
  onSelectOrder: (id: string | null) => void;
}

export default function ProviderOrderView({
  providerId,
  searchQuery,
  activeOrderId,
  onSelectOrder,
}: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [deliveryContent, setDeliveryContent] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');
  const [deliveryAttachments, setDeliveryAttachments] = useState<AttachmentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [revisionResponse, setRevisionResponse] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = (nextPage = 1, append = false) => {
    const params = new URLSearchParams({ providerId, page: String(nextPage), pageSize: '20' });
    if (tab) params.set('status', tab);
    fetch(`/api/provider/orders?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.orders ?? [];
        setOrders(append ? (prev) => [...prev, ...list] : list);
        setHasMore(Boolean(d.hasMore));
        setPage(nextPage);
      });
  };

  useEffect(() => {
    setPage(1);
    load(1, false);
  }, [providerId, tab]);

  useEffect(() => {
    if (!activeOrderId) {
      setSelected(null);
      return;
    }
    fetch(`/api/provider/orders/${activeOrderId}`)
      .then((r) => r.json())
      .then((d) => setSelected(d.order ?? null));
  }, [activeOrderId]);

  const selectOrder = async (id: string) => {
    onSelectOrder(id);
    const res = await fetch(`/api/provider/orders/${id}`);
    setSelected((await res.json()).order);
  };

  const uploadFile = async (file: File, asScreenshot: boolean) => {
    setUploading(true);
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const res = await fetch('/api/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, data: dataUrl }),
    });
    const json = await res.json();
    setUploading(false);
    if (json.error) {
      toast(json.error, 'error');
      return;
    }
    setDeliveryAttachments((prev) => [
      ...prev,
      { type: asScreenshot ? 'screenshot' : 'file', name: file.name, url: json.url },
    ]);
    toast('附件已添加', 'success');
  };

  const deliver = async (stage: 'draft' | 'final' | 'generic') => {
    if (!selected || !deliveryContent.trim()) return;
    const isArticle = isArticleContentOrder(selected);
    const res = await fetch(`/api/provider/orders/${selected.id}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: deliveryContent,
        link: stage === 'final' || stage === 'generic' ? deliveryLink : undefined,
        attachments: stage === 'final' || stage === 'generic' ? deliveryAttachments : deliveryAttachments,
        stage: isArticle ? stage : undefined,
      }),
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    const msg =
      stage === 'draft'
        ? '文章草稿已提交，等待发布方审稿'
        : stage === 'final'
          ? '发布交付已提交，等待最终验收'
          : '交付已提交';
    toast(msg, 'success');
    setDeliveryContent('');
    setDeliveryLink('');
    setDeliveryAttachments([]);
    load();
    void selectOrder(selected.id);
  };

  const filtered = orders.filter((o) =>
    matchesSearch(`${o.title} ${o.brandName ?? ''} ${o.platform}`, searchQuery)
  );

  return (
    <div className="space-y-4 -m-2">
      <div>
        <h1 className="text-xl font-bold text-gray-900">我的订单</h1>
        <p className="text-xs text-gray-400">管理合作进度、交付与验收</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`text-xs px-4 py-2 rounded-xl font-medium shrink-0 ${
              tab === t.id ? 'provider-nav-active' : 'provider-nav-item bg-white border border-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 min-h-[480px]">
        <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => void selectOrder(o.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                  (selected?.id ?? activeOrderId) === o.id ? 'bg-brand-light/50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-sm font-medium truncate text-gray-900">{o.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${ORDER_STATUS_CHIP[o.status] ?? 'bg-gray-100'}`}>
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {PLATFORM_SHORT[o.platform] ?? o.platform} · ¥{o.budget}
                </span>
              </button>
            ))}
            {hasMore && (
              <button type="button" className="w-full py-3 text-xs text-brand font-medium" onClick={() => load(page + 1, true)}>
                加载更多
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 overflow-y-auto min-h-0">
          {!selected ? (
            <p className="text-sm text-gray-400 py-12 text-center">选择左侧订单查看详情</p>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
                <p className="text-xs text-gray-400 mt-1">
                  {PLATFORM_SHORT[selected.platform] ?? selected.platform} · ¥{selected.budget}
                </p>
                {selected.settlement && (
                  <p className="text-xs mt-2 text-brand font-medium">
                    结算：{SETTLEMENT_LABEL[selected.settlement.status] ?? selected.settlement.status} · ¥
                    {selected.settlement.amount}
                  </p>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-xl text-sm">
                <p className="text-xs text-gray-400 mb-1">验收标准</p>
                <p>{selected.acceptance}</p>
              </div>

              {selected.revisions?.map((r, i) => (
                <div key={i} className="p-4 border-l-4 border-amber-400 bg-amber-50/50 rounded-xl text-sm">
                  <p className="text-xs font-bold text-amber-800 mb-1">返修要求</p>
                  <p>{r.reason}</p>
                </div>
              ))}

              {selected.deliveries?.map((d, i) => {
                let atts: AttachmentItem[] = [];
                try {
                  atts = d.attachments ? JSON.parse(d.attachments) : [];
                } catch {
                  /* */
                }
                const stageLabel = d.stage ? DELIVERY_STAGE_LABEL[d.stage] ?? d.stage : '交付';
                return (
                  <div key={i} className="p-4 border border-gray-100 rounded-xl text-sm space-y-2">
                    <p className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {stageLabel}
                      {d.reviewStatus && (
                        <span className="text-brand font-medium">
                          · {DELIVERY_REVIEW_STATUS_LABEL[d.reviewStatus] ?? d.reviewStatus}
                        </span>
                      )}
                      <span className="text-gray-300">· {new Date(d.createdAt).toLocaleString('zh-CN')}</span>
                    </p>
                    {d.reviewNote && (
                      <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2 py-1">修改意见：{d.reviewNote}</p>
                    )}
                    <pre className="whitespace-pre-wrap text-gray-700">{d.content}</pre>
                    {d.link && (
                      <a href={d.link} target="_blank" rel="noreferrer" className="text-brand text-xs">
                        {d.link}
                      </a>
                    )}
                    {atts.map((a, j) => (
                      <a key={j} href={a.url} target="_blank" rel="noreferrer" className="block text-xs text-brand">
                        {a.name}
                      </a>
                    ))}
                  </div>
                );
              })}

              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-gray-600">
                <Send className="w-4 h-4 text-brand inline mr-1" />
                正式沟通以平台「消息通知」为准，订单内暂不开放即时聊天。
              </div>

              {selected.status === 'revision' && !isArticleContentOrder(selected) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">提交返修响应</p>
                  <textarea
                    value={revisionResponse}
                    onChange={(e) => setRevisionResponse(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                    placeholder="说明本次返修的处理方式"
                  />
                  <button
                    type="button"
                    className="provider-btn-primary w-full"
                    onClick={async () => {
                      const res = await fetch(`/api/provider/orders/${selected.id}/revision-response`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ response: revisionResponse }),
                      });
                      const data = await res.json();
                      if (data.error) {
                        toast(data.error, 'error');
                        return;
                      }
                      toast('返修响应已提交', 'success');
                      setRevisionResponse('');
                      load();
                      void selectOrder(selected.id);
                    }}
                  >
                    提交返修响应
                  </button>
                </div>
              )}

              {selected.status === 'draft_review' && (
                <div className="p-4 bg-purple-50 rounded-xl text-sm text-purple-900">
                  文章草稿已提交，等待发布方审稿。通过后可回填发布链接并提交最终交付。
                </div>
              )}

              {isArticleContentOrder(selected) &&
                (selected.status === 'in_progress' || selected.status === 'draft_revision') && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-brand" /> 提交文章草稿
                  </p>
                  <p className="text-xs text-gray-500">
                    提交正文或草稿附件，进入发布方审稿。审稿通过前不会进入最终验收。
                  </p>
                  <textarea
                    value={deliveryContent}
                    onChange={(e) => setDeliveryContent(e.target.value)}
                    rows={8}
                    placeholder="文章正文、大纲或交付说明（可粘贴全文）"
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" className="provider-btn-secondary text-xs" onClick={() => fileInputRef.current?.click()}>
                      上传草稿附件
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadFile(f, false);
                    e.target.value = '';
                  }} />
                  <button type="button" className="provider-btn-primary w-full" onClick={() => void deliver('draft')}>
                    提交审稿
                  </button>
                </div>
              )}

              {isArticleContentOrder(selected) && selected.status === 'draft_approved' && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-brand" /> 提交发布交付（最终验收）
                  </p>
                  <p className="text-xs text-gray-500">
                    审稿已通过。请先在平台发布文章，再填写链接、截图与说明，提交后进入发布方最终验收。
                  </p>
                  <textarea
                    value={deliveryContent}
                    onChange={(e) => setDeliveryContent(e.target.value)}
                    rows={3}
                    placeholder="发布说明（如发布账号、发布时间等）"
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                  />
                  <input
                    value={deliveryLink}
                    onChange={(e) => setDeliveryLink(e.target.value)}
                    placeholder="已发布文章链接 *"
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <label className="provider-btn-secondary cursor-pointer text-xs">
                      {uploading ? '上传中…' : '上传发布截图'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadFile(f, true);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button type="button" className="provider-btn-secondary text-xs" onClick={() => fileInputRef.current?.click()}>
                      上传附件
                    </button>
                  </div>
                  {deliveryAttachments.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {deliveryAttachments.map((a, i) => (
                        <li key={i} className="flex justify-between text-gray-600">
                          <span>{a.name}</span>
                          <button type="button" className="text-brand" onClick={() => setDeliveryAttachments((p) => p.filter((_, j) => j !== i))}>
                            移除
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="provider-btn-primary w-full" onClick={() => void deliver('final')}>
                    提交最终交付
                  </button>
                </div>
              )}

              {!isArticleContentOrder(selected) && selected.status === 'in_progress' && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-brand" /> 提交交付
                  </p>
                  <textarea
                    value={deliveryContent}
                    onChange={(e) => setDeliveryContent(e.target.value)}
                    rows={5}
                    placeholder="交付说明"
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                  />
                  <input
                    value={deliveryLink}
                    onChange={(e) => setDeliveryLink(e.target.value)}
                    placeholder="交付链接"
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                  />
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadFile(f, false);
                    e.target.value = '';
                  }} />
                  <div className="flex gap-2 flex-wrap">
                    <label className="provider-btn-secondary cursor-pointer text-xs">
                      {uploading ? '上传中…' : '上传截图'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadFile(f, true);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button type="button" className="provider-btn-secondary text-xs" onClick={() => fileInputRef.current?.click()}>
                      上传附件
                    </button>
                  </div>
                  {deliveryAttachments.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {deliveryAttachments.map((a, i) => (
                        <li key={i} className="flex justify-between text-gray-600">
                          <span>{a.name}</span>
                          <button type="button" className="text-brand" onClick={() => setDeliveryAttachments((p) => p.filter((_, j) => j !== i))}>
                            移除
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="provider-btn-primary w-full" onClick={() => void deliver('generic')}>
                    提交交付
                  </button>
                </div>
              )}

              {isArticleContentOrder(selected) && selected.status === 'revision' && (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold text-gray-900">最终验收返修 — 重新提交发布交付</p>
                  <textarea
                    value={deliveryContent}
                    onChange={(e) => setDeliveryContent(e.target.value)}
                    rows={3}
                    placeholder="返修说明"
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                  />
                  <input
                    value={deliveryLink}
                    onChange={(e) => setDeliveryLink(e.target.value)}
                    placeholder="更新后的文章链接"
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm"
                  />
                  <button type="button" className="provider-btn-primary w-full" onClick={() => void deliver('final')}>
                    重新提交最终交付
                  </button>
                </div>
              )}

              {selected.status === 'pending_review' && (
                <div className="p-4 bg-amber-50 rounded-xl space-y-2">
                  <p className="text-sm flex items-center gap-2 text-amber-800">
                    <Clock className="w-4 h-4" /> 待发布方最终验收中
                  </p>
                  <input
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="争议说明"
                    className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    className="provider-btn-secondary text-sm"
                    onClick={async () => {
                      if (!disputeReason.trim()) return;
                      await fetch(`/api/provider/orders/${selected.id}/disputes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason: disputeReason, providerId }),
                      });
                      toast('争议已提交', 'info');
                      setDisputeReason('');
                      load();
                      void selectOrder(selected.id);
                    }}
                  >
                    申请平台介入
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
