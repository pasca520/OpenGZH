/**
 * Application entrypoint.
 * @module main
 */

import { ImageStore } from './core/image-store.js';
import { ImageCompressor } from './core/image-compressor.js';
import { createMarkdownEngine } from './core/markdown-engine.js';
import { createTurndownService, createPasteHandler } from './core/paste-handler.js';
import { createEditHistory } from './core/edit-history.js';
import { renderPipeline } from './core/render-pipeline.js';
import {
  mergeTheme,
  normalizeStyleOverride,
  serializeStyleFrontMatter,
  parseStyleFrontMatter,
  insertBoxMarkdown,
  getBoxName,
  TOKEN_KEYS,
  PARAM_DEFS,
  PARAM_TARGETS,
  BOX_DEFS,
  BRUSH_CLASSES,
  getMergedDeclaration,
  readParamFromStyles,
  parseDeclarations,
  serializeDeclarations,
  normalizeTokenHex
} from './core/style-override.js';
import { copyToWechat } from './export/clipboard-exporter.js';
import { getCategorizedThemes, getStyleName, isRecommended, getStarredStyles, toggleStarStyle } from './ui/theme-manager.js';
import { applyAppTheme, normalizeAppTheme, toggleAppTheme } from './ui/app-theme.js';
import {
  getCodeThemeList,
  FOLLOW_THEME_CODE_STYLE,
  isCodeThemeSelection,
  resolveCodeTheme
} from './ui/code-themes.js';
import { createToast } from './ui/toast.js';
import { createPanelManager } from './ui/panel-manager.js';
import { loadPreferences, savePreferences, debounceSaveContent, getDefaultCodeBlockSettings, getDefaultDisplaySettings } from './storage/preferences.js';
import { createDefaultXhsSettings, normalizeXhsSettings } from './xhs/constants.js';
import {
  calculateXhsPreviewScale,
  normalizeXhsPreviewMode,
  resolveXhsPageSelection,
  stepXhsPageSelection
} from './xhs/preview-navigation.js';
import {
  XHS_FEATURE_ENABLED,
  XHS_LOGICAL_WIDTH,
  XHS_LOGICAL_HEIGHT,
  XHS_UPLOAD_WARNING_LIMIT,
  XHS_THEME_IDS,
  XHS_DENSITIES
} from './xhs/constants.js';
import { insertPageMarker, removePageMarker } from './xhs/page-markers.js';
import { parseXhsDocument } from './xhs/semantic-parser.js';
import { paginateXhsDocument } from './xhs/paginator.js';
import { createXhsDomMeasurer, renderXhsStack } from './xhs/renderer.js';
import { summarizeXhsPages } from './xhs/page-summary.js';
import { XHS_THEMES } from './xhs/themes.js';
import { exportXhsPage, exportXhsSet } from './xhs/exporter.js';
import { STYLES } from '../styles/themes/index.js';
import { COVER_TEMPLATES, TEMPLATE_META } from './cover/templates.js';
import { renderCover, getTemplate, getTemplates, getCategories, DEFAULT_TYPOGRAPHY, DEFAULT_COVER_CONTENT } from './cover/renderer.js';
import { exportCoverPng as doExportCoverPng } from './cover/export-png.js';
import { DEFAULT_ILLUSTRATIONS, ILLUSTRATION_CATEGORIES, ILLUSTRATION_MARKETS, getIllustration, getIllustrationsByCategory, getAllIllustrations } from './cover/illustration-registry.js';
import { loadIllustrationSvg, replaceIllustrationColor, extractPrimaryColor } from './cover/illustration-color.js';
import {
  createDirectoryFileSource,
  createFileMapSource,
  resolveLocalImages,
} from './core/markdown-image-resolver.js';
import {
  CARD_STYLES,
  CARD_CATEGORIES,
  applyCardEdit,
  findCardAtSelection,
  inspectCardTarget,
  removeCardEdit,
  renderCardPreviewHtml
} from './core/card-styles.js';
import {
  measureTextareaSelectionFocus,
  placeSelectionPopover
} from './ui/selection-popover-position.js';

const { createApp, ref, reactive, watch, nextTick, onMounted, onBeforeUnmount, computed } = window.Vue;

const UNTITLED_PREFIX = '未命名文档';

const markdownInput = ref('');
const renderedContent = ref('');
const currentStyle = ref('wechat-default');
const starredStyles = ref([]);
const currentCodeTheme = ref(FOLLOW_THEME_CODE_STYLE);
const documents = ref([]);
const activeDocumentId = ref(null);
const currentDocumentTitle = ref('');
const documentSearch = ref('');
const previewMode = ref('desktop');
const tocVisible = ref(false);
const isDraggingOver = ref(false);
const copySuccess = ref(false);
const markdownImportDialog = reactive({ show: false, names: [], selectedIndex: 0 });
let pendingMarkdownImports = [];
let pendingSupplementalDirectoryResolve = null;

const showDevicePicker = ref(false);
const showExportMenu = ref(false);
const previewDarkMode = ref(false);
const appTheme = ref(normalizeAppTheme(document.documentElement.dataset.appTheme));
const selectedDevice = ref('iphone-17-pro');

function switchAppTheme() {
  appTheme.value = applyAppTheme(toggleAppTheme(appTheme.value));
}

// ── XHS Image Mode (session-only state; contentOutputMode never persists) ──
const contentOutputMode = ref('text');
const xhsPages = ref([]);
const xhsPageSummary = computed(() => summarizeXhsPages(xhsPages.value));
const xhsRenderedPages = ref([]);
const xhsIsPaginating = ref(false);
const xhsIssues = ref([]);
const xhsWarning = ref('');
const xhsSelectedPageId = ref(null);
const xhsPreviewMode = ref('horizontal');
const xhsPreviewScale = ref(1);
const xhsCoverCandidates = ref([]);
const xhsExportErrorPageIndexes = ref([]);
const xhsShowCoverPanel = ref(false);
const xhsExporting = ref(false);
const XHS_DENSITY_LABELS = { relaxed: '舒展', standard: '标准', compact: '紧凑' };
let xhsPaginationTimer = null;
let xhsPaginationRevision = 0;
let xhsScrollSelectionTimer = null;
let xhsPreviewObserver = null;
let xhsMeasureStageEl = null;
const xhsPreviewUrlCache = new Map();
const xhsSelectedPageIndex = computed(() => (
  resolveXhsPageSelection(xhsPages.value, xhsSelectedPageId.value, 0).index
));
const xhsHasPreviousPage = computed(() => xhsSelectedPageIndex.value > 0);
const xhsHasNextPage = computed(() => (
  xhsSelectedPageIndex.value >= 0 && xhsSelectedPageIndex.value < xhsPages.value.length - 1
));

// ── Tab State ──
const activeTab = ref('editor');

// ── Editor Toolbar Pickers ──
const showTemplatePicker = ref(false);
const showTypoPicker = ref(false);
const showXhsSettings = ref(false);
const CARD_PICKER_BOUNDARY_SELECTOR = '.selection-card-popover, .markdown-input';
const showCardPicker = ref(false);
const cardTargetState = ref({ ok: true, existing: false, reason: '' });
const cardCategoryFilter = ref('all');
const cardMotionFilter = ref('all');
const cardPopoverPosition = ref({ left: 0, top: 0, side: 'right' });
const isMobileCardPopover = ref(window.innerWidth <= 768);
let cardPopoverResizeObserver = null;
let cardPopoverPositionFrame = 0;
let cardPopoverWindowResizeHandler = null;
let suppressCardPopoverEvents = false;

// ── Style Override (样式覆盖层，见 docs/STYLE-OVERRIDE-DESIGN.md) ──
const styleBrushMode = ref(false);
const brushSource = ref('');
const brushApplying = ref(false);
const styleTokenDefs = TOKEN_KEYS.map((key) => ({
  key,
  label: { accent: '主题色', body: '正文色', muted: '弱化色', line: '分割线色' }[key] || key
}));
const styleParamDefs = PARAM_DEFS;
const styleBoxDefs = BOX_DEFS;
const quotePresetOptions = [
  { value: 'theme', label: '跟随主题', meta: '默认引用样式' },
  { value: 'bar', label: '左线条', meta: '强调左边线' },
  { value: 'card', label: '底色卡片', meta: '浅色底+左线' },
  { value: 'top', label: '上边框', meta: '顶部粗线' }
];

