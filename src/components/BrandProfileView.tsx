import { useState, useEffect, useRef, type RefObject } from 'react';
import { BrandProfile, type BrandSourceMaterial, type BrandSourceMaterialKind } from '../types';
import { useToast } from '../context/ToastContext';
import {
  Globe,
  Sparkles,
  Plus,
  X,
  Award,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  Link2,
  Paperclip,
} from 'lucide-react';
import {
  brandSourceMaterialLabel,
  classifyBrandSourceMaterial,
} from '../../lib/brand-source-material';
import RegionCascader from './common/RegionCascader';

interface BrandProfileViewProps {
  brandName: string;
  onBrandNameChange: (name: string) => void;
}

function emptyProfile(name: string): BrandProfile {
  return {
    website: '',
    name,
    industry: '',
    city: '',
    ownerName: '',
    storeCount: 0,
    description: '',
    keywords: [],
    competitors: [],
    forbiddenWords: [],
    sourceMaterials: [],
  };
}

function materialIcon(kind: BrandSourceMaterialKind) {
  switch (kind) {
    case 'image':
      return ImageIcon;
    case 'document':
      return FileText;
    case 'link':
      return Link2;
    default:
      return Paperclip;
  }
}

export default function BrandProfileView({ brandName, onBrandNameChange }: BrandProfileViewProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<BrandProfile>(() => emptyProfile(brandName));
  const [profileReady, setProfileReady] = useState(false);

  // Steps tracking during fetch
  const [extractionStep, setExtractionStep] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  // Edit competitors
  const [newComp, setNewComp] = useState('');
  const [showCompInput, setShowCompInput] = useState(false);

  // Edit forbidden words
  const [newForbidden, setNewForbidden] = useState('');
  const [showForbiddenInput, setShowForbiddenInput] = useState(false);

  useEffect(() => {
    setProfileReady(false);
    const ac = new AbortController();
    fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data?.name) setProfile(data);
        else setProfile(emptyProfile(brandName));
      })
      .catch(() => setProfile(emptyProfile(brandName)))
      .finally(() => setProfileReady(true));
    return () => ac.abort();
  }, [brandName]);

  const pollExtractTask = async (taskId: string) => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/agent-tasks/${taskId}`);
      const data = await res.json();
      const task = data.task;
      if (task?.status === 'succeeded' && task.output?.profile) {
        const p = task.output.profile as BrandProfile;
        setProfile(p);
        onBrandNameChange(p.name);
        toast(`品牌资料已提取：${p.name}`, 'success');
        return;
      }
      if (task?.status === 'failed') {
        toast('品牌提取失败，请稍后重试', 'error');
        return;
      }
    }
  };

  // Dynamic Domain Extractor
  const materials = profile.sourceMaterials ?? [];

  const uploadMaterial = async (file: File, forceKind?: BrandSourceMaterialKind) => {
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: dataUrl, mimeType: file.type }),
      });
      const data = await res.json();
      if (data.error) {
        toast(data.error, 'error');
        return;
      }
      const kind = classifyBrandSourceMaterial(file.name, data.mimeType, forceKind);
      const item: BrandSourceMaterial = {
        id: crypto.randomUUID(),
        kind,
        name: data.name ?? file.name,
        url: data.url,
        mimeType: data.mimeType,
      };
      setProfile({ ...profile, sourceMaterials: [...materials, item] });
      toast(`${brandSourceMaterialLabel(kind)}已添加`, 'success');
    } catch {
      toast('上传失败，请重试', 'error');
    } finally {
      setUploading(false);
    }
  };

  const addLinkMaterial = () => {
    const url = linkUrl.trim();
    if (!url) {
      toast('请填写链接地址', 'error');
      return;
    }
    const item: BrandSourceMaterial = {
      id: crypto.randomUUID(),
      kind: 'link',
      name: linkName.trim() || url,
      url,
    };
    setProfile({ ...profile, sourceMaterials: [...materials, item] });
    setLinkUrl('');
    setLinkName('');
    setShowLinkInput(false);
    toast('链接已添加', 'success');
  };

  const removeMaterial = (id: string) => {
    setProfile({
      ...profile,
      sourceMaterials: materials.filter((m) => m.id !== id),
    });
  };

  const fetchBrandExtractor = async () => {
    if (!profile.website.trim() && materials.length === 0) {
      toast('请填写官网或上传参考材料', 'error');
      return;
    }
    setLoading(true);
    setExtractionStep(
      profile.website.trim() ? '正在抓取域名内容...' : '正在解析参考材料...'
    );

    try {
      setTimeout(() => setExtractionStep('正在提取并拆解品牌业务框架...'), 400);
      setTimeout(() => setExtractionStep('正在构建首选检索本地策略...'), 800);

      const response = await fetch('/api/extract-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: profile.website,
          materials,
        }),
      });
      const data = await response.json();
      if (data.success && data.taskId) {
        setExtractionStep('Agent 任务执行中…');
        await pollExtractTask(data.taskId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setExtractionStep('');
      }, 600);
    }
  };

  const handleSave = () => {
    fetch(`/api/brand-profile?brandName=${encodeURIComponent(brandName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    }).then(res => res.json())
      .then(data => {
        if (data.success) {
          toast('品牌资料保存成功', 'success');
          if (profile.name !== brandName) onBrandNameChange(profile.name);
        }
      });
  };

  const addCompetitor = () => {
    if (newComp.trim() && !profile.competitors.includes(newComp.trim())) {
      setProfile({
        ...profile,
        competitors: [...profile.competitors, newComp.trim()]
      });
      setNewComp('');
      setShowCompInput(false);
    }
  };

  const addForbidden = () => {
    if (newForbidden.trim() && !profile.forbiddenWords.includes(newForbidden.trim())) {
      setProfile({
        ...profile,
        forbiddenWords: [...profile.forbiddenWords, newForbidden.trim()]
      });
      setNewForbidden('');
      setShowForbiddenInput(false);
    }
  };

  const restoreDefaultProfile = () => {
    setProfile({
      website: 'https://www.yunshan-dental.cn',
      name: '云杉口腔',
      industry: '医疗健康',
      city: '江苏省/南京市',
      storeCount: 12,
      description: '提供精准数字化种植牙、隐形矫正、儿童舒适齿科，致力于高品质本地化精密医疗。',
      keywords: ['南京数字化种植', '隐形矫正推荐', '儿童防护口腔'],
      competitors: ['瑞尔齿科', '德卡牙科'],
      forbiddenWords: ['唯一技术', '绝对安全'],
      sourceMaterials: [],
    });
    toast('已恢复默认品牌资料', 'info');
  };

  const renderUploadButton = (
    label: string,
    icon: typeof ImageIcon,
    accept: string,
    inputRef: RefObject<HTMLInputElement | null>,
    forceKind?: BrandSourceMaterialKind
  ) => {
    const Icon = icon;
    return (
      <label className="geo-btn-secondary geo-btn-xs cursor-pointer inline-flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {uploading ? '上传中…' : label}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadMaterial(f, forceKind);
            e.target.value = '';
          }}
        />
      </label>
    );
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden text-left" style={{ padding: 'var(--sp-xl)' }}>
      <div
        className={`geo-brand-workspace flex-1 min-h-0 transition-opacity duration-150 ${profileReady ? 'opacity-100' : 'opacity-60 pointer-events-none'}`}
      >
      <div className="geo-brand-main geo-card flex flex-col overflow-hidden min-h-0">
        <div className="p-6 border-b shrink-0" style={{ borderColor: 'var(--neutral-divider-02)' }}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-title)' }}>
              <span>完善品牌多维度资料</span>
              <span className="geo-badge">品牌资料</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--neutral-text-03)' }} />
              <input
                type="text"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="请输入官网或平台主页，如 https://www.yunshan-dental.cn"
                className="geo-input geo-input-with-icon text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void fetchBrandExtractor()}
              disabled={loading}
              className="geo-btn-primary geo-btn-sm shrink-0 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{loading ? 'AI 智能提取中…' : 'AI 提取品牌资料'}</span>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'var(--neutral-divider-02)' }}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-medium" style={{ color: 'var(--color-title)' }}>
                参考材料（图片 / 文档 / 链接 / 其他）
              </p>
              <span className="text-[10px]" style={{ color: 'var(--neutral-text-03)' }}>
                可单独上传材料辅助 AI 提取，或与官网配合使用
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {renderUploadButton('上传图片', ImageIcon, 'image/*', imageInputRef, 'image')}
              {renderUploadButton(
                '上传文档',
                FileText,
                '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv',
                docInputRef,
                'document'
              )}
              <button
                type="button"
                className="geo-btn-secondary geo-btn-xs inline-flex items-center gap-1.5"
                onClick={() => setShowLinkInput((v) => !v)}
              >
                <Link2 className="w-3.5 h-3.5" />
                添加链接
              </button>
              {renderUploadButton('其他文件', Paperclip, '*/*', otherInputRef, 'other')}
            </div>

            {showLinkInput && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="geo-input geo-input-sm flex-1 min-w-[180px]"
                />
                <input
                  type="text"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="备注名称（可选）"
                  className="geo-input geo-input-sm w-40"
                />
                <button type="button" className="geo-link text-xs" onClick={addLinkMaterial}>
                  确定
                </button>
                <button
                  type="button"
                  className="geo-link geo-link-muted text-xs"
                  onClick={() => setShowLinkInput(false)}
                >
                  取消
                </button>
              </div>
            )}

            {materials.length > 0 ? (
              <ul className="space-y-2">
                {materials.map((m) => {
                  const Icon = materialIcon(m.kind);
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs"
                      style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                        <span className="geo-badge shrink-0">{brandSourceMaterialLabel(m.kind)}</span>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-medium"
                          style={{ color: 'var(--color-title)' }}
                        >
                          {m.name}
                        </a>
                      </div>
                      <button
                        type="button"
                        className="p-0 border-0 bg-transparent cursor-pointer shrink-0"
                        aria-label="移除"
                        onClick={() => removeMaterial(m.id)}
                      >
                        <X className="w-3.5 h-3.5" style={{ color: 'var(--neutral-text-03)' }} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[10px]" style={{ color: 'var(--neutral-text-03)' }}>
                支持 Logo、宣传册 PDF、案例链接等，保存后随品牌资料一并存储
              </p>
            )}
          </div>

          {loading && extractionStep && (
            <div className="geo-callout-warning mt-3">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--color-warning)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--color-warning)' }} />
              </span>
              <span>{extractionStep}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5 text-left">
            <div>
              <label className="geo-label">品牌名称 / 别名</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="geo-input font-semibold"
                placeholder="云杉口腔"
              />
            </div>

            <div>
              <label className="geo-label">所属行业门类</label>
              <select
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                className="geo-input font-semibold"
              >
                <option value="医疗健康">医疗健康</option>
                <option value="餐饮美食">餐饮美食</option>
                <option value="美容个护">美容个护</option>
                <option value="数码3C">数码3C</option>
                <option value="户外休闲">户外休闲</option>
              </select>
            </div>

            <div>
              <label className="geo-label">负责人</label>
              <input
                type="text"
                value={profile.ownerName ?? ''}
                onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                className="geo-input"
                placeholder="品牌运营对接人"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="geo-label">核心业务地区（省 / 市 / 区）</label>
              <RegionCascader
                value={profile.city}
                onChange={(city) => setProfile({ ...profile, city })}
              />
            </div>

            <div>
              <label className="geo-label">门店 / 场景网点数量</label>
              <input
                type="number"
                value={profile.storeCount}
                onChange={(e) => setProfile({ ...profile, storeCount: Number(e.target.value) })}
                className="geo-input"
                placeholder="12"
              />
            </div>

            <div className="col-span-2">
              <label className="geo-label">核心业务特色描述</label>
              <textarea
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                className="geo-input h-20 resize-none"
                placeholder="提供高品质数字化口腔种植矫正服务..."
              />
            </div>

            <div className="col-span-2">
              <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--neutral-bg-03)', color: 'var(--neutral-text-03)' }}>
                关键词请在品牌中心「关键词库」标签中管理（支持分组、AI 挖词与收录/生成共用）。
              </p>
            </div>

            <div className="col-span-2 space-y-2 pt-2 border-t" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              <span className="geo-label mb-0">品牌同城营销竞品</span>
              <div className="flex flex-wrap gap-2 items-center mt-2">
                {profile.competitors.map((cp, i) => (
                  <span key={cp} className="geo-tag geo-tag-info">
                    <span>{cp}</span>
                    <button type="button" className="p-0 border-0 bg-transparent cursor-pointer" aria-label="删除"
                      onClick={() => setProfile({ ...profile, competitors: profile.competitors.filter((_, idx) => idx !== i) })}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {showCompInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newComp}
                      onChange={(e) => setNewComp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
                      placeholder="竞品…"
                      className="geo-input geo-input-sm w-28"
                      autoFocus
                    />
                    <button type="button" onClick={addCompetitor} className="geo-link">确定</button>
                    <button type="button" onClick={() => setShowCompInput(false)} className="geo-link geo-link-muted">取消</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowCompInput(true)} className="geo-btn-dashed">
                    <Plus className="w-3.5 h-3.5" />
                    设定竞品
                  </button>
                )}
              </div>
            </div>

            <div className="col-span-2 space-y-2 pt-2">
              <span className="geo-label mb-0 flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
                <ShieldAlert className="w-3.5 h-3.5" />
                品牌调性审核违禁/敏感词
              </span>
              <div className="flex flex-wrap gap-2 items-center mt-2">
                {profile.forbiddenWords.map((fw, i) => (
                  <span key={fw} className="geo-tag geo-tag-danger">
                    <span>{fw}</span>
                    <button type="button" className="p-0 border-0 bg-transparent cursor-pointer" aria-label="删除"
                      onClick={() => setProfile({ ...profile, forbiddenWords: profile.forbiddenWords.filter((_, idx) => idx !== i) })}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {showForbiddenInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newForbidden}
                      onChange={(e) => setNewForbidden(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addForbidden()}
                      placeholder="违禁词…"
                      className="geo-input geo-input-sm w-28"
                      autoFocus
                    />
                    <button type="button" onClick={addForbidden} className="geo-link">确定</button>
                    <button type="button" onClick={() => setShowForbiddenInput(false)} className="geo-link geo-link-muted">取消</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowForbiddenInput(true)} className="geo-btn-dashed" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                    <Plus className="w-3.5 h-3.5" />
                    添加禁用规则
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

        <div className="p-5 border-t shrink-0 flex gap-3" style={{ borderColor: 'var(--neutral-divider-02)', background: 'var(--neutral-bg-03)' }}>
          <button type="button" onClick={restoreDefaultProfile} className="geo-btn-secondary geo-btn-sm flex-1">
            恢复默认
          </button>
          <button type="button" onClick={handleSave} className="geo-btn-primary geo-btn-sm flex-[2]">
            保存并在后续任务生成中应用本资料
          </button>
        </div>
      </div>

      <div className="geo-brand-aside text-left">
        <div className="flex justify-between items-center shrink-0">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-title)' }}>品牌资料完整度评估</h3>
          <span className="geo-badge">86% 完整</span>
        </div>

        <div className="geo-card p-5 text-center flex flex-col items-center">
          
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
              <circle cx="64" cy="64" r="50" fill="none" stroke="var(--neutral-bg-02)" strokeWidth="8" />
              <circle cx="64" cy="64" r="50" fill="none" stroke="var(--color-accent)" strokeWidth="8" strokeDasharray="314" strokeDashoffset="44" strokeLinecap="round" />
            </svg>
            <div className="flex flex-col items-center justify-center">
              <span className="text-2xl font-bold leading-tight" style={{ color: 'var(--color-title)' }}>86%</span>
              <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-accent)' }}>健康分</span>
            </div>
          </div>

          <p className="text-xs mt-4 mb-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            核心字段已完善 6/7。
          </p>

          <span className="geo-badge">已建立 GEO 投放语料库</span>
        </div>

        <div className="geo-card p-5 space-y-3">
          <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-title)' }}>
            <Award className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
            最新全网大模型检索看板
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--neutral-divider-03)' }}>
              <span style={{ color: 'var(--neutral-text-03)' }}>大模型提及覆盖率</span>
              <span className="font-semibold" style={{ color: 'var(--color-title)' }}>62%</span>
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--neutral-divider-03)' }}>
              <span style={{ color: 'var(--neutral-text-03)' }}>同场景 AI 推荐位</span>
              <span className="font-semibold" style={{ color: 'var(--color-title)' }}>第 4 位</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span style={{ color: 'var(--neutral-text-03)' }}>关键内容高潜缺口</span>
              <span className="font-semibold geo-tag-warning px-2 py-0.5">7 项需卡位</span>
            </div>
          </div>
        </div>

        <div className="geo-card p-5 space-y-3">
          <h4 className="text-xs font-semibold" style={{ color: 'var(--color-title)' }}>关联发布大厅任务 ({brandName})</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg border geo-nav-item" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              <div className="text-left min-w-0">
                <span className="text-xs font-semibold block" style={{ color: 'var(--color-danger)' }}>小红书卡位</span>
                <span className="text-xs font-medium truncate block mt-0.5" style={{ color: 'var(--neutral-text-02)' }}>
                  数字化种植方案测评
                </span>
              </div>
              <span className="geo-tag-warning shrink-0 ml-2">投放中</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg border geo-nav-item" style={{ borderColor: 'var(--neutral-divider-02)' }}>
              <div className="text-left min-w-0">
                <span className="text-xs font-semibold block" style={{ color: 'var(--color-info)' }}>知乎 GEO 浸润</span>
                <span className="text-xs font-medium truncate block mt-0.5" style={{ color: 'var(--neutral-text-02)' }}>
                  精细儿牙治疗科普
                </span>
              </div>
              <span className="geo-tag shrink-0 ml-2">已结清</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
