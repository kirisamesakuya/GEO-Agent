import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ViewType } from '../../types';
import type { OnboardingStatus } from '../../lib/onboarding-client';
import {
  checkHermesForGeoSubmit,
  isHermesRelatedError,
} from '../../lib/hermes-readiness-guard';
import HermesSetupGuideModal from './HermesSetupGuideModal';

interface ContextValue {
  ensureHermesReady: (brandName?: string) => Promise<boolean>;
  showHermesError: (message: string, brandName?: string) => void;
}

const HermesSubmitGuardContext = createContext<ContextValue | null>(null);

export function HermesSubmitGuardProvider({
  children,
  onNavigate,
}: {
  children: ReactNode;
  onNavigate?: (view: ViewType, hint?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [pendingBrand, setPendingBrand] = useState<string | undefined>();

  const openWithStatus = useCallback((next: OnboardingStatus, brandName?: string) => {
    setStatus(next);
    setPendingBrand(brandName);
    setOpen(true);
  }, []);

  const ensureHermesReady = useCallback(
    async (brandName?: string) => {
      try {
        const result = await checkHermesForGeoSubmit(brandName);
        if ('status' in result) {
          openWithStatus(result.status, brandName);
          return false;
        }
        return true;
      } catch {
        openWithStatus(
          {
            brandName: brandName ?? null,
            brandId: null,
            steps: [],
            hermesUiStatus: 'offline',
            hermesReady: false,
            apiGatewayOk: false,
            connectionMode: 'offline',
            readinessUiState: 'needs_setup',
            geoCapabilities: null,
            setupReason: null,
            device: null,
            tokenCapacity: null,
            extractTaskId: null,
            quickStartTaskId: null,
            quickStartTaskStatus: null,
            activeGeoTaskId: null,
            activeGeoTaskStatus: null,
            firstReportId: null,
            latestReportId: null,
            showOnboardingHero: false,
            isNewUser: false,
          },
          brandName
        );
        return false;
      }
    },
    [openWithStatus]
  );

  const showHermesError = useCallback(
    (message: string, brandName?: string) => {
      if (!isHermesRelatedError(message)) return;
      void ensureHermesReady(brandName);
    },
    [ensureHermesReady]
  );

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const ok = await ensureHermesReady(pendingBrand);
      if (ok) setOpen(false);
    } finally {
      setRetrying(false);
    }
  }, [ensureHermesReady, pendingBrand]);

  const value = useMemo(
    () => ({ ensureHermesReady, showHermesError }),
    [ensureHermesReady, showHermesError]
  );

  return (
    <HermesSubmitGuardContext.Provider value={value}>
      {children}
      <HermesSetupGuideModal
        open={open}
        status={status}
        loading={retrying}
        onNavigate={onNavigate}
        onRetry={() => void handleRetry()}
        onClose={() => setOpen(false)}
      />
    </HermesSubmitGuardContext.Provider>
  );
}

export function useHermesSubmitGuard(): ContextValue {
  const ctx = useContext(HermesSubmitGuardContext);
  if (!ctx) {
    throw new Error('useHermesSubmitGuard must be used within HermesSubmitGuardProvider');
  }
  return ctx;
}

/** 无 Provider 时的安全兜底（不弹窗，仅放行） */
export function useOptionalHermesSubmitGuard(): ContextValue {
  const ctx = useContext(HermesSubmitGuardContext);
  return (
    ctx ?? {
      ensureHermesReady: async () => true,
      showHermesError: () => {},
    }
  );
}