// ── Cover Editor State ──
const coverTemplateId = ref('pure-white');
const coverBackgroundId = ref('midnight-prism');
const coverContent = reactive({
  tag: '技术分享',
  title: '用 AI 构建公众号封面工具',
  subtitle: '开箱即用，亦可自由迭代',
  author: 'AI产品零度',
  issueNumber: 'No.01'
});
const coverTypography = reactive({
  titleSize: 48,
  subtitleSize: 40,
  tagSize: 28,
  authorSize: 14,
  titleLineHeight: 1.3,
  subtitleLineHeight: 1.4,
  titleLetterSpacing: 0,
  subtitleLetterSpacing: 0,
  titleOffsetY: 0,
  subtitleOffsetY: 0,
  titleOffsetX: 0,
  subtitleOffsetX: 0,
  textAlign: 'center',
  titleFontFamily: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  subtitleFontFamily: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
});
const coverSansFallback = "'PingFang SC', 'Microsoft YaHei', sans-serif";
const coverSerifFallback = "'Songti SC', 'SimSun', serif";
const coverFontOptions = [
  { label: '系统默认', value: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { label: '思源黑体', value: `'Noto Sans SC', ${coverSansFallback}` },
  { label: '思源宋体', value: `'Noto Serif SC', ${coverSerifFallback}` },
  { label: '霞鹜文楷', value: `'LXGW WenKai', ${coverSansFallback}` },
  { label: 'ZCOOL 小薇', value: `'ZCOOL XiaoWei', ${coverSansFallback}` },
  { label: '站酷快乐体', value: `'ZCOOL KuaiLe', ${coverSansFallback}` },
  { label: '站酷庆黄油', value: `'ZCOOL QingKe HuangYou', ${coverSansFallback}` },
  { label: 'Ma Shan Zheng', value: `'Ma Shan Zheng', ${coverSansFallback}` },
  { label: '刘健毛草', value: `'Liu Jian Mao Cao', ${coverSansFallback}` },
  { label: '龙藏体', value: `'Long Cang', ${coverSansFallback}` },
  { label: 'Fraunces', value: `'Fraunces', 'Noto Serif SC', ${coverSerifFallback}` },
  { label: 'Plus Jakarta Sans', value: `'Plus Jakarta Sans', 'Noto Sans SC', ${coverSansFallback}` }
];
const coverUndoStack = ref([]);
const coverRedoStack = ref([]);
const coverLayerOrder = ref('text-top');
const coverOpacity = ref(100);
const coverIllustrationId = ref('');
const coverIllustCategory = ref('tech');
const coverIllustrationColor = ref('#6366F1');
const coverIllustrationSvg = ref(''); // cached SVG string
const coverSidebarCollapsed = ref(false);
const coverInlineEdit = reactive({
  active: false,
  field: null,
  value: '',
  x: 0, y: 0, width: 0, minHeight: 0,
  fontSize: '16px', fontFamily: 'inherit', fontWeight: 'normal',
  color: '#000', textAlign: 'center',
  letterSpacing: '0px', lineHeight: '1.3'
});

const coverFieldOffsets = reactive({
  tag: { x: 0, y: 0 },
  title: { x: 0, y: 0 },
  subtitle: { x: 0, y: 0 },
  author: { x: 0, y: 0 },
  issueNumber: { x: 0, y: 0 }
});

// Drag tracking (plain variable for performance during rapid mousemove)
let coverDrag = null;
const DRAG_THRESHOLD = 3;

const deviceGroups = [
  {
    label: 'Apple',
    devices: [
      { key: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', width: 440 },
      { key: 'iphone-17-air', name: 'iPhone 17 Air', width: 420 },
      { key: 'iphone-17-pro', name: 'iPhone 17 Pro', width: 402 },
      { key: 'iphone-17', name: 'iPhone 17', width: 402 },
      { key: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', width: 440 },
      { key: 'iphone-se', name: 'iPhone SE (3rd)', width: 375 }
    ]
  },
  {
    label: '小米 / Redmi',
    devices: [
      { key: 'xiaomi-17-pro-max', name: '小米 17 Pro Max', width: 412 },
      { key: 'xiaomi-17-pro', name: '小米 17 Pro', width: 407 },
      { key: 'xiaomi-17', name: '小米 17', width: 407 },
      { key: 'xiaomi-15-pro', name: '小米 15 Pro', width: 412 },
      { key: 'xiaomi-mix-fold4', name: '小米 MIX Fold 4 (展开)', width: 840 },
      { key: 'xiaomi-mix-flip2', name: '小米 MIX Flip 2', width: 400 }
    ]
  },
  {
    label: '华为',
    devices: [
      { key: 'huawei-mate80-pro', name: '华为 Mate 80 Pro', width: 427 },
      { key: 'huawei-mate70-pro-plus', name: '华为 Mate 70 Pro+', width: 412 },
      { key: 'huawei-mate70-pro', name: '华为 Mate 70 Pro', width: 412 },
      { key: 'huawei-mate70', name: '华为 Mate 70', width: 393 },
      { key: 'huawei-pura80-ultra', name: '华为 Pura 80 Ultra', width: 425 },
      { key: 'huawei-mate-x6', name: '华为 Mate X6 (展开)', width: 813 },
      { key: 'huawei-mate-xt', name: '华为 Mate XT 三折叠 (展开)', width: 864 }
    ]
  },
  {
    label: 'vivo',
    devices: [
      { key: 'vivo-x200-pro', name: 'vivo X200 Pro', width: 420 },
      { key: 'vivo-x200', name: 'vivo X200', width: 393 },
      { key: 'vivo-x-fold4', name: 'vivo X Fold 4 (展开)', width: 827 },
      { key: 'vivo-xflip2', name: 'vivo X Flip 2', width: 400 }
    ]
  },
  {
    label: 'OPPO',
    devices: [
      { key: 'oppo-find-x8-ultra', name: 'OPPO Find X8 Ultra', width: 412 },
      { key: 'oppo-find-x8-pro', name: 'OPPO Find X8 Pro', width: 412 },
      { key: 'oppo-find-n5', name: 'OPPO Find N5 (展开)', width: 827 },
      { key: 'oppo-find-n5-flip', name: 'OPPO Find N5 Flip', width: 400 }
    ]
  }
];

const deviceList = deviceGroups.flatMap(g => g.devices);

const selectedDeviceLabel = computed(() => {
  const device = deviceList.find(d => d.key === selectedDevice.value);
  return device ? device.name : '默认';
});

const mobilePreviewWidth = computed(() => {
  const device = deviceList.find(d => d.key === selectedDevice.value);
  return device ? device.width : 402;
});

function selectDevice(key) {
  selectedDevice.value = key;
  showDevicePicker.value = false;
}

const activePanel = ref(null);
const toastState = ref({ show: false, message: '', type: 'success' });
const sidebarOpen = ref(false);
const deleteConfirm = ref({ show: false, docId: null, docTitle: '' });

const wordCount = ref(0);
const charCount = ref(0);
const readTime = ref(0);
const lastSavedTime = ref('--');
const currentSaveState = ref('saved');

const editorWidth = ref(null);
const rightPanelWidth = ref(null);
const syncScrollEnabled = ref(true);
const codeBlockSettings = ref(getDefaultCodeBlockSettings());
const displaySettings = ref(getDefaultDisplaySettings());
const editorSelection = ref({ start: 0, end: 0, direction: 'none' });
const canUndo = ref(false);
const canRedo = ref(false);

/**
 * 主编辑器撤销/重做历史(自管理事务栈,覆盖智能粘贴、工具栏、图片插入等
 * 所有程序化写入路径,详见 core/edit-history.js)。
 */
const editorHistory = createEditHistory({
  getValue: () => getTextarea()?.value ?? markdownInput.value,
  getSelection: () => {
    const textarea = getTextarea();
    if (!textarea) return { start: 0, end: 0, direction: 'none' };
    return {
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? 0,
      direction: textarea.selectionDirection || 'none'
    };
  },
  apply: (value, selection) => {
    markdownInput.value = value;
    const end = Math.min(selection.end ?? selection.start ?? 0, value.length);
    const start = Math.min(selection.start ?? 0, end);
    restoreEditorSelection(start, end);
  },
  onChange: (state) => {
    canUndo.value = state.canUndo;
    canRedo.value = state.canRedo;
  }
});
const selectedCardTextLength = computed(() => Math.max(
  0,
  editorSelection.value.end - editorSelection.value.start
));
const filteredCardStyles = computed(() => CARD_STYLES.filter((card) => (
  (cardCategoryFilter.value === 'all' || card.category === cardCategoryFilter.value)
  && (cardMotionFilter.value === 'all'
    || (cardMotionFilter.value === 'animated') === Boolean(card.animated))
)));
const cardCategoryFilters = computed(() => [
  { value: 'all', label: '全部', count: CARD_STYLES.length },
  ...CARD_CATEGORIES.map((category) => ({
    value: category.id,
    label: category.name,
    count: CARD_STYLES.filter(({ category: categoryId }) => categoryId === category.id).length
  }))
]);
const cardMotionFilters = computed(() => [
  { value: 'all', label: '全部', count: CARD_STYLES.length },
  {
    value: 'static',
    label: '静态',
    count: CARD_STYLES.filter(({ animated }) => !animated).length
  },
  {
    value: 'animated',
    label: '动效',
    count: CARD_STYLES.filter(({ animated }) => animated).length
  }
]);
const cardPopoverStyle = computed(() => isMobileCardPopover.value
  ? { left: '12px', right: '12px', bottom: '12px' }
  : {
      left: `${cardPopoverPosition.value.left}px`,
      top: `${cardPopoverPosition.value.top}px`
    });

const categorizedThemes = ref(getCategorizedThemes());
const codeThemeList = getCodeThemeList();
// 字号档位：以 14px 为 1.0x 基准（推荐），其余档位按 14px 折算（value = px / 14）
// 与 storage/preferences.js 的 FONT_SCALE_VALUES 保持一致
const fontScaleOptions = [
  { label: '更小', value: 12 / 14, meta: '12px · 0.86x' },
  { label: '稍小', value: 13 / 14, meta: '13px · 0.93x' },
  { label: '推荐', value: 1, meta: '14px · 1.0x' },
  { label: '稍大', value: 15 / 14, meta: '15px · 1.07x' },
  { label: '更大', value: 16 / 14, meta: '16px · 1.14x' },
  { label: '超大', value: 17 / 14, meta: '17px · 1.21x' },
  { label: '最大', value: 18 / 14, meta: '18px · 1.29x' }
];
const fontFamilyOptions = [
  { label: '跟随模板', value: 'theme', meta: '保留风格' },
  { label: '非衬线', value: 'sans', meta: '现代清晰' },
  { label: '衬线', value: 'serif', meta: '长文质感' },
  { label: '等宽', value: 'mono', meta: '技术文档' }
];
const lineHeightOptions = [
  { label: '跟随模板', value: 'theme', meta: '模板内置' },
  { label: '紧凑', value: 1.5, meta: '1.5 倍' },
  { label: '标准', value: 1.75, meta: '1.75 倍 · 推荐' },
  { label: '舒展', value: 2, meta: '2.0 倍' }
];
const letterSpacingOptions = [
  { label: '跟随模板', value: 'theme', meta: '模板内置' },
  { label: '无间距', value: 0, meta: '0px' },
  { label: '清晰', value: 1, meta: '1px' },
  { label: '标准', value: 1.5, meta: '1.5px · 推荐' },
  { label: '宽松', value: 2, meta: '2px' }
];
const contentPaddingOptions = [
  { label: '跟随模板', value: 'theme', meta: '模板内置' },
  { label: '紧凑', value: 5, meta: '左右 5px' },
  { label: '标准', value: 10, meta: '左右 10px · 推荐' },
  { label: '舒展', value: 16, meta: '左右 16px' }
];
const imageStyleModeOptions = [
  { label: '默认', value: 'theme', meta: '跟随主题' },
  { label: '自定义', value: 'custom', meta: '覆盖样式' }
];
const imageEffectOptions = [
  { label: '跟随主题', value: 'theme', meta: '模板内置' },
  { label: '干净', value: 'clean', meta: '无边框' },
  { label: '柔影', value: 'soft-shadow', meta: '轻阴影' },
  { label: '纸面', value: 'paper', meta: '白边纸感' },
  { label: '拍立得', value: 'polaroid', meta: '宽白边' },
  { label: '大圆角', value: 'rounded', meta: '柔和卡片' },
  { label: '圆形', value: 'circle', meta: '头像/Logo' },
  { label: '细边框', value: 'bordered', meta: '产品截图' },
  { label: '通栏', value: 'bleed', meta: '沉浸图片' },
  { label: '黑白', value: 'mono', meta: '纪实质感' }
];
const endStyleOptions = [
  { label: '跟随主题', value: 'theme', meta: '模板内置' },
  { label: '经典', value: 'classic', meta: '— END —' },
  { label: '极光', value: 'aurora', meta: '流光渐变' },
  { label: '脉冲', value: 'pulse', meta: '雷达光环' },
  { label: '扫描', value: 'scan', meta: '光束划过' },
  { label: '星轨', value: 'orbit', meta: '环绕运行' },
  { label: '霓虹', value: 'neon', meta: '灯牌闪烁' },
  { label: '像素', value: 'pixel', meta: '逐格点亮' },
  { label: '灵晕', value: 'breathe', meta: '涟漪光晕' },
  { label: '频谱', value: 'equalizer', meta: '声浪跳动' },
  { label: '数据流', value: 'datastream', meta: '码流明灭' },
  { label: '粒子', value: 'particle', meta: '星火升腾' },
  { label: '全息', value: 'holo', meta: '幻彩流转' }
];
const imageRadiusModeOptions = [
  { label: '圆角', value: 'px' },
  { label: '圆形', value: 'circle' }
];

const toast = createToast(() => { toastState.value = toast.getState(); });
const panelManager = createPanelManager(() => { activePanel.value = panelManager.getActivePanel(); });

let md = null;
let imageStore = null;
let imageCompressor = null;
let turndownService = null;
let pasteHandler = null;
let suppressEditorSync = false;
let suppressTitleSync = false;
let syncLock = false;

const filteredDocuments = computed(() => {
  const keyword = documentSearch.value.trim().toLowerCase();

  return [...documents.value]
    .filter((doc) => {
      if (!keyword) return true;
      const haystack = [
        doc.manualTitle,
        extractMarkdownTitle(doc.content),
        doc.content
      ].join('\n').toLowerCase();
      return haystack.includes(keyword);
    })
    .sort((a, b) => {
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.createdAt - b.createdAt;
    });
});

const isImageStyleCustom = computed(() => displaySettings.value.imageStyleMode === 'custom');

const tocItems = computed(() => {
  if (!renderedContent.value) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(renderedContent.value, 'text/html');

  return Array.from(doc.querySelectorAll('h1, h2, h3'))
    .map((heading) => ({
      id: heading.getAttribute('id') || '',
      level: Number(heading.tagName.slice(1)),
      text: (heading.textContent || '').trim()
    }))
    .filter((item) => item.id && item.text);
});

function createDocumentId(prefix = 'doc') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractMarkdownTitle(content) {
  const match = (content || '').match(/^\s*#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : '';
}

function getUntitledIndex(list = documents.value) {
  let maxIndex = 0;
  const pattern = new RegExp(`^${UNTITLED_PREFIX}\\s+(\\d+)$`);

  list.forEach((doc) => {
    const displayTitle = (doc.manualTitle || doc.title || '').trim();
    const match = displayTitle.match(pattern);
    if (match) {
      maxIndex = Math.max(maxIndex, Number(match[1]));
    }
  });

  return maxIndex + 1;
}

function getUntitledTitle(list = documents.value) {
  return `${UNTITLED_PREFIX} ${getUntitledIndex(list)}`;
}

function buildDocument({
  id = createDocumentId(),
  manualTitle = '',
  title = '',
  content = '',
  createdAt = Date.now(),
  updatedAt = createdAt,
  sortOrder = documents.value.length,
  dirty = false,
  xhs = createDefaultXhsSettings(),
  styleOverride = {}
} = {}) {
  return {
    id,
    manualTitle,
    title,
    content,
    createdAt,
    updatedAt,
    sortOrder,
    dirty,
    xhs: normalizeXhsSettings(xhs),
    styleOverride: normalizeStyleOverride(styleOverride)
  };
}

function getActiveDocument() {
  return documents.value.find((doc) => doc.id === activeDocumentId.value) || null;
}

function resolveDocumentDisplayTitle(doc) {
  if (!doc) return UNTITLED_PREFIX;
  return doc.manualTitle?.trim() || extractMarkdownTitle(doc.content) || doc.title?.trim() || UNTITLED_PREFIX;
}

function sanitizeFilename(name) {
  return (name || 'article')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'article';
}

function formatDateTime(timestamp) {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })}`;
}

function formatFullDateTime(timestamp) {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })}`;
}

function getSaveStateLabel() {
  return {
    saving: '保存中',
    saved: '已保存',
    error: '保存失败'
  }[currentSaveState.value];
}

function getSaveStateClass() {
  return `status-${currentSaveState.value}`;
}

function syncEditorFromActiveDocument() {
  const activeDoc = getActiveDocument();
  suppressEditorSync = true;
  suppressTitleSync = true;
  markdownInput.value = activeDoc ? activeDoc.content : '';
  editorHistory.reset(markdownInput.value);
  currentDocumentTitle.value = activeDoc ? (activeDoc.manualTitle || '') : '';
  editorSelection.value = { start: 0, end: 0 };
  updateStats();
  scheduleXhsPagination(0);
}

function markCurrentDocumentDirty() {
  const activeDoc = getActiveDocument();
  if (!activeDoc) return;
  activeDoc.updatedAt = Date.now();
  activeDoc.dirty = true;
  currentSaveState.value = 'saving';
}

function buildSavePayload() {
  const activeDoc = getActiveDocument();
  return {
    currentStyle: currentStyle.value,
    content: activeDoc ? activeDoc.content : markdownInput.value,
    documents: documents.value,
    activeDocumentId: activeDocumentId.value,
    codeBlockSettings: codeBlockSettings.value,
    tocVisible: tocVisible.value,
    displaySettings: displaySettings.value
  };
}

function handleSaveSuccess(payload = null) {
  const documentId = payload?.activeDocumentId || activeDocumentId.value;
  const savedDoc = documents.value.find((doc) => doc.id === documentId);
  if (savedDoc) savedDoc.dirty = false;
  currentSaveState.value = 'saved';
  lastSavedTime.value = formatFullDateTime(Date.now());
}

function handleSaveError() {
  currentSaveState.value = 'error';
}

function persistDocumentState() {
  const success = savePreferences(
    currentStyle.value,
    getActiveDocument()?.content || markdownInput.value,
    documents.value,
    activeDocumentId.value,
    codeBlockSettings.value,
    tocVisible.value,
    displaySettings.value
  );

  if (success) {
    handleSaveSuccess();
  } else {
    handleSaveError();
  }

  return success;
}

function schedulePersistDocumentState() {
  debounceSaveContent(buildSavePayload(), 5000, {
    onSuccess: handleSaveSuccess,
    onError: handleSaveError
  });
}

// ── XHS Image Mode ─────────────────────────────────────────────
const activeXhsSettings = computed(() => getActiveDocument()?.xhs || createDefaultXhsSettings());

function deepMergeXhsSettings(current, patch) {
  const base = normalizeXhsSettings(current);
  const next = patch && typeof patch === 'object' ? patch : {};
  return {
    ...base,
    ...(next.themeId !== undefined ? { themeId: next.themeId } : {}),
    ...(next.density !== undefined ? { density: next.density } : {}),
    ...(next.tocEnabled !== undefined ? { tocEnabled: next.tocEnabled } : {}),
    footer: { ...base.footer, ...(next.footer || {}) },
    cover: {
      ...base.cover,
      ...(next.cover || {}),
      focalPoint: { ...base.cover.focalPoint, ...(next.cover?.focalPoint || {}) }
    }
  };
}

function updateActiveXhsSettings(patch) {
  const doc = getActiveDocument();
  if (!doc) return;
  doc.xhs = normalizeXhsSettings(deepMergeXhsSettings(doc.xhs, patch));
  markCurrentDocumentDirty();
  schedulePersistDocumentState();
  scheduleXhsPagination(0);
}

function getXhsMeasureStage() {
  if (xhsMeasureStageEl) return xhsMeasureStageEl;
  xhsMeasureStageEl = document.createElement('div');
  xhsMeasureStageEl.className = 'xhs-measure-stage';
  xhsMeasureStageEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(xhsMeasureStageEl);
  return xhsMeasureStageEl;
}

function resolveXhsPreviewUrl(ref) {
  if (!ref) return Promise.resolve(null);
  if (ref.startsWith('img://')) {
    const id = ref.slice('img://'.length);
    if (xhsPreviewUrlCache.has(ref)) return Promise.resolve(xhsPreviewUrlCache.get(ref));
    return imageStore.getImageBlob(id)
      .then((blob) => {
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        xhsPreviewUrlCache.set(ref, url);
        return url;
      })
      .catch(() => null);
  }
  // http(s)/data: load directly in the preview; CORS is only enforced at export
  return Promise.resolve(ref);
}

function revokeXhsPreviewUrls() {
  for (const url of xhsPreviewUrlCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch (_error) {
      // ignore
    }
  }
  xhsPreviewUrlCache.clear();
}

async function hydrateXhsMediaRoot(root) {
  if (!root) return;
  const targets = Array.from(root.querySelectorAll('[data-media-ref]'));
  await Promise.all(targets.map(async (element) => {
    const ref = element.getAttribute('data-media-ref');
    const url = await resolveXhsPreviewUrl(ref);
    if (url) element.setAttribute('src', url);
  }));
}

async function buildXhsPages(markdown, settings) {
  if (!md) return { pages: [], meta: { title: '', summary: '' }, images: [], issues: [{ code: 'pagination-failed', pageIndex: 0, message: '编辑器尚未就绪，请稍后重试。', blockId: null }] };
  const parsed = parseXhsDocument(markdown, md);
  const measurer = createXhsDomMeasurer(getXhsMeasureStage(), settings, {
    hydrateMedia: (root) => hydrateXhsMediaRoot(root)
  });
  try {
    const pages = await paginateXhsDocument(parsed, settings, {
      fits: (blocks) => measurer.fits(blocks),
      measure: (blocks) => measurer.measure(blocks)
    });
    return { pages, meta: parsed.meta, images: parsed.images, issues: [] };
  } catch (error) {
    return {
      pages: [],
      meta: parsed.meta,
      images: parsed.images,
      issues: [{
        code: error.code || 'pagination-failed',
        pageIndex: 0,
        message: error.message || '分页失败',
        blockId: error.blockId || null
      }]
    };
  } finally {
    measurer.destroy();
  }
}

async function refreshXhsCoverCandidates(images) {
  const candidates = [...(images || [])];
  const currentCoverRef = activeXhsSettings.value.cover.imageRef;
  if (currentCoverRef && !candidates.some((image) => image.src === currentCoverRef)) {
    candidates.unshift({ src: currentCoverRef, alt: '自定义封面' });
  }
  const hydrated = await Promise.all(candidates.map(async (image) => ({
    ...image,
    url: await resolveXhsPreviewUrl(image.src)
  })));
  xhsCoverCandidates.value = hydrated;
}

function setXhsPreviewMode(mode) {
  xhsPreviewMode.value = normalizeXhsPreviewMode(mode);
  nextTick(() => {
    setupXhsPreviewObserver();
    selectXhsPage(xhsSelectedPageId.value, { behavior: 'auto' });
  });
}

function selectXhsPage(pageId, { scroll = true, behavior = 'smooth' } = {}) {
  const selection = resolveXhsPageSelection(
    xhsPages.value,
    pageId,
    xhsSelectedPageIndex.value
  );
  xhsSelectedPageId.value = selection.page?.id || null;
  if (!scroll || !selection.page) return;

  nextTick(() => {
    const shell = document.querySelector(`.xhs-card-shell[data-page-id="${CSS.escape(selection.page.id)}"]`);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    shell?.scrollIntoView({
      behavior: reducedMotion && behavior === 'smooth' ? 'auto' : behavior,
      block: 'nearest',
      inline: xhsPreviewMode.value === 'horizontal' ? 'center' : 'nearest'
    });
  });
}

function moveXhsSelectedPage(delta) {
  const selection = stepXhsPageSelection(
    xhsPages.value,
    xhsSelectedPageId.value,
    delta
  );
  if (selection.page) selectXhsPage(selection.page.id);
}

function handleXhsPreviewKeydown(event) {
  if (xhsPreviewMode.value !== 'horizontal') return;
  if (event.target !== event.currentTarget && event.target?.closest?.('button, a, input, select, textarea')) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  moveXhsSelectedPage(event.key === 'ArrowLeft' ? -1 : 1);
}

function syncXhsSelectedPageFromRail(rail) {
  if (!rail || xhsPreviewMode.value !== 'horizontal') return;
  const railRect = rail.getBoundingClientRect();
  const railCenter = railRect.left + railRect.width / 2;
  let closestShell = null;
  let closestDistance = Infinity;

  for (const shell of rail.querySelectorAll('.xhs-card-shell')) {
    const rect = shell.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - railCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestShell = shell;
    }
  }

  if (closestShell?.dataset.pageId) {
    xhsSelectedPageId.value = closestShell.dataset.pageId;
  }
}

