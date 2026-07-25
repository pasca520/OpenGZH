/**
 * Theme: 灰阶（移植自 kongge 墨线）
 * Key: gzh-huijie
 * 灰阶 + 细线 + 水印大编号。
 */

export const theme = {
  name: '灰色水印',
  gzh: {
    body: '#52525B', title: '#27272A', muted: '#A1A1AA', line: '#E4E4E7',
    accent: '#27272A', soft: '#FAFAFA', tagBg: '#F4F4F5',
    headFont: "-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif",
    quoteStyle: 'bar',
    numStyle: 'watermark'
  },
  styles: {
    container: "max-width: 100%; margin: 0 auto; padding: 16px 6px 48px 6px; font-family: -apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif; font-size: 15px; line-height: 1.8; letter-spacing: 0.3px; color: #52525B !important; background-color: #ffffff !important; word-wrap: break-word;",
    h1: "font-size: 22px; font-weight: 800; color: #27272A !important; line-height: 1.35 !important; margin: 0 10px 26px; letter-spacing: 0.5px;",
    h2: "font-size: 19px; font-weight: 800; color: #27272A !important; margin: -4px 0 0; letter-spacing: 0.5px; line-height: 1.4 !important; font-family: -apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif;",
    h3: "font-size: 15px; font-weight: 800; color: #27272A !important; margin: 26px 10px 12px; padding-left: 12px; border-left: 3px solid #27272A; line-height: 1.4 !important;",
    p: "margin: 0 10px 22px; font-size: 15px; line-height: 1.8 !important; text-align: justify; color: #52525B !important; letter-spacing: 0.3px;",
    blockquote: "margin: 0 10px 26px; padding: 14px 0 14px 22px; border-left: 3px solid #27272A; font-size: 15px; font-weight: 700; color: #27272A !important; line-height: 1.75 !important;",
    strong: "font-weight: 700; color: #27272A !important;",
    em: "font-style: italic; color: #52525B !important;",
    a: "color: #27272A !important; font-weight: 600; text-decoration: none;",
    ul: "margin: 0 10px 22px; padding-left: 24px;",
    ol: "margin: 0 10px 22px; padding-left: 24px;",
    li: "margin: 6px 0; font-size: 15px; line-height: 1.8 !important; color: #52525B !important;",
    code: "background: #F4F4F5 !important; color: #27272A !important; padding: 2px 6px; border-radius: 4px; font-family: \"SF Mono\", Consolas, Monaco, monospace; font-size: 14px;",
    pre: "margin: 0 10px 26px; padding: 16px 18px; background: #18181B !important; color: #D4D4D8 !important; border-left: 3px solid #27272A; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.7 !important;",
    hr: "margin: 0 10px 26px; border: none; height: 1px; background: #E4E4E7;",
    img: "max-width: 100%; height: auto; display: block; margin: 0 auto 26px;",
    table: "width: 100%; margin: 0 10px 22px; border-collapse: collapse; font-size: 14px;",
    th: "background: #FAFAFA !important; color: #27272A !important; padding: 10px 12px; text-align: left; font-weight: 700; border-bottom: 1px solid #E4E4E7;",
    td: "padding: 10px 12px; border-bottom: 1px solid #E4E4E7; color: #52525B !important;",
    tr: "border-bottom: 1px solid #E4E4E7; line-height: 1.5;"
  }
};
