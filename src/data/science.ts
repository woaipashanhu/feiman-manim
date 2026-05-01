// 科学可视化场景注册表
// 每添加一个新场景，只需在此数组中增加一项即可

export interface ScienceScene {
  id: string;           // 唯一标识（英文，用于URL）
  title: string;        // 场景标题（中文）
  description?: string; // 场景简介
  cover?: string;       // 封面图路径（public/ 下）
  file: string;         // HTML文件路径（public/ 下）
  category?: string;    // 分类：physics / chemistry / biology / health / astronomy 等
}

// ===== 在这里注册场景 =====
export const scienceScenes: ScienceScene[] = [
  { id: 'healthy-bowel-habit', title: '为什么便秘会肚子疼？', description: '食物在肠道里的旅行，了解便秘导致肚子疼的科学原理', cover: 'science/covers/healthy-bowel-habit.jpg', file: 'science/scenes/healthy-bowel-habit.html', category: 'health' },
];

/** 根据 id 查找场景及上/下一个场景索引 */
export function getScienceScene(sceneId: string) {
  const index = scienceScenes.findIndex((s) => s.id === sceneId);
  if (index === -1) return { scene: null, index: -1, prevIndex: null, nextIndex: null };

  const scene = scienceScenes[index];
  const prevIndex = index > 0 ? index - 1 : null;
  const nextIndex = index < scienceScenes.length - 1 ? index + 1 : null;

  return { scene, index, prevIndex, nextIndex };
}

/** 获取所有分类 */
export function getScienceCategories() {
  const categories = new Map<string, ScienceScene[]>();
  for (const scene of scienceScenes) {
    const cat = scene.category || 'other';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(scene);
  }
  return categories;
}