function handleXhsRailScroll(event) {
  if (xhsPreviewMode.value !== 'horizontal') return;
  const rail = event.currentTarget;
  clearTimeout(xhsScrollSelectionTimer);
  xhsScrollSelectionTimer = setTimeout(() => {
    syncXhsSelectedPageFromRail(rail);
  }, 100);
}

function restoreSelectedXhsPage(fallbackIndex = 0) {
  const selection = resolveXhsPageSelection(
    xhsPages.value,
    xhsSelectedPageId.value,
    fallbackIndex
  );
  xhsSelectedPageId.value = selection.page?.id || null;
  if (selection.page) {
    selectXhsPage(selection.page.id, { behavior: 'auto' });
  }
}

function scheduleXhsPagination(delay = 450) {
  clearTimeout(xhsPaginationTimer);
  if (contentOutputMode.value !== 'image') return;
  xhsIsPaginating.value = true;
  const revision = ++xhsPaginationRevision;
  xhsPaginationTimer = setTimeout(async () => {
    const previousSelectedIndex = xhsSelectedPageIndex.value;
    const result = await buildXhsPages(markdownInput.value, activeXhsSettings.value);
    if (revision !== xhsPaginationRevision) return;
    xhsPages.value = result.pages;
    xhsRenderedPages.value = renderXhsStack(result.pages, activeXhsSettings.value, { meta: result.meta });
    xhsIssues.value = result.issues;
    const summary = summarizeXhsPages(result.pages);
    xhsWarning.value = result.pages.length > XHS_UPLOAD_WARNING_LIMIT
      ? `当前共 ${result.pages.length} 张，可能超出当前客户端单篇上传能力，建议拆分为系列内容。仍可完整导出。`
      : summary.needsSeriesSuggestion
        ? `当前共 ${result.pages.length} 张，为了更好的滑动阅读体验，建议按章节拆成系列内容。仍可完整导出。`
        : '';
    xhsExportErrorPageIndexes.value = [];
    xhsIsPaginating.value = false;
    await refreshXhsCoverCandidates(result.images);
    await nextTick();
    setupXhsPreviewObserver();
    await hydrateXhsMediaRoot(document.querySelector('.xhs-image-stack'));
    restoreSelectedXhsPage(previousSelectedIndex);
  }, delay);
}

function setupXhsPreviewObserver() {
  teardownXhsPreviewObserver();
  const container = document.querySelector('.xhs-image-stack');
  if (!container || typeof ResizeObserver === 'undefined') return;
  const update = () => {
    const reservedWidth = xhsPreviewMode.value === 'horizontal'
      ? Math.min(112, Math.max(48, container.clientWidth * 0.18))
      : 32;
    const containerStyle = getComputedStyle(container);
    const shellStyle = getComputedStyle(container.querySelector('.xhs-card-shell'));
    const reservedHeight = ['paddingTop', 'paddingBottom']
      .reduce((total, key) => total + (parseFloat(containerStyle[key]) || 0), 0)
      + ['paddingTop', 'paddingBottom']
        .reduce((total, key) => total + (parseFloat(shellStyle[key]) || 0), 0);
    xhsPreviewScale.value = calculateXhsPreviewScale({
      mode: xhsPreviewMode.value,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
      reservedWidth,
      reservedHeight
    });
  };
  xhsPreviewObserver = new ResizeObserver(update);
  xhsPreviewObserver.observe(container);
  update();
}

function teardownXhsPreviewObserver() {
  if (xhsPreviewObserver) {
    xhsPreviewObserver.disconnect();
    xhsPreviewObserver = null;
  }
}

function setContentOutputMode(mode) {
  if (mode !== 'text' && mode !== 'image') return;
  showXhsSettings.value = false;
  contentOutputMode.value = mode;
  if (mode === 'image') {
    nextTick(() => {
      setupXhsPreviewObserver();
      scheduleXhsPagination(0);
    });
  } else {
    teardownXhsPreviewObserver();
    clearTimeout(xhsPaginationTimer);
    clearTimeout(xhsScrollSelectionTimer);
    xhsIsPaginating.value = false;
    xhsWarning.value = '';
    xhsShowCoverPanel.value = false;
    revokeXhsPreviewUrls();
    xhsCoverCandidates.value = [];
  }
}

function insertXhsPageAtCursor() {
  const result = insertPageMarker(markdownInput.value, editorSelection.value.start);
  editorHistory.programmatic();
  markdownInput.value = result.markdown;
  nextTick(() => getTextarea()?.focus());
}

function insertXhsPageBeforeBlock(blockId) {
  const block = xhsPages.value.flatMap((page) => page.blocks).find((item) => item.id === blockId);
  if (!block) return;
  editorHistory.programmatic();
  markdownInput.value = insertPageMarker(markdownInput.value, block.sourceStart).markdown;
}

function removeXhsPageMarker(markerStart) {
  editorHistory.programmatic();
  markdownInput.value = removePageMarker(markdownInput.value, markerStart).markdown;
}

function selectXhsCoverImage(ref) {
  updateActiveXhsSettings({ cover: { imageRef: ref } });
}

function clearXhsCoverImage() {
  updateActiveXhsSettings({ cover: { imageRef: null } });
}

function updateXhsFocalPoint(x, y) {
  updateActiveXhsSettings({ cover: { focalPoint: { x, y } } });
}

function markXhsExportErrors(issues) {
  console.error('[xhs] export blocked:', issues.map((issue) => `${issue.pageIndex}:${issue.code}:${issue.blockId || '-'}`).join(', '));
  xhsExportErrorPageIndexes.value = issues.map((issue) => issue.pageIndex).filter((index) => index != null);
  const first = issues[0];
  if (first) {
    toast.show(first.message || '导出失败', 'error', 6000);
  }
}

function firstBlockId(page) {
  return page.blocks[0]?.id || null;
}

function coverThumbUrl(ref) {
  return xhsCoverCandidates.value.find((candidate) => candidate.src === ref)?.url || '';
}

async function exportSingleXhsPage(pageId) {
  const page = xhsPages.value.find((item) => item.id === pageId);
  if (!page) return;
  const card = document.querySelector(`.xhs-card[data-page-id="${CSS.escape(pageId)}"]`);
  if (!card) return;
  xhsExportErrorPageIndexes.value = [];
  xhsExporting.value = true;
  try {
    const result = await exportXhsPage(card, page, {
      validateRuntime: { imageStore },
      rasterizeOptions: { mediaOptions: { imageStore } }
    });
    if (!result.ok) {
      markXhsExportErrors(result.issues);
      return;
    }
    toast.show(`已导出第 ${page.pageNumber} 张图片`, 'success');
  } catch (error) {
    toast.show(error.message || '单页导出失败', 'error');
  } finally {
    xhsExporting.value = false;
  }
}

async function exportAllXhsPages() {
  const cards = Array.from(document.querySelectorAll('.xhs-image-stack .xhs-card'));
  if (!cards.length) return;
  xhsExportErrorPageIndexes.value = [];
  xhsExporting.value = true;
  const doc = getActiveDocument();
  const title = resolveDocumentDisplayTitle(doc);
  try {
    const result = await exportXhsSet(cards, { articleTitle: title }, {
      validateRuntime: { imageStore },
      rasterizeOptions: { mediaOptions: { imageStore } }
    });
    if (!result.ok) {
      markXhsExportErrors(result.issues);
      return;
    }
    toast.show(`已导出 ${cards.length} 张图片${result.warning ? '（' + result.warning + '）' : ''}`, 'success', 6000);
  } catch (error) {
    toast.show(error.message || '整组导出失败', 'error');
  } finally {
    xhsExporting.value = false;
  }
}

function updateStats() {
  const text = markdownInput.value;
  if (!text) {
    wordCount.value = 0;
    charCount.value = 0;
    readTime.value = 0;
    return;
  }

  charCount.value = text.length;
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ').split(/\s+/).filter(Boolean).length;
  const total = chineseChars + englishWords;
  wordCount.value = total;
  readTime.value = Math.max(1, Math.ceil(total / 300));
}

function getResolvedCodeTheme() {
  return resolveCodeTheme(currentCodeTheme.value);
}

function toggleToc() {
  tocVisible.value = !tocVisible.value;
  persistDocumentState();
}

function scrollToTocHeading(id) {
  if (!id) return;

  nextTick(() => {
    const preview = document.querySelector('.preview-content');
    const heading = document.getElementById(id);
    if (!preview || !heading) return;

    const previewRect = preview.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const offset = headingRect.top - previewRect.top + preview.scrollTop - 16;
    preview.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
  });
}

async function renderMarkdown() {
  if (!markdownInput.value.trim()) {
    renderedContent.value = '';
    return;
  }
  if (!md) return;

  const styleConfig = STYLES[currentStyle.value];
  if (!styleConfig) return;

  try {
    renderedContent.value = await renderPipeline({
      markdown: markdownInput.value,
      md,
      imageStore,
      styleConfig,
      styleOverride: getActiveDocument()?.styleOverride,
      codeTheme: getResolvedCodeTheme(),
      displaySettings: displaySettings.value
    });
  } catch (error) {
    console.error('渲染失败:', error);
  }
}

function sortDocumentsByCurrentOrder() {
  documents.value.forEach((doc, index) => {
    doc.sortOrder = index;
  });
}

function ensureActiveDocument() {
  if (documents.value.length === 0) {
    const doc = buildDocument({ title: getUntitledTitle([]), content: loadDefaultExample() });
    documents.value = [doc];
    activeDocumentId.value = doc.id;
  }

  if (!documents.value.some((doc) => doc.id === activeDocumentId.value)) {
    activeDocumentId.value = documents.value[0]?.id || null;
  }
}

function switchDocument(documentId) {
  if (!documentId || documentId === activeDocumentId.value) return;
  persistDocumentState();
  activeDocumentId.value = documentId;
  syncEditorFromActiveDocument();
  renderMarkdown();
  scheduleXhsPagination(0);
}

function createNewDocument(content = '', manualTitle = '', extra = {}) {
  const doc = buildDocument({
    manualTitle,
    title: manualTitle || getUntitledTitle(),
    content,
    sortOrder: documents.value.length,
    ...(extra || {})
  });

  documents.value.push(doc);
  sortDocumentsByCurrentOrder();
  activeDocumentId.value = doc.id;
  syncEditorFromActiveDocument();
  persistDocumentState();
  return doc;
}

function renameDocument(documentId) {
  if (documentId !== activeDocumentId.value) {
    switchDocument(documentId);
  }

  nextTick(() => {
    const input = document.querySelector('.document-title-input');
    input?.focus();
    input?.select();
  });
}

function duplicateDocument(documentId) {
  const source = documents.value.find((doc) => doc.id === documentId);
  if (!source) return;

  const duplicateTitle = `${resolveDocumentDisplayTitle(source)} 副本`;
  const doc = buildDocument({
    manualTitle: duplicateTitle,
    title: duplicateTitle,
    content: source.content,
    sortOrder: documents.value.length,
    xhs: source.xhs
  });

  documents.value.push(doc);
  sortDocumentsByCurrentOrder();
  activeDocumentId.value = doc.id;
  syncEditorFromActiveDocument();
  persistDocumentState();
}

function deleteDocument(documentId) {
  const target = documents.value.find((doc) => doc.id === documentId);
  if (!target) return;

  deleteConfirm.value = {
    show: true,
    docId: documentId,
    docTitle: resolveDocumentDisplayTitle(target)
  };
}

function showDeleteConfirm(doc) {
  if (!doc?.id) return;
  const target = documents.value.find((item) => item.id === doc.id);
  if (!target) return;

  deleteConfirm.value = {
    show: true,
    docId: target.id,
    docTitle: resolveDocumentDisplayTitle(target)
  };
}

function cancelDelete() {
  deleteConfirm.value = { show: false, docId: null, docTitle: '' };
}

function confirmDelete() {
  const docId = deleteConfirm.value.docId;
  if (!docId) {
    cancelDelete();
    return;
  }

  const sorted = filteredDocuments.value;
  const currentIndex = sorted.findIndex((doc) => doc.id === docId);
  const nextCandidate = sorted[currentIndex + 1] || sorted[currentIndex - 1] || documents.value.find((doc) => doc.id !== docId);

  documents.value = documents.value.filter((doc) => doc.id !== docId);

  if (documents.value.length === 0) {
    const fallbackDoc = buildDocument({
      title: getUntitledTitle([]),
      manualTitle: '',
      content: '',
      sortOrder: 0
    });
    documents.value = [fallbackDoc];
    activeDocumentId.value = fallbackDoc.id;
  } else {
    activeDocumentId.value = nextCandidate?.id || activeDocumentId.value;
    ensureActiveDocument();
  }

  sortDocumentsByCurrentOrder();
  syncEditorFromActiveDocument();
  persistDocumentState();

  cancelDelete();
}

function moveDocument(documentId, direction) {
  const ordered = filteredDocuments.value;
  const index = ordered.findIndex((doc) => doc.id === documentId);
  if (index < 0) return;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= ordered.length) return;

  const currentDoc = ordered[index];
  const swapDoc = ordered[swapIndex];

  const currentOrder = currentDoc.sortOrder;
  currentDoc.sortOrder = swapDoc.sortOrder;
  swapDoc.sortOrder = currentOrder;

  documents.value = [...documents.value];
  persistDocumentState();
}

