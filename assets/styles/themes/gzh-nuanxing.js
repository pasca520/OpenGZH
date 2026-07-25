/**
 * Theme: 暖杏（移植自 kongge 暖纸）
 * Key: gzh-nuanxing
 * 米白暖调 + 衬线标题 + 小编号。
 */

const SERIF = "Georgia,'Songti SC','Noto Serif SC',serif";

export const theme = {
  name: '暖色衬线',
  gzh: {
    body: '#3d3d3a', title: '#141413', muted: '#8e8b82', line: '#e6dfd8',
    accent: '#C2703D', soft: '#f5f0e8', tagBg: '#efe6d9',
    headFont: SERIF,
    quoteStyle: 'warm',
    numStyle: 'plain'
  },
  styles: {
    container: "max-width: 100%; margin: 0 auto; padding: 16px 6px 48px 6px; font-family: -apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", sans-serif; font-size: 15px; line-height: 1.8; letter-spacing: 0.3px; color: #3d3d3a !important; background-color: #ffffff !important; word-wrap: break-word;",
    h1: "font-size: 22px; font-weight: 600; color: #141413 !important; line-height: 1.35 !important; margin: 0 10px 26px; letter-spacing: 0.5px; font-family: Georgia, \"Songti SC\", \"Noto Serif SC\", serif;",
    h2: "font-size: 20px; font-weight: 600; color: #141413 !important; margin: 0 0 12px; letter-spacing: 0.5px; line-height: 1.45 !important; font-family: Georgia, \"Songti SC\", \"Noto Serif SC\", serif;",
    h3: "font-size: 15px; font-weight: 800; color: #141413 !important; margin: 26px 10px 12px; padding-left: 12px; border-left: 3px solid #C2703D; line-height: 1.4 !important; font-family: Georgia, \"Songti SC\", \"Noto Serif SC\", serif;",
    p: "margin: 0 10px 22px; font-size: 15px; line-height: 1.8 !important; text-align: justify; color: #3d3d3a !important; letter-spacing: 0.3px;",
    blockquote: "margin: 0 10px 26px; padding: 16px 22px; background: #f5f0e8 !important; border-left: 4px solid #C2703D; font-size: 15px; color: #141413 !important; line-height: 1.85 !important; font-family: Georgia, \"Songti SC\", \"Noto Serif SC\", serif;",
    strong: "font-weight: 700; color: #C2703D !important;",
    em: "font-style: italic; color: #3d3d3a !important;",
    a: "color: #C2703D !important; font-weight: 600; text-decoration: none;",
    ul: "margin: 0 10px 22px; padding-left: 24px;",
    ol: "margin: 0 10px 22px; padding-left: 24px;",
    li: "margin: 6px 0; font-size: 15px; line-height: 1.8 !important; color: #3d3d3a !important;",
    code: "background: #efe6d9 !important; color: #141413 !important; padding: 2px 6px; border-radius: 4px; font-family: \"SF Mono\", Consolas, Monaco, monospace; font-size: 14px;",
    pre: "margin: 0 10px 26px; padding: 16px 18px; background: #18181B !important; color: #D4D4D8 !important; border-left: 3px solid #C2703D; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.7 !important;",
    hr: "margin: 0 10px 26px; border: none; height: 1px; background: #e6dfd8;",
    img: "max-width: 100%; height: auto; display: block; margin: 0 auto 26px;",
    table: "width: 100%; margin: 0 10px 22px; border-collapse: collapse; font-size: 14px;",
    th: "background: #f5f0e8 !important; color: #141413 !important; padding: 10px 12px; text-align: left; font-weight: 700; border-bottom: 1px solid #e6dfd8;",
    td: "padding: 10px 12px; border-bottom: 1px solid #e6dfd8; color: #3d3d3a !important;",
    tr: "border-bottom: 1px solid #e6dfd8; line-height: 1.5;"
  }
};
