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
  {
    id: 'sr-creative-bikini',
    name: '夏日休闲',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-bikini.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'small']
  },
  {
    id: 'sr-creative-clumsy',
    name: '笨拙搞笑',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-clumsy.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-creative-dog-jump',
    name: '狗狗跳跃',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-dog-jump.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'small']
  },
  {
    id: 'sr-creative-loving',
    name: '爱心洋溢',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-loving.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'small']
  },
  {
    id: 'sr-creative-petting',
    name: '抚摸宠物',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-petting.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-creative-roller-skating',
    name: '轮滑运动',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-roller-skating.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-creative-rolling',
    name: '悠闲滚动',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-rolling.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'small']
  },
  {
    id: 'sr-creative-sleek',
    name: '现代风格',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-sleek.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-creative-sprinting',
    name: '冲刺奔跑',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-sprinting.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'hero']
  },
  {
    id: 'sr-creative-zombieing',
    name: '僵尸趣味',
    category: 'creative',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/creative-zombieing.svg`,
    defaultColor: '#F97316',
    fit: ['side', 'square', 'hero']
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
  },

  // ── 科技 Tech (补充) ──────────────────────────────

  {
    id: 'freevector-tech-ai-network',
    name: 'AI 网络',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-ai-network.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-tech-cloud-storage',
    name: '云存储',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-cloud-storage.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-tech-data-extraction',
    name: '数据提取',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-data-extraction.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-tech-devices',
    name: '设备展示',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-devices.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-tech-mobile-marketing',
    name: '移动营销',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-mobile-marketing.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-tech-online-world',
    name: '在线世界',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-online-world.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-tech-programming',
    name: '编程开发',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-programming.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-tech-questions',
    name: '问答解惑',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-questions.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-tech-robotics',
    name: '机器人技术',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-robotics.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-tech-server',
    name: '服务器',
    category: 'tech',
    source: 'freevector',
    path: `${BASE}/freevector/tech-server.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'lukaszadam-tech-ai-ball',
    name: 'AI 球体',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-ai-ball.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-ai-icons',
    name: 'AI 图标集',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-ai-icons.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-ai-robot-2',
    name: 'AI 机器人 2',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-ai-robot-2.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-ai-robot-3',
    name: 'AI 机器人 3',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-ai-robot-3.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-ai-working',
    name: 'AI 工作流',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-ai-working.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-bitcoin-miner',
    name: '比特币挖矿',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-bitcoin-miner.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-cat-computer',
    name: '猫咪电脑',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-cat-computer.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-coding-rocket',
    name: '编码火箭',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-coding-rocket.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-hosting',
    name: '网站托管',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-hosting.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-javascript',
    name: 'JS 编程',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-javascript.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-laptop',
    name: '笔记本电脑',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-laptop.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-monitor',
    name: '显示器',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-monitor.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-programming-illustrations',
    name: '编程插图',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-programming-illustrations.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-robot',
    name: '机器人',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-robot.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-robots',
    name: '机器人组',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-robots.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-website-builder',
    name: '网站搭建',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-website-builder.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-tech-website-work',
    name: '网站开发',
    category: 'tech',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/tech-website-work.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'sr-tech-ar-azureline',
    name: 'AR 技术',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-ar-azureline.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-ar-birdview',
    name: 'AR 鸟瞰',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-ar-birdview.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-build-mode',
    name: '构建模式',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-build-mode.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-click-interaction',
    name: '点击交互',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-click-interaction.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-data-maintenance',
    name: '数据维护',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-data-maintenance.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-delete-files',
    name: '文件删除',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-delete-files.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-gaming',
    name: '游戏娱乐',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-gaming.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-markdown-file',
    name: 'Markdown 文件',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-markdown-file.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-profiling',
    name: '性能分析',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-profiling.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-setup-wizard',
    name: '设置向导',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-setup-wizard.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-user-group',
    name: '用户群组',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-user-group.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-tech-web-developer',
    name: 'Web 开发',
    category: 'tech',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/tech-web-developer.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-tech-ai-robot',
    name: 'AI 机器人',
    category: 'tech',
    source: 'storyset',
    path: `${BASE}/storyset/tech-ai-robot.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-tech-devices',
    name: '设备展示',
    category: 'tech',
    source: 'storyset',
    path: `${BASE}/storyset/tech-devices.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-tech-audio',
    name: '音频技术',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tech-audio.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-tech-click',
    name: '点击操作',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tech-click.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-tech-delete',
    name: '删除操作',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tech-delete.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-tech-setup-wizard',
    name: '设置向导',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tech-setup-wizard.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-tech-web-developer',
    name: 'Web 开发',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tech-web-developer.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },

  // ── 商务 Business (补充) ──────────────────────────────

  {
    id: 'freevector-biz-at-office',
    name: '办公场景',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-at-office.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-business-plan',
    name: '商业计划',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-business-plan.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-company',
    name: '公司企业',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-company.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-hero-sitting',
    name: '商务坐姿',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-hero-sitting.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-hero-standing',
    name: '商务站立',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-hero-standing.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-hero-walking',
    name: '商务行走',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-hero-walking.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-hero-waving',
    name: '商务挥手',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-hero-waving.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-learning',
    name: '商务学习',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-learning.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-mobile-marketing',
    name: '移动营销',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-mobile-marketing.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-social-media',
    name: '社交媒体',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-social-media.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-team-goals',
    name: '团队目标',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-team-goals.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-team-spirit',
    name: '团队精神',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-team-spirit.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-team-wide',
    name: '团队全景',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-team-wide.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-biz-webinar',
    name: '网络研讨会',
    category: 'business',
    source: 'freevector',
    path: `${BASE}/freevector/biz-webinar.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'lukaszadam-biz-building-2',
    name: '建筑 2',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-building-2.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-building',
    name: '建筑',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-building.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-flat-characters',
    name: '扁平人物',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-flat-characters.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-goals',
    name: '目标',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-goals.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-house',
    name: '房屋',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-house.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-image-guy',
    name: '形象人物',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-image-guy.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-package-service',
    name: '包裹服务',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-package-service.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-product-review',
    name: '产品评审',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-product-review.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-sales',
    name: '销售',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-sales.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-small-characters',
    name: '小型人物',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-small-characters.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-woman-working-1',
    name: '女性工作',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-woman-working-1.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-woman-working-2',
    name: '女性工作 2',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-woman-working-2.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-working-1',
    name: '工作场景',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-working-1.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-biz-working-2',
    name: '工作场景 2',
    category: 'business',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/biz-working-2.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'sr-business-budget-adjustments',
    name: '预算调整',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-budget-adjustments.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-budgeting',
    name: '预算管理',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-budgeting.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-business-plan',
    name: '商业计划',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-business-plan.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-calculator',
    name: '计算器',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-calculator.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-charts',
    name: '图表分析',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-charts.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-contract-signed',
    name: '合同签署',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-contract-signed.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-decision',
    name: '决策',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-decision.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-digital-signature',
    name: '数字签名',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-digital-signature.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-enter-payment-info',
    name: '支付信息',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-enter-payment-info.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-meet-the-team',
    name: '团队见面',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-meet-the-team.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-money-transfer',
    name: '转账',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-money-transfer.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-money',
    name: '资金',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-money.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-order-status',
    name: '订单状态',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-order-status.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-business-team-presentation',
    name: '团队演示',
    category: 'business',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/business-team-presentation.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-biz-analytics',
    name: '数据分析',
    category: 'business',
    source: 'storyset',
    path: `${BASE}/storyset/biz-analytics.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-biz-meeting',
    name: '会议',
    category: 'business',
    source: 'storyset',
    path: `${BASE}/storyset/biz-meeting.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-budget-adj',
    name: '预算调整',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-budget-adj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-budget',
    name: '预算',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-budget.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-charts',
    name: '图表分析',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-charts.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-contract',
    name: '合同签署',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-contract.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-digital-sig',
    name: '数字签名',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-digital-sig.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-meeting',
    name: '会议',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-meeting.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-order',
    name: '订单管理',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-order.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-payment',
    name: '支付',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-payment.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-plan',
    name: '规划',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-plan.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-biz-split-testing',
    name: 'A/B 测试',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/biz-split-testing.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },

  // ── 创意 Creative (补充) ──────────────────────────────

  {
    id: 'freevector-creative-chilling',
    name: '休闲放松',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-chilling.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-coffee',
    name: '咖啡时光',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-coffee.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-dancing',
    name: '舞蹈',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-dancing.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-groovy',
    name: '律动',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-groovy.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-meditating',
    name: '冥想',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-meditating.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-plant',
    name: '植物',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-plant.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-reading',
    name: '阅读',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-reading.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-rolling',
    name: '滚动',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-rolling.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-running',
    name: '奔跑',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-running.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-sitting-reading',
    name: '坐着阅读',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-sitting-reading.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-creative-unboxing',
    name: '开箱',
    category: 'creative',
    source: 'freevector',
    path: `${BASE}/freevector/creative-unboxing.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'lukaszadam-creative-barcelona-icons',
    name: '巴塞罗那图标',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-barcelona-icons.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-cactus',
    name: '仙人掌',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-cactus.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-cassette',
    name: '磁带',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-cassette.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-characters-2',
    name: '创意角色 2',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-characters-2.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-characters',
    name: '创意角色',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-characters.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-coffee',
    name: '咖啡时光',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-coffee.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-doodle',
    name: '涂鸦',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-doodle.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-espresso',
    name: '浓缩咖啡',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-espresso.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-hero-image',
    name: '英雄形象',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-hero-image.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-notification-woman',
    name: '通知女性',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-notification-woman.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-outline-icons-1',
    name: '轮廓图标 1',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-outline-icons-1.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-outline-icons-2',
    name: '轮廓图标 2',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-outline-icons-2.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-outline-icons-3',
    name: '轮廓图标 3',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-outline-icons-3.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-wordpress-girl',
    name: 'WP 女孩',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-wordpress-girl.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-creative-youtube',
    name: 'YouTube',
    category: 'creative',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/creative-youtube.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'sr-creative-ballet',
    name: '芭蕾',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-ballet.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-creative-content-team',
    name: '内容团队',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-content-team.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-creative-dream-gift',
    name: '梦想礼物',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-dream-gift.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-creative-footer',
    name: '页脚',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-footer.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-creative-ice-cream',
    name: '冰淇淋',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-ice-cream.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-creative-jumping',
    name: '跳跃',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-jumping.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-creative-moshing',
    name: '摇滚',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-moshing.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-creative-reviews',
    name: '评价',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-reviews.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-creative-sit-stand',
    name: '坐立',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-sit-stand.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-creative-toast',
    name: '庆祝',
    category: 'creative',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/creative-toast.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-creative-art',
    name: '艺术',
    category: 'creative',
    source: 'storyset',
    path: `${BASE}/storyset/creative-art.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-creative-brainstorm',
    name: '头脑风暴',
    category: 'creative',
    source: 'storyset',
    path: `${BASE}/storyset/creative-brainstorm.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-creative-writing',
    name: '写作',
    category: 'creative',
    source: 'storyset',
    path: `${BASE}/storyset/creative-writing.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-creative-content-team',
    name: '内容团队',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-content-team.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-creative-fill',
    name: '填充创意',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-fill.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },

  // ── 沟通 Communication (补充) ──────────────────────────────

  {
    id: 'lukaszadam-comm-cat-desk',
    name: '猫咪办公桌',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-cat-desk.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-city-1',
    name: '城市风景',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-city-1.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-city-2',
    name: '城市风景 2',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-city-2.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-colorful-icons',
    name: '多彩图标',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-colorful-icons.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-covid-icons',
    name: '防疫图标',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-covid-icons.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-desk-illustration',
    name: '桌面插图',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-desk-illustration.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-donut-guy',
    name: '甜甜圈人物',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-donut-guy.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-guy-cat',
    name: '人猫互动',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-guy-cat.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-guy-glasses',
    name: '眼镜人物',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-guy-glasses.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-japanese-storefront',
    name: '日式店面',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-japanese-storefront.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-miscellaneous',
    name: '杂项插图',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-miscellaneous.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-ninja-2',
    name: '忍者 2',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-ninja-2.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-ninja',
    name: '忍者',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-ninja.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-outlined-characters',
    name: '轮廓人物',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-outlined-characters.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-phone-icons',
    name: '电话图标',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-phone-icons.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-relaxing',
    name: '放松休闲',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-relaxing.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-scooter',
    name: '滑板车',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-scooter.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-tools',
    name: '沟通工具',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-tools.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-waiting',
    name: '等待',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-waiting.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-comm-woman-desk',
    name: '女性办公',
    category: 'communication',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/comm-woman-desk.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'sr-communication-audio-files',
    name: '音频文件',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-audio-files.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-communication-comment-sent',
    name: '评论发送',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-comment-sent.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-communication-customer-service',
    name: '客服',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-customer-service.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-communication-location-search',
    name: '位置搜索',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-location-search.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-communication-mobile-phone',
    name: '手机',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-mobile-phone.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-communication-morning-news',
    name: '晨间新闻',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-morning-news.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-communication-online-party',
    name: '在线派对',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-online-party.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-communication-peep-standing',
    name: '站立人物',
    category: 'communication',
    source: 'openpeeps',
    path: `${BASE}/semi-realistic/communication-peep-standing.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-communication-select-character',
    name: '选择角色',
    category: 'communication',
    source: 'openpeeps',
    path: `${BASE}/semi-realistic/communication-select-character.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-communication-share-results',
    name: '分享结果',
    category: 'communication',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/communication-share-results.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-com-chat',
    name: '聊天',
    category: 'communication',
    source: 'storyset',
    path: `${BASE}/storyset/com-chat.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-com-contact',
    name: '联系我们',
    category: 'communication',
    source: 'storyset',
    path: `${BASE}/storyset/com-contact.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-com-messaging',
    name: '消息',
    category: 'communication',
    source: 'storyset',
    path: `${BASE}/storyset/com-messaging.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-comm-share',
    name: '分享',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/comm-share.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-comm-text',
    name: '文字消息',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/comm-text.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },

  // ── 教育 Education (补充) ──────────────────────────────

  {
    id: 'lukaszadam-edu-nutrition-icons',
    name: '营养图标',
    category: 'education',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/edu-nutrition-icons.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-edu-premium-2',
    name: '精品课程 2',
    category: 'education',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/edu-premium-2.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-edu-premium-3',
    name: '精品课程 3',
    category: 'education',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/edu-premium-3.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-edu-premium-4',
    name: '精品课程 4',
    category: 'education',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/edu-premium-4.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-edu-premium-5',
    name: '精品课程 5',
    category: 'education',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/edu-premium-5.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-edu-premium-6',
    name: '精品课程 6',
    category: 'education',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/edu-premium-6.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'lukaszadam-edu-test-tubes',
    name: '试管实验',
    category: 'education',
    source: 'lukaszadam',
    path: `${BASE}/lukaszadam/edu-test-tubes.svg`,
    defaultColor: '#9E64FA',
    fit: ['side','glow']
  },
  {
    id: 'sr-education-exploring',
    name: '探索',
    category: 'education',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/education-exploring.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-education-fill-the-blanks',
    name: '填空',
    category: 'education',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/education-fill-the-blanks.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-education-peep-sitting',
    name: '坐着的人',
    category: 'education',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/education-peep-sitting.svg`,
    defaultColor: '#F97316',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-education-reading-side',
    name: '侧读',
    category: 'education',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/education-reading-side.svg`,
    defaultColor: '#F97316',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-education-sitting-reading',
    name: '坐着阅读',
    category: 'education',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/education-sitting-reading.svg`,
    defaultColor: '#F97316',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-education-step-one',
    name: '第一步',
    category: 'education',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/education-step-one.svg`,
    defaultColor: '#F97316',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-education-unboxing',
    name: '开箱',
    category: 'education',
    source: 'opendoodles',
    path: `${BASE}/semi-realistic/education-unboxing.svg`,
    defaultColor: '#F97316',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-edu-books',
    name: '书籍',
    category: 'education',
    source: 'storyset',
    path: `${BASE}/storyset/edu-books.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-edu-studying',
    name: '学习',
    category: 'education',
    source: 'storyset',
    path: `${BASE}/storyset/edu-studying.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-edu-road',
    name: '学习之路',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/edu-road.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },

  // ── 自然 Nature (补充) ──────────────────────────────

  {
    id: 'sr-nature-airplane',
    name: '飞机旅行',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-airplane.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-nature-chilling',
    name: '休闲放松',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-chilling.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-nature-doggie',
    name: '小狗',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-doggie.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-nature-laying',
    name: '躺卧',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-laying.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-nature-new-york',
    name: '纽约',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-new-york.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-nature-running',
    name: '奔跑',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-running.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-nature-strolling',
    name: '散步',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-strolling.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-nature-travel-mode',
    name: '旅行模式',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-travel-mode.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-nature-walking-the-dog',
    name: '遛狗',
    category: 'nature',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/nature-walking-the-dog.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-nature-environment',
    name: '环境',
    category: 'nature',
    source: 'storyset',
    path: `${BASE}/storyset/nature-environment.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-nature-gardening',
    name: '园艺',
    category: 'nature',
    source: 'storyset',
    path: `${BASE}/storyset/nature-gardening.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-nature-potted-plants',
    name: '盆栽',
    category: 'nature',
    source: 'storyset',
    path: `${BASE}/storyset/nature-potted-plants.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-nature-airplane',
    name: '飞机旅行',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/nature-airplane.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-nature-exploring',
    name: '探索',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/nature-exploring.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-nature-finding-way',
    name: '寻找方向',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/nature-finding-way.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-nature-travel',
    name: '旅行',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/nature-travel.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-nature-walking',
    name: '散步',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/nature-walking.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },

  // ── 抽象 Abstract (补充) ──────────────────────────────

  {
    id: 'freevector-abstract-city-walk',
    name: '城市漫步',
    category: 'abstract',
    source: 'freevector',
    path: `${BASE}/freevector/abstract-city-walk.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-abstract-family',
    name: '家庭',
    category: 'abstract',
    source: 'freevector',
    path: `${BASE}/freevector/abstract-family.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-abstract-friendship',
    name: '友谊',
    category: 'abstract',
    source: 'freevector',
    path: `${BASE}/freevector/abstract-friendship.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-abstract-justice',
    name: '正义',
    category: 'abstract',
    source: 'freevector',
    path: `${BASE}/freevector/abstract-justice.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-abstract-music',
    name: '音乐',
    category: 'abstract',
    source: 'freevector',
    path: `${BASE}/freevector/abstract-music.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'freevector-abstract-upload',
    name: '上传',
    category: 'abstract',
    source: 'freevector',
    path: `${BASE}/freevector/abstract-upload.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','landscape']
  },
  {
    id: 'sr-abstract-cityscape',
    name: '城市天际线',
    category: 'abstract',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/abstract-cityscape.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-abstract-finding-the-way',
    name: '寻找方向',
    category: 'abstract',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/abstract-finding-the-way.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-abstract-join',
    name: '加入',
    category: 'abstract',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/abstract-join.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-abstract-levitate',
    name: '漂浮',
    category: 'abstract',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/abstract-levitate.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-abstract-rolling',
    name: '滚动',
    category: 'abstract',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/abstract-rolling.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'sr-abstract-split-testing',
    name: 'A/B 测试',
    category: 'abstract',
    source: 'manypixels',
    path: `${BASE}/semi-realistic/abstract-split-testing.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-abs-launch',
    name: '启动',
    category: 'abstract',
    source: 'storyset',
    path: `${BASE}/storyset/abs-launch.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-abs-lightbulb',
    name: '灯泡',
    category: 'abstract',
    source: 'storyset',
    path: `${BASE}/storyset/abs-lightbulb.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'storyset-abs-startup',
    name: '创业',
    category: 'abstract',
    source: 'storyset',
    path: `${BASE}/storyset/abs-startup.svg`,
    defaultColor: '#407BFF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-misc-gift',
    name: '礼物',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/misc-gift.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-misc-goal',
    name: '目标',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/misc-goal.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-misc-join',
    name: '加入',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/misc-join.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-misc-location',
    name: '位置',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/misc-location.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },
  {
    id: 'undraw-misc-party',
    name: '派对',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/misc-party.svg`,
    defaultColor: '#6C63FF',
    fit: ['side','square','hero']
  },

  // ── 科技 Tech (Undraw) ──────────────────────────────

  {
    id: 'undraw-ai-agent_pdkp',
    name: 'AI 智能体',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-agent_pdkp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ai-answers_uxgx',
    name: 'AI Answers',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-answers_uxgx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ai-code-assistant_5xop',
    name: 'AI 代码 助手',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-code-assistant_5xop.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ai-code-generation_imyw',
    name: 'AI 代码 生成',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-code-generation_imyw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ai-data-extraction_soxc',
    name: 'AI 数据 Extraction',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-data-extraction_soxc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ai-generated-document_ykb4',
    name: 'AI Generated 文档',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-generated-document_ykb4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ai-research-assistant_cxx0',
    name: 'AI 研究 助手',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-research-assistant_cxx0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ai-response_gaip',
    name: 'AI Response',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-response_gaip.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ai-slop_jm2g',
    name: 'AI Slop',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-slop_jm2g.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ai-voice-interface_7uqq',
    name: 'AI Voice Interface',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ai-voice-interface_7uqq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-airplane_do9t',
    name: 'Airplane',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/airplane_do9t.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-all-the-data_ijgn',
    name: 'All the 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/all-the-data_ijgn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-app-benchmarks_ls0m',
    name: '应用 Benchmarks',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/app-benchmarks_ls0m.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-app-dark-mode_6ji2',
    name: '应用 暗色 模式',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/app-dark-mode_6ji2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-approved-wireframe_odf4',
    name: 'Approved 线框',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/approved-wireframe_odf4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-artemis-ii_4w4o',
    name: 'Artemis II',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/artemis-ii_4w4o.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-artificial-intelligence_43qa',
    name: 'Artificial 智能',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/artificial-intelligence_43qa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-artist-at-work_yos7',
    name: 'Artist At Work',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/artist-at-work_yos7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-at-the-airport_z3b9',
    name: 'At the 机场',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/at-the-airport_z3b9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-athletes-training_koqa',
    name: 'Athletes Training',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/athletes-training_koqa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-avatar-traveler_ljy2',
    name: '头像 Traveler',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/avatar-traveler_ljy2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-avatars_xsfb',
    name: 'Avatars',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/avatars_xsfb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-biometric-login_v832',
    name: 'Biometric 登录',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/biometric-login_v832.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-blogging_38kl',
    name: 'Blogging',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/blogging_38kl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-bookmarks_i66k',
    name: 'Bookmarks',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/bookmarks_i66k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-brainstorming_gny9',
    name: 'Brainstorming',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/brainstorming_gny9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-building-a-website_1wrp',
    name: 'Building A 网站',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/building-a-website_1wrp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-bull-market_4a8e',
    name: 'Bull 市场',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/bull-market_4a8e.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-businesswoman-avatar_ktl2',
    name: 'Businesswoman 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/businesswoman-avatar_ktl2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-calendar_8r6s',
    name: '日历',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/calendar_8r6s.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-car-salesman_ni2a',
    name: '汽车 Salesman',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/car-salesman_ni2a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-charts_31si',
    name: 'Charts',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/charts_31si.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-chat-interface_vofq',
    name: '聊天 Interface',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/chat-interface_vofq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-chat-with-ai_ir62',
    name: '聊天 with AI',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/chat-with-ai_ir62.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cloud-sync_h1ig',
    name: '云 同步',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/cloud-sync_h1ig.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cloudflare-dev_nf79',
    name: 'Cloudflare Dev',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/cloudflare-dev_nf79.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-clouds_bmtk',
    name: 'Clouds',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/clouds_bmtk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-code-contribution_8k0x',
    name: '代码 Contribution',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/code-contribution_8k0x.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-code-deployed_iwvu',
    name: '代码 Deployed',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/code-deployed_iwvu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-code-review_jdgp',
    name: '代码 评价',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/code-review_jdgp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-code-sample_kpju',
    name: '代码 Sample',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/code-sample_kpju.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-compose-email_s6kf',
    name: 'Compose 邮件',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/compose-email_s6kf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-computer-files_7dj6',
    name: 'Computer Files',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/computer-files_7dj6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-continuous-learning_a1ld',
    name: 'Continuous Learning',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/continuous-learning_a1ld.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-crypto-portfolio_mf2i',
    name: '加密 作品集',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/crypto-portfolio_mf2i.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-customize-app_wqo5',
    name: '自定义 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/customize-app_wqo5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-analysis_b7cp',
    name: '数据 Analysis',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-analysis_b7cp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-at-work_3tbf',
    name: '数据 at Work',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-at-work_3tbf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-input_ot3j',
    name: '数据 Input',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-input_ot3j.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-input_whqw',
    name: '数据 input',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-input_whqw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-points_uc3j',
    name: '数据 points',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-points_uc3j.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-processing_ohfw',
    name: '数据 处理',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-processing_ohfw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-reports_l2u3',
    name: '数据 Reports',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-reports_l2u3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-table_xmec',
    name: '数据 表格',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-table_xmec.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-thief_d66l',
    name: '数据 Thief',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-thief_d66l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data-trends_kv5v',
    name: '数据 trends',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data-trends_kv5v.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-data_25jw',
    name: '数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/data_25jw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-database-tables_yft5',
    name: '数据库 Tables',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/database-tables_yft5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-deep-thinker-avatar_6xg6',
    name: 'Deep Thinker 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/deep-thinker-avatar_6xg6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-designer-avatar_n5q8',
    name: 'Designer 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/designer-avatar_n5q8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-developer-activity_4zqd',
    name: 'Developer Activity',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/developer-activity_4zqd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-developer-avatar_f6ac',
    name: 'Developer 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/developer-avatar_f6ac.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-digital-artwork_xlmm',
    name: 'Digital Artwork',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/digital-artwork_xlmm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-digital-calendar_180l',
    name: 'Digital 日历',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/digital-calendar_180l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-digital-signature_ttti',
    name: 'Digital Signature',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/digital-signature_ttti.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-document-search_2o7x',
    name: '文档 搜索',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/document-search_2o7x.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-document-warning_2es6',
    name: '文档 Warning',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/document-warning_2es6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-drawing-app_nnb0',
    name: 'Drawing 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/drawing-app_nnb0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-email_b5yu',
    name: '邮件',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/email_b5yu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-empty-mailbox_ef0e',
    name: '空 Mailbox',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/empty-mailbox_ef0e.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-enter-password_1kl4',
    name: 'Enter Password',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/enter-password_1kl4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-file-search_cbur',
    name: '文件 搜索',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/file-search_cbur.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-file-searching_yska',
    name: '文件 Searching',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/file-searching_yska.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-files-uploading_qf8u',
    name: 'Files Uploading',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/files-uploading_qf8u.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-finance-guy-avatar_vhop',
    name: '金融 Guy 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/finance-guy-avatar_vhop.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-financial-data_lbci',
    name: 'Financial 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/financial-data_lbci.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fitness-guy-avatar_50y6',
    name: '健身 Guy 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/fitness-guy-avatar_50y6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fitness-influencer-avatar_04j0',
    name: '健身 Coach 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/fitness-influencer-avatar_04j0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-five-year-plan_7hwj',
    name: 'Five Year 计划',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/five-year-plan_7hwj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fixing-bugs_1ytu',
    name: 'Fixing Bugs',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/fixing-bugs_1ytu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-forgot-password_nttj',
    name: 'Forgot Password',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/forgot-password_nttj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-gardening_jck1',
    name: 'Gardening',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/gardening_jck1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-github-profile_abde',
    name: 'Github 个人资料',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/github-profile_abde.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-going-downwards_wb62',
    name: 'Going Downwards',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/going-downwards_wb62.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-going-upwards_0y3z',
    name: 'Going Upwards',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/going-upwards_0y3z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-growth-chart_4iho',
    name: 'Growth 图表',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/growth-chart_4iho.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-happy-customer_4h84',
    name: 'Happy 客户',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/happy-customer_4h84.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-happy_fsrv',
    name: 'Happy',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/happy_fsrv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-homework-research_kufa',
    name: 'Homework 研究',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/homework-research_kufa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-image-comparison_ieuw',
    name: '图片 Comparison',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/image-comparison_ieuw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-image-upload_7b3b',
    name: '图片 上传',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/image-upload_7b3b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-indie-hacker-avatar_b3wy',
    name: 'Indie Hacker 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/indie-hacker-avatar_b3wy.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-investment-data_frxx',
    name: 'Investment 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/investment-data_frxx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-investor-update_ou4c',
    name: 'Investor 更新',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/investor-update_ou4c.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-large-language-models_m4no',
    name: 'Large Language Models',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/large-language-models_m4no.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-learning-to-sketch_uaxi',
    name: 'Learning To 素描',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/learning-to-sketch_uaxi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-learning_qt7d',
    name: 'Learning',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/learning_qt7d.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-local-server_9izb',
    name: 'Local 服务器',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/local-server_9izb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-lock-screen-notifications_n6o8',
    name: '锁定 屏幕 Notifications',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/lock-screen-notifications_n6o8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-log-out_2vod',
    name: 'Log Out',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/log-out_2vod.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-maintenance_4unj',
    name: 'Maintenance',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/maintenance_4unj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-make-it-rain_ylfg',
    name: '制作 it 雨',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/make-it-rain_ylfg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-making-art_c05m',
    name: 'Making 艺术',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/making-art_c05m.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-markdown-file_io4x',
    name: 'Markdown 文件',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/markdown-file_io4x.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-marketing-analysis_2u5r',
    name: 'Marketing Analysis',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/marketing-analysis_2u5r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mcp-server_7kvc',
    name: 'MCP 服务器',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mcp-server_7kvc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-analytics_bz2a',
    name: 'Mobile Analytics',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-analytics_bz2a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-app-data_2lfx',
    name: 'Mobile 应用 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-app-data_2lfx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-application_uc2q',
    name: 'Mobile 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-application_uc2q.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-assistant_iifm',
    name: 'Mobile 助手',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-assistant_iifm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-coding_l0or',
    name: 'Mobile Coding',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-coding_l0or.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-gaming_di2l',
    name: 'Mobile Gaming',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-gaming_di2l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-log-in_0n4q',
    name: 'Mobile Log In',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-log-in_0n4q.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-marketing_7x7m',
    name: 'Mobile Marketing',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-marketing_7x7m.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-office_w861',
    name: 'Mobile 办公室',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-office_w861.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-payments_uate',
    name: 'Mobile Payments',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-payments_uate.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-post_zwbe',
    name: 'Mobile 发布',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-post_zwbe.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-site_qjby',
    name: 'Mobile 网站',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-site_qjby.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-my-app_jscv',
    name: 'My 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/my-app_jscv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-my-resume_etai',
    name: 'My Resume',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/my-resume_etai.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-new-years-resolutions_jzwq',
    name: '新 Year\'s Resolutions',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/new-years-resolutions_jzwq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-nfc-sharing_tt2d',
    name: 'NFC Sharing',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/nfc-sharing_tt2d.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-party_uybk',
    name: 'Online 派对',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/online-party_uybk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-open-source-code_411s',
    name: '打开 Source 代码',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/open-source-code_411s.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-organizing-data_uns9',
    name: 'Organizing 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/organizing-data_uns9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-os-upgrade_ztrf',
    name: 'OS 升级',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/os-upgrade_ztrf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-painting-the-room_xuf4',
    name: 'Painting the 房间',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/painting-the-room_xuf4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-pair-programming_9jyg',
    name: 'Pair Programming',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/pair-programming_9jyg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-performance-comparison_qd1q',
    name: '性能 Comparison',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/performance-comparison_qd1q.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-training_jq54',
    name: 'Personal Training',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/personal-training_jq54.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-website_kz7a',
    name: 'My 网站',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/personal-website_kz7a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-pie-chart_eo9h',
    name: 'Pie 图表',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/pie-chart_eo9h.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-preparation_59f0',
    name: 'Preparation',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/preparation_59f0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-professional-woman-avatar_ivds',
    name: 'Professional Woman 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/professional-woman-avatar_ivds.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-programming_j1zw',
    name: 'Programming',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/programming_j1zw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-progressive-web-app_c4uq',
    name: 'Progressive 网页 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/progressive-web-app_c4uq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-proud-coder_bivp',
    name: 'Proud Coder',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/proud-coder_bivp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-qr-code-scan_bewe',
    name: 'QR 代码 扫描',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/qr-code-scan_bewe.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-researching_49yy',
    name: 'Researching',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/researching_49yy.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-screen-time_f7ev',
    name: '屏幕 Time',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/screen-time_f7ev.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-scrum-board_7bgh',
    name: 'Scrum Board',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/scrum-board_7bgh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-searching-everywhere_tffi',
    name: 'Searching Everywhere',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/searching-everywhere_tffi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-secure-password_9qv4',
    name: '安全 Password',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/secure-password_9qv4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-security-on_3ykb',
    name: 'Security On',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/security-on_3ykb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-select-character_kdsh',
    name: '选择 Character',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/select-character_kdsh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-server-error_syuz',
    name: '服务器 错误',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/server-error_syuz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-server-failure_syqp',
    name: '服务器 Failure',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/server-failure_syqp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-server-status_7viz',
    name: '服务器 Status',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/server-status_7viz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-share-everywhere_h2ep',
    name: '分享 Everywhere',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/share-everywhere_h2ep.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-share-results_lfh5',
    name: '分享 Results',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/share-results_lfh5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-shared-workspace_6y9d',
    name: 'Shared Workspace',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/shared-workspace_6y9d.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-sharing-ideas_toje',
    name: 'Sharing Ideas',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/sharing-ideas_toje.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-sharing-knowledge_2jx3',
    name: 'Sharing Knowledge',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/sharing-knowledge_2jx3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-shy-guy-avatar_094a',
    name: 'Shy Guy 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/shy-guy-avatar_094a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-smartwatch-map_3u18',
    name: 'Smartwatch 地图',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/smartwatch-map_3u18.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-media-carousel_p2zp',
    name: '社交 Media Carousel',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/social-media-carousel_p2zp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-update_jbhv',
    name: '社交 更新',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/social-update_jbhv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-split-testing_sdbx',
    name: '拆分 testing',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/split-testing_sdbx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-starting-work_ifnt',
    name: 'Starting Work',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/starting-work_ifnt.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-successful-upload_t9fz',
    name: 'Successful 上传',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/successful-upload_t9fz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-system-update_gekm',
    name: '系统 更新',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/system-update_gekm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-target-audience_prun',
    name: 'Target Audience',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/target-audience_prun.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-tech-keynote_ytf3',
    name: 'Tech Keynote',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tech-keynote_ytf3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-to-do-app_esjl',
    name: 'To Do 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/to-do-app_esjl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-toy-car_on9j',
    name: 'Toy 汽车',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/toy-car_on9j.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-typing-code_6t2b',
    name: 'Typing 代码',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/typing-code_6t2b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-uploading_nu4x',
    name: 'Uploading',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/uploading_nu4x.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-user-account_fvqa',
    name: '用户 账户',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/user-account_fvqa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-verify-data_k0y1',
    name: '验证 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/verify-data_k0y1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-version-control_e4yu',
    name: 'Version Control',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/version-control_e4yu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-visionary-technology_f6b3',
    name: 'Visionary Technology',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/visionary-technology_f6b3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-visual-data_1eya',
    name: 'Visual 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/visual-data_1eya.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-web-app_141a',
    name: '网页 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/web-app_141a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-web-design-showcase_6t2l',
    name: '网页 设计 展示',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/web-design-showcase_6t2l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-web-developer_gxaa',
    name: '网页 Developer',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/web-developer_gxaa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-web-development_f0tp',
    name: '网页 Development',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/web-development_f0tp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-web-search_7oif',
    name: '网页 搜索',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/web-search_7oif.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-web-shopping_xd5k',
    name: '网页 Shopping',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/web-shopping_xd5k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-website-builder_4go7',
    name: '网站 Builder',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/website-builder_4go7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-website-visitors_qy9c',
    name: '网站 Visitors',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/website-visitors_qy9c.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-welcome-aboard_y4e9',
    name: '欢迎 Aboard',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/welcome-aboard_y4e9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-wireframe-to-app_i5ze',
    name: '线框 to 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/wireframe-to-app_i5ze.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-young-man-avatar_wgbd',
    name: 'Young Man 头像',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/young-man-avatar_wgbd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-a-day-at-the-park_9w8d',
    name: 'A 白天 at the park',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/a-day-at-the-park_9w8d.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-air-support_dqct',
    name: 'Air 支持',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/air-support_dqct.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-aircraft_usu4',
    name: 'Aircraft',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/aircraft_usu4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-amusement-park_j8fe',
    name: 'Amusement Park',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/amusement-park_j8fe.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-app-data_vo0p',
    name: '应用 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/app-data_vo0p.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-art-thinking_jxnx',
    name: '艺术 thinking',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/art-thinking_jxnx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-at-the-park_2y19',
    name: 'At The Park',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/at-the-park_2y19.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-blog-post_f68f',
    name: '博客 发布',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/blog-post_f68f.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-browser-stats_nljq',
    name: 'Browser Stats',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/browser-stats_nljq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-building-websites_k2zp',
    name: 'Building Websites',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/building-websites_k2zp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-car-repair_wski',
    name: '汽车 repair',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/car-repair_wski.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-career-development_f0n6',
    name: 'Career Development',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/career-development_f0n6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-career-progress_vfq5',
    name: 'Career Progress',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/career-progress_vfq5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cloud-docs_6cpw',
    name: '云 docs',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/cloud-docs_6cpw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cloud-files_8upc',
    name: '云 files',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/cloud-files_8upc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cloud-hosting_tfeh',
    name: '云 托管',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/cloud-hosting_tfeh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-code-inspection_z688',
    name: '代码 inspection',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/code-inspection_z688.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-code-thinking_0vf2',
    name: '代码 thinking',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/code-thinking_0vf2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-departing_010k',
    name: 'Departing',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/departing_010k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-data_ybvy',
    name: '设计 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/design-data_ybvy.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-sprint_7mmb',
    name: '设计 冲刺',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/design-sprint_7mmb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-details_sgb2',
    name: 'Details',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/details_sgb2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-digital-currency_u5p6',
    name: 'Digital Currency',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/digital-currency_u5p6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-digital-nomad_xr4z',
    name: 'Digital Nomad',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/digital-nomad_xr4z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-download_sa8g',
    name: '下载',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/download_sa8g.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-drone-surveillance_mc4g',
    name: 'Drone Surveillance',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/drone-surveillance_mc4g.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-email-campaign_2z6t',
    name: '邮件 campaign',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/email-campaign_2z6t.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-farm-girl_cefo',
    name: 'Farm Girl',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/farm-girl_cefo.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-farming_u62j',
    name: 'Farming',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/farming_u62j.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-firmware_3fxd',
    name: 'Firmware',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/firmware_3fxd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fixing-bugs_13mt',
    name: 'Fixing Bugs',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/fixing-bugs_13mt.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-gift-card_sfy8',
    name: 'Gift 卡片',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/gift-card_sfy8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-happy-announcement_23nf',
    name: 'Happy Announcement',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/happy-announcement_23nf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-heartbroken_ocfa',
    name: 'Heartbroken',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/heartbroken_ocfa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-laravel-and-vue_fios',
    name: 'Laravel And Vue',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/laravel-and-vue_fios.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-logo-design_530k',
    name: '标志 设计',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/logo-design_530k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mail-sent_ujev',
    name: 'Mail Sent',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mail-sent_ujev.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mailbox_e7nc',
    name: 'Mailbox',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mailbox_e7nc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-medical-care_7m9g',
    name: '医疗 care',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/medical-care_7m9g.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-medical-research_pze7',
    name: '医疗 研究',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/medical-research_pze7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-analytics_dtjl',
    name: 'Mobile Analytics',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-analytics_dtjl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-app_qxev',
    name: 'Mobile 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-app_qxev.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-apps_p0aa',
    name: 'Mobile Apps',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-apps_p0aa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-browsers_zxj0',
    name: 'Mobile Browsers',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-browsers_zxj0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-content_yz21',
    name: 'Mobile Content',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-content_yz21.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-development_tjxm',
    name: 'Mobile Development',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-development_tjxm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-devices_7ob7',
    name: 'Mobile Devices',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-devices_7ob7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-encryption_flk2',
    name: 'Mobile Encryption',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-encryption_flk2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-feed_5vtf',
    name: 'Mobile Feed',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-feed_5vtf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-images_b202',
    name: 'Mobile Images',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-images_b202.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-inbox_aszm',
    name: 'Mobile Inbox',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-inbox_aszm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-interface_z1b3',
    name: 'Mobile Interface',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-interface_z1b3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-life_m72o',
    name: 'Mobile Life',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-life_m72o.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-pay_yho9',
    name: 'Mobile Pay',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-pay_yho9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-photos_uu13',
    name: 'Mobile Photos',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-photos_uu13.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-profile_vhpl',
    name: 'Mobile 个人资料',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-profile_vhpl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-prototyping_tb4o',
    name: 'Mobile Prototyping',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-prototyping_tb4o.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-search_macy',
    name: 'Mobile 搜索',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-search_macy.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-testing_sm2l',
    name: 'Mobile Testing',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-testing_sm2l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-user_qc9c',
    name: 'Mobile 用户',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-user_qc9c.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-ux_5h2w',
    name: 'Mobile Ux',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-ux_5h2w.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-web_eqrb',
    name: 'Mobile 网页',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-web_eqrb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile-wireframe_fpih',
    name: 'Mobile 线框',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile-wireframe_fpih.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mobile_fxri',
    name: 'Mobile',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/mobile_fxri.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-my-code-snippets_1t66',
    name: 'My 代码 snippets',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/my-code-snippets_1t66.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-nature-on-screen_5cbd',
    name: '自然 on 屏幕',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/nature-on-screen_5cbd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-no-data_ig65',
    name: 'No 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/no-data_ig65.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-articles_g9cg',
    name: 'Online Articles',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/online-articles_g9cg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-calendar_zaoc',
    name: 'Online 日历',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/online-calendar_zaoc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-learning_tgmv',
    name: 'Online Learning',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/online-learning_tgmv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-popularity_25c4',
    name: 'Online Popularity',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/online-popularity_25c4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-order-a-car_x5mq',
    name: '订单 a 汽车',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/order-a-car_x5mq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ordinary-day_ak4e',
    name: 'Ordinary 白天',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/ordinary-day_ak4e.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-data_a1n8',
    name: 'Personal 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/personal-data_a1n8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-trainer_bqkg',
    name: 'Personal Trainer',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/personal-trainer_bqkg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-photo-sharing_ori7',
    name: '照片 sharing',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/photo-sharing_ori7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-polaroid_qqdz',
    name: 'Polaroid',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/polaroid_qqdz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-portfolio-update_6bro',
    name: '作品集 更新',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/portfolio-update_6bro.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-portfolio-website_838t',
    name: '作品集 网站',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/portfolio-website_838t.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-private-data_7v0o',
    name: 'Private 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/private-data_7v0o.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-profile-data_xkr9',
    name: '个人资料 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/profile-data_xkr9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-progress-data_gvcq',
    name: 'Progress 数据',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/progress-data_gvcq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-publish-article_u3z6',
    name: '发布 article',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/publish-article_u3z6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-regain-focus_iayd',
    name: 'Regain Focus',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/regain-focus_iayd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-robotics_0czc',
    name: 'Robotics',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/robotics_0czc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-runner-start_585j',
    name: 'Runner 开始',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/runner-start_585j.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-search-app_cpm0',
    name: '搜索 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/search-app_cpm0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-security_0ubl',
    name: 'Security',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/security_0ubl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-server-push_1lbi',
    name: '服务器 push',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/server-push_1lbi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-server_9eix',
    name: '服务器',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/server_9eix.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-shared-goals_jn0a',
    name: 'Shared Goals',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/shared-goals_jn0a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-sharing-articles_agyr',
    name: 'Sharing Articles',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/sharing-articles_agyr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-smart-home_9s59',
    name: '智能 家',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/smart-home_9s59.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-dashboard_81sv',
    name: '社交 dashboard',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/social-dashboard_81sv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-share_9clm',
    name: '社交 分享',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/social-share_9clm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-sharing_t073',
    name: '社交 sharing',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/social-sharing_t073.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-source-code_m0vh',
    name: 'Source 代码',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/source-code_m0vh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-startup-life_7hl8',
    name: '创业 life',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/startup-life_7hl8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-static-website_x3tn',
    name: 'Static 网站',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/static-website_x3tn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-statistic-chart_6s7z',
    name: 'Statistic 图表',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/statistic-chart_6s7z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-status-update_7gqz',
    name: 'Status 更新',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/status-update_7gqz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-tailwind-css_ttun',
    name: 'Tailwind CSS',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/tailwind-css_ttun.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-to-the-stars_tz9v',
    name: 'To The Stars',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/to-the-stars_tz9v.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-upgrade_96mr',
    name: '升级',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/upgrade_96mr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-upload_cucu',
    name: '上传',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/upload_cucu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-vr-chat_tiua',
    name: 'VR 聊天',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/vr-chat_tiua.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-waiting-for-you_xhp2',
    name: '等待 for you',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/waiting-for-you_xhp2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-walking-in-rain_tw0k',
    name: 'Walking In 雨',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/walking-in-rain_tw0k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-watch-application_uw0p',
    name: 'Watch 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/watch-application_uw0p.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-weather-app_4cp0',
    name: 'Weather 应用',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/weather-app_4cp0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-web-browsing_qx8i',
    name: '网页 browsing',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/web-browsing_qx8i.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-web-devices_i15y',
    name: '网页 devices',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/web-devices_i15y.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-website-setup_o2zf',
    name: '网站 设置',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/website-setup_o2zf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-website_27ju',
    name: '网站',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/website_27ju.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-website_zbig',
    name: '网站',
    category: 'tech',
    source: 'undraw',
    path: `${BASE}/undraw/website_zbig.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  // ── 商务 Business (Undraw) ──────────────────────────────

  {
    id: 'undraw-action-successful_e2a7',
    name: 'Action Successful',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/action-successful_e2a7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-agreement_ftet',
    name: 'Agreement',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/agreement_ftet.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-analytics-setup_ptrz',
    name: 'Analytics 设置',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/analytics-setup_ptrz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-budget-adjustments_7fj9',
    name: 'Budget Adjustments',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/budget-adjustments_7fj9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-budgeting_klon',
    name: 'Budgeting',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/budgeting_klon.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-business-call_w1gr',
    name: '商务 通话',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/business-call_w1gr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-business-decisions_7vkl',
    name: '商务 Decisions',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/business-decisions_7vkl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-business-plan_zrf7',
    name: '商务 计划',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/business-plan_zrf7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-certification_oqiz',
    name: 'Certification',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/certification_oqiz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-content-team_1p7b',
    name: 'Content 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/content-team_1p7b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-contract-signed_vutk',
    name: 'Contract Signed',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/contract-signed_vutk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-contract_ynau',
    name: 'Contract',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/contract_ynau.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-customer-survey_ek29',
    name: '客户 Survey',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/customer-survey_ek29.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-doctors-orders_a8sv',
    name: '医生\'s Orders',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/doctors-orders_a8sv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-enter-payment-info_k1yw',
    name: 'Enter 支付 Info',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/enter-payment-info_k1yw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-finance_m6vw',
    name: '金融',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/finance_m6vw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fitness-stats_bd09',
    name: '健身 Stats',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/fitness-stats_bd09.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-founding-team_8uhm',
    name: 'Founding 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/founding-team_8uhm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-global-team_8jok',
    name: '全球 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/global-team_8jok.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-group-project_kow1',
    name: '群组 项目',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/group-project_kow1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-handshake-deal_nwk6',
    name: 'Handshake Deal',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/handshake-deal_nwk6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-hr-presentation_uunk',
    name: 'HR Presentation',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/hr-presentation_uunk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-invest_t695',
    name: '投资',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/invest_t695.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-investing_uzcu',
    name: 'Investing',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/investing_uzcu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-meet-the-team_fau8',
    name: 'Meet the 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/meet-the-team_fau8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-money-received_eg1c',
    name: 'Money Received',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/money-received_eg1c.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-banking_l9sn',
    name: 'Online Banking',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/online-banking_l9sn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-meeting_qe61',
    name: 'Online 会议',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/online-meeting_qe61.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-meetings_zutp',
    name: 'Online Meetings',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/online-meetings_zutp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-payments_d5ef',
    name: 'Online Payments',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/online-payments_d5ef.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-stats_d57c',
    name: 'Online Stats',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/online-stats_d57c.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-order-coffee_pw24',
    name: '订单 咖啡',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/order-coffee_pw24.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-order-status_swsl',
    name: '订单 Status',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/order-status_swsl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-finance_xpqg',
    name: 'Personal 金融',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/personal-finance_xpqg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-predictive-analytics_6gsu',
    name: 'Predictive Analytics',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/predictive-analytics_6gsu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-presentation_4ik4',
    name: 'Presentation',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/presentation_4ik4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-printing-invoices_g6c9',
    name: 'Printing Invoices',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/printing-invoices_g6c9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-project-completed_ug9i',
    name: '项目 Completed',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/project-completed_ug9i.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-real-time-analytics_50za',
    name: 'Real Time Analytics',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/real-time-analytics_50za.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-remote-meeting_kqj0',
    name: 'Remote 会议',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/remote-meeting_kqj0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-report_k55w',
    name: '报告',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/report_k55w.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-revenue-analysis_fjh2',
    name: 'Revenue Analysis',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/revenue-analysis_fjh2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-route-planning_2psv',
    name: 'Route Planning',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/route-planning_2psv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-send-money_4qc7',
    name: '发送 Money',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/send-money_4qc7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-stock-prices_8nuz',
    name: '股票 prices',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/stock-prices_8nuz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-stripe-payments_jxnn',
    name: 'Stripe Payments',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/stripe-payments_jxnn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-success-factors_i417',
    name: '成功 factors',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/success-factors_i417.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-success_288d',
    name: '成功',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/success_288d.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-successful_rtc4',
    name: 'Successful',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/successful_rtc4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team-assignment_lzot',
    name: '团队 Assignment',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team-assignment_lzot.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team-up_qeem',
    name: '团队 up',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team-up_qeem.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-teamwork_zplp',
    name: 'Teamwork',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/teamwork_zplp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-time-management_4ss6',
    name: 'Time Management',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/time-management_4ss6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-walk-stats_g34b',
    name: 'Walk Stats',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/walk-stats_g34b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-active-support_v6g0',
    name: 'Active 支持',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/active-support_v6g0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-analytics_6mru',
    name: 'Analytics',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/analytics_6mru.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-business-analytics_y8m6',
    name: '商务 analytics',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/business-analytics_y8m6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-business-chat_xea1',
    name: '商务 聊天',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/business-chat_xea1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-business-deal_nx2n',
    name: '商务 deal',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/business-deal_nx2n.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-business-man_0ifc',
    name: '商务 man',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/business-man_0ifc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-business-shop_b4su',
    name: '商务 商店',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/business-shop_b4su.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-businessman_8vs7',
    name: 'Businessman',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/businessman_8vs7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-businesswoman_8lrc',
    name: 'Businesswoman',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/businesswoman_8lrc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-connecting-teams_nnjy',
    name: 'Connecting Teams',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/connecting-teams_nnjy.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-creative-team_wfty',
    name: '创意 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/creative-team_wfty.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-team_51o5',
    name: '设计 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/design-team_51o5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-engineering-team_13ax',
    name: 'Engineering 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/engineering-team_13ax.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-good-team_zww8',
    name: 'Good 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/good-team_zww8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-growth-analytics_bhy7',
    name: 'Growth Analytics',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/growth-analytics_bhy7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-growth-curve_kzjb',
    name: 'Growth Curve',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/growth-curve_kzjb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-hiring_8szx',
    name: 'Hiring',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/hiring_8szx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-meeting_dunc',
    name: '会议',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/meeting_dunc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-order-confirmed_m9e9',
    name: '订单 confirmed',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/order-confirmed_m9e9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-organizing-projects_heze',
    name: 'Organizing Projects',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/organizing-projects_heze.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-payments_nbqu',
    name: 'Payments',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/payments_nbqu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-project-feedback_lr8q',
    name: '项目 feedback',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/project-feedback_lr8q.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-projections_fhch',
    name: 'Projections',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/projections_fhch.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-remote-design-team_qfqr',
    name: 'Remote 设计 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/remote-design-team_qfqr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-remote-team_4ljl',
    name: 'Remote 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/remote-team_4ljl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-resume-folder_hf4p',
    name: 'Resume 文件夹',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/resume-folder_hf4p.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-resume_jrgi',
    name: 'Resume',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/resume_jrgi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-selecting-team_zehd',
    name: 'Selecting 团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/selecting-team_zehd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-showing-support_ixfc',
    name: 'Showing 支持',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/showing-support_ixfc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-site-stats_gfql',
    name: '网站 stats',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/site-stats_gfql.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-growth_osro',
    name: '社交 growth',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/social-growth_osro.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-strategy_v9qr',
    name: '社交 strategy',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/social-strategy_v9qr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-statistics_z6y6',
    name: 'Statistics',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/statistics_z6y6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team-chat_kjj8',
    name: '团队 聊天',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team-chat_kjj8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team-collaboration_phnf',
    name: '团队 collaboration',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team-collaboration_phnf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team-effort_2mrb',
    name: '团队 Effort',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team-effort_2mrb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team-goals_0026',
    name: '团队 goals',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team-goals_0026.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team-page_q5am',
    name: '团队 页面',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team-page_q5am.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team-spirit_18vw',
    name: '团队 spirit',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team-spirit_18vw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team-work_i1f3',
    name: '团队 work',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team-work_i1f3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-team_85hs',
    name: '团队',
    category: 'business',
    source: 'undraw',
    path: `${BASE}/undraw/team_85hs.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  // ── 创意 Creative (Undraw) ──────────────────────────────

  {
    id: 'undraw-audiobook_0h9f',
    name: 'Audiobook',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/audiobook_0h9f.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-book-lover_m9n3',
    name: '书籍 lover',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/book-lover_m9n3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-booking_8vl5',
    name: 'Booking',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/booking_8vl5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-choose-color_wpfw',
    name: '选择 颜色',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/choose-color_wpfw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-collaborative-writing_ir40',
    name: 'Collaborative Writing',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/collaborative-writing_ir40.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-color-palette_zoli',
    name: '颜色 调色板',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/color-palette_zoli.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-creative-designer_sctu',
    name: '创意 Designer',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-designer_sctu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-creative-flow_t3kz',
    name: '创意 流程',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-flow_t3kz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-creative-woman_su2h',
    name: '创意 woman',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-woman_su2h.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-dancing_lvv0',
    name: 'Dancing',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/dancing_lvv0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-feedback_kzg9',
    name: '设计 feedback',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/design-feedback_kzg9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-tools_wgpz',
    name: '设计 Tools',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/design-tools_wgpz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design_ewba',
    name: '设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/design_ewba.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-designer_efwz',
    name: 'Designer',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/designer_efwz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-designing-components_kb05',
    name: 'Designing Components',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/designing-components_kb05.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-home-cameras_hbw3',
    name: '家 Cameras',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/home-cameras_hbw3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-idea-sketching_rifv',
    name: 'Idea Sketching',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/idea-sketching_rifv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-modern-design_yur1',
    name: 'Modern 设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/modern-design_yur1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-motion-alert_pr1a',
    name: '动效 提醒',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/motion-alert_pr1a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-open-book_pet1',
    name: '打开 书籍',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/open-book_pet1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-photograph_gwbm',
    name: 'Photograph',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/photograph_gwbm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-proud-designer_1rcm',
    name: 'Proud Designer',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/proud-designer_1rcm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-reading-a-book_4cap',
    name: 'Reading A 书籍',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/reading-a-book_4cap.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-reviewing-design_payz',
    name: 'Reviewing 设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/reviewing-design_payz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-travel-booking_a6s2',
    name: '旅行 Booking',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/travel-booking_a6s2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-writing-down-ideas_h99r',
    name: 'Writing Down Ideas',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/writing-down-ideas_h99r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-add-color_6211',
    name: '添加 颜色',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/add-color_6211.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-complete-design_pzh6',
    name: '完成 设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/complete-design_pzh6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-creative-draft_v189',
    name: '创意 草稿',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-draft_v189.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-creative-experiment_bzae',
    name: '创意 实验',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-experiment_bzae.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-creative-process_5pan',
    name: '创意 流程',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-process_5pan.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-creative-thinking_ruwx',
    name: '创意 thinking',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/creative-thinking_ruwx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-community_rkf4',
    name: '设计 社区',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/design-community_rkf4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-components_529l',
    name: '设计 components',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/design-components_529l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-inspiration_2mrc',
    name: '设计 inspiration',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/design-inspiration_2mrc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-notes_vwa7',
    name: '设计 notes',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/design-notes_vwa7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-objectives_f9uv',
    name: '设计 objectives',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/design-objectives_f9uv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-design-thinking_8qg2',
    name: '设计 thinking',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/design-thinking_8qg2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-designer-mindset_bxms',
    name: 'Designer Mindset',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/designer-mindset_bxms.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-discoverable_nq2n',
    name: 'Discoverable',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/discoverable_nq2n.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-everyday-design_4f7q',
    name: 'Everyday 设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/everyday-design_4f7q.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-experience-design_d4md',
    name: 'Experience 设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/experience-design_d4md.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-grid-design_l6hw',
    name: '网格 设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/grid-design_l6hw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-healthy-lifestyle_8zpg',
    name: 'Healthy Lifestyle',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/healthy-lifestyle_8zpg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-icon-design_2kjf',
    name: '图标 设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/icon-design_2kjf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-icons_c73l',
    name: 'Icons',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/icons_c73l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-interior-design_j887',
    name: 'Interior 设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/interior-design_j887.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-notebook_8ihb',
    name: 'Notebook',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/notebook_8ihb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-photo-album_9d6r',
    name: '照片 album',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/photo-album_9d6r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-photo_895y',
    name: '照片',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/photo_895y.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-photos_09tf',
    name: 'Photos',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/photos_09tf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-posting-photo_15k3',
    name: 'Posting 照片',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/posting-photo_15k3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-product-photography_pouq',
    name: '产品 photography',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/product-photography_pouq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-redesign-feedback_aecb',
    name: 'Redesign Feedback',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/redesign-feedback_aecb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-typewriter_d4km',
    name: 'Typewriter',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/typewriter_d4km.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-un-draw-1000_ou30',
    name: 'UnDraw 1000',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/un-draw-1000_ou30.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-urban-design_tz8n',
    name: 'Urban 设计',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/urban-design_tz8n.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-winter-designer_a6kq',
    name: '冬天 designer',
    category: 'creative',
    source: 'undraw',
    path: `${BASE}/undraw/winter-designer_a6kq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  // ── 沟通 Communication (Undraw) ──────────────────────────────

  {
    id: 'undraw-add-post_prex',
    name: '添加 发布',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/add-post_prex.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-casual-chat_4byz',
    name: 'Casual 聊天',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/casual-chat_4byz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-chat-bot_c8iw',
    name: '聊天 bot',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/chat-bot_c8iw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-comment-sent_8c4r',
    name: '评论 Sent',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/comment-sent_8c4r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-conference-call_jgi5',
    name: 'Conference 通话',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/conference-call_jgi5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-contact-us_s4jn',
    name: '联系人 Us',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/contact-us_s4jn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-favorite-post_5ylx',
    name: 'Favorite 发布',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/favorite-post_5ylx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-feedback_ebmx',
    name: 'Feedback',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/feedback_ebmx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-leave-a-review_uj9v',
    name: 'Leave a 评价',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/leave-a-review_uj9v.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-listening-to-podcasts_j0hm',
    name: 'Listening To Podcasts',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/listening-to-podcasts_j0hm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-love-messages_9oca',
    name: 'Love Messages',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/love-messages_9oca.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-new-message_qvv6',
    name: '新 消息',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/new-message_qvv6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-newsletter-subscriber_plsr',
    name: 'Newsletter Subscriber',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/newsletter-subscriber_plsr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-no-signal_nqfa',
    name: 'No Signal',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/no-signal_nqfa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-notifications_uvwd',
    name: 'Notifications',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/notifications_uvwd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-community_3o0l',
    name: 'Online 社区',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/online-community_3o0l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-review_08y6',
    name: 'Online 评价',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/online-review_08y6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-phone-call_ov3z',
    name: 'Phone 通话',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/phone-call_ov3z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-physics_8tvl',
    name: 'Physics',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/physics_8tvl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-podcast-listener_dpel',
    name: '播客 listener',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/podcast-listener_dpel.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-presenting_pjjk',
    name: 'Presenting',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/presenting_pjjk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-publish-post_7g2z',
    name: '发布 发布',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/publish-post_7g2z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-reviewed-docs_tng3',
    name: 'Reviewed Docs',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/reviewed-docs_tng3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-reviews_bmgj',
    name: 'Reviews',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/reviews_bmgj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-sentiment-analysis_rke9',
    name: 'Sentiment Analysis',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/sentiment-analysis_rke9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-friends_mt6k',
    name: '社交 Friends',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-friends_mt6k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-media-interactions_5rls',
    name: '社交 Media Interactions',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-media-interactions_5rls.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-media-post_tg7l',
    name: '社交 Media 发布',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-media-post_tg7l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-media-profile_hjh9',
    name: '社交 Media 个人资料',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-media-profile_hjh9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-media_25ev',
    name: '社交 Media',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-media_25ev.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-notifications_zahe',
    name: '社交 Notifications',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-notifications_zahe.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-post_qn03',
    name: '社交 发布',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-post_qn03.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-talking-on-the-phone_lc9v',
    name: 'Talking On The Phone',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/talking-on-the-phone_lc9v.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-text-messages_p6bk',
    name: 'Text Messages',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/text-messages_p6bk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-toast-notifications_bl43',
    name: 'Toast Notifications',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/toast-notifications_bl43.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-user-feedback_5fp8',
    name: '用户 Feedback',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/user-feedback_5fp8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-video-call_i5de',
    name: '视频 通话',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/video-call_i5de.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-voice-messages_anpq',
    name: 'Voice Messages',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/voice-messages_anpq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-work-chat_kw8x',
    name: 'Work 聊天',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/work-chat_kw8x.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-chat_qmyo',
    name: '聊天',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/chat_qmyo.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-conversation_15p8',
    name: '对话',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/conversation_15p8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-group-chat_4xw0',
    name: '群组 聊天',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/group-chat_4xw0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-media-player_kxtm',
    name: 'Media 玩家',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/media-player_kxtm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-media_opxh',
    name: 'Online Media',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/online-media_opxh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-message_k64b',
    name: 'Online 消息',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/online-message_k64b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-podcast_0ioh',
    name: '播客',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/podcast_0ioh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-posts_gpjx',
    name: 'Posts',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/posts_gpjx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-quick-chat_3gj8',
    name: 'Quick 聊天',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/quick-chat_3gj8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-bio_2xzi',
    name: '社交 bio',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-bio_2xzi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-distancing_jh03',
    name: '社交 distancing',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-distancing_jh03.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-expert_wfam',
    name: '社交 expert',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-expert_wfam.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-girl_gytt',
    name: '社交 girl',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-girl_gytt.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-ideas_3znc',
    name: '社交 ideas',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-ideas_3znc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-influencer_hsqo',
    name: '社交 influencer',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-influencer_hsqo.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-life_xwod',
    name: '社交 life',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-life_xwod.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-serenity_x9vq',
    name: '社交 serenity',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-serenity_x9vq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-thinking_x42y',
    name: '社交 thinking',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-thinking_x42y.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-social-tree_p8cw',
    name: '社交 树',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/social-tree_p8cw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-tweetstorm_wq1q',
    name: 'Tweetstorm',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/tweetstorm_wq1q.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-wall-post_e47r',
    name: 'Wall 发布',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/wall-post_e47r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-weather-notification_5wuk',
    name: 'Weather Notification',
    category: 'communication',
    source: 'undraw',
    path: `${BASE}/undraw/weather-notification_5wuk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  // ── 教育 Education (Undraw) ──────────────────────────────

  {
    id: 'undraw-calculator_os9t',
    name: 'Calculator',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/calculator_os9t.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-document-ready_o5d5',
    name: '文档 就绪',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/document-ready_o5d5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-environmental-study_c69w',
    name: 'Environmental Study',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/environmental-study_c69w.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-exam-prep_nmly',
    name: 'Exam Prep',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/exam-prep_nmly.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-lecture_hul3',
    name: 'Lecture',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/lecture_hul3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-live-collaboration_i8an',
    name: '直播 collaboration',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/live-collaboration_i8an.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-math_ldpv',
    name: 'Math',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/math_ldpv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mathematics_0j2b',
    name: 'Mathematics',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/mathematics_0j2b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-open-letter_xc4r',
    name: '打开 Letter',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/open-letter_xc4r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-reading-notes_dg9z',
    name: 'Reading Notes',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/reading-notes_dg9z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-reading_6jjr',
    name: 'Reading',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/reading_6jjr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-real-time-collaboration_bchs',
    name: 'Real-Time Collaboration',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/real-time-collaboration_bchs.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-road-to-knowledge_ufma',
    name: 'Road To Knowledge',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/road-to-knowledge_ufma.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-spreadsheet_uj8z',
    name: 'Spreadsheet',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/spreadsheet_uj8z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-spreadsheets_bh6n',
    name: 'Spreadsheets',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/spreadsheets_bh6n.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-studying-science_kk9e',
    name: 'Studying 科学',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/studying-science_kk9e.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-video-tutorial_lgts',
    name: '视频 教程',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/video-tutorial_lgts.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-video-tutorial_ly8k',
    name: '视频 教程',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/video-tutorial_ly8k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-alien-science_0aba',
    name: 'Alien 科学',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/alien-science_0aba.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-collab_h1mq',
    name: 'Collab',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/collab_h1mq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-collaborating_mayd',
    name: 'Collaborating',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/collaborating_mayd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-education_3vwh',
    name: 'Education',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/education_3vwh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-knowledge_0ty5',
    name: 'Knowledge',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/knowledge_0ty5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-open-source_g069',
    name: '打开 source',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/open-source_g069.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-opened_47gd',
    name: 'Opened',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/opened_47gd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-science_kut5',
    name: '科学',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/science_kut5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-youtube-tutorial_xgp1',
    name: 'Youtube 教程',
    category: 'education',
    source: 'undraw',
    path: `${BASE}/undraw/youtube-tutorial_xgp1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero']
  },

  // ── 自然 Nature (Undraw) ──────────────────────────────

  {
    id: 'undraw-adventure-map_3e4p',
    name: '冒险 地图',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/adventure-map_3e4p.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-authentication_1evl',
    name: 'Authentication',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/authentication_1evl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-camping_q4ji',
    name: 'Camping',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/camping_q4ji.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-certificate_cqps',
    name: 'Certificate',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/certificate_cqps.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-delivery-location_um5t',
    name: '快递 位置',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/delivery-location_um5t.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-dev-environment_n5by',
    name: 'Dev Environment',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/dev-environment_n5by.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fast-changing-world_3ee6',
    name: '快速-Changing 世界',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/fast-changing-world_3ee6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-hiking_9zta',
    name: 'Hiking',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/hiking_9zta.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-holding-flowers_jc03',
    name: 'Holding Flowers',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/holding-flowers_jc03.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-my-current-location_tudq',
    name: 'My current 位置',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/my-current-location_tudq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-next-adventure_pzln',
    name: 'Next 冒险',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/next-adventure_pzln.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-relaxing-outdoors_s653',
    name: 'Relaxing Outdoors',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/relaxing-outdoors_s653.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-to-the-moon_w1wa',
    name: 'To the 月亮',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/to-the-moon_w1wa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-travel-mode_103y',
    name: '旅行 模式',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/travel-mode_103y.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-travelers_kud9',
    name: 'Travelers',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/travelers_kud9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-traveling_c18z',
    name: 'Traveling',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/traveling_c18z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-two-factor-authentication_ofho',
    name: 'Two Factor Authentication',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/two-factor-authentication_ofho.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-vacation-selfie_q5bs',
    name: '假期 自拍',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/vacation-selfie_q5bs.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-watering-plants_64af',
    name: 'Watering Plants',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/watering-plants_64af.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-weather-forecast_h6pw',
    name: 'Weather Forecast',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/weather-forecast_h6pw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-wind-turbines_sq2c',
    name: '风 Turbines',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/wind-turbines_sq2c.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-windows_kqsk',
    name: 'Windows',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/windows_kqsk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-among-nature_2f9e',
    name: 'Among 自然',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/among-nature_2f9e.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-city-driver_kgk7',
    name: '城市 driver',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/city-driver_kgk7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-connected-world_anke',
    name: 'Connected 世界',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/connected-world_anke.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-environment_9luj',
    name: 'Environment',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/environment_9luj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-explore_kfv3',
    name: '探索',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/explore_kfv3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fishing_n8vg',
    name: 'Fishing',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/fishing_n8vg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-flowers_171u',
    name: 'Flowers',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/flowers_171u.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-heatmap_zy1q',
    name: 'Heatmap',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/heatmap_zy1q.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-journey_brk8',
    name: '旅程',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/journey_brk8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-map_cuix',
    name: '地图',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/map_cuix.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-nature-benefits_ak6e',
    name: '自然 benefits',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/nature-benefits_ak6e.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-nature-fun_vkot',
    name: '自然 fun',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/nature-fun_vkot.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-nature_yf30',
    name: '自然',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/nature_yf30.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-stranded-traveler_y2cf',
    name: 'Stranded Traveler',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/stranded-traveler_y2cf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-sunny-day_53fo',
    name: 'Sunny 白天',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/sunny-day_53fo.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-through-the-desert_0e7j',
    name: 'Through the 沙漠',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/through-the-desert_0e7j.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-travel-plans_l0fo',
    name: '旅行 plans',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/travel-plans_l0fo.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-travel-together_uhlf',
    name: '旅行 together',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/travel-together_uhlf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-winter-road_hxt3',
    name: '冬天 road',
    category: 'nature',
    source: 'undraw',
    path: `${BASE}/undraw/winter-road_hxt3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  // ── 抽象 Abstract (Undraw) ──────────────────────────────

  {
    id: 'undraw-absorbed_h2rt',
    name: 'Absorbed',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/absorbed_h2rt.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-accomplishments_tb6k',
    name: 'Accomplishments',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/accomplishments_tb6k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-add-files_s0fz',
    name: '添加 Files',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/add-files_s0fz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-add-tasks_mvlb',
    name: '添加 tasks',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/add-tasks_mvlb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-adjust-settings_6pis',
    name: 'Adjust Settings',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/adjust-settings_6pis.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-all-checked_d3u6',
    name: 'All Checked',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/all-checked_d3u6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-analyze_gcbr',
    name: '分析',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/analyze_gcbr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-annotations_2xx4',
    name: 'Annotations',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/annotations_2xx4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-astronomy_ied1',
    name: 'Astronomy',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/astronomy_ied1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-audio-files_cgj7',
    name: '音频 Files',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/audio-files_cgj7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-bento-grid_qfc0',
    name: 'Bento 网格',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/bento-grid_qfc0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-beyond-profiles_ma4m',
    name: 'Beyond Profiles',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/beyond-profiles_ma4m.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-bright-ideas_z7u9',
    name: 'Bright Ideas',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/bright-ideas_z7u9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-browsing-online_rozb',
    name: 'Browsing Online',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/browsing-online_rozb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-browsing_z5g5',
    name: 'Browsing',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/browsing_z5g5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-build-mode_aa78',
    name: '构建 模式',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/build-mode_aa78.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cli-coding-agent_jtq1',
    name: 'CLI Coding 智能体',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/cli-coding-agent_jtq1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-coding-assistant_i178',
    name: 'Coding 助手',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/coding-assistant_i178.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-coding_joxb',
    name: 'Coding',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/coding_joxb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-coming-soon_7lvi',
    name: 'Coming Soon',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/coming-soon_7lvi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-completed_vjc6',
    name: 'Completed',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/completed_vjc6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-completing_3pe7',
    name: 'Completing',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/completing_3pe7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-conference-speaker_kl0d',
    name: 'Conference Speaker',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/conference-speaker_kl0d.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-confident_9v38',
    name: 'Confident',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/confident_9v38.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-confirmation_31jc',
    name: 'Confirmation',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/confirmation_31jc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-confirmed_c5lo',
    name: 'Confirmed',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/confirmed_c5lo.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-connection-lost_am29',
    name: 'Connection 丢失',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/connection-lost_am29.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-construction-workers_z99i',
    name: 'Construction Workers',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/construction-workers_z99i.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-control-panel_s0j2',
    name: 'Control 面板',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/control-panel_s0j2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-correct-answer_vjt7',
    name: 'Correct Answer',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/correct-answer_vjt7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-day-dreaming_2mlz',
    name: 'Daydreaming',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/day-dreaming_2mlz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-decide_g91m',
    name: 'Decide',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/decide_g91m.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-deep-work_muov',
    name: 'Deep Work',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/deep-work_muov.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-delete-files_ozzz',
    name: '删除 Files',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/delete-files_ozzz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-deliveries_qutl',
    name: 'Deliveries',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/deliveries_qutl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-destination_fkst',
    name: 'Destination',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/destination_fkst.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-distractions_jmxk',
    name: 'Distractions',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/distractions_jmxk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-document-analysis_3c0y',
    name: '文档 Analysis',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/document-analysis_3c0y.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-doll-play_e471',
    name: 'Doll 播放',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/doll-play_e471.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-drag-to-add_8zdg',
    name: '拖拽 to 添加',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/drag-to-add_8zdg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-elements_8i1l',
    name: 'Elements',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/elements_8i1l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-empty-wallet_j0kn',
    name: '空 钱包',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/empty-wallet_j0kn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-exploring_d1vd',
    name: 'Exploring',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/exploring_d1vd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fall_zh0m',
    name: 'Fall',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/fall_zh0m.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-faq_pgxi',
    name: 'FAQ',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/faq_pgxi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-file-analysis_nbtc',
    name: '文件 Analysis',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/file-analysis_nbtc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-files-missing_ntwe',
    name: 'Files 缺失',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/files-missing_ntwe.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fill-the-blank_n29z',
    name: 'Fill the 空白',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/fill-the-blank_n29z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-finding-the-way_qp1z',
    name: 'Finding The Way',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/finding-the-way_qp1z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-firewall_cfej',
    name: 'Firewall',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/firewall_cfej.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-focused-dev_gqoa',
    name: 'Focused Dev',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/focused-dev_gqoa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-focused_m9bj',
    name: 'Focused',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/focused_m9bj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-followers_m4z4',
    name: 'Followers',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/followers_m4z4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-gaming-controller_qzoc',
    name: 'Gaming Controller',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/gaming-controller_qzoc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-goals_dwgr',
    name: 'Goals',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/goals_dwgr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-google-docs_fwhy',
    name: 'Google Docs',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/google-docs_fwhy.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-got-an-idea_1z3i',
    name: 'Got An Idea',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/got-an-idea_1z3i.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-grading-papers_lty0',
    name: 'Grading Papers',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/grading-papers_lty0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-idea_hz8b',
    name: 'Idea',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/idea_hz8b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ideas-flow_lwpa',
    name: 'Ideas 流程',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/ideas-flow_lwpa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ideas_vn7a',
    name: 'Ideas',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/ideas_vn7a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ideation_r1g5',
    name: 'Ideation',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/ideation_r1g5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-image-editing_qqbe',
    name: '图片 Editing',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/image-editing_qqbe.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-images_v4j9',
    name: 'Images',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/images_v4j9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-in-love_yqu6',
    name: 'In Love',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/in-love_yqu6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-in-the-zone_07y7',
    name: 'In The Zone',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/in-the-zone_07y7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-indoor-bike_h658',
    name: 'Indoor 自行车',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/indoor-bike_h658.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-inflation_ht0o',
    name: 'Inflation',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/inflation_ht0o.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-instant-analysis_vm8x',
    name: 'Instant Analysis',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/instant-analysis_vm8x.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-invite-only_373f',
    name: 'Invite Only',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/invite-only_373f.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-key-insights_ex8y',
    name: 'Key Insights',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/key-insights_ex8y.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-key-points_iiic',
    name: 'Key Points',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/key-points_iiic.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-knocking-on-the-door_vgly',
    name: 'Knocking On The Door',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/knocking-on-the-door_vgly.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-landing-page_zc5e',
    name: 'Landing 页面',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/landing-page_zc5e.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-launch-event_aur1',
    name: '启动 活动',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/launch-event_aur1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-level-up_fenw',
    name: '级别 Up',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/level-up_fenw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-lightbulb-moment_16av',
    name: 'Lightbulb Moment',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/lightbulb-moment_16av.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-loading_3kqt',
    name: '加载',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/loading_3kqt.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-loving-it_hspq',
    name: 'Loving It',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/loving-it_hspq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-luggage_k1gn',
    name: 'Luggage',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/luggage_k1gn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-meditation_k4oa',
    name: '冥想',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/meditation_k4oa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-metrics_5v8d',
    name: 'Metrics',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/metrics_5v8d.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-morning-plans_5vln',
    name: '早晨 Plans',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/morning-plans_5vln.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-morning-workout_73u9',
    name: '早晨 训练',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/morning-workout_73u9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-multitasking_i2bv',
    name: 'Multitasking',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/multitasking_i2bv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-my-answer_au1h',
    name: 'My Answer',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/my-answer_au1h.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-my-files_1xwx',
    name: 'My Files',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/my-files_1xwx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-my-workspace_5961',
    name: 'My Workspace',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/my-workspace_5961.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-news-editor_5nnl',
    name: 'News Editor',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/news-editor_5nnl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-newsfeed_8ms9',
    name: 'Newsfeed',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/newsfeed_8ms9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-nice-to-meet-you_sqin',
    name: 'Nice To Meet You',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/nice-to-meet-you_sqin.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-on-the-move_3di5',
    name: 'On the 移动',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/on-the-move_3di5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-ad_703t',
    name: 'Online Ad',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/online-ad_703t.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-profile_v9c1',
    name: 'Online 个人资料',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/online-profile_v9c1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-shopping_po8w',
    name: 'Online Shopping',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/online-shopping_po8w.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-survey_xq2g',
    name: 'Online Survey',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/online-survey_xq2g.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-wishes_cb5x',
    name: 'Online Wishes',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/online-wishes_cb5x.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-our-solution_qv3b',
    name: 'Our Solution',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/our-solution_qv3b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-goals_f9bb',
    name: 'Personal Goals',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/personal-goals_f9bb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-information_h7kf',
    name: 'Personal Information',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/personal-information_h7kf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-pitching_y6kw',
    name: 'Pitching',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/pitching_y6kw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-plan-mode_rs7h',
    name: '计划 模式',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/plan-mode_rs7h.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-plug-in_hy0z',
    name: 'Plug In',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/plug-in_hy0z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-pricing-page_88g4',
    name: '定价 页面',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/pricing-page_88g4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-private-files_m2bw',
    name: 'Private Files',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/private-files_m2bw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-problem-solving_1kpx',
    name: 'Problem Solving',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/problem-solving_1kpx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-process_0wew',
    name: '流程',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/process_0wew.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-processing_bto8',
    name: '处理',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/processing_bto8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-product-demo_9d4i',
    name: '产品 演示',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/product-demo_9d4i.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-professor_d7zn',
    name: 'Professor',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/professor_d7zn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-programmer_raqr',
    name: 'Programmer',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/programmer_raqr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-public-speaking_m17t',
    name: 'Public Speaking',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/public-speaking_m17t.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-puzzle-solved_qdjq',
    name: 'Puzzle Solved',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/puzzle-solved_qdjq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-question-answered_ezyn',
    name: 'Question Answered',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/question-answered_ezyn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-questions_52ic',
    name: 'Questions',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/questions_52ic.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-random-thoughts_spw5',
    name: 'Random Thoughts',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/random-thoughts_spw5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-recruiter-suggestions_afdd',
    name: 'Recruiter Suggestions',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/recruiter-suggestions_afdd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-referral_ihsd',
    name: 'Referral',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/referral_ihsd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-reminders_o8j5',
    name: 'Reminders',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/reminders_o8j5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-remote-cabin_6x4q',
    name: 'Remote Cabin',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/remote-cabin_6x4q.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-remote-worker_0l91',
    name: 'Remote Worker',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/remote-worker_0l91.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-respond_o54z',
    name: 'Respond',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/respond_o54z.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-saving-notes_wp71',
    name: 'Saving Notes',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/saving-notes_wp71.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-savings_d97f',
    name: 'Savings',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/savings_d97f.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-schedule-cleanup_1xs7',
    name: '日程 Cleanup',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/schedule-cleanup_1xs7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-schedule_ry1w',
    name: '日程',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/schedule_ry1w.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-secure-usb-drive_7pj5',
    name: '安全 USB Drive',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/secure-usb-drive_7pj5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-segment-analysis_cl30',
    name: 'Segment Analysis',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/segment-analysis_cl30.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-settings_alfp',
    name: 'Settings',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/settings_alfp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ship-it_vn4g',
    name: 'Ship It',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/ship-it_vn4g.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-shopping-favorites_spd0',
    name: 'Shopping Favorites',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/shopping-favorites_spd0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-shopping-spree_h07u',
    name: 'Shopping Spree',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/shopping-spree_h07u.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-sorting-thoughts_b0kt',
    name: 'Sorting Thoughts',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/sorting-thoughts_b0kt.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-space-exploration_dhu1',
    name: 'Space Exploration',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/space-exploration_dhu1.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-stepping-up_i0i7',
    name: 'Stepping Up',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/stepping-up_i0i7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-taking-notes_oyqz',
    name: 'Taking Notes',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/taking-notes_oyqz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-taking-selfie_swcs',
    name: 'Taking 自拍',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/taking-selfie_swcs.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-texting_s1te',
    name: 'Texting',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/texting_s1te.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-thinking-mode_7czd',
    name: 'Thinking 模式',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/thinking-mode_7czd.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-thought-process_ze2r',
    name: 'Thought 流程',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/thought-process_ze2r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-throw-away_aaho',
    name: 'Throw Away',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/throw-away_aaho.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-to-do-list_eoia',
    name: 'To Do 列表',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/to-do-list_eoia.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-touching-grass_6v3i',
    name: 'Touching Grass',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/touching-grass_6v3i.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ui-analysis_crhb',
    name: 'UI Analysis',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/ui-analysis_crhb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-under-construction_hdrn',
    name: 'Under Construction',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/under-construction_hdrn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-unidentified-flying-object_x5ei',
    name: 'Unidentified Flying Object',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/unidentified-flying-object_x5ei.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-unlock_m0yr',
    name: '解锁',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/unlock_m0yr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-vibe-coding_mjme',
    name: 'Vibe Coding',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/vibe-coding_mjme.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-virtual-reality_4fo0',
    name: 'Virtual Reality',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/virtual-reality_4fo0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-visual-explanation_vd4l',
    name: 'Visual Explanation',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/visual-explanation_vd4l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-voice-notes_x4kp',
    name: 'Voice Notes',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/voice-notes_x4kp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-wallet_diag',
    name: '钱包',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/wallet_diag.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-wishlist_0k5w',
    name: 'Wishlist',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/wishlist_0k5w.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-work-friends_g4mn',
    name: 'Work Friends',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/work-friends_g4mn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-work-from-anywhere_tpk5',
    name: 'Work From Anywhere',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/work-from-anywhere_tpk5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-work-in-progress_m95a',
    name: 'Work In Progress',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/work-in-progress_m95a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-work-time_1ogn',
    name: 'Work Time',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/work-time_1ogn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-working-at-home_pxaa',
    name: '工作中 at 家',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/working-at-home_pxaa.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-working-out_6ksl',
    name: '工作中 out',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/working-out_6ksl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-working-together_r43a',
    name: '工作中 Together',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/working-together_r43a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-workspace_s6wf',
    name: 'Workspace',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/workspace_s6wf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-yoga_i399',
    name: '瑜伽',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/yoga_i399.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-abstract_gk2d',
    name: 'Abstract',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/abstract_gk2d.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-activity-tracker_3o6r',
    name: 'Activity Tracker',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/activity-tracker_3o6r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-add-friends_v4kx',
    name: '添加 friends',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/add-friends_v4kx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-add-information_06qr',
    name: '添加 information',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/add-information_06qr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-address_4imv',
    name: 'Address',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/address_4imv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-advanced-customization_7ms4',
    name: 'Advanced Customization',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/advanced-customization_7ms4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-alert_w756',
    name: '提醒',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/alert_w756.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-analysis_1k4x',
    name: 'Analysis',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/analysis_1k4x.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ask-me-anything_v09d',
    name: 'Ask Me Anything',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/ask-me-anything_v09d.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-asset-selection_jrie',
    name: 'Asset Selection',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/asset-selection_jrie.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-astronaut_j6je',
    name: 'Astronaut',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/astronaut_j6je.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-before-dawn_8wuh',
    name: 'Before Dawn',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/before-dawn_8wuh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-best-place_dhzp',
    name: 'Best Place',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/best-place_dhzp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-biking_m4mb',
    name: 'Biking',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/biking_m4mb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-buffer_dsav',
    name: 'Buffer',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/buffer_dsav.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-by-the-road_178b',
    name: 'By The Road',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/by-the-road_178b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cabin_7fei',
    name: 'Cabin',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/cabin_7fei.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-campfire_42p5',
    name: 'Campfire',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/campfire_42p5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-celebration_wtm8',
    name: '庆祝',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/celebration_wtm8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-chasing-love_ny97',
    name: 'Chasing Love',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/chasing-love_ny97.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-choice_dzxz',
    name: 'Choice',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/choice_dzxz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-choosing-house_u1wp',
    name: 'Choosing 房屋',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/choosing-house_u1wp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-circles_9tlx',
    name: 'Circles',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/circles_9tlx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-close-tab_jr11',
    name: '关闭 标签',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/close-tab_jr11.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cms_2ulf',
    name: 'CMS',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/cms_2ulf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-co-workers_8xeu',
    name: 'Co-Workers',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/co-workers_8xeu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-co-working_becw',
    name: 'Co-工作中',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/co-working_becw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-coffee-break_yeby',
    name: '咖啡 break',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/coffee-break_yeby.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cohort-analysis_nqxy',
    name: 'Cohort Analysis',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/cohort-analysis_nqxy.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-collecting_3zyb',
    name: 'Collecting',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/collecting_3zyb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-collection_ly06',
    name: '合集',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/collection_ly06.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-composition_aydi',
    name: 'Composition',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/composition_aydi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-conceptual-idea_cc76',
    name: 'Conceptual Idea',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/conceptual-idea_cc76.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-content-creator_vuqg',
    name: 'Content Creator',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/content-creator_vuqg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-cookie-love_t5px',
    name: 'Cookie Love',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/cookie-love_t5px.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-country-side_ojgw',
    name: 'Country Side',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/country-side_ojgw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-creation-process_uvp6',
    name: 'Creation 流程',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/creation-process_uvp6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-deconstructed_izoh',
    name: 'Deconstructed',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/deconstructed_izoh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-destinations_izq9',
    name: 'Destinations',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/destinations_izq9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-development_s4gv',
    name: 'Development',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/development_s4gv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-doctors_djoj',
    name: 'Doctors',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/doctors_djoj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-documents_9rcz',
    name: 'Documents',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/documents_9rcz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-done_i0ak',
    name: '完成',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/done_i0ak.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-eco-conscious_oqny',
    name: 'Eco Conscious',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/eco-conscious_oqny.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-empty_4zx0',
    name: '空',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/empty_4zx0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-energizer_1ewu',
    name: 'Energizer',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/energizer_1ewu.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-export-files_gc69',
    name: '导出 files',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/export-files_gc69.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fatherhood_eldm',
    name: 'Fatherhood',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/fatherhood_eldm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-festivities_q090',
    name: 'Festivities',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/festivities_q090.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fingerprint_kdwq',
    name: 'Fingerprint',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/fingerprint_kdwq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-finish-line_auqi',
    name: '完成 line',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/finish-line_auqi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fitness-tracker_y5q5',
    name: '健身 tracker',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/fitness-tracker_y5q5.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fitting-piece_y3bi',
    name: 'Fitting Piece',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/fitting-piece_y3bi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-fitting-pieces_k7hv',
    name: 'Fitting Pieces',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/fitting-pieces_k7hv.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-flutter-dev_c8s7',
    name: 'Flutter Dev',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/flutter-dev_c8s7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-focus_y60l',
    name: 'Focus',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/focus_y60l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-forming-ideas_3bup',
    name: 'Forming Ideas',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/forming-ideas_3bup.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-freelancer_vibs',
    name: 'Freelancer',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/freelancer_vibs.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-friendship_chd3',
    name: 'Friendship',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/friendship_chd3.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-game-day_m63l',
    name: '游戏 白天',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/game-day_m63l.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-gatsby-js_wd5s',
    name: 'GatsbyJs',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/gatsby-js_wd5s.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-gdpr_g020',
    name: 'GDPR',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/gdpr_g020.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-going-offline_v4oo',
    name: 'Going Offline',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/going-offline_v4oo.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-grades_hqyk',
    name: 'Grades',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/grades_hqyk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-graduation_u7uc',
    name: '毕业',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/graduation_u7uc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-growing_am8t',
    name: 'Growing',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/growing_am8t.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-hacker-mind_j91b',
    name: 'Hacker Mind',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/hacker-mind_j91b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-hacker-mindset_m0cp',
    name: 'Hacker Mindset',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/hacker-mindset_m0cp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-hamburger_falh',
    name: 'Hamburger',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/hamburger_falh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-healthy-habit_2ata',
    name: 'Healthy Habit',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/healthy-habit_2ata.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-healthy-options_ne00',
    name: 'Healthy Options',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/healthy-options_ne00.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-high-five_w86k',
    name: 'High Five',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/high-five_w86k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-hire_hadq',
    name: 'Hire',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/hire_hadq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-home-run_n1g7',
    name: '家 run',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/home-run_n1g7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-i-can-fly_0cuj',
    name: 'I Can Fly',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/i-can-fly_0cuj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-ice-cream_mhwt',
    name: '冰 cream',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/ice-cream_mhwt.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-image-folder_ep25',
    name: '图片 文件夹',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/image-folder_ep25.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-imagination_63cb',
    name: 'Imagination',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/imagination_63cb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-in-thought_xa50',
    name: 'In Thought',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/in-thought_xa50.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-influencer_qtm6',
    name: 'Influencer',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/influencer_qtm6.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-informed-decision_2jwi',
    name: 'Informed Decision',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/informed-decision_2jwi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-innovative_9l1b',
    name: 'Innovative',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/innovative_9l1b.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-inspection_tyum',
    name: 'Inspection',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/inspection_tyum.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-inspiration_z6x7',
    name: 'Inspiration',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/inspiration_z6x7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-instant-information_li5g',
    name: 'Instant Information',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/instant-information_li5g.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-into-the-night_nd84',
    name: 'Into the 夜晚',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/into-the-night_nd84.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-jogging_tf9a',
    name: 'Jogging',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/jogging_tf9a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-joyride_mb83',
    name: 'Joyride',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/joyride_mb83.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-junior-soccer_0lib',
    name: 'Junior Soccer',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/junior-soccer_0lib.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-letter_ombg',
    name: 'Letter',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/letter_ombg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-light-the-fire_u2zp',
    name: '亮色 the 火',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/light-the-fire_u2zp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-like-dislike_ggjr',
    name: '点赞 dislike',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/like-dislike_ggjr.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-maker-launch_fwzi',
    name: 'Maker 启动',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/maker-launch_fwzi.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-master-plan_m8ym',
    name: 'Master 计划',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/master-plan_m8ym.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-medicine_hqqg',
    name: '药品',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/medicine_hqqg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-meditating_1fki',
    name: 'Meditating',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/meditating_1fki.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mention_t7iw',
    name: 'Mention',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/mention_t7iw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-mint-tea_gjmb',
    name: 'Mint 茶',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/mint-tea_gjmb.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-miro_pu4s',
    name: 'Miro',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/miro_pu4s.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-modern-life_nfjp',
    name: 'Modern Life',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/modern-life_nfjp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-modern-professional_6pek',
    name: 'Modern Professional',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/modern-professional_6pek.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-my-files_yynz',
    name: 'My Files',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/my-files_yynz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-nakamoto_uy67',
    name: 'Nakamoto',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/nakamoto_uy67.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-new-ideas_nk4n',
    name: '新 ideas',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/new-ideas_nk4n.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-news_nz1p',
    name: 'News',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/news_nz1p.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-next-js_hy59',
    name: 'NextJs',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/next-js_hy59.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-noted_c0zn',
    name: 'Noted',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/noted_c0zn.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-nuxt-js_ge6r',
    name: 'Nuxt Js',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/nuxt-js_ge6r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-off-road_34hg',
    name: 'Off Road',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/off-road_34hg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online-transactions_8chx',
    name: 'Online Transactions',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/online-transactions_8chx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-online_dhvx',
    name: 'Online',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/online_dhvx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-page-not-found_6wni',
    name: '页面 not found',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/page-not-found_6wni.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-pay-online_806n',
    name: 'Pay Online',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/pay-online_806n.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-performance-overview_1b4y',
    name: '性能 overview',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/performance-overview_1b4y.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-documents_uhkq',
    name: 'Personal Documents',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/personal-documents_uhkq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-file_81l0',
    name: 'Personal 文件',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/personal-file_81l0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-info_yzls',
    name: 'Personal Info',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/personal-info_yzls.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-notes_n75r',
    name: 'Personal Notes',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/personal-notes_n75r.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personal-text_090t',
    name: 'Personal Text',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/personal-text_090t.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-personalization_0q05',
    name: 'Personalization',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/personalization_0q05.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-pilates_i5uo',
    name: 'Pilates',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/pilates_i5uo.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-positive-attitude_xx3v',
    name: 'Positive Attitude',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/positive-attitude_xx3v.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-powerful_e1sw',
    name: 'Powerful',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/powerful_e1sw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-preferences_2bda',
    name: 'Preferences',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/preferences_2bda.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-processing-thoughts_wakg',
    name: '处理 thoughts',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/processing-thoughts_wakg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-product-iteration_r2wg',
    name: '产品 iteration',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/product-iteration_r2wg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-product-tour_msgk',
    name: '产品 Tour',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/product-tour_msgk.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-profile-image_2hi8',
    name: '个人资料 图片',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/profile-image_2hi8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-profile_d7qw',
    name: '个人资料',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/profile_d7qw.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-progress-tracking_9m3o',
    name: 'Progress 追踪',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/progress-tracking_9m3o.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-prototyping-process_1thp',
    name: 'Prototyping 流程',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/prototyping-process_1thp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-quiet-town_6rlj',
    name: 'Quiet 小镇',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/quiet-town_6rlj.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-quitting-time_azp9',
    name: 'Quitting Time',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/quitting-time_azp9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-remotely_p27a',
    name: 'Remotely',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/remotely_p27a.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-responsive_csbt',
    name: 'Responsive',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/responsive_csbt.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-result_d6p8',
    name: 'Result',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/result_d6p8.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-safe_0mei',
    name: '安全',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/safe_0mei.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-scientist_5td0',
    name: 'Scientist',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/scientist_5td0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-segmentation_gd0j',
    name: 'Segmentation',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/segmentation_gd0j.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-select-player_sppe',
    name: '选择 玩家',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/select-player_sppe.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-shopping_a55o',
    name: 'Shopping',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/shopping_a55o.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-small-town_76a2',
    name: 'Small 小镇',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/small-town_76a2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-solution-mindset_pit7',
    name: 'Solution Mindset',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/solution-mindset_pit7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-specs_2nnl',
    name: 'Specs',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/specs_2nnl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-stability-ball_fxne',
    name: 'Stability Ball',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/stability-ball_fxne.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-subscriptions_72tq',
    name: 'Subscriptions',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/subscriptions_72tq.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-subway_66jh',
    name: 'Subway',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/subway_66jh.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-super-woman_6nx2',
    name: 'Super Woman',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/super-woman_6nx2.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-surveillance_k6wl',
    name: 'Surveillance',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/surveillance_k6wl.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-switches_atb7',
    name: 'Switches',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/switches_atb7.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-tabs_tlxz',
    name: 'Tabs',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/tabs_tlxz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-task-list_qe3p',
    name: '任务 列表',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/task-list_qe3p.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-teaching_58yg',
    name: 'Teaching',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/teaching_58yg.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-term-sheet_70lo',
    name: 'Term 表格',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/term-sheet_70lo.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-thoughts_wy7s',
    name: 'Thoughts',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/thoughts_wy7s.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-together_s27q',
    name: 'Together',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/together_s27q.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-track-and-field_i2au',
    name: '追踪 and field',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/track-and-field_i2au.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-trip_rh66',
    name: '旅程',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/trip_rh66.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-typing_gcve',
    name: 'Typing',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/typing_gcve.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-unexpected-friends_42mc',
    name: 'Unexpected Friends',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/unexpected-friends_42mc.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-user-flow_d1ya',
    name: '用户 流程',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/user-flow_d1ya.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-verified_m721',
    name: 'Verified',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/verified_m721.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-video-files_cxl9',
    name: '视频 files',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/video-files_cxl9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-video-streaming_cckz',
    name: '视频 streaming',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/video-streaming_cckz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-vintage_q09n',
    name: 'Vintage',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/vintage_q09n.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-virtual-assistant_y1xf',
    name: 'Virtual 助手',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/virtual-assistant_y1xf.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-visualization_zhab',
    name: 'Visualization',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/visualization_zhab.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-walking-outside_7jfy',
    name: 'Walking Outside',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/walking-outside_7jfy.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-welcome_nk8k',
    name: '欢迎',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/welcome_nk8k.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-winners_fre4',
    name: 'Winners',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/winners_fre4.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-wireframing_d3cx',
    name: 'Wireframing',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/wireframing_d3cx.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-word-of-mouth_9ddm',
    name: 'Word Of Mouth',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/word-of-mouth_9ddm.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-wordpress_l75e',
    name: 'Wordpress',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/wordpress_l75e.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-work-together_0f8c',
    name: 'Work Together',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/work-together_0f8c.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-working-from-anywhere_33m9',
    name: '工作中 from anywhere',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/working-from-anywhere_33m9.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-working-late_nh09',
    name: '工作中 late',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/working-late_nh09.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-working-remotely_ivtz',
    name: '工作中 remotely',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/working-remotely_ivtz.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-working_n9u0',
    name: '工作中',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/working_n9u0.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

  {
    id: 'undraw-workout_wqgp',
    name: '训练',
    category: 'abstract',
    source: 'undraw',
    path: `${BASE}/undraw/workout_wqgp.svg`,
    defaultColor: '#6C63FF',
    fit: ['side', 'square', 'hero'],
  },

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
