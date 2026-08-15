# 居中布局与 16 套背景系列设计

> 本设计替代 `2026-08-15-four-centered-cover-templates-design.md` 中“四个独立模板”的产品模型。

## 目标

把现有 4 个结构完全相同的居中模板收敛为 1 个“居中布局”模板，并在模板内部提供 16 个可选背景。布局、字段和换行逻辑只维护一份；背景只提供装饰 SVG、配色和选择器预览。

## 产品模型

- 模板列表只保留 `centered-layout` / “居中布局”一张卡片。
- 选中该模板后，右侧内容面板显示 4 × 4 的背景选择网格。
- 背景选择参与封面的撤销、重做和重置，但不新增 localStorage 键；这与当前封面模板选择本身不持久化的行为一致。
- 其他模板不显示背景选择器，不改变现有输出。

## 统一布局

- 顶部中央只显示 `coverContent.tag` 的值，例如“技术分享”，不再显示固定文字“类型”。
- 主标题与副标题继续在同一安全区内居中排列，并沿用 CJK 感知换行。
- 作者移至右下角，显示为 `@AI产品零度`。数据仍保存为 `AI产品零度`；渲染时统一去除用户可能输入的前导 `@`，再补一个 `@`，避免重复。
- 标签、标题、副标题、作者继续保留 `data-field`，兼容行内编辑和拖拽。

## 16 个背景

| ID | 名称 | 视觉方向 |
| --- | --- | --- |
| `midnight-prism` | 午夜棱镜 | 深蓝几何切面 |
| `editorial-seal` | 编辑印记 | 暖白纸张与红色印记 |
| `circuit-grid` | 电路网格 | 深青电路与节点 |
| `orbit-glow` | 环形微光 | 黑紫轨道与柔光 |
| `cobalt-radar` | 钴蓝雷达 | 钴蓝扫描环与坐标线 |
| `vermilion-fold` | 朱红折面 | 朱红纸面与折线 |
| `ink-wash` | 水墨留白 | 灰白纸面与墨色晕染 |
| `emerald-contour` | 翡翠等高线 | 深绿地形等高线 |
| `amber-horizon` | 琥珀地平线 | 暖橙日落与水平光带 |
| `graphite-grid` | 石墨网格 | 黑白编辑网格 |
| `cyan-blueprint` | 青蓝蓝图 | 蓝图刻度与结构线 |
| `coral-ripple` | 珊瑚涟漪 | 珊瑚粉曲线与波纹 |
| `forest-window` | 森林窗口 | 墨绿窗口与自然几何 |
| `silver-glass` | 银色玻璃 | 冷白半透明玻璃层 |
| `burgundy-lines` | 勃艮第线稿 | 酒红底与细金线 |
| `ultraviolet-noise` | 紫外噪点 | 紫黑噪点与频谱光带 |

背景数据由 `CENTERED_BACKGROUNDS` 统一声明：`id`、`name`、`preview`、`palette` 和 `artwork()`。`centeredLayout.render()` 只负责组合所选背景、统一标签、标题、副标题与作者。

## 状态与交互

- 新增 `coverBackgroundId`，默认 `midnight-prism`。
- `currentTemplateBackgrounds` 从当前模板的 `backgrounds` 属性读取；为空时不渲染选择器。
- `selectCoverBackground(id)` 只接受当前模板声明的背景 ID，先记录撤销快照再更新。
- `getCoverStateSnapshot()`、`restoreCoverState()` 和 `coverReset()` 同步处理背景 ID。
- `renderCover()` 将 `backgroundId` 作为安全内容传给模板；未知 ID 回退到第一项。

## 修改范围

- `assets/scripts/cover/templates.js`：删除 4 个重复模板，新增 16 个背景定义和 1 个统一布局模板。
- `assets/scripts/cover/renderer.js`：透传 `backgroundId`，保留“居中布局”分类。
- `assets/scripts/main.js`：增加背景选择状态、选择逻辑、撤销/重做/重置接入。
- `index.html`、`assets/styles/cover.css`：增加仅在支持时出现的 4 × 4 背景选择器。
- `assets/scripts/cover/__tests__/templates.test.js`：总数 44 → 41，验证单模板、16 背景、标签/作者排版、回退与长文本。
- `README.md` 与应用内说明：模板数 44 → 41。

## 验收标准

- “居中布局”分类只有 1 张模板卡，模板卡内部可选择恰好 16 个背景。
- 16 个背景切换后布局坐标不变，仅背景装饰与配色变化。
- 画面不包含“类型”和“作者”固定文字；顶部显示“技术分享”，右下角显示且只显示一个 `@AI产品零度`。
- 16 个背景均能导出 `2400 × 1020` PNG；长中文标题/副标题不越界、不重叠。
- 背景选择支持撤销、重做、重置；其他 40 个模板行为保持不变。
- 全量 Vitest、16/16 SVG XML、浏览器交互、PNG 尺寸和 `git diff --check` 通过。

## 回滚

回滚实现提交即可恢复 4 个独立模板。没有新增持久化键或数据迁移，因此不会遗留不可读的用户数据。
