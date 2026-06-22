/**
 * Application entrypoint.
 * @module main
 */

import { ImageStore } from './core/image-store.js';
import { ImageCompressor } from './core/image-compressor.js';
import { createMarkdownEngine } from './core/markdown-engine.js';
import { createTurndownService, createPasteHandler } from './core/paste-handler.js';
import { renderPipeline } from './core/render-pipeline.js';
import { copyToWechat } from './export/clipboard-exporter.js';
import { getCategorizedThemes, getStyleName, isRecommended, getStarredStyles, toggleStarStyle } from './ui/theme-manager.js';
import {
  getCodeThemeList,
  FOLLOW_THEME_CODE_STYLE,
  isCodeThemeSelection,
  resolveCodeTheme
} from './ui/code-themes.js';
import { createToast } from './ui/toast.js';
import { createPanelManager } from './ui/panel-manager.js';
import { loadPreferences, savePreferences, debounceSaveContent, getDefaultCodeBlockSettings, getDefaultDisplaySettings } from './storage/preferences.js';
import { STYLES } from '../styles/themes/index.js';
import { COVER_TEMPLATES, TEMPLATE_META } from './cover/templates.js';
import { renderCover, getTemplates, getCategories, DEFAULT_TYPOGRAPHY, DEFAULT_COVER_CONTENT } from './cover/renderer.js';
import { exportCoverPng as doExportCoverPng } from './cover/export-png.js';
import { DEFAULT_ILLUSTRATIONS, ILLUSTRATION_CATEGORIES, ILLUSTRATION_MARKETS, getIllustration, getIllustrationsByCategory, getAllIllustrations } from './cover/illustration-registry.js';
import { loadIllustrationSvg, replaceIllustrationColor, extractPrimaryColor } from './cover/illustration-color.js';
import { resolveLocalImages } from './core/markdown-image-resolver.js';

const { createApp, ref, reactive, watch, nextTick, onMounted, computed } = window.Vue;

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

const showDevicePicker = ref(false);
const showExportMenu = ref(false);
const previewDarkMode = ref(false);
const selectedDevice = ref('iphone-17-pro');

// ── Tab State ──
const activeTab = ref('editor');

// ── Editor Toolbar Pickers ──
const showTemplatePicker = ref(false);
const showTypoPicker = ref(false);

