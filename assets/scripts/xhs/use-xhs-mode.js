import {
  createDefaultXhsSettings,
  normalizeXhsSettings,
  XHS_FEATURE_ENABLED,
  XHS_LOGICAL_WIDTH,
  XHS_LOGICAL_HEIGHT,
  XHS_UPLOAD_WARNING_LIMIT,
  XHS_THEME_IDS,
  XHS_DENSITIES
} from './constants.js';
import {
  calculateXhsPreviewScale,
  normalizeXhsPreviewMode,
  resolveXhsPageSelection,
  stepXhsPageSelection
} from './preview-navigation.js';
import { insertPageMarker, removePageMarker } from './page-markers.js';
import { parseXhsDocument } from './semantic-parser.js';
import { paginateXhsDocument } from './paginator.js';
import { createXhsDomMeasurer, renderXhsStack } from './renderer.js';
import { summarizeXhsPages } from './page-summary.js';
import { XHS_THEMES } from './themes.js';
import { exportXhsPage, exportXhsSet } from './exporter.js';

export function mergeXhsSettings(current, patch) {
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

export function useXhsMode({
  Vue,
  getMarkdown,
  setMarkdown,
  getEditorSelection,
  getTextarea,
  getActiveDocument,
  getMarkdownEngine,
  getImageStore,
  resolveDocumentDisplayTitle,
  schedulePersist,
  handleImageUpload,
  toast,
  closeSettings = () => {}
}) {
  const { ref, computed, nextTick } = Vue;
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
  const activeXhsSettings = computed(() => getActiveDocument()?.xhs || createDefaultXhsSettings());
  const xhsSelectedPageIndex = computed(() => (
    resolveXhsPageSelection(xhsPages.value, xhsSelectedPageId.value, 0).index
  ));
  const xhsHasPreviousPage = computed(() => xhsSelectedPageIndex.value > 0);
  const xhsHasNextPage = computed(() => (
    xhsSelectedPageIndex.value >= 0 && xhsSelectedPageIndex.value < xhsPages.value.length - 1
  ));

  let xhsPaginationTimer = null;
  let xhsPaginationRevision = 0;
  let xhsScrollSelectionTimer = null;
  let xhsPreviewObserver = null;
  let xhsMeasureStageEl = null;
  const xhsPreviewUrlCache = new Map();

  function updateActiveXhsSettings(patch) {
    const doc = getActiveDocument();
    if (!doc) return;
    doc.xhs = normalizeXhsSettings(mergeXhsSettings(doc.xhs, patch));
    doc.updatedAt = Date.now();
    doc.dirty = true;
    schedulePersist();
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
      const store = getImageStore();
      if (!store) return Promise.resolve(null);
      return store.getImageBlob(id)
        .then((blob) => {
          if (!blob) return null;
          const url = URL.createObjectURL(blob);
          xhsPreviewUrlCache.set(ref, url);
          return url;
        })
        .catch(() => null);
    }
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
    const md = getMarkdownEngine();
    if (!md) {
      return {
        pages: [],
        meta: { title: '', summary: '' },
        images: [],
        issues: [{ code: 'pagination-failed', pageIndex: 0, message: '编辑器尚未就绪，请稍后重试。', blockId: null }]
      };
    }
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
    xhsCoverCandidates.value = await Promise.all(candidates.map(async (image) => ({
      ...image,
      url: await resolveXhsPreviewUrl(image.src)
    })));
  }

  function setXhsPreviewMode(mode) {
    xhsPreviewMode.value = normalizeXhsPreviewMode(mode);
    nextTick(() => {
      setupXhsPreviewObserver();
      selectXhsPage(xhsSelectedPageId.value, { behavior: 'auto' });
    });
  }

  function selectXhsPage(pageId, { scroll = true, behavior = 'smooth' } = {}) {
    const selection = resolveXhsPageSelection(xhsPages.value, pageId, xhsSelectedPageIndex.value);
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
    const selection = stepXhsPageSelection(xhsPages.value, xhsSelectedPageId.value, delta);
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
    if (closestShell?.dataset.pageId) xhsSelectedPageId.value = closestShell.dataset.pageId;
  }

  function handleXhsRailScroll(event) {
    if (xhsPreviewMode.value !== 'horizontal') return;
    clearTimeout(xhsScrollSelectionTimer);
    xhsScrollSelectionTimer = setTimeout(() => syncXhsSelectedPageFromRail(event.currentTarget), 100);
  }

  function restoreSelectedXhsPage(fallbackIndex = 0) {
    const selection = resolveXhsPageSelection(xhsPages.value, xhsSelectedPageId.value, fallbackIndex);
    xhsSelectedPageId.value = selection.page?.id || null;
    if (selection.page) selectXhsPage(selection.page.id, { behavior: 'auto' });
  }

  function scheduleXhsPagination(delay = 450) {
    clearTimeout(xhsPaginationTimer);
    if (contentOutputMode.value !== 'image') return;
    xhsIsPaginating.value = true;
    const revision = ++xhsPaginationRevision;
    xhsPaginationTimer = setTimeout(async () => {
      const previousSelectedIndex = xhsSelectedPageIndex.value;
      const result = await buildXhsPages(getMarkdown(), activeXhsSettings.value);
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
    xhsPreviewObserver?.disconnect();
    xhsPreviewObserver = null;
  }

  function setContentOutputMode(mode) {
    if (mode !== 'text' && mode !== 'image') return;
    closeSettings();
    contentOutputMode.value = mode;
    if (mode === 'image') {
      nextTick(() => {
        setupXhsPreviewObserver();
        scheduleXhsPagination(0);
      });
      return;
    }
    teardownXhsPreviewObserver();
    clearTimeout(xhsPaginationTimer);
    clearTimeout(xhsScrollSelectionTimer);
    xhsIsPaginating.value = false;
    xhsWarning.value = '';
    xhsShowCoverPanel.value = false;
    revokeXhsPreviewUrls();
    xhsCoverCandidates.value = [];
  }

  function insertXhsPageAtCursor() {
    const result = insertPageMarker(getMarkdown(), getEditorSelection().start);
    setMarkdown(result.markdown);
    nextTick(() => getTextarea()?.focus());
  }

  function insertXhsPageBeforeBlock(blockId) {
    const block = xhsPages.value.flatMap((page) => page.blocks).find((item) => item.id === blockId);
    if (block) setMarkdown(insertPageMarker(getMarkdown(), block.sourceStart).markdown);
  }

  function removeXhsPageMarker(markerStart) {
    setMarkdown(removePageMarker(getMarkdown(), markerStart).markdown);
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
    if (first) toast.show(first.message || '导出失败', 'error', 6000);
  }

  function firstBlockId(page) {
    return page.blocks[0]?.id || null;
  }

  function coverThumbUrl(ref) {
    return xhsCoverCandidates.value.find((candidate) => candidate.src === ref)?.url || '';
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

  async function exportSingleXhsPage(pageId) {
    const page = xhsPages.value.find((item) => item.id === pageId);
    const card = document.querySelector(`.xhs-card[data-page-id="${CSS.escape(pageId)}"]`);
    if (!page || !card) return;
    xhsExportErrorPageIndexes.value = [];
    xhsExporting.value = true;
    try {
      const result = await exportXhsPage(card, page, {
        validateRuntime: { imageStore: getImageStore() },
        rasterizeOptions: { mediaOptions: { imageStore: getImageStore() } }
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
    try {
      const result = await exportXhsSet(cards, { articleTitle: resolveDocumentDisplayTitle(getActiveDocument()) }, {
        validateRuntime: { imageStore: getImageStore() },
        rasterizeOptions: { mediaOptions: { imageStore: getImageStore() } }
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

  function dispose() {
    clearTimeout(xhsPaginationTimer);
    clearTimeout(xhsScrollSelectionTimer);
    teardownXhsPreviewObserver();
    revokeXhsPreviewUrls();
    xhsMeasureStageEl?.remove();
    xhsMeasureStageEl = null;
  }

  return {
    XHS_FEATURE_ENABLED,
    XHS_LOGICAL_WIDTH,
    XHS_LOGICAL_HEIGHT,
    XHS_UPLOAD_WARNING_LIMIT,
    XHS_THEME_IDS,
    XHS_DENSITIES,
    XHS_THEMES,
    XHS_DENSITY_LABELS,
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
    scheduleXhsPagination,
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
    coverThumbUrl,
    dispose
  };
}
