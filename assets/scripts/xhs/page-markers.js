/**
 * Insert, remove and scan Markdown page-break comments.
 * Pure string functions; no DOM access.
 * @module xhs/page-markers
 */

import { XHS_PAGE_MARKER } from './constants.js';

const MARKER_RE = /<!--\s*xhs-page\s*-->/gi;

/**
 * @param {string} markdown
 * @returns {{start:number,end:number}[]}
 */
export function scanPageMarkers(markdown) {
  return Array.from(String(markdown || '').matchAll(MARKER_RE), (match) => ({
    start: match.index,
    end: match.index + match[0].length
  }));
}

/**
 * Insert a marker at a char offset, keeping it on its own lines.
 * No-op when a marker is already adjacent.
 * @param {string} markdown
 * @param {number} offset
 * @returns {{markdown:string, markerStart:number}}
 */
export function insertPageMarker(markdown, offset) {
  const source = String(markdown || '');
  const cursor = Math.min(source.length, Math.max(0, Number(offset) || 0));
  const adjacent = scanPageMarkers(source).find((marker) => {
    const gap = marker.end <= cursor
      ? source.slice(marker.end, cursor)
      : source.slice(cursor, marker.start);
    return /^\s*$/.test(gap);
  });
  if (adjacent) return { markdown: source, markerStart: adjacent.start };
  const before = source.slice(0, cursor).replace(/[ \t]+$/g, '');
  const after = source.slice(cursor).replace(/^[ \t]+/g, '');
  const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
  const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '';
  const addition = `${prefix}${XHS_PAGE_MARKER}${suffix}`;
  return { markdown: `${before}${addition}${after}`, markerStart: before.length + prefix.length };
}

/**
 * Remove exactly the marker at markerStart plus one surrounding blank line.
 * @param {string} markdown
 * @param {number} markerStart
 * @returns {{markdown:string, removed:boolean}}
 */
export function removePageMarker(markdown, markerStart) {
  const source = String(markdown || '');
  const marker = scanPageMarkers(source).find((item) => item.start === markerStart);
  if (!marker) return { markdown: source, removed: false };
  const left = source.slice(0, marker.start).replace(/\n?[ \t]*\n$/, '\n');
  const right = source.slice(marker.end).replace(/^\n[ \t]*\n?/, '\n');
  return { markdown: `${left}${right}`, removed: true };
}
