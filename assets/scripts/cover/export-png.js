/**
 * Export cover SVG to PNG via Canvas.
 * @module cover/export-png
 */

/** Supported aspect ratios with their pixel dimensions */
export const COVER_RATIOS = {
  '900×383': { width: 900, height: 383, label: '900×383 · 公众号封面' }
};

export async function waitForDocumentFonts(fontSet = globalThis.document?.fonts) {
  if (fontSet?.ready) await fontSet.ready;
}

/**
 * Export an SVG string as a downloadable PNG file.
 * @param {string} svgString - Complete SVG markup
 * @param {string} [filename='cover'] - Output filename (without extension)
 * @returns {Promise<void>}
 */
export async function exportCoverPng(svgString, filename = 'cover') {
  await waitForDocumentFonts();

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = doc.documentElement;

  // Inline external SVG <image> references for correct export
  const images = svgEl.querySelectorAll('image[href]');
  for (const img of images) {
    const href = img.getAttribute('href');
    if (href && (href.endsWith('.svg') || href.includes('.svg'))) {
      try {
        const resp = await fetch(href);
        if (resp.ok) {
          const svgText = await resp.text();
          const innerDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const innerSvg = innerDoc.documentElement;

          // Create a <g> wrapper with the same positioning attributes
          const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
          const x = img.getAttribute('x') || '0';
          const y = img.getAttribute('y') || '0';
          const w = img.getAttribute('width');
          const h = img.getAttribute('height');
          const opacity = img.getAttribute('opacity');

          // Get inner SVG viewBox for scaling
          const innerVB = (innerSvg.getAttribute('viewBox') || '0 0 400 400').split(' ').map(Number);
          const innerW = innerVB[2] || 400;
          const innerH = innerVB[3] || 400;

          const scaleX = w ? (parseFloat(w) / innerW) : 1;
          const scaleY = h ? (parseFloat(h) / innerH) : 1;

          g.setAttribute('transform', `translate(${x}, ${y}) scale(${scaleX}, ${scaleY})`);
          if (opacity) g.setAttribute('opacity', opacity);

          // Copy inner SVG children to the group
          while (innerSvg.firstChild) {
            g.appendChild(innerSvg.firstChild);
          }

          // Also copy defs from inner SVG
          img.parentNode.insertBefore(g, img);
          img.parentNode.removeChild(img);
        }
      } catch (e) {
        // If fetch fails, leave the image element as-is
        console.warn('Failed to inline SVG image:', href, e);
      }
    }
  }

  // Serialize back to string after inlining
  const serializer = new XMLSerializer();
  svgString = serializer.serializeToString(svgEl);

  const viewBox = (svgEl.getAttribute('viewBox') || '0 0 1200 510').split(' ').map(Number);
  const width = viewBox[2] || 1200;
  const height = viewBox[3] || 480;

  // Scale up for retina quality
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Convert SVG to a data URL and draw on canvas
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(url);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    // Download
    const blob = await canvasToBlob(canvas, 'image/png');
    if (!blob) throw new Error('Canvas to Blob failed');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${sanitizeFilename(filename)}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/**
 * Load an image from a URL as a promise.
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Convert canvas to blob as a promise.
 * @param {HTMLCanvasElement} canvas
 * @param {string} type
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('toBlob returned null'));
    }, type);
  });
}

/**
 * Sanitize a string for use as a filename.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
  return (name || 'cover')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'cover';
}