// ── Cover Editor State ──
const coverTemplateId = ref('pure-white');
const coverContent = reactive({
  tag: '技术分享',
  title: '用 AI 构建公众号封面工具',
  subtitle: '开箱即用，亦可自由迭代',
  author: '@OpenGZH',
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
const coverFontOptions = [
  { label: '系统默认', value: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { label: '思源黑体', value: "'Noto Sans SC', sans-serif" },
  { label: '思源宋体', value: "'Noto Serif SC', serif" },
  { label: '霞鹜文楷', value: "'LXGW WenKai', cursive" },
  { label: 'ZCOOL 小薇', value: "'ZCOOL XiaoWei', sans-serif" },
  { label: '站酷快乐体', value: "'ZCOOL KuaiLe', sans-serif" },
  { label: '站酷庆黄油', value: "'ZCOOL QingKe HuangYou', sans-serif" },
  { label: 'Ma Shan Zheng', value: "'Ma Shan Zheng', cursive" },
  { label: '刘健毛草', value: "'Liu Jian Mao Cao', cursive" },
  { label: '龙藏体', value: "'Long Cang', cursive" },
  { label: 'Fraunces', value: "'Fraunces', 'Noto Serif SC', serif" },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', 'Noto Sans SC', sans-serif" }
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
const editorSelection = ref({ start: 0, end: 0 });

const categorizedThemes = ref(getCategorizedThemes());
const codeThemeList = getCodeThemeList();
const fontScaleOptions = [
  { label: '更小', value: 0.75, meta: '0.75x' },
  { label: '稍小', value: 0.85, meta: '0.85x' },
  { label: '推荐', value: 1, meta: '1.0x' },
  { label: '稍大', value: 1.15, meta: '1.15x' },
  { label: '更大', value: 1.3, meta: '1.3x' },
  { label: '超大', value: 1.5, meta: '1.5x' }
];
const fontFamilyOptions = [
  { label: '跟随模板', value: 'theme', meta: '保留风格' },
  { label: '非衬线', value: 'sans', meta: '现代清晰' },
  { label: '衬线', value: 'serif', meta: '长文质感' },
  { label: '等宽', value: 'mono', meta: '技术文档' }
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
  dirty = false
} = {}) {
  return {
    id,
    manualTitle,
    title,
    content,
    createdAt,
    updatedAt,
    sortOrder,
    dirty
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
  currentDocumentTitle.value = activeDoc ? (activeDoc.manualTitle || '') : '';
  editorSelection.value = { start: 0, end: 0 };
  updateStats();
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
}

function createNewDocument(content = '', manualTitle = '') {
  const doc = buildDocument({
    manualTitle,
    title: manualTitle || getUntitledTitle(),
    content,
    sortOrder: documents.value.length
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
    sortOrder: documents.value.length
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

async function handleImageUpload(file, textarea) {
  if (!file.type.startsWith('image/')) {
    toast.show('请上传图片文件', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    toast.show('图片大小不能超过 10MB', 'error');
    return;
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

    const markdownImage = `![${imageName}](img://${imageId})`;
    insertAtCursor(markdownImage, {
      textarea,
      selectionStart: markdownImage.length
    });

    if (compressionRatio > 10) {
      toast.show(`已保存 (${ImageCompressor.formatSize(originalSize)} → ${ImageCompressor.formatSize(compressedSize)})`, 'success');
    } else {
      toast.show(`已保存 (${ImageCompressor.formatSize(compressedSize)})`, 'success');
    }
  } catch (error) {
    console.error('图片处理失败:', error);
    toast.show(`图片处理失败: ${error.message}`, 'error');
  }
}

function initPasteHandler() {
  turndownService = createTurndownService();
  pasteHandler = createPasteHandler({
    turndownService,
    handleImageUpload,
    showToast: (message, type) => toast.show(message, type),
    getInput: () => markdownInput.value,
    setInput: (value) => { markdownInput.value = value; },
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

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileTitle = file.name.replace(/\.(md|markdown)$/i, '');
  let content;

  try {
    content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result || '');
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  } catch (_error) {
    toast.show('文件读取失败', 'error');
    event.target.value = '';
    return;
  }

  if (!imageStore) {
    createNewDocument(content, fileTitle);
    event.target.value = '';
    return;
  }

  try {
    const result = await resolveLocalImages(content, {
      imageStore,
      imageCompressor,
      createImageId: () => createDocumentId('img'),
    });

    if (result.total > 0) {
      if (result.cancelled) {
        toast.show(`检测到 ${result.total} 张本地图片，已跳过导入`, 'info');
      } else if (result.unmatched.length === 0) {
        toast.show(`已导入 ${result.matched.length} 张本地图片`, 'success');
      } else {
        toast.show(
          `已导入 ${result.matched.length} 张图片，${result.unmatched.length} 张未在目录中找到`,
          'info'
        );
      }
    }

    createNewDocument(result.resolvedMarkdown, fileTitle);
  } catch (error) {
    console.error('图片解析失败:', error);
    toast.show(`图片解析失败: ${error.message}`, 'error');
    createNewDocument(content, fileTitle);
  }

  event.target.value = '';
}

function exportMarkdown() {
  const activeDoc = getActiveDocument();
  const blob = new Blob([markdownInput.value], { type: 'text/markdown' });
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
  markdownInput.value = '';
  persistDocumentState();
  toast.show('已清空编辑器内容', 'info');
}

function resetToDefault() {
  markdownInput.value = loadDefaultExample();
  coverTemplateId.value = 'pure-white';
  Object.assign(coverContent, {
    tag: '技术分享',
    title: '用 AI 构建公众号封面工具',
    subtitle: '开箱即用，亦可自由迭代',
    author: '@OpenGZH',
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
  const styleConfig = STYLES[currentStyle.value];
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

function syncEditorSelection(event) {
  const textarea = event?.target || getTextarea();
  if (!textarea) return;

  editorSelection.value = {
    start: textarea.selectionStart ?? 0,
    end: textarea.selectionEnd ?? 0
  };
}

function getEditorSelection(textarea = getTextarea()) {
  if (!textarea) {
    return {
      start: editorSelection.value.start ?? 0,
      end: editorSelection.value.end ?? 0
    };
  }

  if (document.activeElement === textarea) {
    syncEditorSelection({ target: textarea });
  }

  return {
    start: editorSelection.value.start ?? 0,
    end: editorSelection.value.end ?? 0
  };
}

function insertAtCursor(text, options = {}) {
  const textarea = options.textarea || getTextarea();
  const { start, end } = getEditorSelection(textarea);
  const before = markdownInput.value.slice(0, start);
  const after = markdownInput.value.slice(end);

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

function handleKeydown(event) {
  const isMod = event.ctrlKey || event.metaKey;

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

- **35 套精选模板**，涵盖深色、浅色、渐变、几何、插画等风格
- **73 幅精选插画**，支持自定义颜色替换
- 自由调整标题、副标题、标签的 **字体、字号、行高、字间距**
- 导出 **2400 × 960** 高清 PNG

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
| 封面模板 | 35 套 + 73 幅插画 | 场景标签辅助选择 |
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
      illustrationSvg: coverIllustrationSvg.value,
      illustrationOpacity: coverOpacity.value / 100,
      layerOrder: coverLayerOrder.value
    },
    { ...coverTypography }
  );
});

const coverCategories = computed(() => getCategories());

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
  coverTemplateId.value = state.templateId || 'pure-white';
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
  pushCoverUndo();
  coverTemplateId.value = id;
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
        }
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

    return {
      // ── Tab State ──
      activeTab,
      showTemplatePicker,
      showTypoPicker,

      // ── Cover Editor ──
      coverTemplateId,
      coverContent,
      coverTypography,
      coverFontOptions,
      coverUndoStack,
      coverRedoStack,
      coverLayerOrder,
      coverOpacity,
      coverSvgOutput,
      coverCategories,
      coverPreviewStyle,
      selectCoverTemplate,
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
      imageStyleModeOptions,
      imageEffectOptions,
      imageRadiusModeOptions,
      codeBlockSettings,
      displaySettings,
      showDevicePicker,
      showExportMenu,
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
      handleFileUpload,
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
      setImageRadiusMode,
      updateImageMetric,
      updateImageShadowOpacity,
      updateImageShadowColor,
      handleKeydown,
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
      togglePanel: (name) => panelManager.toggle(name)
    };
  }
});

app.mount('#app');
