import { generateJson as generateJsonMinimax, loadMinimaxConfig } from './minimax.js';

export function getActiveModelLabel(): string {
  const cfg = loadMinimaxConfig();
  return cfg?.model ?? 'MiniMax-M3（请在 config/minimax.local.json 配置 apiKey）';
}

export async function generateJson<T>(prompt: string): Promise<T> {
  return generateJsonMinimax<T>(prompt);
}