async function handleImageUpload(file, textarea, { insert = true } = {}) {
  if (!file.type.startsWith('image/')) {
    toast.show('请上传图片文件', 'error');
    return null;
  }

  if (file.size > 10 * 1024 * 1024) {
    toast.show('图片大小不能超过 10MB', 'error');
    return null;
  }

  const imageName = file.name.replace(/\.[^/.]+$/, '') || '图片';
  const originalSize = file.size;

  try {
    toast.show('正在压缩图片...', 'success');
    const compressedBlob = await imageCompressor.compress(file);
    const compressedSize = compressedBlob.size;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(0);
    const imageId = createDocumentId('img');

    await imageStore.saveImage(imageId, compressedBlob, {
      name: imageName,
      originalName: file.name,
      originalSize,
      compressedSize,
      compressionRatio,
      mimeType: compressedBlob.type || file.type
    });

    const imageRef = `img://${imageId}`;
    if (insert) {
      const markdownImage = `![${imageName}](${imageRef})`;
      insertAtCursor(markdownImage, {
        textarea,
        selectionStart: markdownImage.length
      });
    }

    if (compressionRatio > 10) {
      toast.show(`已保存 (${ImageCompressor.formatSize(originalSize)} → ${ImageCompressor.formatSize(compressedSize)})`, 'success');
    } else {
      toast.show(`已保存 (${ImageCompressor.formatSize(compressedSize)})`, 'success');
    }
    return imageRef;
  } catch (error) {
    console.error('图片处理失败:', error);
    toast.show(`图片处理失败: ${error.message}`, 'error');
    return null;
  }
}

function initPasteHandler() {
  turndownService = createTurndownService();
  pasteHandler = createPasteHandler({
    turndownService,
    handleImageUpload,
    showToast: (message, type) => toast.show(message, type),
    getInput: () => markdownInput.value,
    setInput: (value) => {
      editorHistory.programmatic();
      markdownInput.value = value;
    },
    nextTick
  });
}

async function onPaste(event) {
  if (pasteHandler) {
    await pasteHandler(event);
  }
}

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  isDraggingOver.value = false;

  const file = event.dataTransfer.files[0];
  if (!file) return;

  if (file.type.startsWith('image/')) {
    handleImageUpload(file, event.target);
  } else {
    toast.show('仅支持拖拽图片文件', 'error');
  }
}

function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = 'copy';
  isDraggingOver.value = true;
}

function handleDragEnter(event) {
  event.preventDefault();
  isDraggingOver.value = true;
}

function handleDragLeave(event) {
  event.preventDefault();
  if (event.target.classList.contains('markdown-input')) {
    isDraggingOver.value = false;
  }
}

function getDirectoryUploadEntries(fileList) {
  return Array.from(fileList || []).map((file) => {
    const rawPath = file.webkitRelativePath || file.name;
    const segments = rawPath.split('/').filter(Boolean);
    const path = segments.length > 1 ? segments.slice(1).join('/') : file.name;
    return { path, file };
  });
}

function getRootMarkdownCandidates(entries, source) {
  return entries
    .filter(({ path }) => !path.includes('/') && /\.(md|markdown)$/i.test(path))
    .map(({ path, file }) => ({ name: path, getFile: async () => file, source }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

async function getDirectoryHandleCandidates(directoryHandle) {
  const source = createDirectoryFileSource(directoryHandle);
  const candidates = [];

  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind === 'file' && /\.(md|markdown)$/i.test(name)) {
      candidates.push({ name, getFile: () => handle.getFile(), source });
    }
  }

  return candidates.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

function showMarkdownCandidates(candidates, supplementalInput) {
  if (candidates.length === 0) {
    toast.show('所选目录根层没有 Markdown 文件', 'error');
    return;
  }

  if (candidates.length === 1) {
    importMarkdownCandidate(candidates[0], supplementalInput);
    return;
  }

  pendingMarkdownImports = candidates.map((candidate) => ({ ...candidate, supplementalInput }));
  markdownImportDialog.names = candidates.map((candidate) => candidate.name);
  markdownImportDialog.selectedIndex = 0;
  markdownImportDialog.show = true;
}

async function startMarkdownImport(directoryInput, supplementalInput) {
  if (typeof globalThis.showDirectoryPicker !== 'function') {
    directoryInput.value = '';
    directoryInput.click();
    return;
  }

  try {
    const directoryHandle = await globalThis.showDirectoryPicker({ mode: 'read' });
    showMarkdownCandidates(await getDirectoryHandleCandidates(directoryHandle), supplementalInput);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error('读取文章目录失败:', error);
      toast.show(`读取文章目录失败: ${error.message}`, 'error');
    }
  }
}

function handleMarkdownDirectoryUpload(event, supplementalInput) {
  const entries = getDirectoryUploadEntries(event.target.files);
  const source = createFileMapSource(entries);

  showMarkdownCandidates(getRootMarkdownCandidates(entries, source), supplementalInput);
  event.target.value = '';
}

function startMarkdownFileImport(fileInput) {
  fileInput.value = '';
  fileInput.click();
}

async function handleMarkdownFileUpload(event, supplementalInput) {
  const files = Array.from(event.target.files || []).filter((file) => /\.(md|markdown)$/i.test(file.name));
  event.target.value = '';

  if (files.length === 0) {
    if (event.target.files && event.target.files.length > 0) {
      toast.show('未选择 Markdown 文件', 'error');
    }
    return;
  }

  for (const file of files) {
    await importMarkdownCandidate(
      { name: file.name, getFile: async () => file, source: null, skipSourcePrompt: true },
      supplementalInput
    );
  }
}

function cancelMarkdownImport() {
  markdownImportDialog.show = false;
  markdownImportDialog.names = [];
  markdownImportDialog.selectedIndex = 0;
  pendingMarkdownImports = [];
}

function confirmMarkdownImport() {
  const candidate = pendingMarkdownImports[markdownImportDialog.selectedIndex];
  if (!candidate) {
    cancelMarkdownImport();
    return;
  }

  cancelMarkdownImport();
  importMarkdownCandidate(candidate, candidate.supplementalInput);
}

function chooseSupplementalDirectory(directoryInput) {
  if (typeof globalThis.showDirectoryPicker === 'function') {
    return globalThis.showDirectoryPicker({ mode: 'read' })
      .then((handle) => createDirectoryFileSource(handle))
      .catch((error) => {
        if (error?.name === 'AbortError') return null;
        throw error;
      });
  }

  if (!directoryInput) return Promise.resolve(null);

  return new Promise((resolve) => {
    pendingSupplementalDirectoryResolve = resolve;
    directoryInput.value = '';
    directoryInput.click();
  });
}

function handleSupplementalDirectoryUpload(event) {
  const resolve = pendingSupplementalDirectoryResolve;
  pendingSupplementalDirectoryResolve = null;
  if (!resolve) return;

  const entries = getDirectoryUploadEntries(event.target.files);
  event.target.value = '';
  resolve(entries.length > 0 ? createFileMapSource(entries) : null);
}

function cancelSupplementalDirectoryUpload() {
  const resolve = pendingSupplementalDirectoryResolve;
  pendingSupplementalDirectoryResolve = null;
  if (resolve) resolve(null);
}

async function readMarkdownFile(file) {
  if (typeof file.text === 'function') return file.text();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result || '');
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

async function importMarkdownCandidate(candidate, supplementalInput) {
  let file;
  let content;
  try {
    file = await candidate.getFile();
    content = await readMarkdownFile(file);
  } catch (_error) {
    toast.show('文件读取失败', 'error');
    return;
  }

  // 解析 opengzh front matter（文档级样式覆盖随 MD 文件往返）
  const parsed = parseStyleFrontMatter(content);
  const bodyContent = parsed.content;
  const docExtra = { styleOverride: parsed.styleOverride || {} };

  const fileTitle = file.name.replace(/\.(md|markdown)$/i, '');
  if (!imageStore) {
    createNewDocument(bodyContent, fileTitle, docExtra);
    if (parsed.styleOverride) toast.show('已导入并恢复文档样式', 'success');
    return;
  }

  try {
    let result = await resolveLocalImages(bodyContent, {
      source: candidate.source,
      promptForSource: !candidate.skipSourcePrompt,
      imageStore,
      imageCompressor,
      createImageId: () => createDocumentId('img'),
    });

    let matchedCount = result.matched.length;
    if (result.unmatched.length > 0 || result.conflicts.length > 0) {
      const missingCount = result.unmatched.length + result.conflicts.length;
      toast.show(`有 ${missingCount} 张图片未找到，请选择图片目录`, 'info');
      const supplementalSource = await chooseSupplementalDirectory(supplementalInput);

      if (supplementalSource) {
        const supplementalResult = await resolveLocalImages(result.resolvedMarkdown, {
          source: supplementalSource,
          allowBasenameFallback: true,
          imageStore,
          imageCompressor,
          createImageId: () => createDocumentId('img'),
        });
        result = supplementalResult;
        matchedCount += supplementalResult.matched.length;
      }
    }

    // CDN 图片保持原样不处理，只有本地路径图片需要解析导入
    createNewDocument(result.resolvedMarkdown, fileTitle, docExtra);
    if (parsed.styleOverride) toast.show('已导入并恢复文档样式', 'success');
    const remainingCount = result.unmatched.length + result.conflicts.length;
    if (remainingCount > 0) {
      const paths = [...result.unmatched, ...result.conflicts].map((item) => item.path).join('、');
      toast.show(`文章已导入，仍有 ${remainingCount} 张图片未找到：${paths}`, 'error');
    } else if (matchedCount > 0) {
      toast.show(`文章已导入，自动导入 ${matchedCount} 张图片`, 'success');
    } else {
      toast.show('文章已导入', 'success');
    }
  } catch (error) {
    console.error('图片解析失败:', error);
    toast.show(`图片解析失败: ${error.message}`, 'error');
    createNewDocument(bodyContent, fileTitle, docExtra);
    if (parsed.styleOverride) toast.show('已导入并恢复文档样式', 'success');
  }
}

function exportMarkdown() {
  const activeDoc = getActiveDocument();
  const frontMatter = serializeStyleFrontMatter(activeDoc?.styleOverride);
  const blob = new Blob([frontMatter + markdownInput.value], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(resolveDocumentDisplayTitle(activeDoc))}.md`;
  link.click();
  URL.revokeObjectURL(url);
  toast.show('已导出 Markdown', 'success');
}

function exportHTML() {
  const activeDoc = getActiveDocument();
  const blob = new Blob([renderedContent.value], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(resolveDocumentDisplayTitle(activeDoc))}.html`;
  link.click();
  URL.revokeObjectURL(url);
  toast.show('已导出 HTML', 'success');
}

function resetEditor() {
  editorHistory.programmatic();
  markdownInput.value = '';
  persistDocumentState();
  toast.show('已清空编辑器内容', 'info');
}

function resetToDefault() {
  editorHistory.programmatic();
  markdownInput.value = loadDefaultExample();
  coverTemplateId.value = 'pure-white';
  coverBackgroundId.value = 'midnight-prism';
  Object.assign(coverContent, {
    tag: '技术分享',
    title: '用 AI 构建公众号封面工具',
    subtitle: '开箱即用，亦可自由迭代',
    author: 'AI产品零度',
    issueNumber: 'No.01'
  });
  Object.assign(coverTypography, {
    titleSize: 48,
    subtitleSize: 40,
    tagSize: 28,
    authorSize: 14,
    titleLineHeight: 1.3,
    subtitleLineHeight: 1.4,
    titleLetterSpacing: 0,
    subtitleLetterSpacing: 0,
    titleOffsetY: 0,
    subtitleOffsetY: 0,
    titleOffsetX: 0,
    subtitleOffsetX: 0,
    textAlign: 'center',
    titleFontFamily: "'Noto Sans SC', sans-serif",
    subtitleFontFamily: "'Noto Sans SC', sans-serif"
  });
  coverIllustrationId.value = '';
  coverIllustrationSvg.value = '';
  coverIllustrationColor.value = '#6366F1';
  coverLayerOrder.value = 'text-top';
  coverOpacity.value = 100;
  coverUndoStack.value = [];
  coverRedoStack.value = [];
  persistDocumentState();
  toast.show('已恢复默认设置', 'info');
}

async function doCopy() {
  // 复制与预览共用同一 merged 样式配置（含文档级覆盖），保证粘贴即所见
  const styleConfig = mergeTheme(STYLES[currentStyle.value], getActiveDocument()?.styleOverride);
  const success = await copyToWechat({
    renderedHTML: renderedContent.value,
    styleConfig,
    imageStore,
    showToast: (message, type) => toast.show(message, type),
    codeTheme: getResolvedCodeTheme(),
    displaySettings: displaySettings.value
  });

  if (success) {
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  }
}

function selectTheme(key) {
  currentStyle.value = key;
}

function toggleStar(key) {
  toggleStarStyle(key);
  starredStyles.value = getStarredStyles();
  categorizedThemes.value = getCategorizedThemes();
}

function selectCodeTheme(key) {
  if (!isCodeThemeSelection(key)) return;
  currentCodeTheme.value = key;
  try {
    localStorage.setItem('currentCodeTheme', key);
  } catch (_error) {
    // ignore
  }
  renderMarkdown();
}

function clampNumber(value, min, max, fallback, precision = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const clamped = Math.min(max, Math.max(min, number));
  if (precision <= 0) return Math.round(clamped);
  return Number(clamped.toFixed(precision));
}

function updateDisplaySettings(nextSettings) {
  displaySettings.value = {
    ...displaySettings.value,
    ...nextSettings
  };
}

function setFontScale(value) {
  updateDisplaySettings({ fontScale: value });
}

function setFontFamily(value) {
  if (!['theme', 'sans', 'serif', 'mono'].includes(value)) return;
  updateDisplaySettings({ fontFamily: value });
}

function setImageStyleMode(value) {
  if (!['theme', 'custom'].includes(value)) return;
  updateDisplaySettings({
    imageStyleMode: value,
    imageEffect: value === 'theme' ? 'theme' : displaySettings.value.imageEffect
  });
}

function setImageEffect(value) {
  const validEffects = imageEffectOptions.map((option) => option.value);
  if (!validEffects.includes(value)) return;
  updateDisplaySettings({
    imageEffect: value,
    imageStyleMode: value === 'theme' ? 'theme' : 'custom'
  });
}

function setEndStyle(value) {
  const validStyles = endStyleOptions.map((option) => option.value);
  if (!validStyles.includes(value)) return;
  updateDisplaySettings({ endStyle: value });
}

function updateImageDisplaySettings(nextSettings) {
  updateDisplaySettings({
    imageStyleMode: 'custom',
    imageEffect: nextSettings.imageEffect || displaySettings.value.imageEffect || 'theme',
    ...nextSettings
  });
}

function updateImageMetric(field, value, min, max) {
  updateImageDisplaySettings({
    [field]: clampNumber(value, min, max, displaySettings.value[field] ?? min)
  });
}

function setImageRadiusMode(value) {
  if (!['px', 'circle'].includes(value)) return;
  updateImageDisplaySettings({ imageRadiusMode: value });
}

function updateImageShadowOpacity(value) {
  updateImageDisplaySettings({
    imageShadowOpacity: clampNumber(
      Number(value) / 100,
      0,
      1,
      displaySettings.value.imageShadowOpacity ?? 0,
      2
    )
  });
}

function updateImageShadowColor(value) {
  const normalized = String(value || '').trim();
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) return;
  updateImageDisplaySettings({ imageShadowColor: normalized });
}

