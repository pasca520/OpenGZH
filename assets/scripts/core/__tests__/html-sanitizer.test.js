import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../html-sanitizer.js';

describe('html sanitizer', () => {
  it('removes executable tags, handlers, and unsafe URLs', () => {
    const result = sanitizeHtml(`
      <img src="x" onerror="alert(1)">
      <a href="javascript:alert(1)" onclick="steal()">bad</a>
      <svg onload="alert(1)"><path d="M0 0" /></svg>
      <script>alert(1)</script><iframe src="https://evil.example"></iframe>
      <a href="https://example.com" target="_blank">safe</a>
      <img src="data:text/html,<script>alert(1)</script>">
    `);

    expect(result).not.toMatch(/onerror|onclick|onload|javascript:|<script|<iframe|data:text\/html/i);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('keeps legal article markup, formulas, cards, and image protocols', () => {
    const result = sanitizeHtml(`
      <section data-ogzh-card="soft-fill" data-code-block="true" style="color: #123456; margin: 0 1px">
        <h2 id="title">标题</h2><table><thead><tr><th>列</th></tr></thead><tbody><tr><td>值</td></tr></tbody></table>
        <span class="katex" aria-hidden="true"><span class="mord">x</span></span>
        <img src="img://local-id" data-image-id="local-id" alt="图片">
        <input type="checkbox" checked>
      </section>
    `);

    expect(result).toContain('data-ogzh-card="soft-fill"');
    expect(result).toContain('data-code-block="true"');
    expect(result).toContain('class="katex"');
    expect(result).toContain('src="img://local-id"');
    expect(result).toContain('type="checkbox"');
    expect(result).not.toMatch(/\son[a-z-]+=|javascript:/i);
  });

  it('strips dangerous CSS fetches while keeping safe inline styles', () => {
    const result = sanitizeHtml('<p style="color: red; background: url(javascript:alert(1)); margin: 0">text</p>');
    expect(result).toContain('color: red');
    expect(result).toContain('margin: 0');
    expect(result).not.toMatch(/url\(|javascript:/i);
  });
});
