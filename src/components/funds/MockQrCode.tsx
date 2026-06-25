interface Props {
  value: string;
  size?: number;
  className?: string;
}

/** 演示用二维码占位：网格样式 + 中心 Logo 区，真实环境可替换为可扫码组件 */
export default function MockQrCode({ value, size = 168, className = '' }: Props) {
  const cells = 21;
  const cellSize = size / cells;

  const hash = (x: number, y: number) => {
    let h = 0;
    const s = `${value}:${x}:${y}`;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h) % 5 !== 0;
  };

  const isFinder = (x: number, y: number) => {
    const inTopLeft = x < 7 && y < 7;
    const inTopRight = x >= cells - 7 && y < 7;
    const inBottomLeft = x < 7 && y >= cells - 7;
    if (!inTopLeft && !inTopRight && !inBottomLeft) return false;
    const lx = inTopRight ? x - (cells - 7) : x;
    const ly = inBottomLeft ? y - (cells - 7) : y;
    const outer = lx === 0 || lx === 6 || ly === 0 || ly === 6;
    const inner = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
    return outer || inner;
  };

  const isCenterLogo = (x: number, y: number) => {
    const cx = Math.floor(cells / 2);
    const cy = Math.floor(cells / 2);
    return Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2;
  };

  const rects: string[] = [];
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const filled = isFinder(x, y) || (!isCenterLogo(x, y) && hash(x, y));
      if (filled) {
        rects.push(
          `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#111"/>`
        );
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#fff"/>${rects.join('')}</svg>`;

  return (
    <img
      src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
      alt="支付二维码"
      width={size}
      height={size}
      className={`rounded-lg border border-[var(--neutral-divider-02)] bg-white ${className}`}
      title={value}
    />
  );
}
