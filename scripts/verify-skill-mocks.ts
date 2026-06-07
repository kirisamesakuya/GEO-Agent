/**
 * 验证全量 Skill Mock 目录可生成符合契约的演示输出
 * 运行: npx tsx scripts/verify-skill-mocks.ts
 */
import { getSkillMockCatalog, mockOutputForTaskType } from '../server/mocks/skill-mock-registry.js';

let failed = 0;

for (const item of getSkillMockCatalog()) {
  try {
    const output = mockOutputForTaskType(item.taskType, item.sampleInput);
    if (!output || typeof output !== 'object') {
      throw new Error('output 为空');
    }
    const keys = Object.keys(output);
    if (keys.length === 0) {
      throw new Error('output 无字段');
    }
    console.log(`✓ ${item.taskType} (${item.skillName}) → keys: ${keys.slice(0, 6).join(', ')}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${item.taskType}:`, err instanceof Error ? err.message : err);
  }
}

if (failed > 0) {
  console.error(`\n${failed} 项 Mock 验证失败`);
  process.exit(1);
}

console.log(`\n全部 ${getSkillMockCatalog().length} 项 Skill Mock 验证通过`);
