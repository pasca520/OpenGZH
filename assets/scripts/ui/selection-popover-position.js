const GAP = 12;

export function placeSelectionPopover(anchor, size, bounds) {
  const minLeft = bounds.left + GAP;
  const minTop = bounds.top + GAP;
  const maxLeft = Math.max(minLeft, bounds.right - size.width - GAP);
  const maxTop = Math.max(minTop, bounds.bottom - size.height - GAP);
  if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
    return { side: 'fallback', left: maxLeft, top: minTop };
  }

  const right = anchor.x + GAP;
  const left = anchor.x - size.width - GAP;
  const side = right <= maxLeft ? 'right' : left >= minLeft ? 'left' : 'clamped';
  const candidate = side === 'right' ? right : side === 'left' ? left : anchor.x;
  return {
    side,
    left: Math.min(maxLeft, Math.max(minLeft, candidate)),
    top: Math.min(maxTop, Math.max(minTop, anchor.y - 24))
  };
}

const MIRRORED_PROPERTIES = Object.freeze([
  'box-sizing', 'width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'font', 'letter-spacing', 'line-height', 'text-transform', 'text-indent',
  'white-space', 'word-break', 'overflow-wrap', 'tab-size'
]);

export function measureTextareaSelectionFocus(textarea) {
  if (!textarea?.ownerDocument || typeof textarea.getBoundingClientRect !== 'function') return null;
  const doc = textarea.ownerDocument;
  const view = doc.defaultView;
  if (!view?.getComputedStyle || !doc.body) return null;

  const mirror = doc.createElement('div');
  const marker = doc.createElement('span');
  try {
    const computed = view.getComputedStyle(textarea);
    mirror.setAttribute('aria-hidden', 'true');
    mirror.style.position = 'fixed';
    mirror.style.left = '-10000px';
    mirror.style.top = '0';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.overflow = 'hidden';
    MIRRORED_PROPERTIES.forEach((property) => {
      mirror.style.setProperty(property, computed.getPropertyValue(property));
    });
    mirror.style.setProperty('height', 'auto');
    mirror.style.setProperty('min-height', '0');
    mirror.style.setProperty('white-space', 'pre-wrap');

    const focusOffset = textarea.selectionDirection === 'backward'
      ? textarea.selectionStart
      : textarea.selectionEnd;
    mirror.appendChild(doc.createTextNode(String(textarea.value || '').slice(0, focusOffset)));
    marker.textContent = '\u200b';
    marker.style.display = 'inline-block';
    marker.style.width = '0';
    marker.style.height = computed.lineHeight;
    mirror.appendChild(marker);
    doc.body.appendChild(mirror);

    const rect = textarea.getBoundingClientRect();
    const lineHeight = Number.parseFloat(computed.lineHeight)
      || Number.parseFloat(computed.fontSize)
      || 16;
    return {
      x: rect.left + marker.offsetLeft - textarea.scrollLeft,
      y: rect.top + marker.offsetTop + lineHeight - textarea.scrollTop
    };
  } finally {
    mirror.remove();
  }
}
