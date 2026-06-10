import { useCallback, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { ViewType } from '../../types';
import type { OnboardingGoal } from '../../lib/brand-clue';
import { fetchOnboardingStatus } from '../../lib/onboarding-client';
import { notifyBrandsUpdated } from '../../lib/brand-events';
import BrandClueStartFlow from './BrandClueStartFlow';
import BrandConfirmView from './BrandConfirmView';
import OnboardingConsoleView from './OnboardingConsoleView';

type WizardStep = 'clue' | 'confirm' | 'console';

type CluePayload = {
  brandUrl?: string;
  website?: string;
  socialLink?: string;
  description?: string;
  text?: string;
  inputType?: string;
  files?: Array<{ id: string; name: string; url: string; mimeType?: string }>;
};

interface Props {
  initialStep?: WizardStep;
  brandName?: string;
  taskId?: string;
  initialClue?: CluePayload;
  onWorkspaceSwitch: (name: string) => void | Promise<void>;
  onNavigate: (view: ViewType, hint?: string) => void;
  onExit?: () => void;
}

export default function BrandOnboardingWizard({
  initialStep = 'clue',
  brandName: initialBrandName,
  taskId: initialTaskId,
  initialClue,
  onWorkspaceSwitch,
  onNavigate,
  onExit,
}: Props) {
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [draftBrandName, setDraftBrandName] = useState(initialBrandName ?? '');
  const [goal, setGoal] = useState<OnboardingGoal>('geo_quick_start');
  const [geoTaskId, setGeoTaskId] = useState(initialTaskId);
  const [clue, setClue] = useState<CluePayload | null>(initialClue ?? null);
  const [workspaceBrand, setWorkspaceBrand] = useState(initialBrandName ?? '');

  const syncWorkspace = useCallback(
    async (name: string) => {
      await onWorkspaceSwitch(name);
      setWorkspaceBrand(name);
      setDraftBrandName(name);
      notifyBrandsUpdated();
    },
    [onWorkspaceSwitch]
  );

  const handleClueComplete = useCallback(
    (
      result: {
        brandName: string;
        extractTaskId: string;
        goal: OnboardingGoal;
        clue?: CluePayload;
        files?: CluePayload['files'];
      },
      options?: { preferBrandConfirm?: boolean }
    ) => {
      setDraftBrandName(result.brandName);
      setGoal(result.goal ?? 'geo_quick_start');
      const website =
        result.clue?.brandUrl?.trim() ||
        result.clue?.website?.trim() ||
        '';
      setClue({
        brandUrl: website || undefined,
        website: website || undefined,
        socialLink: result.clue?.socialLink?.trim() || undefined,
        description: result.clue?.description?.trim() || undefined,
        files: result.files,
      });

      if (options?.preferBrandConfirm || !result.extractTaskId) {
        setStep('confirm');
        return;
      }

      void (async () => {
        await syncWorkspace(result.brandName);
        try {
          const ob = await fetchOnboardingStatus(result.brandName);
          if (!ob.hermesReady) {
            onNavigate('hermes_console', `return:onboarding:${result.extractTaskId}`);
            return;
          }
        } catch {
          /* fall through */
        }
        setStep('confirm');
      })();
    },
    [onNavigate, syncWorkspace]
  );

  const handleConfirmed = useCallback(
    ({ brandName: confirmedBrand, taskId }: { brandName: string; taskId: string }) => {
      void (async () => {
        await syncWorkspace(confirmedBrand);
        setGeoTaskId(taskId);
        try {
          const ob = await fetchOnboardingStatus(confirmedBrand);
          if (!ob.hermesReady) {
            onNavigate('hermes_console', `return:onboarding:${taskId}`);
            return;
          }
        } catch {
          /* continue */
        }
        setStep('console');
      })();
    },
    [onNavigate, syncWorkspace]
  );

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('clue');
      return;
    }
    if (onExit) onExit();
    else onNavigate('workbench');
  };

  const displayBrand = workspaceBrand || draftBrandName;

  return (
    <div>
      {step !== 'console' && (
        <div className="geo-page-content pt-4 pb-2">
          <button
            type="button"
            className="geo-btn-secondary text-sm inline-flex items-center gap-2"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
        </div>
      )}

      {step === 'clue' && (
        <BrandClueStartFlow
          headline="添加品牌 · 首次 GEO 体检"
          variant="page"
          deferApi
          onNavigate={onNavigate}
          onComplete={handleClueComplete}
        />
      )}

      {step === 'confirm' && draftBrandName && (
        <BrandConfirmView
          brandName={draftBrandName}
          goal={goal}
          cluePayload={clue ?? undefined}
          initialProfile={{
            website: clue?.brandUrl ?? clue?.website ?? '',
            description: clue?.description ?? '',
            socialLink: clue?.socialLink ?? '',
          }}
          onBack={() => setStep('clue')}
          onConfirmed={handleConfirmed}
        />
      )}

      {step === 'console' && displayBrand && (
        <OnboardingConsoleView
          brandName={displayBrand}
          taskId={geoTaskId}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
