/**
 * Media inlining for XHS cards: local ImageStore refs, remote CORS-safe
 * fetches, blob/data URLs, and silent first-frame capture for GIF/video.
 * Fails closed: any remote media that cannot be read safely is an issue,
 * never a silent placeholder.
 * @module xhs/media-resolver
 */

export function createMediaError(code, message, blockId = null) {
  const error = new Error(message);
  error.code = code;
  error.blockId = blockId;
  return error;
}

function remoteBlocked(source, cause = null) {
  return createMediaError(
    'remote-image-blocked',
    `远程图片无法安全读取（CORS）：${source}。请下载到文章目录后重新导入。`,
    null
  );
}

/**
 * @param {Blob} blob
 * @param {Function} [FileReaderCtor]
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob, FileReaderCtor = globalThis.FileReader) {
  return new Promise((resolve, reject) => {
    const reader = new FileReaderCtor();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(createMediaError('media-not-ready', '无法读取媒体文件'));
    reader.readAsDataURL(blob);
  });
}

async function fetchMediaBlob(ref, options = {}) {
  const source = String(ref || '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const imageStore = options.imageStore;

  if (source.startsWith('data:')) return null;
  if (source.startsWith('img://')) {
    const id = source.slice('img://'.length);
    const blob = imageStore ? await imageStore.getImageBlob(id) : null;
    if (!blob) throw createMediaError('media-not-ready', `本地图片不存在：${id}`);
    return blob;
  }
  if (source.startsWith('blob:')) {
    const response = await fetchImpl(source);
    return response.blob();
  }
  if (/^https?:/i.test(source)) {
    let response;
    try {
      response = await fetchImpl(source, { mode: 'cors', credentials: 'omit' });
    } catch (error) {
      throw remoteBlocked(source, error);
    }
    if (!response.ok || response.type === 'opaque') throw remoteBlocked(source);
    return response.blob();
  }
  throw createMediaError('media-not-ready', `不支持的媒体引用：${source}`);
}

/**
 * Resolve any supported media ref to a data URL string.
 * @param {string} ref
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function resolveMediaRefToDataUrl(ref, options = {}) {
  const source = String(ref || '');
  if (source.startsWith('data:')) return source;
  const blob = await fetchMediaBlob(ref, options);
  if (!blob) throw createMediaError('media-not-ready', `无法解析媒体：${source}`);
  const toDataUrl = options.blobToDataUrl || blobToDataUrl;
  return toDataUrl(blob, options.FileReaderCtor);
}

function canvasToDataUrl(canvas, options = {}) {
  const toDataUrl = options.blobToDataUrl || blobToDataUrl;
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(createMediaError('capture-failed', '无法从画布生成图片'));
        return;
      }
      try {
        resolve(await toDataUrl(blob, options.FileReaderCtor));
      } catch (error) {
        reject(error);
      }
    }, 'image/png');
  });
}

async function extractGifFirstFrame(blob, options = {}) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = options.canvasFactory ? options.canvasFactory() : document.createElement('canvas');
    canvas.width = bitmap.width || 540;
    canvas.height = bitmap.height || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await canvasToDataUrl(canvas, options);
  } finally {
    if (typeof bitmap.close === 'function') bitmap.close();
  }
}

async function extractVideoFirstFrame(blob, options = {}) {
  const createObjectURL = options.createObjectURL || globalThis.URL?.createObjectURL?.bind(globalThis.URL);
  const revokeObjectURL = options.revokeObjectURL || globalThis.URL?.revokeObjectURL?.bind(globalThis.URL);
  const video = options.videoFactory
    ? options.videoFactory()
    : document.createElement('video');
  const objectUrl = createObjectURL(blob);
  let timeoutId = null;

  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = objectUrl;

    await new Promise((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(createMediaError('media-not-ready', '视频解码失败'));
      };
      const cleanup = () => {
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('seeked', onReady);
        video.removeEventListener('error', onError);
        clearTimeout(timeoutId);
      };
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('seeked', onReady);
      video.addEventListener('error', onError);
      timeoutId = setTimeout(() => {
        cleanup();
        reject(createMediaError('media-not-ready', '视频第一帧加载超时'));
      }, options.timeoutMs || 8000);
      try {
        video.currentTime = 0;
      } catch (_error) {
        // some formats refuse seeking; loadeddata still resolves
      }
      if (video.readyState >= 2) {
        cleanup();
        resolve();
      }
    });

    const canvas = options.canvasFactory ? options.canvasFactory() : document.createElement('canvas');
    canvas.width = video.videoWidth || 540;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await canvasToDataUrl(canvas, options);
  } finally {
    revokeObjectURL(objectUrl);
  }
}

/**
 * Capture the first frame of a GIF or video blob as a PNG data URL.
 * @param {Blob} blob
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function extractFirstFrame(blob, options = {}) {
  if (options.decode) return options.decode(blob);
  const type = String(blob?.type || '');
  if (type.startsWith('video/')) return extractVideoFirstFrame(blob, options);
  if (type.startsWith('image/gif')) return extractGifFirstFrame(blob, options);
  const toDataUrl = options.blobToDataUrl || blobToDataUrl;
  return toDataUrl(blob, options.FileReaderCtor);
}

function nearestBlockId(element) {
  let node = element && element.parentNode;
  while (node) {
    if (typeof node.getAttribute === 'function') {
      const blockId = node.getAttribute('data-block-id');
      if (blockId) return blockId;
    }
    node = node.parentNode;
  }
  return null;
}

function replaceWithImage(target, dataUrl, ref) {
  if (target.tagName && String(target.tagName).toLowerCase() === 'video') {
    const img = target.ownerDocument ? target.ownerDocument.createElement('img') : null;
    if (img) {
      img.setAttribute('src', dataUrl);
      img.setAttribute('alt', '');
      if (target.parentNode) target.parentNode.replaceChild(img, target);
      return;
    }
  }
  target.setAttribute('src', dataUrl);
  target.removeAttribute('data-media-ref');
  if (target.tagName && String(target.tagName).toLowerCase() === 'video') {
    target.removeAttribute('src');
    target.removeAttribute('poster');
  }
}

/**
 * Clone a card and replace every media reference with an inline data URL.
 * Dynamic media (GIF/video) becomes its first frame silently. Failures are
 * reported in `issues`; failing nodes stay untouched.
 * @param {HTMLElement} cardElement
 * @param {object} [options]
 * @returns {Promise<{clone:HTMLElement, issues:object[]}>}
 */
export async function inlineCardMedia(cardElement, options = {}) {
  const clone = cardElement.cloneNode(true);
  const issues = [];
  const targets = Array.from(clone.querySelectorAll('[data-media-ref], video[src]'));

  for (const element of targets) {
    const ref = element.getAttribute('data-media-ref') || element.getAttribute('src') || '';
    try {
      const blob = await fetchMediaBlob(ref, options);
      if (blob && (String(blob.type).startsWith('image/gif') || String(blob.type).startsWith('video/'))) {
        const frame = await extractFirstFrame(blob, options);
        replaceWithImage(element, frame, ref);
      } else {
        const url = blob
          ? await (options.blobToDataUrl || blobToDataUrl)(blob, options.FileReaderCtor)
          : await resolveMediaRefToDataUrl(ref, options);
        replaceWithImage(element, url, ref);
      }
    } catch (error) {
      issues.push({
        code: error.code || 'media-not-ready',
        blockId: nearestBlockId(element),
        message: error.message || '媒体加载失败'
      });
    }
  }

  return { clone, issues };
}
