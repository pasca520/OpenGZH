import { createHistoryStack } from '../core/history-stack.js';
import { COVER_TEMPLATES, TEMPLATE_META } from './templates.js';
import {
  renderCover,
  getTemplate,
  getTemplates,
  getCategories,
  DEFAULT_TYPOGRAPHY,
  DEFAULT_COVER_CONTENT
} from './renderer.js';
import { exportCoverPng as doExportCoverPng } from './export-png.js';
import {
  ILLUSTRATION_CATEGORIES,
  ILLUSTRATION_MARKETS,
  loadIllustrationRegistry,
  getIllustration,
  getIllustrationsByCategory
} from './illustration-registry.js';
import { loadIllustrationSvg, replaceIllustrationColor } from './illustration-color.js';

const COVER_FIELDS = ['tag', 'title', 'subtitle', 'author', 'issueNumber'];
const COVER_SANS_FALLBACK = "'PingFang SC', 'Microsoft YaHei', sans-serif";
const COVER_SERIF_FALLBACK = "'Songti SC', 'SimSun', serif";

export function useCoverEditor({ Vue, toast }) {
  const { ref, reactive, computed, nextTick } = Vue;

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
  const coverFontOptions = [
    { label: '系统默认', value: `system-ui, -apple-system, ${COVER_SANS_FALLBACK}` },
    { label: '思源黑体', value: `'Noto Sans SC', ${COVER_SANS_FALLBACK}` },
    { label: '思源宋体', value: `'Noto Serif SC', ${COVER_SERIF_FALLBACK}` },
    { label: '霞鹜文楷', value: `'LXGW WenKai', ${COVER_SANS_FALLBACK}` },
    { label: 'ZCOOL 小薇', value: `'ZCOOL XiaoWei', ${COVER_SANS_FALLBACK}` },
    { label: '站酷快乐体', value: `'ZCOOL KuaiLe', ${COVER_SANS_FALLBACK}` },
    { label: '站酷庆黄油', value: `'ZCOOL QingKe HuangYou', ${COVER_SANS_FALLBACK}` },
    { label: 'Ma Shan Zheng', value: `'Ma Shan Zheng', ${COVER_SANS_FALLBACK}` },
    { label: '刘健毛草', value: `'Liu Jian Mao Cao', ${COVER_SANS_FALLBACK}` },
    { label: '龙藏体', value: `'Long Cang', ${COVER_SANS_FALLBACK}` },
    { label: 'Fraunces', value: `'Fraunces', 'Noto Serif SC', ${COVER_SERIF_FALLBACK}` },
    { label: 'Plus Jakarta Sans', value: `'Plus Jakarta Sans', 'Noto Sans SC', ${COVER_SANS_FALLBACK}` }
  ];
  const coverUndoStack = ref([]);
  const coverRedoStack = ref([]);
  const coverLayerOrder = ref('text-top');
  const coverOpacity = ref(100);
  const coverIllustrationId = ref('');
  const coverIllustCategory = ref('tech');
  const coverIllustrationColor = ref('#6366F1');
  const coverIllustrationSvg = ref('');
  const coverIllustrationRegistryReady = ref(false);
  const coverSidebarCollapsed = ref(false);
  const coverInlineEdit = reactive({
    active: false,
    field: null,
    value: '',
    x: 0,
    y: 0,
    width: 0,
    minHeight: 0,
    fontSize: '16px',
    fontFamily: 'inherit',
    fontWeight: 'normal',
    color: '#000',
    textAlign: 'center',
    letterSpacing: '0px',
    lineHeight: '1.3'
  });
  const coverFieldOffsets = reactive({
    tag: { x: 0, y: 0 },
    title: { x: 0, y: 0 },
    subtitle: { x: 0, y: 0 },
    author: { x: 0, y: 0 },
    issueNumber: { x: 0, y: 0 }
  });

  const illustrationColorPresets = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316',
    '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
    '#1E293B', '#64748B'
  ];
  const DRAG_THRESHOLD = 3;
  let coverDrag = null;
  let illustrationRegistryPromise = null;
  let restoringCover = false;

  function applyFieldOffsetsToDom() {
    const svg = document.querySelector('.cover-preview-frame svg');
    if (!svg) return;
    for (const [field, offset] of Object.entries(coverFieldOffsets)) {
      const els = svg.querySelectorAll(`[data-field="${field}"]`);
      els.forEach((el) => {
        if (offset.x === 0 && offset.y === 0) {
          el.removeAttribute('transform');
        } else {
          el.setAttribute('transform', `translate(${offset.x}, ${offset.y})`);
        }
      });
    }
  }

  function handleCoverTextClick(event) {
    const target = event.target.closest('[data-field]');
    if (!target) return;

    const svg = target.closest('svg');
    if (!svg) return;

    const field = target.getAttribute('data-field');
    if (!COVER_FIELDS.includes(field)) return;

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

    let leftSvg = Infinity;
    let topSvg = Infinity;
    let bottomSvg = -Infinity;
    let maxTextLen = 0;
    allLines.forEach((el) => {
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
      topSvg = Math.min(topSvg, ty - fs);
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
      fontSize: `${svgFontSize * Math.min(svgToScreenX, svgToScreenY)}px`,
      fontFamily: firstEl.getAttribute('font-family') || 'inherit',
      fontWeight: firstEl.getAttribute('font-weight') || 'normal',
      color: firstEl.getAttribute('fill') || '#000',
      textAlign: textAlignMap[textAnchor] || 'left',
      letterSpacing: `${svgLetterSpacing * svgToScreenX}px`,
      lineHeight: (rawLineHeight / svgFontSize).toFixed(2)
    });

    nextTick(() => {
      const input = document.querySelector('.cover-inline-editor textarea');
      if (input) {
        input.style.height = 'auto';
        input.style.height = `${input.scrollHeight}px`;
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

  function handleCoverMouseDown(event) {
    const target = event.target.closest('[data-field]');
    if (!target) return;
    const field = target.getAttribute('data-field');
    if (!COVER_FIELDS.includes(field)) return;

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
    els.forEach((el) => el.setAttribute('transform', `translate(${offsetX}, ${offsetY})`));
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

  const coverSvgOutput = computed(() => renderCover(
    coverTemplateId.value,
    {
      ...coverContent,
      backgroundId: coverBackgroundId.value,
      illustrationSvg: coverIllustrationSvg.value,
      illustrationOpacity: coverOpacity.value / 100,
      layerOrder: coverLayerOrder.value
    },
    { ...coverTypography }
  ));

  const coverCategories = computed(() => getCategories());
  const currentTemplateBackgrounds = computed(() => getTemplate(coverTemplateId.value)?.backgrounds || []);
  const coverPreviewStyle = computed(() => ({ aspectRatio: '900 / 383' }));

  function getCoverTemplatesByCategory(category) {
    return getTemplates(category);
  }

  function renderCoverThumb(templateId) {
    return renderCover(
      templateId,
      { tag: '标签', title: '标题预览', subtitle: '副标题', author: '作者' },
      { ...DEFAULT_TYPOGRAPHY, titleSize: 36, subtitleSize: 16, tagSize: 10, authorSize: 10 }
    );
  }

  function getTemplateMeta(templateId) {
    return TEMPLATE_META[templateId] || null;
  }

  function coverTemplateSupports(field) {
    const template = COVER_TEMPLATES.find((item) => item.id === coverTemplateId.value);
    return template ? template.elements[field] : false;
  }

  const currentTemplateIllustFit = computed(() => {
    const template = COVER_TEMPLATES.find((item) => item.id === coverTemplateId.value);
    return template?.illustFit || null;
  });

  const filteredIllustrations = computed(() => {
    if (!coverIllustrationRegistryReady.value) return [];
    let list = getIllustrationsByCategory(coverIllustCategory.value);
    const fit = currentTemplateIllustFit.value;
    if (fit) list = list.filter((item) => item.fit && item.fit.includes(fit));
    return list;
  });

  async function ensureIllustrationRegistry() {
    if (coverIllustrationRegistryReady.value) return;
    if (!illustrationRegistryPromise) {
      illustrationRegistryPromise = loadIllustrationRegistry()
        .then(() => { coverIllustrationRegistryReady.value = true; })
        .finally(() => { illustrationRegistryPromise = null; });
    }
    await illustrationRegistryPromise;
  }

  async function selectIllustration(id) {
    await ensureIllustrationRegistry();
    pushCoverUndo();
    coverIllustrationId.value = id;
    const illustration = getIllustration(id);
    if (illustration) {
      coverIllustrationColor.value = illustration.defaultColor || '#6366F1';
      coverIllustrationSvg.value = await loadIllustrationSvg(illustration.path);
    }
  }

  function clearIllustration() {
    pushCoverUndo();
    coverIllustrationId.value = '';
    coverIllustrationSvg.value = '';
  }

  async function updateIllustrationColor(color) {
    coverIllustrationColor.value = color;
    if (!coverIllustrationId.value) return;
    const illustration = getIllustration(coverIllustrationId.value);
    if (!illustration) return;
    const originalSvg = await loadIllustrationSvg(illustration.path);
    coverIllustrationSvg.value = replaceIllustrationColor(originalSvg, color);
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

  const coverHistory = createHistoryStack({
    undoStack: coverUndoStack,
    redoStack: coverRedoStack,
    limit: 50,
    clone: (snapshot) => JSON.parse(JSON.stringify(snapshot))
  });

  function restoreCoverState(state) {
    restoringCover = true;
    const savedTemplate = COVER_TEMPLATES.find((item) => item.id === state.templateId);
    coverTemplateId.value = savedTemplate ? state.templateId : 'pure-white';
    const savedBackgrounds = savedTemplate?.backgrounds || [];
    coverBackgroundId.value = savedBackgrounds.some((item) => item.id === state.backgroundId)
      ? state.backgroundId
      : (savedBackgrounds[0]?.id || 'midnight-prism');
    Object.assign(coverContent, state.content || DEFAULT_COVER_CONTENT);
    Object.assign(coverTypography, state.typography || DEFAULT_TYPOGRAPHY);
    if (state.fieldOffsets) {
      for (const [key, value] of Object.entries(state.fieldOffsets)) {
        if (coverFieldOffsets[key]) Object.assign(coverFieldOffsets[key], value);
      }
    } else {
      resetCoverFieldOffsets();
    }
    coverIllustrationId.value = state.illustrationId || '';
    coverIllustrationColor.value = state.illustrationColor || coverIllustrationColor.value;
    coverLayerOrder.value = state.layerOrder || 'text-top';
    coverOpacity.value = Number.isFinite(Number(state.opacity)) ? Number(state.opacity) : 100;

    if (coverIllustrationId.value) {
      const illustration = getIllustration(coverIllustrationId.value);
      if (illustration) {
        loadIllustrationSvg(illustration.path).then((svg) => {
          coverIllustrationSvg.value = replaceIllustrationColor(svg, coverIllustrationColor.value);
        });
      }
    } else {
      coverIllustrationSvg.value = '';
    }

    nextTick(() => { restoringCover = false; });
  }

  function pushCoverUndo() {
    coverHistory.push(getCoverStateSnapshot());
  }

  function selectCoverTemplate(id) {
    const template = getTemplate(id);
    if (!template) return;
    pushCoverUndo();
    coverTemplateId.value = id;
    if (template.backgrounds?.length && !template.backgrounds.some((item) => item.id === coverBackgroundId.value)) {
      coverBackgroundId.value = template.backgrounds[0].id;
    }
  }

  function selectCoverBackground(id) {
    if (id === coverBackgroundId.value || !currentTemplateBackgrounds.value.some((item) => item.id === id)) return;
    pushCoverUndo();
    coverBackgroundId.value = id;
  }

  function updateCoverTypo(field, value) {
    pushCoverUndo();
    coverTypography[field] = Number(value);
  }

  function coverUndo() {
    const state = coverHistory.undo(getCoverStateSnapshot());
    if (state) restoreCoverState(state);
  }

  function coverRedo() {
    const state = coverHistory.redo(getCoverStateSnapshot());
    if (state) restoreCoverState(state);
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

  function resetCoverToDefault() {
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
    } catch (error) {
      console.error('导出失败:', error);
      toast.show(`导出失败: ${error.message}`, 'error');
    }
  }

  function dispose() {
    document.removeEventListener('mousemove', onDragMouseMove);
    document.removeEventListener('mouseup', onDragMouseUp);
    coverDrag = null;
  }

  return {
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
    updateCoverTypo,
    coverUndo,
    coverRedo,
    coverReset,
    resetCoverToDefault,
    toggleCoverLayerOrder,
    exportCoverPngAction,
    getCoverTemplatesByCategory,
    getTemplateMeta,
    renderCoverThumb,
    coverTemplateSupports,
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
    coverIllustrationId,
    coverIllustCategory,
    coverIllustrationColor,
    coverIllustrationSvg,
    currentTemplateIllustFit,
    filteredIllustrations,
    illustrationCategories: ILLUSTRATION_CATEGORIES,
    illustrationMarkets: ILLUSTRATION_MARKETS,
    illustrationColorPresets,
    ensureIllustrationRegistry,
    selectIllustration,
    clearIllustration,
    updateIllustrationColor,
    applyFieldOffsetsToDom,
    isRestoring: () => restoringCover,
    dispose
  };
}
