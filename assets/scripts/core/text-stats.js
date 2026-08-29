/**
 * 正文统计：从 markdown-it token 流提取「读者可见的正文文本」，
 * 供字数 / 字符统计使用。只统计渲染后实际出现在文章里的文字，
 * 排除 markdown 语法符号、图片地址、链接 URL、HTML 标签等非正文内容。
 * @module text-stats
 */

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/g;
const TAG_RE = /<[^>]*>/g;

/** 收集 inline token 中的可见文本（图片 alt、链接 URL 等不可见内容不计入）。 */
function collectInlineText(parts, tokens) {
  for (const token of tokens) {
    switch (token.type) {
      case 'text':
      case 'code_inline':
        if (token.content) parts.push(token.content);
        break;
      case 'softbreak':
      case 'hardbreak':
        parts.push(' ');
        break;
      case 'html_inline':
        parts.push(String(token.content || '').replace(TAG_RE, ''));
        break;
      case 'math_inline':
      case 'math_inline_double':
        // 公式源码即渲染后读者看到的公式，计入正文
        if (token.content) parts.push(token.content);
        break;
      default:
        // image 等无可见文本（alt 不作为正文）
        break;
    }
  }
}

function stripHtmlTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(TAG_RE, ' ');
}

/**
 * 从 md.parse(source, {}) 返回的 block token 数组提取正文可见文本。
 * 段落内部文本直接拼接（token 内容自带空格），块之间以换行分隔。
 * @param {Array<object>} tokens markdown-it block tokens
 * @returns {string} 正文纯文本（不含 markdown 语法、图片地址、标签）
 */
export function extractBodyText(tokens) {
  const blocks = [];
  for (const token of tokens || []) {
    switch (token.type) {
      case 'inline':
        if (token.children) {
          const pieces = [];
          collectInlineText(pieces, token.children);
          if (pieces.length > 0) blocks.push(pieces.join(''));
        } else if (token.content) {
          blocks.push(token.content);
        }
        break;
      case 'fence':
      case 'code_block':
        // 代码块是文章中文档可见内容，计入正文
        if (token.content) blocks.push(token.content);
        break;
      case 'html_block':
        blocks.push(stripHtmlTags(token.content));
        break;
      case 'math_block':
      case 'math_block_eqno':
        if (token.content) blocks.push(token.content);
        break;
      default:
        // heading_open / list_open / table_open / hr 等结构 token 无正文文本
        break;
    }
  }
  return blocks.join('\n');
}

/** 字符数：正文全部可见字符（不含空白）。 */
export function countChars(bodyText) {
  return String(bodyText || '').replace(/\s+/g, '').length;
}

/** 字数：汉字数 + 英文单词数（数字按英文单词计）。 */
export function countWords(bodyText) {
  const text = String(bodyText || '');
  const chineseChars = (text.match(CJK_RE) || []).length;
  const englishWords = text.replace(CJK_RE, ' ').split(/\s+/).filter(Boolean).length;
  return chineseChars + englishWords;
}