function getTextarea() {
  return document.querySelector('.markdown-input');
}

// ── Style Override: 状态与更新 ─────────────────────────────

const activeStyleOverride = computed(() => getActiveDocument()?.styleOverride || {});

/** 主题 ⊗ 文档覆盖 = 当前成稿样式配置 */
function mergedThemeConfig() {
  const themeConfig = STYLES[currentStyle.value];
  return themeConfig ? mergeTheme(themeConfig, activeStyleOverride.value) : null;
}

/** 未带覆盖的主题默认配置（用于「改回默认即撤销覆盖」判定） */
function baseThemeConfig() {
  const themeConfig = STYLES[currentStyle.value];
  return themeConfig ? mergeTheme(themeConfig, null) : null;
}

function formatParamValueForDisplay(key, value) {
  const def = PARAM_DEFS.find((d) => d.key === key);
  if (!def) return value;
  return Number(Number(value).toFixed(def.precision));
}

function styleTokenValue(key) {
  return mergedThemeConfig()?.gzh?.[key] || '#000000';
}

function styleParamValue(key) {
  const overridden = activeStyleOverride.value.params?.[key];
  if (overridden != null) return overridden;
  const merged = mergedThemeConfig();
  if (merged) {
    const value = readParamFromStyles(merged.styles, key);
    if (value != null) return formatParamValueForDisplay(key, value);
  }
  const def = PARAM_DEFS.find((d) => d.key === key);
  return def ? def.min : 0;
}

function styleParamPresetValue(key) {
  const params = activeStyleOverride.value.params || {};
  return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : 'theme';
}

/**
 * 排版参数当前生效值文本（覆盖或模板默认）——用于「行间距/字间距」行回显当前数值。
 * 返回 merged styles 中首个命中的声明原值（去 !important），如 '1.75' / '0.3px' / '0.022em'；
 * 主题未声明时给出语义兜底：字间距 = 0px（normal 即无附加间距）、行间距回「模板默认」。
 */
function styleParamCurrentLabel(key) {
  const merged = mergedThemeConfig();
  if (!merged) return '';
  const targets = PARAM_TARGETS[key] || [];
  for (const { selector, property } of targets) {
    const value = getMergedDeclaration(merged.styles, selector, property);
    if (value == null) continue;
    return String(value).replace(/\s*!\s*important\s*$/i, '').trim();
  }
  if (key === 'letterSpacing') return '0px';
  if (key === 'lineHeight') return '模板默认';
  return '';
}

/** 深合并更新文档样式覆盖，并触发保存与重渲染 */
function updateStyleOverride(patch) {
  const doc = getActiveDocument();
  if (!doc) return;
  const base = normalizeStyleOverride(doc.styleOverride);
  const next = {
    tokens: patch?.tokens ?? base.tokens,
    params: patch?.params ?? base.params,
    elements: patch?.elements ?? base.elements
  };
  doc.styleOverride = normalizeStyleOverride(next);
  markCurrentDocumentDirty();
  schedulePersistDocumentState();
  renderMarkdown();
}

function setStyleToken(key, value) {
  const normalized = normalizeTokenHex(value);
  if (!normalized) return;
  const tokens = { ...(activeStyleOverride.value.tokens || {}) };
  const original = baseThemeConfig()?.gzh?.[key];
  if (normalized === original) {
    delete tokens[key];
  } else {
    tokens[key] = normalized;
  }
  updateStyleOverride({ tokens });
}

function setStyleParam(key, value) {
  const def = PARAM_DEFS.find((d) => d.key === key);
  if (!def) return;
  const number = Number(value);
  if (!Number.isFinite(number)) return;
  const clamped = Math.min(def.max, Math.max(def.min, number));
  const rounded = Number(Number(clamped).toFixed(def.precision));
  const params = { ...(activeStyleOverride.value.params || {}) };
  const themeValue = readParamFromStyles(baseThemeConfig()?.styles, key);
  if (themeValue != null && Math.abs(rounded - themeValue) < 1e-9) {
    delete params[key];
  } else {
    params[key] = rounded;
  }
  updateStyleOverride({ params });
}

function setStyleParamPreset(key, value) {
  if (value !== 'theme') {
    setStyleParam(key, value);
    return;
  }
  const params = { ...(activeStyleOverride.value.params || {}) };
  delete params[key];
  updateStyleOverride({ params });
}

function clearStyleOverride() {
  const doc = getActiveDocument();
  if (!doc) return;
  doc.styleOverride = {};
  markCurrentDocumentDirty();
  schedulePersistDocumentState();
  renderMarkdown();
  toast.show('已还原模板默认样式', 'info');
}

// ── Style Override: L2 元素类级 ────────────────────────────

function elementCss(selector) {
  return activeStyleOverride.value.elements?.[selector] || '';
}

function elementDefault(selector, property) {
  const merged = mergedThemeConfig();
  return merged ? getMergedDeclaration(merged.styles, selector, property) : null;
}

function patchMultiElement(selectors, prop, valueOrNull) {
  const elements = { ...(activeStyleOverride.value.elements || {}) };
  selectors.forEach((selector) => {
    const map = parseDeclarations(elements[selector] || '');
    if (valueOrNull) map[prop] = valueOrNull;
    else delete map[prop];
    const cssText = serializeDeclarations(map);
    if (cssText) elements[selector] = cssText;
    else delete elements[selector];
  });
  updateStyleOverride({ elements });
}

function resetElement(selector) {
  const elements = { ...(activeStyleOverride.value.elements || {}) };
  delete elements[selector];
  updateStyleOverride({ elements });
}

/** 整段替换某 selector 的覆盖 CSS（空字符串则删除该覆盖） */
function setElementCss(selector, cssText) {
  const elements = { ...(activeStyleOverride.value.elements || {}) };
  if (cssText) elements[selector] = cssText;
  else delete elements[selector];
  updateStyleOverride({ elements });
}

/** 标题组：字号（h2/h3 同步） */
function headingFontSizeValue() {
  const overridden = parseDeclarations(elementCss('h2'))['font-size'];
  if (overridden) return parseFloat(overridden) || 19;
  const def = elementDefault('h2', 'font-size');
  return def ? (parseFloat(def) || 19) : 19;
}

function setHeadingFontSize(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return;
  patchMultiElement(['h2', 'h3'], 'font-size', `${number}px !important`);
}

/** 标题组：颜色跟随主题（默认开）。关闭时落成明确的主题色值。 */
const headingColorFollow = computed(() => !parseDeclarations(elementCss('h2'))['color']);

function headingColorValue() {
  const overridden = parseDeclarations(elementCss('h2'))['color'];
  if (overridden) return normalizeTokenHex(overridden) || '#111111';
  return mergedThemeConfig()?.gzh?.accent || '#111111';
}

function setHeadingColorFollow(follow) {
  if (follow) {
    patchMultiElement(['h2', 'h3'], 'color', null);
    return;
  }
  const accent = mergedThemeConfig()?.gzh?.accent || '#111111';
  patchMultiElement(['h2', 'h3'], 'color', `${accent} !important`);
}

function setHeadingColor(value) {
  const hex = normalizeTokenHex(value);
  if (!hex) return;
  patchMultiElement(['h2', 'h3'], 'color', `${hex} !important`);
}

/** 标题组：加粗 */
const headingBold = computed(() => {
  const overridden = parseDeclarations(elementCss('h2'))['font-weight'];
  if (overridden) return ['700', '800', '900'].includes(overridden);
  const def = elementDefault('h2', 'font-weight');
  return Boolean(def && /\b(700|800|900)\b/.test(def));
});

function setHeadingBold(bold) {
  patchMultiElement(['h2', 'h3'], 'font-weight', bold ? '700 !important' : null);
}

/** 引用组：风格预设（theme / bar / card / top） */
const quotePreset = computed(() => {
  const css = parseDeclarations(elementCss('blockquote'));
  if (css['border-top'] && !/^none\b/i.test(css['border-top'])) return 'top';
  if (css['background'] && !/^transparent\b/i.test(css['background'])) return 'card';
  if (css['border-left'] && !/^none\b/i.test(css['border-left'])) return 'bar';
  return 'theme';
});

function setQuotePreset(preset) {
  if (preset === 'theme') {
    resetElement('blockquote');
    return;
  }
  const gzh = mergedThemeConfig()?.gzh || {};
  const accent = gzh.accent || '#2563EB';
  const soft = gzh.soft || '#F5F3F0';
  const base = 'margin: 0 10px 26px !important; padding: 14px 16px !important; border-radius: 6px !important;';
  let extra = '';
  if (preset === 'bar') extra = 'background: transparent !important; border-left: 4px solid ' + accent + ' !important; border-top: none !important;';
  if (preset === 'card') extra = `background: ${soft} !important; border-left: 4px solid ${accent} !important; border-top: none !important;`;
  if (preset === 'top') extra = `background: ${soft} !important; border-top: 3px solid ${accent} !important; border-left: none !important;`;
  setElementCss('blockquote', base + extra);
}

/** 表格组：表头底色 */
function tableHeaderColorValue() {
  const overridden = normalizeTokenHex(parseDeclarations(elementCss('th'))['background']);
  if (overridden) return overridden;
  const def = elementDefault('th', 'background');
  return normalizeTokenHex(def) || '#F5F5F5';
}

function setTableHeaderColor(value) {
  const hex = normalizeTokenHex(value);
  if (!hex) return;
  patchMultiElement(['th'], 'background', `${hex} !important`);
}

/** 表格组：表头加粗 */
const tableHeaderBold = computed(() => {
  const overridden = parseDeclarations(elementCss('th'))['font-weight'];
  if (overridden) return ['700', '800', '900'].includes(overridden);
  const def = elementDefault('th', 'font-weight');
  return Boolean(def && /\b(700|800|900)\b/.test(def));
});

function setTableHeaderBold(bold) {
  patchMultiElement(['th'], 'font-weight', bold ? '700 !important' : null);
}

/** 表格组：斑马纹 */
const tableZebra = computed(() => Boolean(elementCss('tbody tr:nth-child(even)')));

function setTableZebra(enabled) {
  const selector = 'tbody tr:nth-child(even)';
  if (!enabled) {
    resetElement(selector);
    return;
  }
  const accent = mergedThemeConfig()?.gzh?.accent || '#2563EB';
  patchMultiElement([selector], 'background', `${hexToRgbaLocal(accent, 0.05)} !important`);
}

function hexToRgbaLocal(hex, opacity) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(0, 0, 0, ${opacity})`;
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${opacity})`;
}

/** 分割线组 */
function hrColorValue() {
  const overridden = normalizeTokenHex(parseDeclarations(elementCss('hr'))['background']);
  if (overridden) return overridden;
  const def = elementDefault('hr', 'background');
  return normalizeTokenHex(def) || '#E4E4E7';
}

function setHrColor(value) {
  const hex = normalizeTokenHex(value);
  if (!hex) return;
  patchMultiElement(['hr'], 'background', `${hex} !important`);
}

function hrHeightValue() {
  const overridden = parseDeclarations(elementCss('hr'))['height'];
  if (overridden) return parseFloat(overridden) || 1;
  const def = elementDefault('hr', 'height');
  return def ? (parseFloat(def) || 1) : 1;
}

function setHrHeight(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return;
  patchMultiElement(['hr'], 'height', `${number}px !important`);
}

// ── Style Override: L3 盒子与样式刷子 ─────────────────────

function insertStyleBox(key) {
  const snippet = insertBoxMarkdown(key);
  if (!snippet) return;
  insertAtCursor(snippet);
  renderMarkdown();
}

function toggleStyleBrush() {
  if (styleBrushMode.value) {
    styleBrushMode.value = false;
    brushApplying.value = false;
    brushSource.value = '';
    toast.show('已取消样式刷子', 'info');
    return;
  }
  styleBrushMode.value = true;
  brushApplying.value = false;
  brushSource.value = '';
  toast.show('样式刷子：点击预览中带样式的段落进行复制', 'info');
}

function setBrushSource(element) {
  const classes = Array.from(element.classList || []).filter((cls) => BRUSH_CLASSES.includes(cls));
  if (classes.length === 0) {
    toast.show('该段落没有可复制的盒子样式', 'error');
    return;
  }
  brushSource.value = classes[0];
  brushApplying.value = true;
  styleBrushMode.value = false;
  toast.show(`已复制「${getBoxName(classes[0].replace('ogzh-', ''))}」样式：请把光标移到目标段落，再点「应用样式」`, 'info');
}

function applyStyleBrush() {
  if (!brushApplying.value || !brushSource.value) return;
  const textarea = getTextarea();
  const { start } = getEditorSelection(textarea);
  const full = markdownInput.value;

  // 定位光标所在段落行；光标在空行时回退到上一非空行
  let lineStart = full.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  let rawEnd = full.indexOf('\n', lineStart);
  let lineEnd = rawEnd === -1 ? full.length : rawEnd;
  let lineText = full.slice(lineStart, lineEnd);
  while (lineText.trim() === '' && lineStart > 0) {
    const newStart = full.lastIndexOf('\n', lineStart - 2) + 1;
    const newEnd = full.indexOf('\n', newStart);
    lineStart = newStart;
    lineEnd = newEnd === -1 ? full.length : newEnd;
    lineText = full.slice(lineStart, lineEnd);
  }
  if (!lineText.trim()) {
    toast.show('找不到目标段落，请把光标移到段落内', 'error');
    return;
  }

  // 行内已带标记则替换，避免叠加
  let base = lineText;
  const existing = base.match(/\s*\{\.[\w-]+(?:\s+\.[\w-]+)*\}\s*$/);
  if (existing) base = base.replace(/\s*\{\.[\w-]+(?:\s+\.[\w-]+)*\}\s*$/, '');

  const suffix = `\n{.${brushSource.value}}`;
  const head = full.slice(0, lineStart);
  const rest = lineEnd >= full.length ? '' : full.slice(lineEnd + 1);
  const joined = rest ? `\n${rest}` : '\n';
  editorHistory.programmatic();
  markdownInput.value = head + base + suffix + joined;

  brushApplying.value = false;
  brushSource.value = '';
  toast.show('已应用样式', 'success');

  nextTick(() => {
    const target = textarea || getTextarea();
    if (!target) return;
    const position = lineStart + base.length + suffix.length;
    target.focus();
    target.selectionStart = position;
    target.selectionEnd = position;
    syncEditorSelection({ target });
  });
}

const brushStatusLabel = computed(() => {
  if (brushApplying.value) return '应用样式';
  if (styleBrushMode.value) return '点击预览中的样式段落';
  return '复制样式';
});

function syncEditorSelection(event) {
  const textarea = event?.target || getTextarea();
  if (!textarea) return;

  editorSelection.value = {
    start: textarea.selectionStart ?? 0,
    end: textarea.selectionEnd ?? 0,
    direction: textarea.selectionDirection || 'none'
  };
}

function getEditorSelection(textarea = getTextarea()) {
  if (!textarea) {
    return {
      start: editorSelection.value.start ?? 0,
      end: editorSelection.value.end ?? 0,
      direction: editorSelection.value.direction || 'none'
    };
  }

  if (document.activeElement === textarea) {
    syncEditorSelection({ target: textarea });
  }

  return {
    start: editorSelection.value.start ?? 0,
    end: editorSelection.value.end ?? 0,
    direction: editorSelection.value.direction || 'none'
  };
}

async function restoreEditorSelection(start, end) {
  await nextTick();
  const textarea = getTextarea();
  if (!textarea) return;

  const scrollTop = textarea.scrollTop;
  textarea.setSelectionRange(start, end);
  textarea.focus({ preventScroll: true });
  textarea.scrollTop = scrollTop;
  syncEditorSelection({ target: textarea });
}

