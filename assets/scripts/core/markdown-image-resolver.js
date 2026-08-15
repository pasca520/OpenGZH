/**
 * Markdown 图片解析器 — 从用户授权的目录精确读取本地图片，存入 IndexedDB，
 * 再把源路径替换为 img:// 协议；远程 CDN 图片同样支持下载本地化。
 * @module markdown-image-resolver
 */

import { fetchRemoteImageBlob } from './remote-image-loader.js';

const INLINE_IMAGE_REGEX = /!\[([^\]]*)\]\(\s*(?:<([^>\n]+)>|((?:\\.|[^()\s])+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
const IMAGE_REFERENCE_REGEX = /!\[([^\]]*)\]\[([^\]]*)\]/g;
const REFERENCE_DEFINITION_REGEX = /^[ \t]{0,3}\[([^\]\n]+)\]:[ \t]*(?:<([^>\n]+)>|(\S+))(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/gm;
const HTML_IMAGE_REGEX = /<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;
const REMOTE_PREFIXES = ['http://', 'https://', '//', 'data:', 'img://', '#'];
const IMAGE_EXTENSION_REGEX = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i;

function isLocalPath(path) {
  const value = String(path || '').trim().toLowerCase();
  return value && !REMOTE_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function isRemotePath(path) {
  const value = String(path || '').trim().toLowerCase();
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//');
}

function createMatch(markdownText, fullMatch, path, alt, matchIndex, kind) {
  const pathOffset = fullMatch.indexOf(path);
  return {
    fullMatch,
    alt,
    path,
    index: matchIndex,
    pathStart: matchIndex + pathOffset,
    pathEnd: matchIndex + pathOffset + path.length,
    kind,
  };
}

/**
 * 按谓词扫描常见 Markdown 与 HTML 图片语法中的图片路径。
 * @param {string} markdownText
 * @param {(path: string) => boolean} isMatch
 * @returns {{ fullMatch: string, alt: string, path: string, index: number, pathStart: number, pathEnd: number, kind: string }[]}
 */
function scanImagePaths(markdownText, isMatch) {
  if (!markdownText) return [];

  const matches = [];
  const imageReferences = new Map();
  let match;

  const inlineRegex = new RegExp(INLINE_IMAGE_REGEX.source, INLINE_IMAGE_REGEX.flags);
  while ((match = inlineRegex.exec(markdownText)) !== null) {
    const path = match[2] || match[3];
    if (isMatch(path)) {
      matches.push(createMatch(markdownText, match[0], path, match[1], match.index, 'inline'));
    }
  }

  const imageReferenceRegex = new RegExp(IMAGE_REFERENCE_REGEX.source, IMAGE_REFERENCE_REGEX.flags);
  while ((match = imageReferenceRegex.exec(markdownText)) !== null) {
    const reference = (match[2] || match[1]).trim().toLowerCase();
    if (reference && !imageReferences.has(reference)) imageReferences.set(reference, match[1]);
  }

  const definitionRegex = new RegExp(REFERENCE_DEFINITION_REGEX.source, REFERENCE_DEFINITION_REGEX.flags);
  while ((match = definitionRegex.exec(markdownText)) !== null) {
    const reference = match[1].trim().toLowerCase();
    const path = match[2] || match[3];
    if (imageReferences.has(reference) && isMatch(path)) {
      matches.push(createMatch(
        markdownText,
        match[0],
        path,
        imageReferences.get(reference),
        match.index,
        'reference'
      ));
    }
  }

  const htmlRegex = new RegExp(HTML_IMAGE_REGEX.source, HTML_IMAGE_REGEX.flags);
  while ((match = htmlRegex.exec(markdownText)) !== null) {
    const path = match[2];
    if (isMatch(path)) {
      const altMatch = match[0].match(/\balt\s*=\s*(["'])(.*?)\1/i);
      matches.push(createMatch(markdownText, match[0], path, altMatch?.[2] || '', match.index, 'html'));
    }
  }

  return matches.sort((left, right) => left.index - right.index);
}

/**
 * 扫描常见 Markdown 与 HTML 图片语法中的本地路径。
 * @param {string} markdownText
 * @returns {{ fullMatch: string, alt: string, path: string, index: number, pathStart: number, pathEnd: number, kind: string }[]}
 */
export function scanLocalImagePaths(markdownText) {
  return scanImagePaths(markdownText, isLocalPath);
}

/**
 * 扫描 Markdown 与 HTML 图片语法中的远程（CDN）图片地址。
 * @param {string} markdownText
 * @returns {{ fullMatch: string, alt: string, path: string, index: number, pathStart: number, pathEnd: number, kind: string }[]}
 */
export function scanRemoteImagePaths(markdownText) {
  return scanImagePaths(markdownText, isRemotePath);
}

/**
 * 将图片路径规范化为授权目录内的相对路径。
 * @param {string} path
 * @returns {string|null}
 */
export function normalizeLocalImagePath(path) {
  let value = String(path || '').trim().replace(/\\/g, '/');

  try {
    value = decodeURIComponent(value);
  } catch (_error) {
    return null;
  }

  if (!value || value.startsWith('/') || /^[a-zA-Z]:\//.test(value) || /^file:/i.test(value)) {
    return null;
  }

  const segments = [];
  for (const segment of value.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.length > 0 ? segments.join('/') : null;
}

/**
 * 从路径中提取文件名。
 * @param {string} filePath
 * @returns {string}
 */
export function extractFilename(filePath) {
  const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSep >= 0 ? filePath.slice(lastSep + 1) : filePath;
}

/**
 * 按扫描结果精确替换图片 URL，不改动 alt、title 或其他 HTML 属性。
 * @param {string} markdownText
 * @param {Record<string, string>} pathMap
 * @param {{ fullMatch: string, alt: string, path: string, index: number, pathStart: number, pathEnd: number, kind: string }[]} scanned
 * @returns {string}
 */
function replaceScannedPaths(markdownText, pathMap, scanned) {
  if (!markdownText || !pathMap || Object.keys(pathMap).length === 0) return markdownText;

  const replacements = scanned
    .filter((item) => Object.prototype.hasOwnProperty.call(pathMap, item.path))
    .sort((left, right) => right.pathStart - left.pathStart);

  let result = markdownText;
  for (const item of replacements) {
    result = `${result.slice(0, item.pathStart)}${pathMap[item.path]}${result.slice(item.pathEnd)}`;
  }
  return result;
}

/**
 * 精确替换扫描到的本地图片路径。
 * @param {string} markdownText
 * @param {Record<string, string>} pathMap
 * @returns {string}
 */
export function replaceImagePaths(markdownText, pathMap) {
  return replaceScannedPaths(markdownText, pathMap, scanLocalImagePaths(markdownText));
}

/**
 * 精确替换扫描到的远程（CDN）图片地址。
 * @param {string} markdownText
 * @param {Record<string, string>} pathMap
 * @returns {string}
 */
export function replaceRemoteImagePaths(markdownText, pathMap) {
  return replaceScannedPaths(markdownText, pathMap, scanRemoteImagePaths(markdownText));
}

function isImageFile(file, sourcePath) {
  return Boolean(file && (file.type?.startsWith('image/') || IMAGE_EXTENSION_REGEX.test(sourcePath)));
}

/**
 * 用 FileSystemDirectoryHandle 创建按路径读取的来源。
 * @param {FileSystemDirectoryHandle} directoryHandle
 */
export function createDirectoryFileSource(directoryHandle) {
  return {
    async getFile(path) {
      const segments = path.split('/').filter(Boolean);
      if (segments.length === 0) return null;

      let current = directoryHandle;
      try {
        for (const segment of segments.slice(0, -1)) {
          current = await current.getDirectoryHandle(segment);
        }
        const handle = await current.getFileHandle(segments.at(-1));
        return await handle.getFile();
      } catch (error) {
        if (error?.name === 'NotFoundError' || error?.name === 'TypeMismatchError') return null;
        throw error;
      }
    },

    async findByFilename(fileName) {
      const found = [];

      async function visit(handle, prefix = '') {
        for await (const [name, child] of handle.entries()) {
          const path = prefix ? `${prefix}/${name}` : name;
          if (child.kind === 'directory') {
            await visit(child, path);
          } else if (name === fileName) {
            found.push({ path, file: await child.getFile() });
          }
        }
      }

      await visit(directoryHandle);
      return found.sort((left, right) => left.path.localeCompare(right.path));
    },
  };
}

/**
 * 用 webkitdirectory 返回的 File 列表创建路径来源。
 * @param {{ path: string, file: File }[]} entries
 */
export function createFileMapSource(entries) {
  const files = new Map();
  for (const entry of entries || []) {
    const normalized = normalizeLocalImagePath(entry.path);
    if (normalized && entry.file) files.set(normalized, entry.file);
  }

  return {
    async getFile(path) {
      return files.get(path) || null;
    },

    async findByFilename(fileName) {
      return Array.from(files.entries())
        .filter(([path]) => extractFilename(path) === fileName)
        .map(([path, file]) => ({ path, file }))
        .sort((left, right) => left.path.localeCompare(right.path));
    },
  };
}

/**
 * 解析 Markdown 中的本地图片引用并写入 ImageStore。
 * @param {string} markdownText
 * @param {Object} deps
 * @returns {Promise<Object>}
 */
export async function resolveLocalImages(markdownText, {
  imageStore,
  imageCompressor,
  createImageId,
  source = null,
  allowBasenameFallback = false,
  promptForSource = true,
}) {
  const scanned = scanLocalImagePaths(markdownText);
  const localImages = Array.from(new Map(scanned.map((item) => [item.path, item])).values());

  if (localImages.length === 0) {
    return { resolvedMarkdown: markdownText, matched: [], unmatched: [], conflicts: [], total: 0 };
  }

  let activeSource = source;
  if (!activeSource) {
    if (!promptForSource) {
      return {
        resolvedMarkdown: markdownText,
        matched: [],
        unmatched: localImages.map((item) => ({ path: item.path, reason: 'no-source' })),
        conflicts: [],
        total: localImages.length,
      };
    }

    if (typeof globalThis.showDirectoryPicker !== 'function') {
      return {
        resolvedMarkdown: markdownText,
        matched: [],
        unmatched: localImages.map((item) => ({ path: item.path, reason: 'directory-unavailable' })),
        conflicts: [],
        total: localImages.length,
        cancelled: true,
      };
    }

    try {
      activeSource = createDirectoryFileSource(await globalThis.showDirectoryPicker({ mode: 'read' }));
    } catch (error) {
      if (error?.name === 'AbortError') {
        return {
          resolvedMarkdown: markdownText,
          matched: [],
          unmatched: localImages.map((item) => ({ path: item.path, reason: 'cancelled' })),
          conflicts: [],
          total: localImages.length,
          cancelled: true,
        };
      }
      throw error;
    }
  }

  const pathMap = {};
  const matched = [];
  const unmatched = [];
  const conflicts = [];

  for (const image of localImages) {
    const normalizedPath = normalizeLocalImagePath(image.path);
    if (!normalizedPath) {
      unmatched.push({ path: image.path, reason: 'outside-root' });
      continue;
    }

    try {
      let file = await activeSource.getFile(normalizedPath);
      let matchedPath = normalizedPath;

      if (!file && allowBasenameFallback && typeof activeSource.findByFilename === 'function') {
        const candidates = await activeSource.findByFilename(extractFilename(normalizedPath));
        if (candidates.length > 1) {
          conflicts.push({ path: image.path, candidates: candidates.map((candidate) => candidate.path) });
          continue;
        }
        if (candidates.length === 1) {
          file = candidates[0].file;
          matchedPath = candidates[0].path;
        }
      }

      if (!file) {
        unmatched.push({ path: image.path, reason: 'not-found' });
        continue;
      }
      if (!isImageFile(file, matchedPath)) {
        unmatched.push({ path: image.path, reason: 'not-image' });
        continue;
      }

      const compressedBlob = await imageCompressor.compress(file);
      const imageId = createImageId();
      await imageStore.saveImage(imageId, compressedBlob, {
        name: image.alt || file.name.replace(/\.[^.]+$/, ''),
        originalName: file.name,
        originalPath: image.path,
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        mimeType: compressedBlob.type || file.type,
      });

      const newPath = `img://${imageId}`;
      pathMap[image.path] = newPath;
      matched.push({ oldPath: image.path, newPath, imageId, fileName: file.name, matchedPath });
    } catch (_error) {
      unmatched.push({ path: image.path, reason: 'import-failed' });
    }
  }

  return {
    resolvedMarkdown: replaceImagePaths(markdownText, pathMap),
    matched,
    unmatched,
    conflicts,
    total: localImages.length,
  };
}

/**
 * 解析 Markdown 中的远程（CDN）图片引用：下载、压缩并写入 ImageStore，
 * 再把原 URL 替换为 img:// 协议，实现图片本地化。下载失败的 URL 保持原样，
 * 复制到公众号时会再次尝试。
 * @param {string} markdownText
 * @param {Object} deps
 * @returns {Promise<Object>}
 */
export async function resolveRemoteImages(markdownText, {
  imageStore,
  imageCompressor,
  createImageId,
  concurrency = 4,
  timeoutMs = 8000,
}) {
  const scanned = scanRemoteImagePaths(markdownText);
  const remoteImages = Array.from(new Map(scanned.map((item) => [item.path, item])).values());

  if (remoteImages.length === 0) {
    return { resolvedMarkdown: markdownText, matched: [], failed: [], total: 0 };
  }

  const pathMap = {};
  const matched = [];
  const failed = [];
  let nextIndex = 0;

  async function processImage(image) {
    try {
      const blob = await fetchRemoteImageBlob(image.path, { timeoutMs });
      if (!blob || !blob.size || !String(blob.type || '').startsWith('image/')) {
        throw new Error('非图片响应');
      }

      const compressedBlob = await imageCompressor.compress(blob);
      const imageId = createImageId();
      await imageStore.saveImage(imageId, compressedBlob, {
        name: image.alt || extractFilename(image.path) || '网络图片',
        originalName: extractFilename(image.path),
        originalPath: image.path,
        originalSize: blob.size,
        compressedSize: compressedBlob.size,
        mimeType: compressedBlob.type || blob.type,
      });

      const newPath = `img://${imageId}`;
      pathMap[image.path] = newPath;
      matched.push({ oldPath: image.path, newPath, imageId });
    } catch (error) {
      failed.push({ path: image.path, reason: error?.message || '下载失败' });
    }
  }

  async function worker() {
    while (nextIndex < remoteImages.length) {
      const image = remoteImages[nextIndex];
      nextIndex += 1;
      await processImage(image);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, remoteImages.length) }, () => worker()));

  return {
    resolvedMarkdown: replaceRemoteImagePaths(markdownText, pathMap),
    matched,
    failed,
    total: remoteImages.length,
  };
}
