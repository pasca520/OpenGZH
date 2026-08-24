let table;

function crcTable() {
  if (table) return table;
  table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
}

export function crc32Hex(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('CRC32 输入必须是 Uint8Array');
  let crc = 0xffffffff;
  const lookup = crcTable();
  for (const byte of bytes) crc = (crc >>> 8) ^ lookup[(crc ^ byte) & 0xff];
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}
