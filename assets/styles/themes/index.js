/**
 * 主题汇总 - 自动导入所有主题并导出 STYLES 对象
 * 新增主题时只需在 themes/ 目录下添加新文件，并在此处引入
 *
 * 深色模式约定：容器保持白底，让微信「智能反色」接管深色模式。
 * 彩色元素（章节编号等）的文字/徽标色必须足够深——微信整体反色后深色文字变浅，
 * 明暗两态都可读；切勿用中亮度的饱和色（反色后仍为中亮度，深色下看不清）。
 * 编号用色统一经 gzh-structure.js 的 darken() 加深处理。
 * @module themes
 */

import { theme as wechatDefault } from './wechat-default.js';
import { theme as latepostDepth } from './latepost-depth.js';
import { theme as wechatFt } from './wechat-ft.js';
import { theme as wechatAnthropic } from './wechat-anthropic.js';
import { theme as wechatTech } from './wechat-tech.js';
import { theme as wechatElegant } from './wechat-elegant.js';
import { theme as wechatDeepread } from './wechat-deepread.js';
import { theme as wechatNyt } from './wechat-nyt.js';
import { theme as wechatJonyive } from './wechat-jonyive.js';
import { theme as wechatMedium } from './wechat-medium.js';
import { theme as wechatApple } from './wechat-apple.js';
import { theme as kenyaEmptiness } from './kenya-emptiness.js';
import { theme as hischeEditorial } from './hische-editorial.js';
import { theme as andoConcrete } from './ando-concrete.js';
import { theme as gaudiOrganic } from './gaudi-organic.js';
import { theme as guardian } from './guardian.js';
import { theme as nikkei } from './nikkei.js';
import { theme as lemonde } from './lemonde.js';
import { theme as minimalism } from './minimalism.js';
import { theme as wechatPaperpress } from './wechat-paperpress.js';
import { theme as kamiPaper } from './kami-paper.js';
import { theme as wechatLingxi } from './wechat-lingxi.js';
import { theme as wechatProductUpdate } from './wechat-product-update.js';
import { theme as wechatFounderNote } from './wechat-founder-note.js';
import { theme as wechatLabReport } from './wechat-lab-report.js';
import { theme as wechatCityNews } from './wechat-city-news.js';
import { theme as wechatCv8g } from './wechat-cv8g.js';
import { theme as gzhHuijie } from './gzh-huijie.js';
import { theme as gzhQingyu } from './gzh-qingyu.js';
import { theme as gzhNuanxing } from './gzh-nuanxing.js';
import { theme as gzhJingkong } from './gzh-jingkong.js';
import { theme as gzhGewu } from './gzh-gewu.js';
import { theme as gzhZidian } from './gzh-zidian.js';
import { theme as gzhFeihong } from './gzh-feihong.js';
import { theme as gzhYehang } from './gzh-yehang.js';
import { theme as gzhHongcai } from './gzh-hongcai.js';
import { theme as gzhDansha } from './gzh-dansha.js';

/**
 * 所有主题样式配置
 * 格式为内联 CSS 字符串（微信兼容性要求）
 */
export const STYLES = {
  'wechat-default': wechatDefault,
  'latepost-depth': latepostDepth,
  'wechat-ft': wechatFt,
  'wechat-anthropic': wechatAnthropic,
  'wechat-tech': wechatTech,
  'wechat-elegant': wechatElegant,
  'wechat-deepread': wechatDeepread,
  'wechat-nyt': wechatNyt,
  'wechat-jonyive': wechatJonyive,
  'wechat-medium': wechatMedium,
  'wechat-apple': wechatApple,
  'kenya-emptiness': kenyaEmptiness,
  'hische-editorial': hischeEditorial,
  'ando-concrete': andoConcrete,
  'gaudi-organic': gaudiOrganic,
  'guardian': guardian,
  'nikkei': nikkei,
  'lemonde': lemonde,
  'minimalism': minimalism,
  'wechat-paperpress': wechatPaperpress,
  'kami-paper': kamiPaper,
  'wechat-lingxi': wechatLingxi,
  'wechat-product-update': wechatProductUpdate,
  'wechat-founder-note': wechatFounderNote,
  'wechat-lab-report': wechatLabReport,
  'wechat-city-news': wechatCityNews,
  'wechat-cv8g': wechatCv8g,
  'gzh-huijie': gzhHuijie,
  'gzh-qingyu': gzhQingyu,
  'gzh-nuanxing': gzhNuanxing,
  'gzh-jingkong': gzhJingkong,
  'gzh-gewu': gzhGewu,
  'gzh-zidian': gzhZidian,
  'gzh-feihong': gzhFeihong,
  'gzh-yehang': gzhYehang,
  'gzh-hongcai': gzhHongcai,
  'gzh-dansha': gzhDansha,
};
