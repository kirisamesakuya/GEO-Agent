import publisherLogo from '../../assets/branding/publisher-logo.png';
import { PUBLISHER_APP_NAME } from '../../lib/app-branding';

interface Props {
  className?: string;
  size?: number;
}

export default function PublisherLogo({ className = '', size = 32 }: Props) {
  return (
    <img
      src={publisherLogo}
      alt={PUBLISHER_APP_NAME}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