function analyzeCardTarget() {
  const selection = getEditorSelection();
  const existing = findCardAtSelection(
    markdownInput.value,
    selection.start,
    selection.end
  );

  if (existing) {
    cardTargetState.value = { ok: true, existing: true, reason: '' };
  } else if (selection.start === selection.end) {
    cardTargetState.value = { ok: true, existing: false, reason: '' };
  } else if (!md) {
    cardTargetState.value = {
      ok: false,
      existing: false,
      reason: '编辑器尚未准备好，请稍后重试。'
    };
  } else {
    const tokens = md.parse(markdownInput.value, {});
    const target = inspectCardTarget(
      markdownInput.value,
      selection.start,
      selection.end,
      tokens
    );
    cardTargetState.value = {
      ok: target.ok,
      existing: false,
      reason: target.reason || ''
    };
  }

  return cardTargetState.value;
}

function positionCardPopover() {
  if (!showCardPicker.value || isMobileCardPopover.value) return;
  const textarea = getTextarea();
  const popover = document.querySelector('.selection-card-popover');
  if (!textarea || !popover) return;

  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft || 0;
  const viewportTop = viewport?.offsetTop || 0;
  const viewportRight = viewportLeft + (viewport?.width || window.innerWidth);
  const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
  const panelRect = textarea.closest('.editor-panel')?.getBoundingClientRect();
  const bounds = {
    left: Math.max(viewportLeft, panelRect?.left ?? viewportLeft),
    right: Math.min(viewportRight, panelRect?.right ?? viewportRight),
    top: Math.max(viewportTop, panelRect?.top ?? viewportTop),
    bottom: Math.min(viewportBottom, panelRect?.bottom ?? viewportBottom)
  };
  const rect = popover.getBoundingClientRect();
  const anchor = measureTextareaSelectionFocus(textarea);
  cardPopoverPosition.value = placeSelectionPopover(
    anchor,
    { width: rect.width || 376, height: rect.height || 520 },
    bounds
  );
}

function scheduleCardPopoverPosition() {
  if (cardPopoverPositionFrame) return;
  cardPopoverPositionFrame = window.requestAnimationFrame(() => {
    cardPopoverPositionFrame = 0;
    positionCardPopover();
  });
}

async function openCardPicker() {
  analyzeCardTarget();
  showCardPicker.value = true;
  await nextTick();
  scheduleCardPopoverPosition();
}

function closeCardPicker(restoreEditorFocus = false) {
  const wasOpen = showCardPicker.value;
  showCardPicker.value = false;
  if (!restoreEditorFocus || !wasOpen) return;

  nextTick(() => {
    getTextarea()?.focus({ preventScroll: true });
  });
}

function releaseCardPopoverSuppression() {
  window.requestAnimationFrame(() => {
    suppressCardPopoverEvents = false;
  });
}

function handleEditorSelectionChange(event) {
  syncEditorSelection(event);
  if (suppressCardPopoverEvents) return;
  if (editorSelection.value.start === editorSelection.value.end) {
    closeCardPicker(false);
    return;
  }
  openCardPicker();
}

/** beforeinput:原生编辑发生前,向历史管理器捕获「之前」快照。 */
function handleEditorBeforeInput() {
  editorHistory.beforeInput();
}

/** input:原生编辑发生后,录入历史并同步选区/卡片弹层。 */
function handleEditorInput(event) {
  editorHistory.input(event);
  handleEditorSelectionChange(event);
}

function handleUndo() {
  editorHistory.undo();
}

function handleRedo() {
  editorHistory.redo();
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape' && showCardPicker.value) {
    event.preventDefault();
    closeCardPicker(true);
  }
}

function formatCardEditFailureReason(reason) {
  const messages = {
    'card-not-found': '当前选区不在卡片内，请重新选择卡片内容。',
    'unknown-style': '卡片样式不存在，请重新选择。'
  };
  if (Object.hasOwn(messages, reason)) return messages[reason];
  if (typeof reason === 'string' && /[\u3400-\u9fff]/.test(reason)) return reason;
  return '卡片操作失败，请重新选择后重试。';
}

function reportCardEditFailure(reason, existing) {
  const message = formatCardEditFailureReason(reason);
  cardTargetState.value = { ok: false, existing: Boolean(existing), reason: message };
  toast.show(message, 'error');
  return false;
}

async function applySelectedCard(styleId) {
  const source = markdownInput.value;
  const selection = getEditorSelection();
  const existing = findCardAtSelection(source, selection.start, selection.end);
  let tokens;

  if (!existing && selection.start !== selection.end) {
    if (!md) {
      return reportCardEditFailure('编辑器尚未准备好，请稍后重试。', false);
    }
    tokens = md.parse(markdownInput.value, {});
  }

  const result = applyCardEdit(
    source,
    selection.start,
    selection.end,
    styleId,
    tokens
  );
  if (!result.ok) {
    return reportCardEditFailure(result.reason, Boolean(existing));
  }

  editorHistory.programmatic();
  markdownInput.value = result.markdown;
  cardTargetState.value = { ok: true, existing: result.kind === 'replace', reason: '' };
  toast.show('已应用卡片样式', 'success');
  suppressCardPopoverEvents = true;
  await restoreEditorSelection(result.selectionStart, result.selectionEnd);
  closeCardPicker();
  releaseCardPopoverSuppression();
  return true;
}

async function removeSelectedCard() {
  const source = markdownInput.value;
  const selection = getEditorSelection();
  const existing = findCardAtSelection(source, selection.start, selection.end);
  if (!existing) {
    return reportCardEditFailure('card-not-found', false);
  }

  const result = removeCardEdit(source, selection.start, selection.end);
  if (!result.ok) {
    return reportCardEditFailure(result.reason, true);
  }

  editorHistory.programmatic();
  markdownInput.value = result.markdown;
  cardTargetState.value = { ok: true, existing: false, reason: '' };
  toast.show('已移除卡片样式', 'success');
  suppressCardPopoverEvents = true;
  await restoreEditorSelection(result.selectionStart, result.selectionEnd);
  closeCardPicker();
  releaseCardPopoverSuppression();
  return true;
}

function getCardPreviewHtml(styleId) {
  return renderCardPreviewHtml(styleId, mergedThemeConfig());
}

function insertAtCursor(text, options = {}) {
  const textarea = options.textarea || getTextarea();
  const { start, end } = getEditorSelection(textarea);
  const before = markdownInput.value.slice(0, start);
  const after = markdownInput.value.slice(end);

  editorHistory.programmatic();
  markdownInput.value = `${before}${text}${after}`;

  nextTick(() => {
    const target = textarea || getTextarea();
    if (!target) return;

    const position = start + (options.selectionStart ?? text.length);
    const selectionEnd = options.selectionEnd != null ? start + options.selectionEnd : position;
    target.focus();
    target.selectionStart = position;
    target.selectionEnd = selectionEnd;
    syncEditorSelection({ target });
  });
}

function wrapSelection(before, after, placeholder = '文本') {
  const textarea = getTextarea();
  const { start, end } = getEditorSelection(textarea);
  const selected = markdownInput.value.substring(start, end) || placeholder;
  const text = `${before}${selected}${after}`;

  editorHistory.programmatic();
  markdownInput.value = `${markdownInput.value.substring(0, start)}${text}${markdownInput.value.substring(end)}`;

  nextTick(() => {
    if (!textarea) return;
    textarea.focus();
    textarea.selectionStart = start + before.length;
    textarea.selectionEnd = start + before.length + selected.length;
    syncEditorSelection({ target: textarea });
  });
}

function insertHeading(level) {
  insertAtCursor(`${'#'.repeat(level)} `);
}

function insertQuote() {
  insertAtCursor('> ');
}

function insertUnderline() {
  wrapSelection('<u>', '</u>', 'text');
}

function insertLink() {
  wrapSelection('[', '](https://example.com)', 'text');
}

function insertInlineCode() {
  wrapSelection('`', '`', 'code');
}

function applyListToSelection(type = 'unordered') {
  const textarea = getTextarea();
  const { start, end } = getEditorSelection(textarea);
  const source = markdownInput.value;

  if (start === end) {
    insertAtCursor(type === 'ordered' ? '1. ' : '- ');
    return;
  }

  const blockStart = source.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const blockEndIndex = source.indexOf('\n', end);
  const blockEnd = blockEndIndex === -1 ? source.length : blockEndIndex;
  const block = source.slice(blockStart, blockEnd);
  const lines = block.split('\n');

  const nextBlock = lines
    .map((line, index) => {
      if (!line.trim()) return line;
      const stripped = line.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, '');
      return type === 'ordered' ? `${index + 1}. ${stripped}` : `- ${stripped}`;
    })
    .join('\n');

  editorHistory.programmatic();
  markdownInput.value = `${source.slice(0, blockStart)}${nextBlock}${source.slice(blockEnd)}`;

  nextTick(() => {
    const target = textarea || getTextarea();
    if (!target) return;
    target.focus();
    target.selectionStart = blockStart;
    target.selectionEnd = blockStart + nextBlock.length;
    syncEditorSelection({ target });
  });
}

function insertOrderedList() {
  applyListToSelection('ordered');
}

function insertUnorderedList() {
  applyListToSelection('unordered');
}

function insertDivider() {
  insertAtCursor('\n---\n');
}

function insertCodeBlock() {
  const textarea = getTextarea();
  const { start, end } = getEditorSelection(textarea);
  const selected = markdownInput.value.substring(start, end);
  const snippet = `\`\`\`\n${selected}\n\`\`\``;

  editorHistory.programmatic();
  markdownInput.value = `${markdownInput.value.substring(0, start)}${snippet}${markdownInput.value.substring(end)}`;

  nextTick(() => {
    if (!textarea) return;
    textarea.focus();
    if (selected) {
      textarea.selectionStart = start + 4;
      textarea.selectionEnd = start + 4 + selected.length;
    } else {
      textarea.selectionStart = start + 4;
      textarea.selectionEnd = start + 4;
    }
    syncEditorSelection({ target: textarea });
  });
}

function insertImageSyntax() {
  insertAtCursor('![]()', { selectionStart: 4 });
}

function insertTable() {
  const table = '\n| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n';
  insertAtCursor(table);
}

function handleToolbarImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  handleImageUpload(file, getTextarea());
  event.target.value = '';
}

async function handleXhsCoverUpload(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  const imageRef = await handleImageUpload(file, null, { insert: false });
  input.value = '';
  if (!imageRef) return;

  const url = await resolveXhsPreviewUrl(imageRef);
  xhsCoverCandidates.value = [
    { src: imageRef, url, alt: file.name.replace(/\.[^/.]+$/, '') || '自定义封面' },
    ...xhsCoverCandidates.value.filter((candidate) => candidate.src !== imageRef)
  ];
  selectXhsCoverImage(imageRef);
}

