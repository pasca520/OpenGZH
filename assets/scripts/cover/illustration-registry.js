// ============================================================
// Illustration Registry for WeChat Cover Editor
// Curated illustrations from multiple sources with metadata
// ============================================================

/**
 * Available illustration categories for filtering.
 */
export const ILLUSTRATION_CATEGORIES = [
  { id: 'tech', name: '科技' },
  { id: 'business', name: '商务' },
  { id: 'creative', name: '创意' },
  { id: 'communication', name: '沟通' },
  { id: 'education', name: '教育' },
  { id: 'nature', name: '自然' },
  { id: 'abstract', name: '抽象' }
];

/**
 * External illustration marketplace for users who want more options.
 */
export const ILLUSTRATION_MARKETS = [
  { name: 'unDraw', url: 'https://undraw.co/illustrations', description: '可选插画资源' },
  { name: 'FreeVector', url: 'https://www.freevector.com/', description: '免费矢量资源' },
  { name: 'Lukasz Adam', url: 'https://lukaszadam.com/illustrations', description: '设计师 Lukasz Adam 免费插画' }
];

const BASE = 'assets/images/cover-illustrations';

export let DEFAULT_ILLUSTRATIONS = [];
let registryLoadPromise = null;

export async function loadIllustrationRegistry(path = `${BASE}/registry.json`) {
  if (DEFAULT_ILLUSTRATIONS.length > 0) return DEFAULT_ILLUSTRATIONS;
  if (registryLoadPromise) return registryLoadPromise;

  registryLoadPromise = fetch(path)
    .then((response) => {
      if (!response.ok) throw new Error(`插画注册表加载失败: ${response.status}`);
      return response.json();
    })
    .then((entries) => {
      if (!Array.isArray(entries)) throw new Error('插画注册表格式无效');
      DEFAULT_ILLUSTRATIONS = entries;
      return DEFAULT_ILLUSTRATIONS;
    })
    .finally(() => {
      registryLoadPromise = null;
    });

  return registryLoadPromise;
}

/**
 * Return illustrations filtered by category.
 * @param {string} category - Category id (e.g. 'tech', 'business')
 * @returns {Array} Matching illustration entries
 */
export function getIllustrationsByCategory(category) {
  return DEFAULT_ILLUSTRATIONS.filter(item => item.category === category);
}

/**
 * Find a single illustration by its unique id.
 * @param {string} id - Illustration id (e.g. 'undraw-tech-ai-data')
 * @returns {object|undefined} The illustration entry, or undefined if not found
 */
export function getIllustration(id) {
  return DEFAULT_ILLUSTRATIONS.find(item => item.id === id);
}

/**
 * Return the full curated illustration list.
 * @returns {Array} All default illustrations
 */
export function getAllIllustrations() {
  return DEFAULT_ILLUSTRATIONS;
}
