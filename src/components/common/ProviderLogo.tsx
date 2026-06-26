import providerLogo from '../../assets/branding/provider-logo.png';
import { PROVIDER_APP_NAME } from '../../lib/app-branding';

interface Props {
  className?: string;
  size?: number;
}

export default function ProviderLogo({ className = '', size = 44 }: Props) {
  return (
    <img
      src={providerLogo}
      alt={PROVIDER_APP_NAME}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
