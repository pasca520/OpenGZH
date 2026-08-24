const IMAGE_DATA_URL = /^data:(image\/(?:png|jpe?g|gif|webp|avif|svg\+xml));base64,([A-Za-z0-9+/]*={0,2})$/i;
const DATA_URL_HEADER = /^data:([^;,]+)(;base64)?,/i;

export function dataUrlToBlob(dataUrl) {
  const input = String(dataUrl || '');
  const match = input.match(IMAGE_DATA_URL);
  if (!match) {
    const header = input.match(DATA_URL_HEADER);
    if (!header || !header[1].toLowerCase().startsWith('image/')) throw new TypeError('仅允许图片 Data URL');
    if (!/^image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)$/i.test(header[1])) throw new TypeError('仅允许图片 Data URL');
    if (!header[2]) throw new TypeError('图片 Data URL 必须使用 Base64');
    throw new TypeError('图片 Data URL 必须使用有效 Base64');
  }
  const encoded = match[2];
  if (!encoded || encoded.length % 4 !== 0) throw new TypeError('图片 Data URL 必须使用有效 Base64');
  let binary;
  try {
    binary = atob(encoded);
  } catch {
    throw new TypeError('图片 Data URL 必须使用有效 Base64');
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1].toLowerCase() });
}
