/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppState, UserProfile } from '../types';
import {
  Crown,
  Shield,
  Target,
  ChevronRight,
  User,
  X,
  Check,
  Fingerprint,
  Sparkles,
  Info,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Lock,
  Smartphone,
  ShieldCheck,
  Award,
  AlertCircle
} from 'lucide-react';

interface ProfileViewProps {
  state: AppState;
  onUpdateProfile: (updatedProfile: UserProfile) => void;
  onUpgrade: () => void;
}

export default function ProfileView({ state, onUpdateProfile, onUpgrade }: ProfileViewProps) {
  const { profile, userScore } = state;

  // Modals visibility state
  const [activeModal, setActiveModal] = useState<'none' | 'edit' | 'verify' | 'preferences' | 'security' | 'growth'>('none');

  // Success alert message within modals
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState(profile.name);
  const [editStatus, setEditStatus] = useState(profile.status);
  const [editResponse, setEditResponse] = useState(profile.responseTime);

  // Prefs selection state
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>(profile.preferences);

  // Security toggles state
  const [secPhone, setSecPhone] = useState(true);
  const [sec2Factor, setSec2Factor] = useState(true);

  // Available industry preference tags for customization
  const AVAILABLE_PREFS = [
    '数码科技', '生活数码', '穿搭美妆', '美甲趋势', '探店分享', 
    '美食测评', '游戏电竞', '动漫ACG', '户外运动', '职场干货'
  ];

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      triggerToast('昵称不能为空！');
      return;
    }
    onUpdateProfile({
      ...profile,
      name: editName.trim(),
      status: editStatus,
      responseTime: editResponse,
    });
    triggerToast('个人基础档案保存成功！');
    setTimeout(() => setActiveModal('none'), 1200);
  };

  const handleTogglePref = (pref: string) => {
    if (selectedPrefs.includes(pref)) {
      setSelectedPrefs(selectedPrefs.filter(p => p !== pref));
    } else {
      setSelectedPrefs([...selectedPrefs, pref]);
    }
  };

  const handleSavePrefs = () => {
    if (selectedPrefs.length === 0) {
      triggerToast('请至少选择一个擅长领域！');
      return;
    }
    onUpdateProfile({
      ...profile,
      preferences: selectedPrefs,
    });
    triggerToast('接单领域偏好更新成功！');
    setTimeout(() => setActiveModal('none'), 1200);
  };

  const handleSaveSecurity = () => {
    let currentLevel: 'high' | 'medium' | 'low' = 'high';
    if (!secPhone && !sec2Factor) {
      currentLevel = 'low';
    } else if (!secPhone || !sec2Factor) {
      currentLevel = 'medium';
    }

    onUpdateProfile({
      ...profile,
      safeLevel: currentLevel,
    });
    triggerToast('账号安全防护级别已更新');
    setTimeout(() => setActiveModal('none'), 1200);
  };

  // Status label helpers
  const getStatusLabelAndColor = (status: 'accepting' | 'busy' | 'resting') => {
    switch (status) {
      case 'accepting':
        return { label: '可接单', color: 'text-green-500 bg-green-50 border-green-100', dot: 'bg-green-500' };
      case 'busy':
        return { label: '忙碌中', color: 'text-orange-500 bg-orange-50 border-orange-100', dot: 'bg-orange-500' };
      case 'resting':
        return { label: '休息中', color: 'text-gray-500 bg-gray-50 border-gray-100', dot: 'bg-gray-400' };
    }
  };

  const statusHelper = getStatusLabelAndColor(profile.status);

  // Security helper
  const getSecurityHelper = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return { label: '安全设置完善', class: 'text-green-600 bg-green-50/50 border-green-100', iconColor: 'text-green-500' };
      case 'medium':
        return { label: '安全级别：中', class: 'text-orange-600 bg-orange-50/50 border-orange-100', iconColor: 'text-orange-500' };
      case 'low':
        return { label: '存在安全隐患', class: 'text-red-600 bg-red-50/50 border-red-100', iconColor: 'text-red-500' };
    }
  };

  const secHelper = getSecurityHelper(profile.safeLevel);

  return (
    <div className="space-y-6 relative text-left">
      {/* Toast Alert floating top */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur text-white font-medium text-xs px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-bounce border border-gray-800">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-950 tracking-tight">个人中心</h1>
          <p className="text-xs text-gray-400 mt-1">查看和编辑个人基础信息、实名认证状态、接单偏好以及账号等级特权</p>
        </div>
      </div>

      {/* Main Profile Summary Card */}
      <div id="profile-main-summary-card" className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.015)] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-brand-light to-transparent opacity-40 pointer-events-none rounded-bl-full"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-50">
          {/* Left Block: Identity */}
          <div className="flex items-center gap-5">
            <div className="relative group shrink-0">
              <img
                src={profile.avatar}
                alt="User Big Avatar"
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-50 shadow-inner group-hover:scale-105 transition-all duration-300"
              />
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md border border-white shadow-sm leading-none">
                Lv.3
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-950 tracking-tight">{profile.name}</h2>
                <span className="border border-orange-200 bg-orange-50 text-orange-600 rounded-lg text-[9px] px-1.5 py-0.5 font-bold inline-flex items-center gap-0.5">
                  Lv.3 创作达人
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full inline-block ${statusHelper.dot} animate-pulse`}></span>
                <span className="font-semibold text-gray-700">{statusHelper.label}</span>
                <span className="text-gray-300">|</span>
                <span>信誉评估 920分 (超优)</span>
              </div>
            </div>
          </div>

          {/* Right Block: Action to edit */}
          <div>
            <button
              id="edit-profile-action-btn"
              onClick={() => {
                setEditName(profile.name);
                setEditStatus(profile.status);
                setEditResponse(profile.responseTime);
                setActiveModal('edit');
              }}
              className="bg-brand hover:bg-brand-hover text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm shadow-md shadow-brand/10 hover:shadow-brand/20 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              编辑资料
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 pt-6 text-center">
          <div className="border-r border-gray-100 last:border-r-0">
            <p className="text-[10px] sm:text-xs text-gray-400 font-medium mb-1">完成订单</p>
            <p className="text-lg sm:text-2xl font-black text-gray-950 font-mono tracking-tight">
              {state.orders.filter(o => o.status === 'settled').length + profile.completedOrdersCount}
            </p>
          </div>
          <div className="border-r border-gray-100 last:border-r-02">
            <p className="text-[10px] sm:text-xs text-gray-400 font-medium mb-1">好评率</p>
            <p className="text-lg sm:text-2xl font-black text-gray-950 font-mono tracking-tight">{profile.ratingRate}%</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-400 font-medium mb-1">响应</p>
            <p className="text-lg sm:text-2xl font-black text-gray-950 font-mono tracking-tight">{profile.responseTime}</p>
          </div>
        </div>
      </div>

      {/* Grid of 3 quick access cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: 认证资料 */}
        <div
          id="quick-card-certification"
          onClick={() => setActiveModal('verify')}
          className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:border-brand/20 hover:shadow-lg hover:shadow-gray-200/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100/30 flex items-center justify-center text-brand shrink-0">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-950 group-hover:text-brand transition-colors">认证资料</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">已完成实名认证</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Card 2: 接单偏好 */}
        <div
          id="quick-card-preference"
          onClick={() => {
            setSelectedPrefs(profile.preferences);
            setActiveModal('preferences');
          }}
          className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:border-brand/20 hover:shadow-lg hover:shadow-gray-200/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-105 flex items-center justify-center text-orange-500 shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-950 group-hover:text-amber-500 transition-colors">接单偏好</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">已设置擅长领域模板</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Card 3: 账号安全 */}
        <div
          id="quick-card-security"
          onClick={() => setActiveModal('security')}
          className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:border-brand/20 hover:shadow-lg hover:shadow-gray-200/20 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-51 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-950 group-hover:text-emerald-650 transition-colors">账号安全</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{secHelper.label}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Full Rows Box: Growth Plan details */}
      <div id="full-card-growth-plan" className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] relative overflow-hidden">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-50 to-orange-50 p-3 border border-rose-100/50 flex items-center justify-center text-brand shrink-0">
            <Crown className="w-8 h-8 text-orange-500 fill-orange-500" />
          </div>
          <div className="space-y-1.5 text-left flex-1 md:flex-none">
            <h3 className="text-base font-bold text-gray-950">成长计划</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-gray-600">Lv.3 创作达人</span>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-1">{userScore} / 1200 分</span>
            </div>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="flex-1 w-full md:px-4">
          <div className="h-2 bg-gray-50 border border-gray-100 rounded-full w-full overflow-hidden relative">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${(userScore / 1200) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
            <span>成长值 {userScore}</span>
            <span>下一等级 Lv.4 ({1200 - userScore}分升级)</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="w-full md:w-auto shrink-0 flex gap-2">
          <button
            onClick={() => setActiveModal('growth')}
            className="flex-1 md:flex-none border border-brand text-brand hover:bg-brand-light font-bold py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer text-center"
          >
            详情查看
          </button>
          {userScore < 1200 && (
            <button
              onClick={onUpgrade}
              className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer text-center"
            >
              一键升级
            </button>
          )}
        </div>
      </div>

      {/* ==================================== MODAL 1: EDIT PROFILE ==================================== */}
      {activeModal === 'edit' && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button onClick={() => setActiveModal('none')} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-brand" />
              <h3 className="font-bold text-base text-gray-950">编辑个人数据档案</h3>
            </div>
            
            <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-650 mb-1.5">主媒体达人昵称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border-gray-100/80 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-brand focus:ring-0 outline-none"
                  placeholder="如: 媒体人 小北"
                  maxLength={16}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-650 mb-1.5">当前接单接驳状态</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['accepting', 'busy', 'resting'] as const).map((st) => {
                    const option = getStatusLabelAndColor(st);
                    const isSelected = editStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditStatus(st)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'border-brand bg-brand-light text-brand'
                            : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${option.dot}`}></span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-650 mb-1.5">日常线上平均响应时效</label>
                <select
                  value={editResponse}
                  onChange={(e) => setEditResponse(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border-gray-100 rounded-xl text-xs sm:text-sm focus:bg-white focus:border-brand focus:ring-0 outline-none"
                >
                  <option value="1h">1h (极速高配合)</option>
                  <option value="2h">2h (优质级响应)</option>
                  <option value="4h">4h (普通时效级)</option>
                  <option value="12h">12h (晚间集中处理)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2.5 rounded-xl border border-gray-100 text-xs text-gray-500 font-bold hover:bg-gray-50 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================== MODAL 2: CERTIFICATION INFO ==================================== */}
      {activeModal === 'verify' && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button onClick={() => setActiveModal('none')} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
              <Fingerprint className="w-6 h-6 text-brand" />
              <div>
                <h3 className="font-bold text-base text-gray-950">实名资质信用档案</h3>
                <p className="text-[10px] text-gray-400">中华人民共和国国家网络空间信息真实身份认证</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-green-800">已通过一类实名信息审核</h4>
                  <p className="text-[10px] text-green-600 mt-1">系统已对接中国银联与公安部门身份系统，极速提现与纳税申报安全体系已在安全托管期生效中。</p>
                </div>
              </div>

              <div className="space-y-2 text-xs divide-y divide-gray-50">
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">实名身份</span>
                  <span className="font-bold text-gray-800">陈*北</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">证件类别</span>
                  <span className="font-semibold text-gray-700">中华人民共和国居民身份证</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">身份证号</span>
                  <span className="font-mono text-gray-800 font-semibold">110101********3412</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">信用授权评级</span>
                  <span className="text-green-500 font-semibold">AAA 卓越信誉</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">认证办理时间</span>
                  <span className="text-gray-650">2025年12月14日</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-[10px] text-gray-400 leading-normal flex gap-1.5 mt-2">
                <AlertCircle className="w-3.5 h-3.5 text-gray-450 shrink-0" />
                <span>实名资质涉及资金汇兑和个人所得税预扣，如果更改需要联系直管运营顾问（1对1专线办理），不可线上任意修改。</span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  我已了解
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL 3: PREFERENCES ADJUSTMENT ==================================== */}
      {activeModal === 'preferences' && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button onClick={() => setActiveModal('none')} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
              <Target className="w-5 h-5 text-orange-500" />
              <div>
                <h3 className="font-bold text-base text-gray-950">设置擅长及接单核心领域</h3>
                <p className="text-[10px] text-gray-400">系统将根据您勾选的领域标签，在任务大厅优先推荐高匹配度合作约稿</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-650 mb-3 block">请选择您的创作垂类标签 (多选)</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_PREFS.map((pref) => {
                    const isSelected = selectedPrefs.includes(pref);
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => handleTogglePref(pref)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                          isSelected
                            ? 'bg-brand/10 border-brand text-brand hover:bg-brand/15'
                            : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{pref}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-[10px] text-orange-700 leading-normal">
                📊 <strong>小助手推荐:</strong> 目前「数码科技」、「生活数码」爆单中，当前季度对应品牌总预算增长 120%，建议将其保留。
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2.5 border border-gray-100 text-xs text-gray-500 font-bold rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSavePrefs}
                  className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  保存接单偏好
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL 4: SECURITY CONTROLS ==================================== */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button onClick={() => setActiveModal('none')} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
              <Shield className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="font-bold text-base text-gray-950">账号隐私与安全防护中心</h3>
                <p className="text-[10px] text-gray-400">护航账号自主安全，防暴力破解，配置支付结算动态认证</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3.5">
                {/* Simulated Switch 1: Phone */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100/40">
                  <div className="flex items-start gap-2.5">
                    <Smartphone className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">绑定主手机号进行校验</h4>
                      <p className="text-[10px] text-gray-400 mt-1">138****0123 已就绪</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSecPhone(!secPhone)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer relative ${secPhone ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full transition-transform transform ${secPhone ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Simulated Switch 2: 2FA */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100/40">
                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 font-medium">双重动态口令结算锁</h4>
                      <p className="text-[10px] text-gray-400 mt-1">提现转账必须输入安全软件一次性动态密令</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSec2Factor(!sec2Factor)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer relative ${sec2Factor ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full transition-transform transform ${sec2Factor ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Simulated Switch 3: Credit */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100/40">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 font-medium">签署平台信用共建公约</h4>
                      <p className="text-[10px] text-gray-400 mt-1">平台评估星级受此公约加成</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg shrink-0">
                    已签署
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2.5 border border-gray-100 text-xs text-gray-500 font-bold rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveSecurity}
                  className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  确认保存设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL 5: GROWTH PLAN BENEFITS ==================================== */}
      {activeModal === 'growth' && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150 text-left">
            <button onClick={() => setActiveModal('none')} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
              <Crown className="w-6 h-6 text-orange-500 fill-orange-500 animate-pulse" />
              <div>
                <h3 className="font-bold text-base text-gray-950">GEO 媒体合伙人等级及特权</h3>
                <p className="text-[10px] text-gray-400">接单并交付高质量稿件可增加成长值。等级越高，权益愈好</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              <div className="space-y-3">
                {/* Level 1 */}
                <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-700">Lv.1 创作新手 (0 - 300)</span>
                    <span className="text-[10px] text-gray-400 font-medium">基础约稿权限</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    享基础爆量合作、小助手撮合接单，收益一般需3~5天审核下发，不包含溢价调整和运营顾问保障。
                  </p>
                </div>

                {/* Level 2 */}
                <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-700">Lv.2 创作好手 (301 - 600)</span>
                    <span className="text-[10px] text-gray-400 font-medium">成长激励</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    享专属短视频/图文创意思路指导。预算佣金基准上浮5%，收益结算缩减至1~2日核赔。
                  </p>
                </div>

                {/* Level 3 */}
                <div className="p-3 bg-orange-50/40 border border-orange-100 rounded-2xl">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-orange-950">Lv.3 创作达人 (601 - 1200)</span>
                      <span className="text-[8px] bg-brand text-white font-black px-1.5 rounded">当前</span>
                    </div>
                    <span className="text-[10px] text-orange-650 font-bold">达人尊享</span>
                  </div>
                  <ul className="text-[10px] text-orange-800 list-disc pl-4 space-y-1 mt-1 font-medium">
                    <li>1对1专属爆款运营顾问，专线答疑</li>
                    <li>爆量任务推荐直通车，自动对齐最契合粉丝群</li>
                    <li><strong>即时结算通道：</strong>品牌点击审核通过后，额度最高5秒内即时划转提现（实时到账）</li>
                    <li>好评和反馈双重加权，享有前向优先派单保障</li>
                  </ul>
                </div>

                {/* Level 4 */}
                <div className="p-3 bg-gray-50/20 rounded-2xl border border-gray-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-700">Lv.4 顶级创作大咖 (1200+)</span>
                    <span className="text-[10px] text-gray-400 font-medium">峰值权益</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal font-medium">
                    独家头部奢品/高科技品牌专属定向爆单约稿（月保障10单+）；享受专属线下峰会特权及流量推荐扶持（单篇额外增加30%~50%官方红扶持）；可申请并联合设立个人/机构专属工作台联盟。
                  </p>
                </div>
              </div>

              {userScore < 1200 ? (
                <div className="pt-2 flex justify-between items-center">
                  <div className="text-[10px] text-gray-400">
                    距离Lv.4需要 <strong>{1200 - userScore} 无退款信用分</strong>
                  </div>
                  <button
                    onClick={() => {
                      onUpgrade();
                      setActiveModal('none');
                    }}
                    className="bg-brand text-white text-xs font-bold py-2 px-4 rounded-xl hover:bg-brand-hover tracking-wide mt-1 animate-pulse"
                  >
                    极速加分升级
                  </button>
                </div>
              ) : (
                <div className="text-center font-bold text-[11px] text-green-600 bg-green-50 p-2 rounded-xl mt-1">
                  🎉 恭喜！您已在 GEO 平台创作者成长体系中享有最高级尊誉特权！
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
