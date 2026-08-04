/**
 * 最小可用 GIF89a 编码器（无外部依赖）。
 *
 * 用于把「结尾动效」逐帧渲染成 GIF 动图，嵌入复制到公众号的 HTML。
 * 仅支持 8bit 调色板 + 1 位透明（GIF 原生能力），足够渲染纯色图形结尾。
 * 纯函数，可在 node 环境单测。
 *
 * @module gif-encoder
 */

const GIF_MAGIC = 'GIF89a';
const MAX_DICTIONARY = 4096;
const MAX_PALETTE = 256;

/**
 * 编码一帧的 RGBA 像素为 GIF 索引（含透明处理）。
 */
function toIndexedPixels(frame, width, height, paletteMap, transpIndex, transparent) {
  const indices = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < frame.length; i += 4, p += 1) {
    if (transparent && frame[i + 3] < 128) {
      indices[p] = transpIndex;
      continue;
    }
    const key = (frame[i] << 16) | (frame[i + 1] << 8) | frame[i + 2];
    const idx = paletteMap.get(key);
    indices[p] = idx === undefined ? 0 : idx;
  }
  return indices;
}

/**
 * GIF 变长 LZW 编码（字典码流 → 字节流）。
 */
function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  let dict = new Map();
  let nextCode = endCode + 1;
  let codeSize = minCodeSize + 1;
  const out = [];
  let cur = 0;
  let curBits = 0;

  const emit = (code) => {
    cur |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      out.push(cur & 0xff);
      cur >>>= 8;
      curBits -= 8;
    }
  };

  const resetDict = () => {
    dict = new Map();
    nextCode = endCode + 1;
    codeSize = minCodeSize + 1;
  };

  emit(clearCode);
  // 当前积累串用「逗号分隔的索引码」作字典键，避免多字节串歧义。
  let wKey = String(indices[0]);

  for (let i = 1; i < indices.length; i += 1) {
    const k = indices[i];
    const wk = `${wKey},${k}`;
    if (dict.has(wk)) {
      wKey = dict.get(wk);
      continue;
    }
    emit(wKey.indexOf(',') === -1 ? Number(wKey) : dict.get(wKey));
    if (nextCode < MAX_DICTIONARY) {
      dict.set(wk, String(nextCode));
      nextCode += 1;
      if (nextCode > (1 << codeSize) && codeSize < 12) codeSize += 1;
    }
    wKey = String(k);
    if (nextCode >= MAX_DICTIONARY) {
      resetDict();
      emit(clearCode);
    }
  }

  emit(wKey.indexOf(',') === -1 ? Number(wKey) : dict.get(wKey));
  emit(endCode);
  if (curBits > 0) out.push(cur & 0xff);
  return out;
}

/**
 * 中位切分量化：把颜色列表压缩到 ≤maxColors 个代表色。
 * 用于平滑渐变 / 抗锯齿边缘产生大量颜色时，保证 GIF 256 色调色板内可用。
 */
function medianCut(colors, maxColors) {
  let boxes = [colors];
  while (boxes.length < maxColors) {
    let pick = -1;
    let bestRange = -1;
    let bestChannel = -1;
    for (let i = 0; i < boxes.length; i += 1) {
      if (boxes[i].length < 2) continue;
      const mn = [255, 255, 255];
      const mx = [0, 0, 0];
      for (const c of boxes[i]) {
        for (let ch = 0; ch < 3; ch += 1) {
          if (c[ch] < mn[ch]) mn[ch] = c[ch];
          if (c[ch] > mx[ch]) mx[ch] = c[ch];
        }
      }
      let range = -1;
      let channel = -1;
      for (let ch = 0; ch < 3; ch += 1) {
        const r = mx[ch] - mn[ch];
        if (r > range) {
          range = r;
          channel = ch;
        }
      }
      if (range > bestRange) {
        bestRange = range;
        bestChannel = channel;
        pick = i;
      }
    }
    if (pick === -1) break; // 所有盒都只有 1 色
    const box = boxes[pick];
    const sorted = [...box].sort((a, b) => a[bestChannel] - b[bestChannel]);
    const mid = Math.floor(sorted.length / 2);
    boxes = [...boxes.slice(0, pick), sorted.slice(0, mid), sorted.slice(mid), ...boxes.slice(pick + 1)];
  }
  return boxes.map((box) => {
    const n = box.length;
    return [
      Math.round(box.reduce((s, c) => s + c[0], 0) / n),
      Math.round(box.reduce((s, c) => s + c[1], 0) / n),
      Math.round(box.reduce((s, c) => s + c[2], 0) / n)
    ];
  });
}

