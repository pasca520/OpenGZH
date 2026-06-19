/**
 * Markdown 图片解析器 — 扫描 .md 文件中的本地图片引用，通过 File System Access API
 * 让用户选择图片文件夹，自动匹配并存入 IndexedDB，替换路径为 img:// 协议。
 * @module markdown-image-resolver
 */

const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

const REMOTE_PREFIXES = ['http://', 'https://', 'data:', 'img://', '#'];

/**
 * 检测图片路径是否为本地路径（非远程 URL、非 Data URI、非 img:// 协议、非锚点）
 * @param {string} path
 * @returns {boolean}
 */
function isLocalPath(path) {
  return !REMOTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * 扫描 Markdown 文本中的本地图片引用
 * @param {string} markdownText
 * @returns {{ fullMatch: string, alt: string, path: string, index: number }[]}
 */
export function scanLocalImagePaths(markdownText) {
  if (!markdownText) return [];

  const matches = [];
  let match;

  while ((match = IMAGE_REGEX.exec(markdownText)) !== null) {
    const path = match[2];
    if (isLocalPath(path)) {
      matches.push({
        fullMatch: match[0],
        alt: match[1],
        path,
        index: match.index,
      });
    }
  }

  return matches;
}

/**
 * 从路径中提取文件名（最后一个路径分隔符之后的部分）
 * 支持正斜杠和反斜杠
 * @param {string} filePath
 * @returns {string}
 */
export function extractFilename(filePath) {
  const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSep >= 0 ? filePath.slice(lastSep + 1) : filePath;
}

/**
 * 替换 Markdown 文本中的图片路径
 * @param {string} markdownText
 * @param {Record<string, string>} pathMap — 旧路径 → 新路径的映射
 * @returns {string}
 */
export function replaceImagePaths(markdownText, pathMap) {
  if (!markdownText || !pathMap || Object.keys(pathMap).length === 0) {
    return markdownText;
  }

  const regex = new RegExp(IMAGE_REGEX.source, IMAGE_REGEX.flags);

  return markdownText.replace(regex, (fullMatch, alt, path, ...rest) => {
    if (pathMap.hasOwnProperty(path)) {
      // 从 fullMatch 中提取可选 title 部分
      const titleMatch = fullMatch.match(/\([^)]+\s+"([^"]*)"\)$/);
      const title = titleMatch ? ` "${titleMatch[1]}"` : '';
      return `![${alt}](${pathMap[path]}${title})`;
    }
    return fullMatch;
  });
}

/**
 * 解析 Markdown 中的本地图片引用，通过 File System Access API 让用户选择图片目录，
 * 自动匹配文件名并存入 IndexedDB，替换为 img:// 协议。
 *
 * @param {string} markdownText
 * @param {Object} deps
 * @param {Object} deps.imageStore — ImageStore 实例（需有 saveImage 方法）
 * @param {Object} deps.imageCompressor — ImageCompressor 实例（需有 compress 方法）
 * @param {Function} deps.createImageId — 生成唯一图片 ID 的函数
 * @returns {Promise<{
 *   resolvedMarkdown: string,
 *   matched: { oldPath: string, newPath: string, imageId: string, fileName: string }[],
 *   unmatched: { path: string }[],
 *   total: number,
 *   cancelled?: boolean
 * }>}
 */
export async function resolveLocalImages(markdownText, { imageStore, imageCompressor, createImageId }) {
  const localImages = scanLocalImagePaths(markdownText);

  if (localImages.length === 0) {
    return {
      resolvedMarkdown: markdownText,
      matched: [],
      unmatched: [],
      total: 0,
    };
  }

  let dirHandle;
  try {
    dirHandle = await globalThis.showDirectoryPicker({ mode: 'read' });
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        resolvedMarkdown: markdownText,
        matched: [],
        unmatched: localImages.map((img) => ({ path: img.path })),
        total: localImages.length,
        cancelled: true,
      };
    }
    throw error;
  }

  const pathMap = {};
  const matched = [];
  const unmatched = [];

  for (const img of localImages) {
    const fileName = extractFilename(img.path);

    try {
      const fileHandle = await dirHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const compressedBlob = await imageCompressor.compress(file);
      const imageId = createImageId();

      await imageStore.saveImage(imageId, compressedBlob, {
        name: img.alt || fileName.replace(/\.[^.]+$/, ''),
        originalName: fileName,
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        mimeType: compressedBlob.type || file.type,
      });

      const newPath = `img://${imageId}`;
      pathMap[img.path] = newPath;
      matched.push({
        oldPath: img.path,
        newPath,
        imageId,
        fileName,
      });
    } catch (_error) {
      unmatched.push({ path: img.path });
    }
  }

  const resolvedMarkdown = replaceImagePaths(markdownText, pathMap);

  return {
    resolvedMarkdown,
    matched,
    unmatched,
    total: localImages.length,
  };
}
