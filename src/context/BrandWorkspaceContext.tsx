import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchPublisherContext,
  persistPublisherBrand,
  readSavedPublisherBrand,
  resolvePublisherBrandName,
} from '../lib/publisher-context';
import { notifyBrandsUpdated } from '../lib/brand-events';

export interface BrandOption {
  id: string;
  name: string;
}

interface BrandWorkspaceContextValue {
  workspaceBrand: string;
  brandOptions: BrandOption[];
  switchWorkspace: (name: string) => Promise<void>;
  refreshBrands: () => Promise<void>;
  isSwitching: boolean;
}

const BrandWorkspaceContext = createContext<BrandWorkspaceContextValue | null>(null);

export function BrandWorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceBrand, setWorkspaceBrand] = useState('云杉口腔');
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const userChangedRef = useRef(false);

  const refreshBrands = useCallback(async () => {
    const { me, brands } = await fetchPublisherContext();
    if (brands.length) {
      setBrandOptions(brands.map((b) => ({ id: b.id, name: b.name })));
    }
    return { me, brands };
  }, []);

  useEffect(() => {
    void refreshBrands()
      .then(({ me, brands }) => {
        if (userChangedRef.current) return;
        const saved = readSavedPublisherBrand();
        setWorkspaceBrand(resolvePublisherBrandName({ saved, me, brands }));
      })
      .catch(() => {});
  }, [refreshBrands]);

  const switchWorkspace = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      userChangedRef.current = true;
      setIsSwitching(true);
      try {
        persistPublisherBrand(trimmed);
        setWorkspaceBrand(trimmed);
        setBrandOptions((prev) => {
          if (prev.some((b) => b.name === trimmed)) return prev;
          return [...prev, { id: trimmed, name: trimmed }];
        });
        try {
          const { brands } = await fetchPublisherContext();
          if (brands.length) {
            setBrandOptions(brands.map((b) => ({ id: b.id, name: b.name })));
          }
        } catch {
          /* keep optimistic option */
        }
        notifyBrandsUpdated();
      } finally {
        setIsSwitching(false);
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      workspaceBrand,
      brandOptions,
      switchWorkspace,
      refreshBrands,
      isSwitching,
    }),
    [workspaceBrand, brandOptions, switchWorkspace, refreshBrands, isSwitching]
  );

  return (
    <BrandWorkspaceContext.Provider value={value}>{children}</BrandWorkspaceContext.Provider>
  );
}

export function useBrandWorkspace(): BrandWorkspaceContextValue {
  const ctx = useContext(BrandWorkspaceContext);
  if (!ctx) {
    throw new Error('useBrandWorkspace must be used within BrandWorkspaceProvider');
  }
  return ctx;
}