/** 找最接近的调色板索引（欧氏距离）。 */
function nearestPaletteIndex(palette, color) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i += 1) {
    const dr = palette[i][0] - color[0];
    const dg = palette[i][1] - color[1];
    const db = palette[i][2] - color[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * 编码为 GIF89a 字节流。
 *
 * @param {Uint8ClampedArray[]} frames RGBA 帧数组（每帧 width*height*4）
 * @param {number} width 逻辑宽度
 * @param {number} height 逻辑高度
 * @param {object} [options]
 * @param {number} [options.delayCs=4] 帧间隔，单位 1/100 秒
 * @param {boolean} [options.transparent=true] 是否启用 1 位透明（alpha<128 视为透明）
 * @param {number} [options.repeat=0] 循环次数，0=无限循环
 * @returns {Uint8Array}
 */
export function encodeGif(frames, width, height, options = {}) {
  const { delayCs = 4, transparent = true, repeat = 0 } = options;

  if (!frames || frames.length === 0) {
    throw new Error('encodeGif: 至少需要一帧');
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error('encodeGif: 非法尺寸');
  }

  // 1) 收集不同颜色（透明像素不参与）
  const distinctKeys = [];
  const seen = new Set();
  frames.forEach((frame) => {
    for (let i = 0; i < frame.length; i += 4) {
      if (transparent && frame[i + 3] < 128) continue;
      const key = (frame[i] << 16) | (frame[i + 1] << 8) | frame[i + 2];
      if (!seen.has(key)) {
        seen.add(key);
        distinctKeys.push(key);
      }
    }
  });

  // 2) 调色板：超过上限用中位切分量化（渐变/抗锯齿边缘可能产生大量颜色）
  const distinctColors = distinctKeys.map((k) => [(k >> 16) & 0xff, (k >> 8) & 0xff, k & 0xff]);
  const maxPalette = transparent ? MAX_PALETTE - 1 : MAX_PALETTE; // 透明需要预留一个索引
  const palette = distinctColors.length <= maxPalette ? distinctColors : medianCut(distinctColors, maxPalette);

  // 每帧像素 → 最近调色板索引（按不同颜色预计算，避免逐像素扫描）
  const paletteMap = new Map();
  distinctColors.forEach((color, i) => {
    paletteMap.set(distinctKeys[i], nearestPaletteIndex(palette, color));
  });

  let bits = 1;
  while ((1 << bits) < palette.length) bits += 1;
  const tableSize = 1 << bits;
  const transpIndex = tableSize - 1; // 最后一格留给透明色（palette 未占用）

  const colorTable = new Uint8Array(tableSize * 3);
  palette.forEach((color, i) => {
    colorTable[i * 3] = color[0];
    colorTable[i * 3 + 1] = color[1];
    colorTable[i * 3 + 2] = color[2];
  });

  // 2) 组字节流
  const bytes = [];
  for (const char of GIF_MAGIC) bytes.push(char.charCodeAt(0));

  // Logical Screen Descriptor；packed 字节 bits0-2=色表大小-1，bits4-6=颜色分辨率
  bytes.push(width & 0xff, (width >> 8) & 0xff);
  bytes.push(height & 0xff, (height >> 8) & 0xff);
  bytes.push(0x80 | ((bits - 1) << 4) | (bits - 1));
  bytes.push(0, 0);
  bytes.push(...colorTable);

  // Netscape 循环扩展（repeat=0 无限循环）：0x21 0xFF 0x0B "NETSCAPE2.0" 0x03 lo hi 0x00 0x00
  bytes.push(0x21, 0xff, 0x0b, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, repeat & 0xff, (repeat >> 8) & 0xff, 0x00, 0x00);

  frames.forEach((frame) => {
    // Graphic Control Extension
    bytes.push(0x21, 0xf9, 4, transparent ? 0x01 : 0x00, delayCs & 0xff, (delayCs >> 8) & 0xff,
      transparent ? transpIndex : 0, 0);

    // Image Descriptor（全帧无偏移）
    bytes.push(0x2c, 0, 0, 0, 0, width & 0xff, (width >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff, 0);

    const indices = toIndexedPixels(frame, width, height, paletteMap, transpIndex, transparent);
    const compressed = lzwEncode(indices, bits);
    bytes.push(bits);
    for (let i = 0; i < compressed.length; i += 255) {
      const chunk = compressed.slice(i, i + 255);
      bytes.push(chunk.length, ...chunk);
    }
    bytes.push(0);
  });

  bytes.push(0x3b);
  return new Uint8Array(bytes);
}
