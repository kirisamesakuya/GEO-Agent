/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { AppState, CreatorOrder, OrderStatus, ChatMessage } from '../types';
import {
  FileText,
  Pencil,
  ShieldCheck,
  Wallet,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Check,
  Clock,
  ArrowUpRight,
  Upload,
  Link2,
  Smile,
  Send,
  Eye,
  Trash2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface OrderViewProps {
  state: AppState;
  onSelectOrder: (orderId: string | null) => void;
  onDeliverOrder: (orderId: string, deliveryUrl: string, fileName: string, notes: string) => void;
  onAddChatMessage: (orderId: string, text: string) => void;
}

export default function OrderView({ state, onSelectOrder, onDeliverOrder, onAddChatMessage }: OrderViewProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | OrderStatus>('all');
  const [chatText, setChatText] = useState('');
  const [deliverLink, setDeliverLink] = useState('');
  const [deliverNotes, setDeliverNotes] = useState('');
  
  // File upload drag & drop states
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeOrder = state.orders.find((o) => o.id === state.activeOrderId);

  // Filter logic
  const filteredOrders = state.orders.filter((o) => {
    // Top-bar search integration
    const matchSearch =
      o.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      o.brand.toLowerCase().includes(state.searchQuery.toLowerCase());
    
    if (!matchSearch) return false;
    if (activeFilter === 'all') return true;
    return o.status === activeFilter;
  });

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile({
        name: file.name,
        url: URL.createObjectURL(file)
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile({
        name: file.name,
        url: URL.createObjectURL(file)
      });
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Submit Deliverables triggers
  const handleSubmitDeliverables = () => {
    if (!activeOrder) return;
    const finalFile = uploadedFile ? uploadedFile.name : '交付样图打包.zip';
    onDeliverOrder(activeOrder.id, deliverLink, finalFile, deliverNotes);
    // Reset local form elements
    setUploadedFile(null);
    setDeliverLink('');
    setDeliverNotes('');
  };

  const handleSendMessage = () => {
    if (!activeOrder || !chatText.trim()) return;
    onAddChatMessage(activeOrder.id, chatText.trim());
    setChatText('');
  };

  // Counter metrics matching designs
  const applyingCount = state.orders.filter((o) => o.status === 'applying').length;
  const creatingCount = state.orders.filter((o) => o.status === 'creating').length;
  const checkingCount = state.orders.filter((o) => o.status === 'checking').length;
  const settledSum = 12480; // Hardcoded static balance from mockup

  // If viewing main orders list hall
  if (!activeOrder) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">我的订单</h1>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveFilter('applying')}
            className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center cursor-pointer hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand shadow-sm mr-4 shrink-0 relative">
              <FileText className="w-6 h-6" />
              {applyingCount > 0 && (
                <div className="absolute w-2.5 h-2.5 bg-brand rounded-full border-2 border-white -top-0.5 -right-0.5 animate-pulse"></div>
              )}
            </div>
            <div>
              <div className="text-[11px] text-gray-500 mb-0.5 font-medium">申请中</div>
              <div className="text-xl font-bold text-gray-900 flex items-center">
                {applyingCount} <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-1" />
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('creating')}
            className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center cursor-pointer hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm mr-4 shrink-0">
              <Pencil className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 mb-0.5 font-medium">创作中</div>
              <div className="text-xl font-bold text-gray-900 flex items-center">
                {creatingCount} <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-1" />
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('checking')}
            className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center cursor-pointer hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm mr-4 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 mb-0.5 font-medium">待验收</div>
              <div className="text-xl font-bold text-gray-900 flex items-center">
                {checkingCount} <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-1" />
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveFilter('settled')}
            className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center cursor-pointer hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-green-500 shadow-sm mr-4 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 mb-0.5 font-medium">待结算</div>
              <div className="text-base font-bold text-gray-900 flex items-center font-mono">
                ¥ {settledSum.toLocaleString()} <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex items-center justify-between border-b border-gray-100">
          <div className="flex gap-6 text-sm">
            {[
              { id: 'all', label: '全部' },
              { id: 'applying', label: '申请中' },
              { id: 'creating', label: '创作中' },
              { id: 'checking', label: '待验收' },
              { id: 'settled', label: '已结算' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`pb-3 font-semibold transition-all border-b-2 cursor-pointer ${
                  (activeFilter === tab.id || (tab.id === 'all' && activeFilter === 'all'))
                    ? 'border-brand text-brand font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="pb-3 text-xs text-gray-400">最新下单排序</div>
        </div>

        {/* Order Cards Grid */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-white border border-dashed rounded-2xl">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-405">没有符合该归类条件或搜索名字的对应订单订单</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const applied = order.status === 'applying';
              const creating = order.status === 'creating';
              const checking = order.status === 'checking';
              const settled = order.status === 'settled';

              let statusLabel = '进行中';
              let styleTag = 'bg-blueTag text-blueText border-blueText/10';
              if (applied) {
                statusLabel = '申请中';
                styleTag = 'bg-red-50 text-red-500 border-red-100';
              } else if (creating) {
                statusLabel = '创作中';
                styleTag = 'bg-amber-50 text-amber-600 border-amber-100';
              } else if (checking) {
                statusLabel = '待验收';
                styleTag = 'bg-indigo-50 text-indigo-600 border-indigo-150';
              } else if (settled) {
                statusLabel = '已结算';
                styleTag = 'bg-green-50 text-green-600 border-green-150';
              }

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group ${
                    settled ? 'opacity-70' : applied ? 'opacity-85' : ''
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                    {/* Cover & basics */}
                    <div className="flex gap-4 items-center">
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative bg-gray-50 border">
                        <img src={order.coverImage} className="w-full h-full object-cover" alt="" />
                        <span className="absolute top-1 left-1 bg-brand text-white text-[8px] font-black px-1 rounded-sm leading-tight">
                          {order.platform === 'xiaohongshu' ? '小红书' : order.platform === 'douyin' ? '抖音' : '知乎'}
                        </span>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-gray-900 group-hover:text-brand transition-colors">
                            {order.title}
                          </h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${styleTag}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-lg font-black text-brand font-mono">¥ {order.budget.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> 截止交付：{order.deadline}
                        </p>
                      </div>
                    </div>

                    {/* Timeline & details trigger button */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6 w-full md:w-auto justify-between sm:justify-end">
                      {/* Timeline graphic based on status */}
                      <div className="flex items-center w-52 relative text-[10px] text-gray-400 font-medium">
                        <div className="absolute left-4 right-4 top-2 h-0.5 bg-gray-100 -z-10"></div>
                        <div
                          className="absolute left-4 top-2 h-0.5 bg-brand -z-10 transition-all duration-500"
                          style={{
                            width: settled ? '100%' : checking ? '75%' : creating ? '50%' : '0%'
                          }}
                        ></div>

                        <div className="flex-1 flex flex-col items-center">
                          <Check className={`w-4.5 h-4.5 rounded-full p-0.5 text-white ${applied || creating || checking || settled ? 'bg-brand' : 'bg-gray-205'}`} />
                          <span className="mt-1">接单</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <Check className={`w-4.5 h-4.5 rounded-full p-0.5 text-white ${creating || checking || settled ? 'bg-brand' : 'bg-gray-205'}`} />
                          <span className="mt-1">创作</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <Check className={`w-4.5 h-4.5 rounded-full p-0.5 text-white ${checking || settled ? 'bg-brand' : 'bg-gray-205'}`} />
                          <span className="mt-1">验收</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectOrder(order.id)}
                        className={`text-xs px-5 py-2 rounded-xl font-bold min-w-[88px] cursor-pointer transition-all ${
                          settled
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'
                            : 'bg-brand text-white hover:bg-brand-hover shadow-brand/10 hover:translate-x-0.5'
                        }`}
                      >
                        {settled ? '已结算' : creating ? '去交付' : '查看详情'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // DETAILED VIEW (View 3 - ORDER DETAILED WORKSPACE)
  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="text-xs text-gray-400 font-medium flex items-center gap-2">
        <button onClick={() => onSelectOrder(null)} className="hover:text-gray-900 cursor-pointer">
          我的订单
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-semibold">订单详情</span>
      </div>

      {/* Overview Block */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div className="flex gap-4">
            <img
              alt="Order Thumbnail"
              className="w-24 h-20 object-cover rounded-xl border"
              src={activeOrder.coverImage}
            />
            <div className="text-left">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">{activeOrder.title}</h1>
                <span className="bg-red-50 text-red-500 border border-red-100 text-[10px] px-2 py-0.5 rounded leading-tight font-black uppercase">
                  {activeOrder.platform === 'xiaohongshu' ? '小红书' : '其他平台'}
                </span>
                <span className="bg-brand-light text-brand border border-brand/10 text-[10px] px-2 py-0.5 rounded leading-tight font-semibold">
                  {activeOrder.status === 'creating' ? '创作中' : activeOrder.status === 'checking' ? '待验收' : activeOrder.status === 'settled' ? '已结算' : '申请中'}
                </span>
              </div>
              <p className="text-xs text-gray-500">品牌：{activeOrder.brand} (实人认证) | 订单号: {activeOrder.id}</p>
            </div>
          </div>

          <div className="flex gap-8 text-left w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0">
            <div>
              <div className="text-xs text-gray-400 mb-1">接单预算</div>
              <div className="text-xl font-black text-brand font-mono">¥ {activeOrder.budget.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">预计截止时间</div>
              <div className="text-sm font-semibold text-gray-800">{activeOrder.deadline}</div>
            </div>
          </div>
        </div>

        {/* High-fidelity progression bar timeline */}
        <div className="mt-8 pt-8 border-t border-gray-100 px-6">
          <div className="relative flex justify-between items-center w-full">
            <div className="absolute left-8 right-8 top-3.5 h-0.5 bg-gray-100 -z-10"></div>
            <div
              className="absolute left-8 top-3.5 h-0.5 bg-brand -z-10 transition-all duration-500"
              style={{
                width: activeOrder.status === 'settled' ? '100%' : activeOrder.status === 'checking' ? '66%' : activeOrder.status === 'creating' ? '33%' : '0%'
              }}
            ></div>

            {/* Steps */}
            {[
              { label: '接单', icon: '1', date: '5月16日 10:30', compl: true },
              { label: '创作', icon: '2', date: '5月16日 13:15', compl: activeOrder.status !== 'applying' },
              { label: '验收', icon: '3', date: activeOrder.status === 'checking' ? '资料已交待审' : '待提交', compl: activeOrder.status === 'checking' || activeOrder.status === 'settled' },
              { label: '结算', icon: '4', date: activeOrder.status === 'settled' ? '完成打款' : '待结算', compl: activeOrder.status === 'settled' }
            ].map((st, i) => (
              <div key={i} className="flex flex-col items-center bg-white px-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 text-xs font-black shadow-sm-light border transition-all ${
                    st.compl
                      ? 'bg-brand text-white border-brand leading-none'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  {st.compl ? '✓' : st.icon}
                </div>
                <div className="text-xs font-bold text-gray-900">{st.label}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">{st.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main interactive split columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns (Submit area & Record Logs) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deliverables submit slot */}
          {activeOrder.status === 'creating' && (
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4">提交交付</h2>
              <div className="space-y-4">
                {/* Drag and drop upload */}
                <div>
                  <label className="block text-xs font-medium text-gray-750 mb-2">交付稿件及截图</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleTriggerUpload}
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-100/60 transition-all cursor-pointer group ${
                      isDragOver ? 'border-brand bg-brand-light/20' : 'border-gray-200'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".jpg,.png,.jpeg,.pdf,.zip"
                    />

                    {uploadedFile ? (
                      <div className="text-center space-y-2">
                        <FileSpreadsheet className="w-10 h-10 text-brand mx-auto" />
                        <p className="text-xs font-semibold text-gray-900">{uploadedFile.name}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                          }}
                          className="text-[10px] text-red-500 hover:underline font-bold flex items-center gap-1 mx-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 移除重新上传
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform text-gray-400">
                          <Upload className="w-5 h-5 text-gray-450" />
                        </div>
                        <div className="text-xs font-semibold text-gray-800 mb-1">
                          拖拽您的交付截图或文件到此，或点击直接上传
                        </div>
                        <div className="text-[10px] text-gray-400">
                          支持 JPG / PNG / PDF，单个文件夹文件不超过 20MB
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Paste URL */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-medium text-gray-750">或粘贴发布后的作品链接</label>
                    <span className="text-[10px] text-gray-400">请确保链接可公开访问</span>
                  </div>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={deliverLink}
                      onChange={(e) => setDeliverLink(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand transition-colors"
                      placeholder="粘贴小红书笔记发布链接 (如 https://www.xiaohongshu.com/...)"
                    />
                  </div>
                </div>

                {/* notes info */}
                <div>
                  <label className="block text-xs font-medium text-gray-750 mb-2">交付说明 (选填)</label>
                  <textarea
                    value={deliverNotes}
                    onChange={(e) => setDeliverNotes(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-xs h-20 outline-none focus:border-brand transition-colors resize-none"
                    placeholder="补充交代稿件亮点、引见数据、投放设置或者需要品牌方留意的要点等..."
                  />
                </div>

                {/* action buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleSubmitDeliverables}
                    className="flex-1 bg-brand text-white font-bold py-2.5 rounded-xl hover:bg-brand-hover transition-colors text-xs shadow-md shadow-brand/10 cursor-pointer hover:translate-x-0.5"
                  >
                    提交验收申请
                  </button>
                  <button className="w-32 bg-white border border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-xs cursor-pointer">
                    保存草稿
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Delivery Records log list */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4">合作及交付历史记录</h2>
            <div className="space-y-4">
              {activeOrder.history.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs py-3 border-b border-gray-50 last:border-0 last:pb-0 font-medium"
                >
                  <div className="flex items-center gap-3 w-1/3">
                    <div className="w-2 h-2 rounded-full bg-brand"></div>
                    <span className="text-gray-800">{rec.title}</span>
                  </div>
                  <div className="w-1/3 text-gray-500">{rec.operator}</div>
                  <div className="w-1/3 text-right text-gray-400 font-mono">{rec.time}</div>
                </div>
              ))}
              {activeOrder.status === 'creating' && (
                <div className="flex items-center justify-between text-xs py-3 text-gray-400 font-medium border-t border-gray-50 border-dashed">
                  <div className="flex items-center gap-3 w-1/3">
                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                    <span>等待提交验收</span>
                  </div>
                  <div className="w-1/3">-</div>
                  <div className="w-1/3 text-right">-</div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right column: checklist, assets, and messaging */}
        <div className="space-y-6">
          {/* Approval standards list */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-900 mb-4">品牌验收基本规范</h2>
            <ul className="space-y-3 text-left">
              {[
                '发布图文内容必须真实原创，坚决杜绝洗稿及抄袭行为',
                '文章内页不少于 8 张高清实拍，精选字数不少于 300 字',
                '必须精确包含门店的周边商区环境、特色餐点招牌以及价格区间',
                '笔记发布前务必附带官方指定的核心品牌话题 #青岚咖啡探店'
              ].map((text, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-650 leading-relaxed">
                  <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Quick Assets links */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs font-bold text-gray-900">高品质品牌素材</h2>
              <span className="text-[10px] text-gray-400">全部</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 cursor-pointer group">
                <div className="rounded-lg overflow-hidden border h-20 bg-gray-50">
                  <img
                    alt="Store"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDX1Pky7HSk94Aaov8dqUqW1BoBafLtLDi3voH6a5WOW11bX2lsdYUjncglyU7iEeRxZtJenExsVRiccbc6owlfecdPiCiJVw5gXh-jYz30rI7G5kI0YWdzA0FmaGW2ItzC__LFufUfXnCmXIQTtA5S4prb3H67lQo8CMofPKyQkeIdSAnJhyLU5rdPB3vyJbNINuMSswBBSZNGze9UA5-9sRgSOKV0iWL32PCtN3IofFfkY4Ye7CVGi7Drmvm6gXsmglNTnaQnyrli"
                  />
                </div>
                <div className="text-[10px] text-gray-600 text-center font-bold">门店外观.jpg</div>
              </div>

              <div className="space-y-1.5 cursor-pointer group">
                <div className="rounded-lg overflow-hidden border h-20 bg-gray-50">
                  <img
                    alt="Product"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCb2_-LvKoUampypSTOBe3ZdA-cI5mDg58ygTtvi0SKHDw_3bXC9ntIrlARDwOBOHYBuRy4lRjU5dlfxPQW0K4EQJqNpSghWLFc4d98KpQIPmVQmdn82PTfMDLW1qMNTfa441uOV2u6VuJxS2iRnKo2y9WnDz--rZE0h1CKayjHw94ZIQIdBqDyrAa9-tkC9VVxu9iDd7fn94TdqXMvfY3sWVfkLhC_KO5Drv-fJjL9PRHNBeukthMAs83pyarbRIj_rPGe7SL_65eL"
                  />
                </div>
                <div className="text-[10px] text-gray-600 text-center font-bold">新品主打图.png</div>
              </div>
            </div>
          </section>

          {/* Chat Messaging Box (Interactive) */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col h-[320px]">
            <h2 className="text-xs font-bold text-gray-900 mb-3 block shrink-0">实时在线沟通 (品牌方)</h2>
            
            {/* Scrollable chat body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-3 scrollbar-hide text-left">
              {activeOrder.messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-[11px] font-medium leading-relaxed">
                  暂无聊天记录。试着给品牌方发一条消息，交代您的想法。
                </div>
              ) : (
                activeOrder.messages.map((msg) => {
                  const isMe = msg.sender === 'creator';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-black text-[9px] shrink-0 overflow-hidden border uppercase text-gray-800">
                        {msg.avatar ? (
                          <img src={msg.avatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                          msg.senderName.charAt(0)
                        )}
                      </div>
                      <div className="max-w-[75%]">
                        <div className="flex items-baseline gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-[10px] font-bold text-gray-850">{msg.senderName}</span>
                          <span className="text-[8px] text-gray-400 font-mono">{msg.time}</span>
                        </div>
                        <div
                          className={`text-xs px-3 py-2 rounded-xl inline-block leading-relaxed font-semibold ${
                            isMe
                              ? 'bg-brand text-white rounded-tr-none text-left'
                              : 'bg-gray-100 text-gray-800 rounded-tl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message composer input */}
            <div className="shrink-0 flex items-center gap-1.5 border border-gray-205 rounded-xl p-1 bg-gray-50/50">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                className="flex-1 bg-transparent border-none text-xs focus:ring-0 px-2 py-1 outline-none font-semibold text-gray-800"
                placeholder="请输入并发送消息给品牌方..."
              />
              <button
                type="button"
                onClick={handleSendMessage}
                className="bg-brand text-white font-bold text-xs p-1.5 rounded-lg hover:bg-brand-hover hover:translate-x-0.5 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
