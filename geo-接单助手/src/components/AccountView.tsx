/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, ConnectedAccount } from '../types';
import {
  Link,
  CheckCircle2,
  Edit,
  Wallet,
  Plus,
  HelpCircle,
  X,
  Sparkles,
  Leaf,
  Layers,
  Activity
} from 'lucide-react';

interface AccountViewProps {
  state: AppState;
  onToggleAccountStatus: (id: string) => void;
  onAddAccount: (account: Omit<ConnectedAccount, 'id'>) => void;
  onEditAccountSelection: (account: ConnectedAccount) => void;
}

export default function AccountView({ state, onToggleAccountStatus, onAddAccount, onEditAccountSelection }: AccountViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState<'xiaohongshu' | 'zhihu' | 'official_account' | 'douyin'>('xiaohongshu');
  const [newFollowers, setNewFollowers] = useState('');
  const [newScore, setNewScore] = useState(80);
  const [newField, setNewField] = useState('');

  const [showMessage, setShowMessage] = useState(false);

  // Stats calculation
  const totalBound = state.accounts.length;
  const canAcceptCount = state.accounts.filter(a => a.canAccept).length;
  const pendingCount = 1; // Mapped directly to screenshot '1个待完善'

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newFollowers.trim()) return;

    onAddAccount({
      platform: newPlatform,
      name: newName.trim(),
      avatar: '',
      followers: newFollowers.trim(),
      followersCount: parseInt(newFollowers) || 12000,
      isMain: false,
      canAccept: true,
      score: newScore,
      fields: newField.trim() ? newField.split('、') : ['新媒体运营']
    });

    // Reset Form
    setNewName('');
    setNewFollowers('');
    setNewScore(85);
    setNewField('');
    setShowAddForm(false);

    // Show temporary success flash
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  return (
    <div className="space-y-6 relative">
      {/* Alert Banner */}
      {showMessage && (
        <div className="bg-green-100 border border-green-200 text-green-800 text-xs py-3 px-4 rounded-xl flex justify-between items-center z-50 shadow-md">
          <span className="font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> 成功绑定新媒体达人账号！接单匹配自动配置中。
          </span>
          <button onClick={() => setShowMessage(false)} className="text-green-600 hover:text-green-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-3 text-left">
          <h1 className="text-xl font-bold text-gray-900">我的各平台资源账号</h1>
          <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
            <span>绑定小红书、抖音、知乎，多渠道接单变现</span>
            <HelpCircle className="w-4 h-4 cursor-pointer hover:text-gray-600" />
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-brand hover:bg-brand-hover text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer hover:translate-x-0.5 shadow-sm active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>添加账号</span>
        </button>
      </div>

      {/* Split Columns Grid */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Column: Account Cards and Stats */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-light text-brand flex items-center justify-center text-xl shrink-0">
                <Link className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 mb-0.5 font-medium">已绑定</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{totalBound}</span>
                  <span className="text-xs text-gray-400">个账号</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-xl shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 mb-0.5 font-medium">可接单</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{canAcceptCount}</span>
                  <span className="text-xs text-gray-400">个账号</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-xl shrink-0">
                <Edit className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400 mb-0.5 font-medium">待完善</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{pendingCount}</span>
                  <span className="text-xs text-gray-400">个资料</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {state.accounts.map((acc) => {
              const xhs = acc.platform === 'xiaohongshu';
              const zh = acc.platform === 'zhihu';
              const wx = acc.platform === 'official_account';
              const dy = acc.platform === 'douyin';

              let platformLabel = '其他';
              let badgeBg = 'bg-gray-800';
              if (xhs) {
                platformLabel = '小红书';
                badgeBg = 'bg-[#ff2442]';
              } else if (zh) {
                platformLabel = '知乎';
                badgeBg = 'bg-[#0066ff]';
              } else if (wx) {
                platformLabel = '公众号';
                badgeBg = 'bg-[#07c160]';
              } else if (dy) {
                platformLabel = '抖音';
                badgeBg = 'bg-black';
              }

              return (
                <div
                  key={acc.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 text-white text-[9px] px-2.5 py-1 rounded-br-lg font-bold leading-none ${badgeBg}`}>
                    {platformLabel}
                  </div>

                  <div className="flex justify-between items-start mt-2.5 mb-5 text-left">
                    <div className="flex gap-4 items-center">
                      {acc.avatar ? (
                        <img
                          alt="Avatar"
                          className="w-12 h-12 rounded-full border border-gray-100 object-cover"
                          src={acc.avatar}
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full border text-white flex items-center justify-center font-bold text-base ${badgeBg}`}>
                          {acc.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <h3 className="font-bold text-sm text-gray-950">{acc.name}</h3>
                          {acc.isMain && (
                            <span className="bg-brand-light text-brand text-[8px] px-1.5 py-0.5 rounded border border-brand/20 select-none font-bold">
                              主账号
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-medium">
                          粉丝数 <span className="font-bold text-gray-800">{acc.followers}</span>
                        </p>
                      </div>
                    </div>

                    {/* Highly polished active Toggle Switch matching view 4 */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-gray-400 font-semibold mb-0.5">可接单</span>
                      <button
                        onClick={() => onToggleAccountStatus(acc.id)}
                        className={`relative w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer outline-none ${
                          acc.canAccept ? 'bg-brand' : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                            acc.canAccept ? 'translate-x-[16px]' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5 text-left">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1 font-medium">账号质量评级</p>
                      <p className="text-xl font-black text-green-500 font-mono">
                        {acc.score} <span className="text-[10px] font-normal text-gray-400">分</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1 font-medium">核心属性归类</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {acc.fields.map((tag) => (
                          <span key={tag} className="bg-gray-55 text-gray-600 text-[9px] px-2 py-0.5 rounded font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-auto flex justify-end gap-2.5 pt-4 border-t border-gray-50">
                    <button
                      onClick={() => onEditAccountSelection(acc)}
                      className="px-3 py-1 bg-white border border-gray-250 hover:bg-gray-50 text-xs font-semibold text-gray-600 rounded-lg cursor-pointer transition-colors"
                    >
                      编辑
                    </button>
                    <button className="px-3 py-1 bg-white border border-brand hover:bg-brand-light/30 text-xs font-semibold text-brand rounded-lg cursor-pointer transition-colors">
                      查看数据
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dotted lines Add account */}
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-white border border-dashed border-gray-200 hover:border-brand/40 text-gray-400 hover:text-brand rounded-2xl py-4 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-99"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-semibold">快速添加全新接单账号</span>
          </button>
        </div>

        {/* Right Column: Side cards (Completeness circular chart, pricing templates) */}
        <div className="w-full xl:w-80 space-y-6">
          {/* Completeness Chart wrapper */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-50 pb-3 text-left">
              创作者资料完整度评估
            </h3>
            <div className="relative w-36 h-36 mx-auto my-5">
              <svg className="w-full h-full text-brand progress-circle" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  strokeDasharray="85, 100"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-gray-900 font-mono">85%</span>
                <span className="text-[9px] text-gray-400 mt-0.5">达成高密接单</span>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              {[
                { label: '账号基础信息关联', compl: true, text: '已完善' },
                { label: '实名认证及资质授信', compl: true, text: '已通过' },
                { label: '收款结余账户签约', compl: true, text: '已签约' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] text-green-500 font-bold">{item.text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing Template card */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-left">
            <h3 className="font-bold text-sm text-gray-900 mb-4">报价方案配置</h3>
            <div className="flex gap-4 items-start mb-5">
              <div className="w-11 h-11 rounded-xl bg-brand-light text-brand flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-950 leading-tight">已成功部署 2 个报价方案</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                  快速匹配各平台预算要求，最高提升接单反馈率约 40%。
                </p>
              </div>
            </div>
            <button className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:translate-x-0.5">
              查看并配置报价单
            </button>
          </section>
        </div>
      </div>

      {/* Add Account Popup Form Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative border text-left">
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-950 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-brand" /> 绑定新媒体达人账号
            </h2>
            <p className="text-xs text-gray-400 mb-5">请输入以下信息以建立平台账号授信绑定。</p>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">平台账号称呼</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 border border-gray-205 rounded-xl text-xs outline-none focus:border-brand"
                  placeholder="如：探店小北、摄影咖"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">目标社媒平台</label>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-205 rounded-xl text-xs outline-none focus:border-brand"
                  >
                    <option value="xiaohongshu">小红书</option>
                    <option value="douyin">抖音</option>
                    <option value="zhihu">知乎</option>
                    <option value="official_account">公众号</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">总粉丝体量</label>
                  <input
                    type="text"
                    required
                    value={newFollowers}
                    onChange={(e) => setNewFollowers(e.target.value)}
                    className="w-full p-2.5 border border-gray-205 rounded-xl text-xs text-gray-800 font-medium font-mono outline-none focus:border-brand"
                    placeholder="如：12k, 50w"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">内容方向标签 (、隔开)</label>
                  <input
                    type="text"
                    value={newField}
                    onChange={(e) => setNewField(e.target.value)}
                    className="w-full p-2.5 border border-gray-205 rounded-xl text-xs outline-none focus:border-brand"
                    placeholder="美食探店、咖啡馆、数码评测"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">达人评估质量评分 (50-100)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={newScore}
                    onChange={(e) => setNewScore(parseInt(e.target.value) || 85)}
                    className="w-full p-2.5 border border-gray-205 rounded-xl text-xs text-gray-800 font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer shadow-sm hover:translate-x-0.5 transition-all"
                >
                  确认绑定安全授信
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
