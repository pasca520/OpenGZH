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

/**
 * Base path for all illustration assets (relative to project root).
 */
const BASE = 'assets/images/cover-illustrations';

/**
 * Curated list of default illustrations.
 * Each entry has:
 *   id          - unique identifier
 *   name        - Chinese display name
 *   category    - one of the category ids
 *   source      - origin: 'undraw' | 'lukaszadam' | 'freevector' | 'custom' | 'storyset' | 'manypixels' | 'openpeeps' | 'opendoodles'
 *   path        - relative path to the SVG file
 *   defaultColor - primary accent color extracted from the SVG
 */
export const DEFAULT_ILLUSTRATIONS = [
  // ── 科技 Tech ──────────────────────────────────────────
  {
    id: 'undraw-tech-ai-data',
    name: 'AI 数据分析',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tech-ai-data.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'undraw-tech-build-mode',
    name: '构建模式',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tech-build-mode.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'undraw-tech-markdown',
    name: '文档编辑',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tech-markdown.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'lukaszadam-tech-ai-hero',
    name: 'AI 英雄',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-ai-hero.svg`,
    defaultColor: '#9E64FA',
    fit: ['side', 'glow', 'hero']
  },
  {
    id: 'lukaszadam-tech-coding-people',
    name: '编程协作',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-coding-people.svg`,
    defaultColor: '#F97906',
    fit: ['side', 'glow', 'hero']
  },
  {
    id: 'lukaszadam-tech-programming',
    name: '程序开发',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-programming.svg`,
    defaultColor: '#FFE56B',
    fit: ['side', 'glow']
  },
  {
    id: 'freevector-tech-chatbot',
    name: '智能聊天',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-chatbot.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'landscape', 'small', 'glow']
  },
  {
    id: 'freevector-tech-cybersecurity',
    name: '网络安全',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-cybersecurity.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'landscape', 'glow']
  },
  {
    id: 'freevector-tech-innovation',
    name: '技术创新',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-innovation.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'landscape', 'hero']
  },
  {
    id: 'custom-isometric-devices',
    name: '等距设备',
    category: 'tech',
    source: 'custom',
    path: `${BASE}/isometric-devices.svg`,
    defaultColor: '#60A5FA',
    fit: ['landscape', 'hero', 'side']
  },
  {
    id: 'custom-tech-wave-bg',
    name: '科技波浪',
    category: 'tech',
    source: 'custom',
    path: `${BASE}/tech-wave-bg.svg`,
    defaultColor: '#3B82F6',
    fit: ['hero', 'landscape']
  },
  {
    id: 'storyset-tech-ai-brain',
    name: 'AI 思维',
    category: 'tech',
    source: 'storyset',
    path: `${BASE}/storyset/tech-ai-brain.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-tech-coding',
    name: '编程开发',
    category: 'tech',
    source: 'storyset',
    path: `${BASE}/storyset/tech-coding.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-tech-digital-transform',
    name: '数字转型',
    category: 'tech',
    source: 'storyset',
    path: `${BASE}/storyset/tech-digital-transform.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-tech-ui-design',
    name: '界面设计',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-ui-design.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-tech-ai-data-extraction',
    name: 'AI 数据提取',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-ai-data-extraction.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-tech-data-storage',
    name: '数据存储',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-data-storage.svg`,
    fit: ['side', 'square', 'landscape', 'hero']
  },

  // ── 商务 Business ──────────────────────────────────────
  {
    id: 'undraw-biz-team',
    name: '团队协作',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-team.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'undraw-biz-reviews',
    name: '评价反馈',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-reviews.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'lukaszadam-biz-storefront',
    name: '店铺门面',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-storefront.svg`,
    defaultColor: '#F68D27',
    fit: ['side', 'glow']
  },
  {
    id: 'lukaszadam-biz-success',
    name: '商务成功',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-success.svg`,
    defaultColor: '#FCD051',
    fit: ['side', 'glow']
  },
  {
    id: 'freevector-biz-consulting',
    name: '商务咨询',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-consulting.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'landscape', 'small']
  },
  {
    id: 'freevector-biz-team-work',
    name: '团队合作',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-team-work.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'landscape', 'small']
  },
  {
    id: 'custom-person-presenting',
    name: '演示汇报',
    category: 'business',
    source: 'custom',
    path: `${BASE}/person-presenting.svg`,
    defaultColor: '#6366F1',
    fit: ['side', 'hero', 'square']
  },
  {
    id: 'storyset-biz-growth',
    name: '业务增长',
    category: 'business',
    source: 'storyset',
    path: `${BASE}/storyset/biz-growth.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-biz-teamwork',
    name: '团队协作',
    category: 'business',
    source: 'storyset',
    path: `${BASE}/storyset/biz-teamwork.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-biz-finance',
    name: '财务管理',
    category: 'business',
    source: 'storyset',
    path: `${BASE}/storyset/biz-finance.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-biz-digital-nomad',
    name: '数字游民',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-digital-nomad.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'hero', 'landscape']
  },
  {
    id: 'sr-biz-presentation',
    name: '演示汇报',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-presentation.svg`,
    fit: ['side', 'hero', 'landscape']
  },
  {
    id: 'sr-biz-conference-call',
    name: '电话会议',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-conference-call.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-biz-report-analysis',
    name: '报表分析',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-report-analysis.svg`,
    fit: ['side', 'landscape', 'hero']
  },

  // ── 创意 Creative ──────────────────────────────────────
  {
    id: 'undraw-creative-design',
    name: '设计创作',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-design.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'lukaszadam-creative-ui-design',
    name: 'UI 设计',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-ui-design.svg`,
    defaultColor: '#F98E64',
    fit: ['side', 'glow']
  },
  {
    id: 'freevector-creative-floating',
    name: '漂浮创意',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-floating.svg`,
    defaultColor: '#FF5678',
    fit: ['side', 'square', 'landscape', 'small', 'hero']
  },
  {
    id: 'custom-mascot-character',
    name: '吉祥物',
    category: 'creative',
    source: 'custom',
    path: `${BASE}/mascot-character.svg`,
    defaultColor: '#FBBF24',
    fit: ['side', 'square', 'hero', 'small']
  },
  {
    id: 'storyset-creative-design-tools',
    name: '设计工具',
    category: 'creative',
    source: 'storyset',
    path: `${BASE}/storyset/creative-design-tools.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-creative-thinking',
    name: '创意思考',
    category: 'creative',
    source: 'storyset',
    path: `${BASE}/storyset/creative-thinking.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-creative-cover-hero',
    name: '封面英雄',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-cover-hero.svg`,
    defaultColor: '#F97316',
    fit: ['hero', 'landscape']
  },
  {
    id: 'sr-creative-dancing',
    name: '舞蹈创意',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-dancing.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-creative-coffee',
    name: '咖啡时光',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-coffee.svg`,
    fit: ['side', 'square', 'small']
  },

  // ── 沟通 Communication ─────────────────────────────────
  {
    id: 'undraw-comm-comment',
    name: '评论交流',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/comm-comment.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'undraw-comm-news',
    name: '新闻资讯',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/comm-news.svg`,
    defaultColor: '#ED9DA0',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'lukaszadam-comm-video-call',
    name: '视频会议',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-video-call.svg`,
    defaultColor: '#F27E00',
    fit: ['side', 'glow']
  },
  {
    id: 'lukaszadam-comm-conversation',
    name: '对话沟通',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-conversation.svg`,
    defaultColor: '#F57A59',
    fit: ['side', 'glow']
  },
  {
    id: 'storyset-com-video-call',
    name: '视频会议',
    category: 'communication',
    source: 'storyset',
    path: `${BASE}/storyset/com-video-call.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-com-social-media',
    name: '社交媒体',
    category: 'communication',
    source: 'storyset',
    path: `${BASE}/storyset/com-social-media.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-com-conversation',
    name: '对话交流',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-conversation.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-com-selfie',
    name: '自拍分享',
    category: 'communication',
    source: 'openpeeps',
    path: `${BASE}/semi-realistic/communication-selfie.svg`,
    fit: ['side', 'square', 'small']
  },
  {
    id: 'sr-com-text-messages',
    name: '消息沟通',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-text-messages.svg`,
    fit: ['side', 'square', 'hero']
  },

  // ── 教育 Education ─────────────────────────────────────
  {
    id: 'undraw-edu-book',
    name: '阅读学习',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/edu-book.svg`,
    defaultColor: '#3F3D56',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'lukaszadam-edu-premium',
    name: '精品课程',
    category: 'education',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/edu-premium-1.svg`,
    defaultColor: '#FFCC5A',
    fit: ['side', 'glow', 'square']
  },
  {
    id: 'storyset-edu-learning',
    name: '在线学习',
    category: 'education',
    source: 'storyset',
    path: `${BASE}/storyset/edu-learning.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-edu-teaching',
    name: '教学授课',
    category: 'education',
    source: 'storyset',
    path: `${BASE}/storyset/edu-teaching.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-edu-online-course',
    name: '线上课程',
    category: 'education',
    source: 'storyset',
    path: `${BASE}/storyset/edu-online-course.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-edu-reading',
    name: '阅读学习',
    category: 'education',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/education-reading.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'small']
  },
  {
    id: 'sr-edu-open-book',
    name: '开卷有益',
    category: 'education',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/education-open-book.svg`,
    fit: ['side', 'square', 'landscape', 'hero']
  },
  {
    id: 'sr-edu-road-to-knowledge',
    name: '知识之路',
    category: 'education',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/education-road-to-knowledge.svg`,
    fit: ['side', 'landscape', 'hero']
  },

  // ── 自然 Nature ────────────────────────────────────────
  {
    id: 'undraw-nature-adventure',
    name: '冒险旅行',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/nature-adventure.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-nature-forest',
    name: '森林生态',
    category: 'nature',
    source: 'storyset',
    path: `${BASE}/storyset/nature-forest.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'storyset-nature-scene',
    name: '自然风光',
    category: 'nature',
    source: 'storyset',
    path: `${BASE}/storyset/nature-scene.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-nature-plant',
    name: '绿植养护',
    category: 'nature',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/nature-plant.svg`,
    defaultColor: '#22C55E',
    fit: ['side', 'square', 'small']
  },
  {
    id: 'sr-nature-meditating',
    name: '冥想放松',
    category: 'nature',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/nature-meditating.svg`,
    fit: ['side', 'square', 'small']
  },
  {
    id: 'sr-nature-swinging',
    name: '秋千时光',
    category: 'nature',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/nature-swinging.svg`,
    fit: ['side', 'square']
  },
  {
    id: 'sr-nature-next-adventure',
    name: '下一次冒险',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-next-adventure.svg`,
    fit: ['side', 'landscape', 'hero']
  },

  // ── 抽象 Abstract ──────────────────────────────────────
  {
    id: 'freevector-abstract-startup',
    name: '创业启航',
    category: 'abstract',
    source: 'freevector',
    path: `${BASE}/freevector/abstract-startup.svg`,
    defaultColor: '#BA68C8',
    fit: ['side', 'square', 'landscape', 'hero']
  },
  {
    id: 'freevector-abstract-social-connection',
    name: '社交连接',
    category: 'abstract',
    source: 'freevector',
    path: `${BASE}/freevector/abstract-social-connection.svg`,
    defaultColor: '#AA6550',
    fit: ['side', 'square', 'landscape', 'hero']
  },
  {
    id: 'custom-mockup-cards',
    name: '卡片样机',
    category: 'abstract',
    source: 'custom',
    path: `${BASE}/mockup-cards.svg`,
    defaultColor: '#F97316',
    fit: ['landscape', 'hero']
  },
  {
    id: 'storyset-abs-innovation',
    name: '科技创新',
    category: 'abstract',
    source: 'storyset',
    path: `${BASE}/storyset/abs-innovation.svg`,
    defaultColor: '#407BFF',
    fit: ['side', 'square', 'landscape', 'hero']
  },
  {
    id: 'storyset-abs-discovery',
    name: '探索发现',
    category: 'abstract',
    source: 'storyset',
    path: `${BASE}/storyset/abs-discovery.svg`,
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-abs-float',
    name: '漂浮抽象',
    category: 'abstract',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/abstract-float.svg`,
    defaultColor: '#8B5CF6',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-abs-groovy',
    name: '律动纹理',
    category: 'abstract',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/abstract-groovy.svg`,
    fit: ['side', 'square', 'landscape']
  },
  {
    id: 'sr-abs-goal',
    name: '目标达成',
    category: 'abstract',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/abstract-goal.svg`,
    fit: ['side', 'square', 'landscape', 'hero']
  }
];

// ── Lookup helpers ─────────────────────────────────────────

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
