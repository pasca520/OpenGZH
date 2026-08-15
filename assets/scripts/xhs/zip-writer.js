/**
 * Dependency-free ZIP writer using Store method only.
 * PNG is already compressed, so ZIP Store avoids a runtime dependency;
 * add Deflate only if future archives contain large uncompressed assets.
 * @module xhs/zip-writer
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let k = 0; k < 8; k += 1) {
      value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

/**
 * @param {Uint8Array} bytes
 * @returns {number} unsigned 32-bit CRC
 */
export function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[index]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function buildUnicodePathExtra(nameBytes) {
  // extra field 0x7075 (Info-ZIP Unicode Path): id + length + version 1 +
  // name CRC32 + UTF-8 name, so legacy decoders (macOS CLI unzip) resolve
  // non-ASCII filenames correctly.
  const extra = new Uint8Array(9 + nameBytes.length);
  const view = new DataView(extra.buffer);
  view.setUint16(0, 0x7075, true);
  view.setUint16(2, 5 + nameBytes.length, true);
  view.setUint8(4, 1);
  view.setUint32(5, crc32(nameBytes), true);
  extra.set(nameBytes, 9);
  return extra;
}

function buildLocalHeader(entry) {
  const extra = entry.unicodePathExtra;
  const view = new DataView(new ArrayBuffer(30));
  writeUint32(view, 0, 0x04034b50); // local file header signature
  writeUint16(view, 4, 20); // version needed
  writeUint16(view, 6, 0x0800); // UTF-8 filename flag
  writeUint16(view, 8, 0); // method: store
  writeUint16(view, 10, 0); // mod time
  writeUint16(view, 12, 0); // mod date
  writeUint32(view, 14, entry.crc);
  writeUint32(view, 18, entry.data.length);
  writeUint32(view, 22, entry.data.length);
  writeUint16(view, 26, entry.nameBytes.length);
  writeUint16(view, 28, extra.length); // extra length
  return new Uint8Array(view.buffer);
}

function buildCentralRecord(entry, localOffset) {
  const extra = entry.unicodePathExtra;
  const view = new DataView(new ArrayBuffer(46));
  writeUint32(view, 0, 0x02014b50); // central directory signature
  writeUint16(view, 4, 20); // version made by
  writeUint16(view, 6, 20); // version needed
  writeUint16(view, 8, 0x0800); // UTF-8 filename flag
  writeUint16(view, 10, 0); // method: store
  writeUint16(view, 12, 0); // mod time
  writeUint16(view, 14, 0); // mod date
  writeUint32(view, 16, entry.crc);
  writeUint32(view, 20, entry.data.length);
  writeUint32(view, 24, entry.data.length);
  writeUint16(view, 28, entry.nameBytes.length);
  writeUint16(view, 30, extra.length); // extra length
  writeUint16(view, 32, 0); // comment length
  writeUint16(view, 34, 0); // disk number start
  writeUint16(view, 36, 0); // internal attributes
  writeUint32(view, 38, 0); // external attributes
  writeUint32(view, 42, localOffset);
  return new Uint8Array(view.buffer);
}

function buildEndOfCentralDirectory(entryCount, centralSize, centralOffset) {
  const view = new DataView(new ArrayBuffer(22));
  writeUint32(view, 0, 0x06054b50); // end of central directory signature
  writeUint16(view, 4, 0); // disk number
  writeUint16(view, 6, 0); // central dir start disk
  writeUint16(view, 8, entryCount);
  writeUint16(view, 10, entryCount);
  writeUint32(view, 12, centralSize);
  writeUint32(view, 16, centralOffset);
  writeUint16(view, 20, 0); // comment length
  return new Uint8Array(view.buffer);
}

/**
 * Create a Store-mode ZIP Blob. ZIP64 is not supported; entries are
 * validated up front (non-empty unique names, sizes within 4GiB).
 * @param {{name:string, data:Uint8Array}[]} files
 * @returns {Blob}
 */
export function createStoredZip(files) {
  if (!Array.isArray(files) || !files.length) throw new Error('ZIP 文件列表不能为空');

  const entries = files.map((file) => {
    if (!file || !file.name || !String(file.name).trim()) {
      throw new Error('ZIP 文件名不能为空');
    }
    const nameBytes = new TextEncoder().encode(String(file.name));
    if (nameBytes.length > 0xFFFF) throw new Error('ZIP 文件名过长');
    if (!file.data || file.data.length > 0xFFFFFFFF) {
      throw new Error('ZIP64 不受支持：单文件超过 4GiB');
    }
    return {
      name: String(file.name),
      nameBytes,
      unicodePathExtra: buildUnicodePathExtra(nameBytes),
      data: file.data,
      crc: crc32(file.data)
    };
  });

  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.name)) throw new Error(`ZIP 文件名重复：${entry.name}`);
    seen.add(entry.name);
  }

  const parts = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const localSize = 30 + entry.nameBytes.length + entry.unicodePathExtra.length;
    if (offset > 0xFFFFFFFF) throw new Error('ZIP64 不受支持：总大小超过 4GiB');
    parts.push(buildLocalHeader(entry), entry.nameBytes, entry.unicodePathExtra, entry.data);
    central.push({ entry, offset });
    offset += localSize + entry.data.length;
  }

  const centralStart = offset;
  const centralParts = [];
  for (const { entry, offset: localOffset } of central) {
    centralParts.push(buildCentralRecord(entry, localOffset), entry.nameBytes, entry.unicodePathExtra);
    offset += 46 + entry.nameBytes.length + entry.unicodePathExtra.length;
  }

  const centralSize = offset - centralStart;
  const eocd = buildEndOfCentralDirectory(entries.length, centralSize, centralStart);
  return new Blob([...parts, ...centralParts, eocd], { type: 'application/zip' });
}