function handleKeydown(event) {
  const isMod = event.ctrlKey || event.metaKey;

  if (isMod && (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
    event.preventDefault();
    if (event.shiftKey || event.key.toLowerCase() === 'y') editorHistory.redo();
    else editorHistory.undo();
    return;
  }

  if (isMod && event.key.toLowerCase() === 's') {
    event.preventDefault();
    persistDocumentState();
    toast.show('已保存', 'success');
    return;
  }

  if (isMod && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    wrapSelection('**', '**');
    return;
  }

  if (isMod && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    wrapSelection('*', '*');
    return;
  }

  if (isMod && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    wrapSelection('[', '](url)');
    return;
  }

  if (event.key === 'Tab') {
    event.preventDefault();
    insertAtCursor('  ');
  }
}

function setupSyncScroll() {
  const editor = getTextarea();
  const preview = document.querySelector('.preview-content');
  if (!editor || !preview) return;

  const sync = (source, target) => {
    if (syncLock || !syncScrollEnabled.value) return;
    syncLock = true;
    const ratio = source.scrollTop / (source.scrollHeight - source.clientHeight || 1);
    target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
    requestAnimationFrame(() => { syncLock = false; });
  };

  editor.addEventListener('scroll', () => sync(editor, preview));
  preview.addEventListener('scroll', () => sync(preview, editor));
}

function loadDefaultExample() {
  return `# OpenGZH — 微信公众号 Markdown 排版编辑器

![写作工作区](https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80)

**OpenGZH** 是一款专为微信公众号打造的 Markdown 排版工具。左侧写作，右侧实时预览，一键复制到公众号编辑器，所有样式完整保留。

> 纯前端架构，无需登录，数据不出浏览器。打开即用，用完即走。

---

## 产品核心能力

### 文章排版

1. 左侧 Markdown 输入，右侧 **实时预览**，支持同步滚动
2. **27 套文章主题** — 日常公众号、资讯深读、产品技术、观点札记、设计审美五类场景一键切换
3. **17 种代码高亮主题** — 支持跟随文章主题自动联动
4. 支持 **手机预览**，覆盖 iPhone 17、华为 Mate 80、小米 17 等 29 款主流机型
5. 截图粘贴、拖拽上传、**自动压缩**，刷新页面图片不丢失

### 封面图设计

切换到顶部 **「封面图」** 标签页，快速生成公众号封面：

- **47 套精选模板**，涵盖深色、浅色、渐变、几何、插画、抽象艺术等风格；居中布局另含 16 款可选背景
- **73 幅精选插画**，支持自定义颜色替换
- 自由调整标题、副标题、标签的 **字体、字号、行高、字间距**
- 导出 **2400 × 1020** 高清 PNG

### 一键发布

点击右上角 **「复制到公众号」**，所有样式自动转为内联 CSS，图片自动转 Base64，完美兼容微信公众号编辑器。

---

## Markdown 排版示例

### 文字样式

**加粗重点**、*斜体强调*、~~删除线~~，以及 \`行内代码\` 标记技术名词。还可以插入 [超链接](https://example.com) 引导读者跳转。

### 引用

> 好的排版让阅读成为一种享受，让内容被更多人看到。

### 列表

OpenGZH 的核心特性：

- **CJK 专项优化** — 中文加粗、斜体、标点断行均经过适配
- **智能粘贴** — 从网页复制富文本，自动转为 Markdown
- **数学公式** — KaTeX 预览 + MathJax SVG 导出
- **深色模式** — 一键切换预览区深浅色

### 代码块

支持 17+ 编程语言的语法高亮：

\`\`\`javascript
// OpenGZH 渲染管道核心流程
async function renderPipeline(markdown, theme) {
  const html = markdownEngine.render(markdown);
  const styled = applyInlineStyles(html, theme);
  const images = await convertToBase64(styled);
  return copyToClipboard(images);
}
\`\`\`

\`\`\`python
# 公众号文章阅读数据分析
import pandas as pd

def analyze_articles(df):
    """统计各主题文章的阅读表现"""
    return (df.groupby('topic')
              .agg(views='mean', likes='sum')
              .sort_values('views', ascending=False))
\`\`\`

### 表格

| 功能 | 说明 | 亮点 |
|------|------|------|
| 文章主题 | 27 套风格主题 | 五类场景分类 |
| 代码主题 | 17 种高亮方案 | 跟随文章主题联动 |
| 封面模板 | 47 套 + 居中布局 16 款背景 + 73 幅插画 | 场景标签辅助选择 |
| 手机预览 | 29 款机型 | 含折叠屏 |
| 数学公式 | LaTeX 渲染 | 导出自动转 SVG |

### 数学公式

行内公式：$E = mc^2$，独立公式块：

$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n
$$

### 图片

![代码编辑器](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80)

单张图片自动居中展示。多张连续图片自动组合为网格布局：

![移动设备](https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80)

![简洁桌面](https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80)

支持自定义图片边距、圆角和阴影效果。

---

## 关于 OpenGZH

OpenGZH 是一款 **纯前端** 的公众号排版工具。无需注册登录，所有数据保存在浏览器本地，不会上传到任何服务器。

### 关注公众号

欢迎关注微信公众号 **「进击的零度」**，获取 OpenGZH 最新更新、排版技巧和公众号运营干货。

![关注进击的零度](https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&q=80)

> 用 OpenGZH 写好每一篇文章，让优质内容被更多人看到。
`;
}

function initResizeHandles() {
  const resizeState = {
    handle: null,
    startX: 0,
    startEditorWidth: 0,
    startRightWidth: 0,
    type: null
  };

  document.addEventListener('mousedown', (event) => {
    const handle = event.target.closest('.resize-handle');
    if (!handle) return;

    resizeState.handle = handle;
    resizeState.startX = event.clientX;
    resizeState.type = handle.dataset.handle;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const editorPanel = document.querySelector('.editor-panel');
    const rightPanel = document.querySelector('.right-panel');

    if (resizeState.type === 'editor-preview') {
      resizeState.startEditorWidth = editorPanel?.offsetWidth || 0;
    } else if (resizeState.type === 'preview-right') {
      resizeState.startRightWidth = rightPanel?.offsetWidth || 0;
    }
  });

  document.addEventListener('mousemove', (event) => {
    if (!resizeState.handle) return;

    const mainArea = document.querySelector('.main-area');
    const editorPanel = document.querySelector('.editor-panel');
    const rightPanel = document.querySelector('.right-panel');
    if (!mainArea) return;

    const delta = event.clientX - resizeState.startX;
    const mainWidth = mainArea.offsetWidth;

    if (resizeState.type === 'editor-preview' && editorPanel) {
      const newWidth = resizeState.startEditorWidth + delta;
      const clampedWidth = Math.max(200, Math.min(mainWidth * 0.6, newWidth));
      editorWidth.value = (clampedWidth / mainWidth * 100).toFixed(2);
    } else if (resizeState.type === 'preview-right' && rightPanel) {
      const newWidth = resizeState.startRightWidth + delta;
      rightPanelWidth.value = Math.max(280, Math.min(500, newWidth));
    }
  });

  document.addEventListener('mouseup', () => {
    if (!resizeState.handle) return;
    resizeState.handle.classList.remove('dragging');
    resizeState.handle = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

// ═══ Cover Editor Logic ═══

// ── Inline Text Editing ──

function handleCoverTextClick(event) {
  const target = event.target.closest('[data-field]');
  if (!target) return;

  const svg = target.closest('svg');
  if (!svg) return;

  const field = target.getAttribute('data-field');
  if (!['tag', 'title', 'subtitle', 'author', 'issueNumber'].includes(field)) return;

  const allLines = svg.querySelectorAll(`[data-field="${field}"]`);
  if (allLines.length === 0) return;

  const previewArea = document.querySelector('.cover-preview-area');
  if (!previewArea) return;

  const previewAreaRect = previewArea.getBoundingClientRect();

  const svgRect = svg.getBoundingClientRect();
  const svgToScreenX = svgRect.width / 1200;
  const svgToScreenY = svgRect.height / 510;

  const firstEl = allLines[0];
  const textAnchor = firstEl.getAttribute('text-anchor') || 'start';
  const svgFontSize = parseFloat(firstEl.getAttribute('font-size')) || 48;
  const svgLetterSpacing = parseFloat(firstEl.getAttribute('letter-spacing')) || 0;
  const rawLineHeight = parseFloat(firstEl.getAttribute('data-line-height')) || svgFontSize * 1.3;

  // Compute left, top, width, height from SVG attributes — avoiding
  // getBoundingClientRect which is unreliable for SVG <text> in Chromium.
  let leftSvg = Infinity, topSvg = Infinity, bottomSvg = -Infinity, maxTextLen = 0;
  allLines.forEach(el => {
    const tx = parseFloat(el.getAttribute('x')) || 0;
    const ty = parseFloat(el.getAttribute('y')) || 0;
    const fs = parseFloat(el.getAttribute('font-size')) || svgFontSize;
    const textLen = el.getComputedTextLength();
    maxTextLen = Math.max(maxTextLen, textLen);

    let lineLeft;
    if (textAnchor === 'middle') lineLeft = tx - textLen / 2;
    else if (textAnchor === 'end') lineLeft = tx - textLen;
    else lineLeft = tx;

    leftSvg = Math.min(leftSvg, lineLeft);
    topSvg = Math.min(topSvg, ty - fs);       // y is baseline; top ≈ y - font-size
    bottomSvg = Math.max(bottomSvg, ty + fs * 0.2);
  });

  const relX = svgRect.left + (leftSvg + (coverFieldOffsets[field]?.x || 0)) * svgToScreenX - previewAreaRect.left;
  const relY = svgRect.top + (topSvg + (coverFieldOffsets[field]?.y || 0)) * svgToScreenY - previewAreaRect.top;
  const textW = maxTextLen * svgToScreenX;
  const boxH = (bottomSvg - topSvg) * svgToScreenY;

  const textAlignMap = { start: 'left', middle: 'center', end: 'right' };

  Object.assign(coverInlineEdit, {
    active: true,
    field,
    value: coverContent[field] || '',
    x: relX,
    y: relY,
    width: textW,
    minHeight: boxH,
    fontSize: (svgFontSize * Math.min(svgToScreenX, svgToScreenY)) + 'px',
    fontFamily: firstEl.getAttribute('font-family') || 'inherit',
    fontWeight: firstEl.getAttribute('font-weight') || 'normal',
    color: firstEl.getAttribute('fill') || '#000',
    textAlign: textAlignMap[textAnchor] || 'left',
    letterSpacing: (svgLetterSpacing * svgToScreenX) + 'px',
    lineHeight: (rawLineHeight / svgFontSize).toFixed(2)
  });

  nextTick(() => {
    const input = document.querySelector('.cover-inline-editor textarea');
    if (input) {
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
      input.focus();
      input.select();
    }
  });
}

function applyInlineEdit() {
  if (!coverInlineEdit.active) return;
  pushCoverUndo();
  coverContent[coverInlineEdit.field] = coverInlineEdit.value;
  coverInlineEdit.active = false;
}

function cancelInlineEdit() {
  coverInlineEdit.active = false;
}

// ── Cover Text Drag ──

function applyFieldOffsetsToDom() {
  const svg = document.querySelector('.cover-preview-frame svg');
  if (!svg) return;
  for (const [field, offset] of Object.entries(coverFieldOffsets)) {
    const els = svg.querySelectorAll(`[data-field="${field}"]`);
    els.forEach(el => {
      if (offset.x === 0 && offset.y === 0) {
        el.removeAttribute('transform');
      } else {
        el.setAttribute('transform', `translate(${offset.x}, ${offset.y})`);
      }
    });
  }
}

function handleCoverMouseDown(event) {
  const target = event.target.closest('[data-field]');
  if (!target) return;
  const field = target.getAttribute('data-field');
  if (!['tag', 'title', 'subtitle', 'author', 'issueNumber'].includes(field)) return;

  event.preventDefault();
  coverDrag = {
    field,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startOffset: { x: coverFieldOffsets[field].x, y: coverFieldOffsets[field].y },
    moved: false
  };
  document.addEventListener('mousemove', onDragMouseMove);
  document.addEventListener('mouseup', onDragMouseUp);
}

function onDragMouseMove(event) {
  if (!coverDrag) return;
  const dx = event.clientX - coverDrag.startMouseX;
  const dy = event.clientY - coverDrag.startMouseY;

  if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

  if (!coverDrag.moved) {
    coverDrag.moved = true;
    coverInlineEdit.active = false;
  }

  const svg = document.querySelector('.cover-preview-frame svg');
  if (!svg) return;
  const svgRect = svg.getBoundingClientRect();
  const svgToScreenX = svgRect.width / 1200;
  const svgToScreenY = svgRect.height / 510;

  const offsetX = coverDrag.startOffset.x + dx / svgToScreenX;
  const offsetY = coverDrag.startOffset.y + dy / svgToScreenY;

  const els = svg.querySelectorAll(`[data-field="${coverDrag.field}"]`);
  els.forEach(el => {
    el.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);
  });
}

function onDragMouseUp(event) {
  document.removeEventListener('mousemove', onDragMouseMove);
  document.removeEventListener('mouseup', onDragMouseUp);

  if (!coverDrag) return;
  const drag = coverDrag;
  coverDrag = null;

  if (drag.moved) {
    pushCoverUndo();
    const svg = document.querySelector('.cover-preview-frame svg');
    if (svg) {
      const svgRect = svg.getBoundingClientRect();
      const svgToScreenX = svgRect.width / 1200;
      const svgToScreenY = svgRect.height / 510;
      const dx = event.clientX - drag.startMouseX;
      const dy = event.clientY - drag.startMouseY;
      coverFieldOffsets[drag.field].x = Math.round(drag.startOffset.x + dx / svgToScreenX);
      coverFieldOffsets[drag.field].y = Math.round(drag.startOffset.y + dy / svgToScreenY);
    }
    applyFieldOffsetsToDom();
  } else {
    handleCoverTextClick(event);
  }
}

function resetCoverFieldOffsets() {
  for (const key of Object.keys(coverFieldOffsets)) {
    coverFieldOffsets[key].x = 0;
    coverFieldOffsets[key].y = 0;
  }
}

function handleInlineEditKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    applyInlineEdit();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelInlineEdit();
  }
}

function toggleCoverSidebar() {
  coverSidebarCollapsed.value = !coverSidebarCollapsed.value;
}

// ── Cover SVG Output ──

const coverSvgOutput = computed(() => {
  return renderCover(
    coverTemplateId.value,
    {
      ...coverContent,
      backgroundId: coverBackgroundId.value,
      illustrationSvg: coverIllustrationSvg.value,
      illustrationOpacity: coverOpacity.value / 100,
      layerOrder: coverLayerOrder.value
    },
    { ...coverTypography }
  );
});

const coverCategories = computed(() => getCategories());
const currentTemplateBackgrounds = computed(() => getTemplate(coverTemplateId.value)?.backgrounds || []);

const coverPreviewStyle = computed(() => {
  return { aspectRatio: '900 / 383' };
});

function getCoverTemplatesByCategory(category) {
  return getTemplates(category);
}

function renderCoverThumb(templateId) {
  return renderCover(templateId, { tag: '标签', title: '标题预览', subtitle: '副标题', author: '作者' }, { ...DEFAULT_TYPOGRAPHY, titleSize: 36, subtitleSize: 16, tagSize: 10, authorSize: 10 });
}

function getTemplateMeta(templateId) {
  return TEMPLATE_META[templateId] || null;
}

function coverTemplateSupports(field) {
  const tpl = COVER_TEMPLATES.find(t => t.id === coverTemplateId.value);
  return tpl ? tpl.elements[field] : false;
}

const currentTemplateIllustFit = computed(() => {
  const tpl = COVER_TEMPLATES.find(t => t.id === coverTemplateId.value);
  return tpl?.illustFit || null;
});

const filteredIllustrations = computed(() => {
  let list = getIllustrationsByCategory(coverIllustCategory.value);
  const fit = currentTemplateIllustFit.value;
  if (fit) {
    list = list.filter(item => item.fit && item.fit.includes(fit));
  }
  return list;
});

const illustrationColorPresets = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  '#1E293B', '#64748B'
];

async function selectIllustration(id) {
  pushCoverUndo();
  coverIllustrationId.value = id;
  const illust = getIllustration(id);
  if (illust) {
    coverIllustrationColor.value = illust.defaultColor || '#6366F1';
    const svgStr = await loadIllustrationSvg(illust.path);
    coverIllustrationSvg.value = svgStr;
  }
}

function clearIllustration() {
  pushCoverUndo();
  coverIllustrationId.value = '';
  coverIllustrationSvg.value = '';
}

async function updateIllustrationColor(color) {
  coverIllustrationColor.value = color;
  if (coverIllustrationId.value) {
    const illust = getIllustration(coverIllustrationId.value);
    if (illust) {
      const originalSvg = await loadIllustrationSvg(illust.path);
      coverIllustrationSvg.value = replaceIllustrationColor(originalSvg, color);
    }
  }
}

function getCoverStateSnapshot() {
  return {
    templateId: coverTemplateId.value,
    backgroundId: coverBackgroundId.value,
    content: { ...coverContent },
    typography: { ...coverTypography },
    fieldOffsets: JSON.parse(JSON.stringify(coverFieldOffsets)),
    illustrationId: coverIllustrationId.value,
    illustrationColor: coverIllustrationColor.value,
    layerOrder: coverLayerOrder.value,
    opacity: coverOpacity.value
  };
}

let _restoringCover = false;

function restoreCoverState(state) {
  _restoringCover = true;
  // Fall back to a known template if the saved one no longer exists
  // (e.g. a template was removed in a newer version)
  const savedTpl = COVER_TEMPLATES.find(t => t.id === state.templateId);
  coverTemplateId.value = savedTpl ? state.templateId : 'pure-white';
  const savedBackgrounds = savedTpl?.backgrounds || [];
  coverBackgroundId.value = savedBackgrounds.some(item => item.id === state.backgroundId)
    ? state.backgroundId
    : (savedBackgrounds[0]?.id || 'midnight-prism');
  Object.assign(coverContent, state.content || DEFAULT_COVER_CONTENT);
  Object.assign(coverTypography, state.typography || DEFAULT_TYPOGRAPHY);
  if (state.fieldOffsets) {
    for (const [key, val] of Object.entries(state.fieldOffsets)) {
      if (coverFieldOffsets[key]) Object.assign(coverFieldOffsets[key], val);
    }
  } else {
    resetCoverFieldOffsets();
  }
  coverIllustrationId.value = state.illustrationId || '';
  coverIllustrationColor.value = state.illustrationColor || coverIllustrationColor.value;
  coverLayerOrder.value = state.layerOrder || 'text-top';
  coverOpacity.value = Number.isFinite(Number(state.opacity)) ? Number(state.opacity) : 100;

  if (coverIllustrationId.value) {
    const illust = getIllustration(coverIllustrationId.value);
    if (illust) {
      loadIllustrationSvg(illust.path).then(svg => {
        coverIllustrationSvg.value = replaceIllustrationColor(svg, coverIllustrationColor.value);
      });
    }
  } else {
    coverIllustrationSvg.value = '';
  }

  // Safety: clear flag after render even if coverSvgOutput watcher didn't fire
  nextTick(() => { _restoringCover = false; });
}

function pushCoverUndo() {
  coverUndoStack.value.push(getCoverStateSnapshot());
  if (coverUndoStack.value.length > 50) coverUndoStack.value.shift();
  coverRedoStack.value = [];
}

function selectCoverTemplate(id) {
  const template = getTemplate(id);
  if (!template) return;
  pushCoverUndo();
  coverTemplateId.value = id;
  if (template.backgrounds?.length && !template.backgrounds.some(item => item.id === coverBackgroundId.value)) {
    coverBackgroundId.value = template.backgrounds[0].id;
  }
}

function selectCoverBackground(id) {
  if (id === coverBackgroundId.value || !currentTemplateBackgrounds.value.some(item => item.id === id)) return;
  pushCoverUndo();
  coverBackgroundId.value = id;
}

function updateCoverTypo(field, value) {
  pushCoverUndo();
  coverTypography[field] = Number(value);
}

function coverUndo() {
  if (coverUndoStack.value.length === 0) return;
  coverRedoStack.value.push(getCoverStateSnapshot());
  const state = coverUndoStack.value.pop();
  restoreCoverState(state);
}

function coverRedo() {
  if (coverRedoStack.value.length === 0) return;
  coverUndoStack.value.push(getCoverStateSnapshot());
  const state = coverRedoStack.value.pop();
  restoreCoverState(state);
}

function coverReset() {
  pushCoverUndo();
  coverTemplateId.value = 'pure-white';
  coverBackgroundId.value = 'midnight-prism';
  Object.assign(coverContent, DEFAULT_COVER_CONTENT);
  Object.assign(coverTypography, DEFAULT_TYPOGRAPHY);
  resetCoverFieldOffsets();
  coverLayerOrder.value = 'text-top';
  coverOpacity.value = 100;
  coverIllustrationId.value = '';
  coverIllustrationSvg.value = '';
}

function toggleCoverLayerOrder() {
  coverLayerOrder.value = coverLayerOrder.value === 'text-top' ? 'image-top' : 'text-top';
}

async function exportCoverPngAction() {
  const svg = coverSvgOutput.value;
  if (!svg) return;
  try {
    await doExportCoverPng(svg, coverContent.title || 'cover');
    toast.show('封面已导出', 'success');
  } catch (err) {
    console.error('导出失败:', err);
    toast.show('导出失败: ' + err.message, 'error');
  }
}

const app = createApp({
  setup() {
    watch(markdownInput, (value) => {
      renderMarkdown();
      updateStats();
      scheduleXhsPagination();

      if (suppressEditorSync) {
        suppressEditorSync = false;
        return;
      }

      const activeDoc = getActiveDocument();
      if (!activeDoc) return;

      activeDoc.content = value;
      markCurrentDocumentDirty();
      schedulePersistDocumentState();
    });

    watch(currentDocumentTitle, (value) => {
      if (suppressTitleSync) {
        suppressTitleSync = false;
        return;
      }

      const activeDoc = getActiveDocument();
      if (!activeDoc) return;

      activeDoc.manualTitle = value;
      activeDoc.title = value || activeDoc.title;
      markCurrentDocumentDirty();
      schedulePersistDocumentState();
    });

    watch(currentStyle, () => {
      renderMarkdown();
      persistDocumentState();
    });

    watch(codeBlockSettings, () => {
      renderMarkdown();
      persistDocumentState();
    }, { deep: true });

    watch(displaySettings, () => {
      renderMarkdown();
      persistDocumentState();
    }, { deep: true });

    // Cancel inline editing when template switches (prevents stale editor)
    watch(coverTemplateId, () => {
      coverInlineEdit.active = false;
      if (!_restoringCover) resetCoverFieldOffsets();
    });

    watch(coverSvgOutput, () => {
      nextTick(() => {
        applyFieldOffsetsToDom();
        _restoringCover = false;
      });
    });

    onMounted(async () => {
      starredStyles.value = getStarredStyles();

      const preferences = loadPreferences();
      currentStyle.value = preferences.currentStyle;
      codeBlockSettings.value = preferences.codeBlockSettings;
      displaySettings.value = preferences.displaySettings;
      tocVisible.value = preferences.tocVisible;

      try {
        const savedCodeTheme = localStorage.getItem('currentCodeTheme');
        if (isCodeThemeSelection(savedCodeTheme)) {
          currentCodeTheme.value = savedCodeTheme;
        }
      } catch (_error) {
        // ignore
      }

      initResizeHandles();

      // 下拉浮层右侧溢出视口时自动翻转对齐
      function alignPickerDropdown() {
        const margin = 12;
        for (const selector of ['.template-dropdown', '.typo-dropdown', '.xhs-settings-dropdown']) {
          const dropdown = document.querySelector(selector);
          if (!dropdown) continue;
          dropdown.classList.remove('align-right', 'align-fit');
          if (dropdown.getBoundingClientRect().right > window.innerWidth - margin) {
            dropdown.classList.add('align-right');
            if (dropdown.getBoundingClientRect().left < margin) {
              const anchorTop = dropdown.getBoundingClientRect().top;
              dropdown.classList.remove('align-right');
              dropdown.classList.add('align-fit');
              dropdown.style.top = `${anchorTop}px`;
              dropdown.style.maxHeight = `calc(100vh - ${anchorTop + margin}px)`;
            }
          }
        }
      }
      watch([showTemplatePicker, showTypoPicker, showXhsSettings], () => nextTick(alignPickerDropdown));
      cardPopoverWindowResizeHandler = () => {
        if (showTemplatePicker.value || showTypoPicker.value) alignPickerDropdown();
        isMobileCardPopover.value = window.innerWidth <= 768;
        if (showCardPicker.value) scheduleCardPopoverPosition();
      };
      window.addEventListener('resize', cardPopoverWindowResizeHandler);

      const cardPopoverSurface = document.querySelector('.markdown-input-container');
      if (cardPopoverSurface && typeof ResizeObserver !== 'undefined') {
        cardPopoverResizeObserver = new ResizeObserver(() => {
          if (!showCardPicker.value) return;
          scheduleCardPopoverPosition();
        });
        cardPopoverResizeObserver.observe(cardPopoverSurface);
      }
      window.visualViewport?.addEventListener('resize', scheduleCardPopoverPosition);
      window.visualViewport?.addEventListener('scroll', scheduleCardPopoverPosition);

      // 点击外部关闭下拉菜单
      document.addEventListener('click', (event) => {
        if (!event.target.closest('.device-model-picker')) {
          showDevicePicker.value = false;
        }
        if (!event.target.closest('.export-dropdown')) {
          showExportMenu.value = false;
        }
        if (!event.target.closest('.preview-picker-trigger')) {
          showTemplatePicker.value = false;
          showTypoPicker.value = false;
          showXhsSettings.value = false;
        }
        if (!event.target.closest(CARD_PICKER_BOUNDARY_SELECTOR)) {
          closeCardPicker(false);
        }
      });
      document.addEventListener('keydown', handleDocumentKeydown);

      // 样式刷子：预览区点击带样式段落 → 复制其盒子样式（下次点击「应用样式」写入编辑器光标行）
      document.addEventListener('click', (event) => {
        if (!styleBrushMode.value) return;
        if (!event.target.closest('.preview-content')) return;
        const boxed = event.target.closest('[class*="ogzh-"]');
        if (boxed) setBrushSource(boxed);
      });

      imageStore = new ImageStore();
      try {
        await imageStore.init();
      } catch (error) {
        console.error('ImageStore 初始化失败:', error);
      }

      imageCompressor = new ImageCompressor({ maxWidth: 1920, maxHeight: 1920, quality: 0.85 });
      md = createMarkdownEngine();
      initPasteHandler();

      if (preferences.documents.length > 0) {
        documents.value = preferences.documents.map((doc, index) => buildDocument({ ...doc, sortOrder: doc.sortOrder ?? index }));
      } else if (preferences.content) {
        documents.value = [buildDocument({ content: preferences.content, title: getUntitledTitle([]), manualTitle: '' })];
      } else {
        documents.value = [buildDocument({ content: loadDefaultExample(), title: getUntitledTitle([]), manualTitle: '' })];
      }

      activeDocumentId.value = preferences.activeDocumentId;
      ensureActiveDocument();
      syncEditorFromActiveDocument();
      renderMarkdown();
      persistDocumentState();

      nextTick(() => setupSyncScroll());
    });

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleDocumentKeydown);
      if (cardPopoverWindowResizeHandler) {
        window.removeEventListener('resize', cardPopoverWindowResizeHandler);
        cardPopoverWindowResizeHandler = null;
      }
      window.visualViewport?.removeEventListener('resize', scheduleCardPopoverPosition);
      window.visualViewport?.removeEventListener('scroll', scheduleCardPopoverPosition);
      if (cardPopoverPositionFrame) {
        window.cancelAnimationFrame(cardPopoverPositionFrame);
        cardPopoverPositionFrame = 0;
      }
      cardPopoverResizeObserver?.disconnect();
      cardPopoverResizeObserver = null;
    });

    return {
      // ── Tab State ──
      activeTab,
      showTemplatePicker,
      showTypoPicker,
      showXhsSettings,
      cardStyles: CARD_STYLES,
      cardCategories: CARD_CATEGORIES,
      cardCategoryFilter,
      cardCategoryFilters,
      cardMotionFilter,
      cardMotionFilters,
      filteredCardStyles,
      showCardPicker,
      cardTargetState,
      cardPopoverPosition,
      cardPopoverStyle,
      isMobileCardPopover,
      selectedCardTextLength,
      analyzeCardTarget,
      openCardPicker,
      closeCardPicker,
      handleEditorSelectionChange,
      scheduleCardPopoverPosition,
      applySelectedCard,
      removeSelectedCard,
      getCardPreviewHtml,

      // ── Cover Editor ──
      coverTemplateId,
      coverBackgroundId,
      coverContent,
      coverTypography,
      coverFontOptions,
      coverUndoStack,
      coverRedoStack,
      coverLayerOrder,
      coverOpacity,
      coverSvgOutput,
      coverCategories,
      currentTemplateBackgrounds,
      coverPreviewStyle,
      selectCoverTemplate,
      selectCoverBackground,
      updateCoverTypo: (field, value) => updateCoverTypo(field, value),
      coverUndo,
      coverRedo,
      coverReset,
      toggleCoverLayerOrder,
      exportCoverPng: exportCoverPngAction,
      getCoverTemplatesByCategory,
      getTemplateMeta,
      renderCoverThumb,
      coverTemplateSupports,

      // ── Inline Editing & Drag ──
      coverInlineEdit,
      coverSidebarCollapsed,
      coverFieldOffsets,
      handleCoverTextClick,
      handleCoverMouseDown,
      applyInlineEdit,
      cancelInlineEdit,
      handleInlineEditKeydown,
      toggleCoverSidebar,
      resetCoverFieldOffsets,

      // ── Illustration Picker ──
      coverIllustrationId,
      coverIllustCategory,
      coverIllustrationColor,
      coverIllustrationSvg,
      currentTemplateIllustFit,
      filteredIllustrations,
      illustrationCategories: ILLUSTRATION_CATEGORIES,
      illustrationMarkets: ILLUSTRATION_MARKETS,
      illustrationColorPresets,
      selectIllustration,
      clearIllustration,
      updateIllustrationColor,

      // ── Editor State ──
      markdownInput,
      renderedContent,
      currentStyle,
      starredStyles,
      currentCodeTheme,
      documents,
      activeDocumentId,
      currentDocumentTitle,
      documentSearch,
      filteredDocuments,
      isImageStyleCustom,
      previewMode,
      tocVisible,
      tocItems,
      isDraggingOver,
      copySuccess,
      markdownImportDialog,
      activePanel,
      toastState,
      sidebarOpen,
      deleteConfirm,
      wordCount,
      charCount,
      readTime,
      lastSavedTime,
      currentSaveState,
      syncScrollEnabled,
      editorWidth,
      rightPanelWidth,
      categorizedThemes,
      codeThemeList,
      fontScaleOptions,
      fontFamilyOptions,
      lineHeightOptions,
      letterSpacingOptions,
      contentPaddingOptions,
      imageStyleModeOptions,
      imageEffectOptions,
      endStyleOptions,
      imageRadiusModeOptions,
      codeBlockSettings,
      displaySettings,
      showDevicePicker,
      showExportMenu,
      appTheme,
      switchAppTheme,
      previewDarkMode,
      selectedDevice,
      deviceGroups,
      deviceList,
      selectedDeviceLabel,
      mobilePreviewWidth,
      STYLES,
      renderMarkdown,
      toggleToc,
      scrollToTocHeading,
      doCopy,
      onPaste,
      handleDrop,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      startMarkdownImport,
      handleMarkdownDirectoryUpload,
      startMarkdownFileImport,
      handleMarkdownFileUpload,
      handleSupplementalDirectoryUpload,
      cancelSupplementalDirectoryUpload,
      cancelMarkdownImport,
      confirmMarkdownImport,
      handleToolbarImageUpload,
      resetEditor,
      resetToDefault,
      exportMarkdown,
      exportHTML,
      selectTheme,
      toggleStar,
      selectCodeTheme,
      selectDevice,
      setImageStyleMode,
      setFontScale,
      setFontFamily,
      setImageEffect,
      setEndStyle,
      setImageRadiusMode,
      updateImageMetric,
      updateImageShadowOpacity,
      updateImageShadowColor,
      handleKeydown,
      handleEditorBeforeInput,
      handleEditorInput,
      handleUndo,
      handleRedo,
      canUndo,
      canRedo,
      syncEditorSelection,
      insertHeading,
      insertQuote,
      insertUnderline,
      insertLink,
      insertInlineCode,
      insertOrderedList,
      insertUnorderedList,
      insertCodeBlock,
      insertDivider,
      insertImageSyntax,
      insertTable,
      wrapSelection,
      getStyleName,
      isRecommended,
      getDocumentDisplayTitle: resolveDocumentDisplayTitle,
      formatDateTime,
      switchDocument,
      createNewDocument,
      renameDocument,
      duplicateDocument,
      deleteDocument,
      moveDocument,
      showDeleteConfirm,
      cancelDelete,
      confirmDelete,
      getSaveStateLabel,
      getSaveStateClass,
      togglePanel: (name) => panelManager.toggle(name),

      // ── Style Override (样式覆盖层) ──
      styleTokenDefs,
      styleParamDefs,
      styleBoxDefs,
      quotePresetOptions,
      styleTokenValue,
      styleParamValue,
      styleParamPresetValue,
      styleParamCurrentLabel,
      setStyleToken,
      setStyleParam,
      setStyleParamPreset,
      clearStyleOverride,
      headingFontSizeValue,
      setHeadingFontSize,
      headingColorFollow,
      headingColorValue,
      setHeadingColorFollow,
      setHeadingColor,
      headingBold,
      setHeadingBold,
      resetElement,
      quotePreset,
      setQuotePreset,
      tableHeaderColorValue,
      setTableHeaderColor,
      tableHeaderBold,
      setTableHeaderBold,
      tableZebra,
      setTableZebra,
      hrColorValue,
      setHrColor,
      hrHeightValue,
      setHrHeight,
      insertStyleBox,
      styleBrushMode,
      brushApplying,
      brushStatusLabel,
      toggleStyleBrush,
      applyStyleBrush,

      // ── XHS Image Mode ──
      XHS_FEATURE_ENABLED,
      XHS_THEME_IDS,
      XHS_DENSITIES,
      XHS_DENSITY_LABELS,
      XHS_THEMES,
      XHS_LOGICAL_WIDTH,
      XHS_LOGICAL_HEIGHT,
      XHS_UPLOAD_WARNING_LIMIT,
      contentOutputMode,
      xhsPages,
      xhsPageSummary,
      xhsRenderedPages,
      xhsIsPaginating,
      xhsIssues,
      xhsWarning,
      xhsSelectedPageId,
      xhsSelectedPageIndex,
      xhsHasPreviousPage,
      xhsHasNextPage,
      xhsPreviewMode,
      xhsPreviewScale,
      xhsCoverCandidates,
      xhsExportErrorPageIndexes,
      xhsShowCoverPanel,
      xhsExporting,
      activeXhsSettings,
      setContentOutputMode,
      setXhsPreviewMode,
      selectXhsPage,
      moveXhsSelectedPage,
      handleXhsPreviewKeydown,
      handleXhsRailScroll,
      updateActiveXhsSettings,
      insertXhsPageAtCursor,
      insertXhsPageBeforeBlock,
      removeXhsPageMarker,
      selectXhsCoverImage,
      handleXhsCoverUpload,
      clearXhsCoverImage,
      updateXhsFocalPoint,
      exportSingleXhsPage,
      exportAllXhsPages,
      firstBlockId,
      coverThumbUrl
    };
  }
});

app.mount('#app');
