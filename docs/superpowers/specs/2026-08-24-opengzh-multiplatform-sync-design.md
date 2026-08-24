# OpenGZH 多平台文章同步插件设计

**状态：** 总体方案已确认，等待书面规格复核

**日期：** 2026-08-24

**插件名称：** OpenGZH

**插件副标题：** 微信公众号、知乎、掘金、人人都是产品经理文章同步助手

## 1. 概述

为 OpenGZH 增加一款专用 Chrome Manifest V3 插件，将当前文章自动保存到以下四个平台的草稿箱，并在任务结束后打开成功创建的草稿编辑页：

1. 微信公众号
2. 知乎
3. 掘金
4. 人人都是产品经理

插件只使用用户浏览器中各平台现有的登录会话。它不建设服务端，不保存账号密码、Cookie、平台 token 或文章副本，也不自动正式发布、提交审核或选择平台运营字段。

采用 OpenGZH 专用插件，而不是直接依赖或裁剪 Wechatsync。Wechatsync 仅用于学习“平台适配器、能力声明、草稿优先和任务隔离”的产品及技术思路，运行代码独立实现。

## 2. 目标与非目标

### 2.1 MVP 目标

- 在 OpenGZH 文本模式中提供“同步到平台”入口。
- 默认选中四个平台，用户可以临时取消某个平台。
- 将标题、正文结构和正文图片保存为平台草稿。
- 成功后打开每个平台的草稿编辑页，供用户补充分类、标签、封面等信息并最终发布。
- 登录失效时准确提示对应平台重新登录，不阻断其他已登录平台。
- 单个平台失败不回滚其他平台已经成功创建的草稿。
- 图片处理失败时阻止该平台创建内容不完整的草稿。
- 适配器内部接口变化时给出明确的“平台接口已变化”提示。

### 2.2 MVP 非目标

- 不自动正式发布或提交平台审核。
- 不支持多账号切换。
- 不支持定时发布、发布队列和云端任务。
- 不自动设置分类、话题、标签、摘要、封面、原创声明和评论权限。
- 不同步视频、音频、小程序卡片、广告卡片和平台专属互动组件。
- 不回收阅读量、点赞、评论或粉丝数据。
- 不把小红书图片模式纳入本插件。
- 不提供远程配置、远程代码、遥测或行为分析。

## 3. 用户体验

### 3.1 插件品牌

Manifest 与插件面板统一使用：

```json
{
  "name": "OpenGZH",
  "short_name": "OpenGZH",
  "description": "微信公众号、知乎、掘金、人人都是产品经理文章同步助手"
}
```

首个版本号为 `0.1.0`。

### 3.2 入口

插件内容脚本只注入 OpenGZH 站点，并在现有“复制到公众号”按钮旁插入“同步到平台”按钮。按钮和弹层由插件自己的 Shadow DOM 渲染，不进入 Vue 状态，也不修改文章输出 DOM。

插件未安装时，OpenGZH 页面不显示该按钮；因此站点无需展示无效入口或安装提示。

### 3.3 同步弹层

弹层展示四个平台：

- 平台名称与图标
- 本次是否选中
- 当前状态：待检测、已登录、需要登录、处理中、成功、失败、状态未知
- 图片上传进度
- 成功后的“打开草稿”入口
- 需要登录时的“前往登录”和“重新检测”入口

首次使用默认全选。用户选择保存在 `chrome.storage.local`，只保存平台 ID，不保存文章内容或登录数据。

点击“保存草稿并打开”后，插件立即锁定本次文章快照和平台选择。编辑器后续修改不影响正在执行的任务。

### 3.4 完成行为

- 四个平台按固定顺序串行执行，避免图片上传并发、限流和动态请求头规则互相干扰。
- 每个平台完成后立即记录结果并更新 UI。
- 全部结束后，把成功草稿页作为后台标签页打开，并激活第一个成功页面。
- 未登录平台不自动弹出登录页；用户点击“前往登录”后才打开官方登录页。
- 用户登录后点击“重新检测”，只重试该平台，不重复已成功平台。

## 4. 总体架构

```text
OpenGZH Vue 应用
  └─ DistributionPackage 导出桥
       └─ OpenGZH 页面 Content Script + Shadow DOM UI
            └─ chrome.runtime Port
                 └─ MV3 Service Worker
                      ├─ WeixinAdapter
                      ├─ ZhihuAdapter
                      ├─ JuejinAdapter
                      └─ WoshipmAdapter
                           └─ 各平台草稿与图片接口
```

信任边界如下：

- OpenGZH 页面只输出文章数据，不能指定任意网络地址、请求方法或请求头。
- Content Script 只运行在 OpenGZH 顶层页面，负责 UI、输入校验和逐张提供本地图片。
- Service Worker 只接受四个固定平台 ID，只能调用适配器内写死的域名和操作。
- 平台临时 token、ticket 和 CSRF 数据只存在于单次任务内存中。

## 5. OpenGZH 侧设计

### 5.1 新增模块

```text
assets/scripts/distribution/
├── article-package.js
└── extension-bridge.js
```

`article-package.js` 负责在同步前构造文章快照。`extension-bridge.js` 负责响应插件内容脚本发出的固定 DOM 事件，不包含任何平台网络逻辑。

### 5.2 文章数据契约

```ts
interface DistributionPackage {
  schemaVersion: 1
  documentId: string
  title: string
  markdown: string
  portableMarkdown: string
  semanticHtml: string
  wechatHtml: string
  images: DistributionImage[]
  createdAt: number
}

interface DistributionImage {
  ref: string
  kind: 'indexed-db' | 'data-url'
  imageId?: string
  dataUrl?: string
  mimeType: string
  filename: string
  alt: string
}
```

各字段用途：

- `markdown`：原始 Markdown，只用于保真和诊断。
- `portableMarkdown`：移除 `:::ogzh-card`、`<!-- xhs-page -->` 等 OpenGZH 专属标记，供掘金使用。
- `semanticHtml`：保留标题、段落、列表、引用、代码、表格和图片语义，移除主题内联样式与 OpenGZH 专属容器，供知乎和人人使用。
- `wechatHtml`：沿用公众号复制链路的结构、主题、代码块、公式、列表、表格转图和卡片动图兼容处理，但不执行 Clipboard 写入，供微信公众号适配器使用。

### 5.3 与现有渲染链路的关系

同步前必须调用现有 `flushPendingRender()`，确保快照对应最新编辑内容。

为避免复制兼容逻辑分叉，现有 `copyToWechat()` 中“准备微信 HTML”和“写入 Clipboard”拆成两个步骤：

```text
prepareWechatContent(...) -> { html, text, images }
writeWechatClipboard(...)  -> ClipboardItem
```

原有“复制到公众号”继续调用这两个步骤，行为保持不变；插件只复用 `prepareWechatContent()` 的结果。这个拆分仅服务于同步插件，不重构其他渲染模块。

语义 HTML 复用现有 Markdown 预处理、Markdown-it 渲染和 `sanitizeHtml()`，并复用 `processImageProtocol()` 为本地图片保留 `data-image-id`。

### 5.4 图片预检

MVP 只自动处理以下图片：

- 已进入 `WechatEditorImages/images` IndexedDB 的本地图片。
- OpenGZH 生成的 `data:image/*` 图片，例如表格、公式或装饰动图。
- 已经属于目标平台自身 CDN 的图片，可由对应适配器直接保留。

普通外部 `http://` 或 `https://` 图片必须先导入 OpenGZH 本地图片库。只要检测到不能本地读取且不属于目标平台 CDN 的图片，就在任何平台写入前阻断整个批次，并列出图片位置。这样无需申请 `<all_urls>`，也不会产生只有部分图片的草稿。

## 6. 插件文件结构

```text
extension/
├── manifest.json
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── src/
│   ├── content/
│   │   └── open-gzh.js
│   ├── background/
│   │   ├── service-worker.js
│   │   └── distribution-runner.js
│   ├── adapters/
│   │   ├── weixin.js
│   │   ├── zhihu.js
│   │   ├── juejin.js
│   │   └── woshipm.js
│   └── core/
│       ├── adapter-contract.js
│       ├── article-validator.js
│       ├── data-url.js
│       ├── header-rules.js
│       └── platform-errors.js
└── tests/
    ├── manifest.test.js
    ├── article-validator.test.js
    ├── distribution-runner.test.js
    └── adapters/
        ├── weixin.test.js
        ├── zhihu.test.js
        ├── juejin.test.js
        └── woshipm.test.js
```

插件使用原生 JavaScript 和 MV3 ES Modules，不引入 UI 框架、打包器或运行时依赖。Service Worker 使用模块模式；Content Script 保持一个自包含文件，以避免为内容脚本新增构建链路。

## 7. 插件通信与任务模型

### 7.1 页面到 Content Script

OpenGZH 与 Content Script 使用固定名称的 `CustomEvent`：

- `opengzh:distribution:request`
- `opengzh:distribution:ready`
- `opengzh:distribution:error`

桥接层只返回 `DistributionPackage`，不接受平台 URL、请求参数或脚本内容。Content Script 校验 `schemaVersion`、字段类型、正文非空和图片清单后才连接 Service Worker。

### 7.2 Content Script 到 Service Worker

使用名为 `opengzh-distribution-v1` 的长连接 `chrome.runtime.Port`。Service Worker 必须验证：

- `port.sender.url` 的 origin 为 `https://opengzh.pasca.fun`，开发环境允许 `http://localhost` 和 `http://127.0.0.1`。
- 请求来自顶层 frame。
- `platformId` 属于 `weixin | zhihu | juejin | woshipm`。
- 消息符合固定 schema。

图片采用逐张拉取：Service Worker 发出 `IMAGE_REQUIRED`，Content Script 从页面域 IndexedDB 读取对应 Blob，转换为 Data URL 后回复 `IMAGE_DATA`。每次只在消息中传输一张图片，上传成功即释放，避免一次复制整篇文章的二进制数据。

### 7.3 任务状态

单个平台任务状态为：

```text
idle
  -> checking-auth
  -> auth-required | uploading-images
  -> saving-draft
  -> success | failed | unknown
```

批次结果使用 `chrome.storage.session` 保存，只包含任务 ID、平台 ID、状态、草稿 ID、草稿 URL 和脱敏错误码。浏览器退出后自动清除。

## 8. 适配器契约

四个适配器实现同一个最小接口，不增加通用 DSL：

```ts
interface PlatformAdapter {
  id: 'weixin' | 'zhihu' | 'juejin' | 'woshipm'
  name: string
  loginUrl: string
  checkAuth(runtime: AdapterRuntime): Promise<AuthResult>
  uploadImage(runtime: AdapterRuntime, image: Blob, filename: string): Promise<string>
  saveDraft(
    runtime: AdapterRuntime,
    article: DistributionPackage,
    imageMap: Map<string, string>,
    taskState: PlatformTaskState
  ): Promise<DraftResult>
}
```

`AdapterRuntime` 只提供固定域名 fetch、临时请求头规则、逐张图片读取和脱敏日志能力。适配器不能直接调用 `chrome.cookies`，不能访问任意 URL。

## 9. 四个平台实现

### 9.1 微信公众号

内容源：`wechatHtml`。

流程：

1. `GET https://mp.weixin.qq.com/`，通过浏览器会话加载后台首页。
2. 从返回页面提取本次会话所需的 `token`、`ticket`、`user_name` 和服务器时间。
3. 将非微信 CDN 的正文图片上传到公众号素材接口。
4. 替换 HTML 图片地址；移除微信不允许的外部链接。
5. 调用公众号后台 `operate_appmsg` 创建单篇图文草稿。
6. 从响应读取 `appMsgId`，生成草稿编辑页 URL。

`token`、`ticket` 和账号标识只驻留在适配器实例内存中，不保存、不输出日志。验证码、扫码确认或会话过期统一映射为 `AUTH_REQUIRED`。

### 9.2 知乎

内容源：`semanticHtml`。

流程：

1. `GET https://www.zhihu.com/api/v4/me` 检查登录状态。
2. 上传非知乎 CDN 图片，并取得知乎图片 URL。
3. 转换表格、图片 `figure`、代码块等知乎 Draft 编辑器结构，移除 OpenGZH 内联样式。
4. `POST https://zhuanlan.zhihu.com/api/articles/drafts` 创建空草稿并立即记录草稿 ID。
5. `PATCH https://zhuanlan.zhihu.com/api/articles/{id}/draft` 写入标题和正文。
6. 打开 `https://zhuanlan.zhihu.com/p/{id}/edit`。

如果第 4 步成功、第 5 步失败，任务保留远端草稿 ID；重试时更新原草稿，不再新建。

### 9.3 掘金

内容源：`portableMarkdown`。

流程：

1. `GET https://api.juejin.cn/user_api/v1/user/get` 检查登录状态。
2. 通过 `HEAD https://api.juejin.cn/user_api/v1/sys/token` 获取本次 CSRF token。
3. 获取 ImageX 临时上传凭证，申请上传地址、上传图片并提交上传结果。
4. 用掘金 CDN URL 替换 Markdown 图片引用。
5. 调用 `article_draft/create` 创建 Markdown 草稿，分类、标签和封面保持为空。
6. 打开 `https://juejin.cn/editor/drafts/{id}`。

ImageX 的 AccessKey、SecretKey、SessionToken 和 CSRF token 仅在当前平台任务内存中存在，错误日志不得包含这些值。

### 9.4 人人都是产品经理

内容源：`semanticHtml`。

流程：

1. `GET https://www.woshipm.com/writing`，读取页面中的用户标识和请求 token。
2. 调用用户资料接口确认登录有效。
3. 上传非人人 CDN 图片，并取得平台图片 URL。
4. 替换 HTML 图片地址。
5. 向 `wp-admin/admin-ajax.php` 提交 `action=add_draft`、标题和正文。
6. 使用响应返回的 URL；缺失时回退到 `writing?pid={id}`。

任何图片上传失败都必须终止该平台任务，不能保留原始 `img://`、`blob:` 或外部图片 URL 继续创建草稿。

## 10. Manifest 与权限

生产环境 Content Script 只匹配：

```text
https://opengzh.pasca.fun/*
```

开发环境额外允许：

```text
http://localhost/*
http://127.0.0.1/*
```

基础权限：

- `storage`
- `declarativeNetRequestWithHostAccess`

权限方案使用一次安装授权，不使用运行时申请：Chrome Content Script 不能直接调用 `chrome.permissions`，而 [`permissions.request()` 必须在调用它的扩展上下文用户手势内执行](https://developer.chrome.com/docs/extensions/reference/api/permissions)。Chrome 没有保证 Content Script 的点击经 `runtime.Port` 转发后仍为 Service Worker 保留用户手势，因此不把该转发链路作为发布依赖。

MVP 将以下十个精确模式放入 required `host_permissions`，由用户在 Chrome 安装权限界面一次确认：

```text
https://mp.weixin.qq.com/*
https://www.zhihu.com/*
https://zhuanlan.zhihu.com/*
https://api.zhihu.com/*
https://zhihu-pics-upload.zhimg.com/*
https://juejin.cn/*
https://api.juejin.cn/*
https://imagex.bytedanceapi.com/*
https://*.volces.com/*
https://www.woshipm.com/*
```

Content Script 不调用 `chrome.permissions.contains()` 或 `chrome.permissions.request()`。Service Worker 在 `CHECK_AUTH`、`START_BATCH` 和单平台重试前，只接受经白名单校验的 `platformId`，从不可变的 `platformId → origins` 映射派生待检查域名，并在受信任的 Service Worker 上下文调用 `chrome.permissions.contains()`。如果用户或企业策略已撤回/扣留某个 required host，必须在发出任何平台网络请求前以 `PERMISSION_DENIED` 失败关闭，提示用户在 Chrome 扩展详情中恢复站点访问后重试。

这一技术修正的权衡是：将原本的分平台首次提示改为安装时一次展示所有目标域名，换取可执行、可验收的 MV3 权限路径。平台勾选仍只决定执行哪些适配器，不作为授权边界。插件不得请求消息中传入的 origin，也不得在运行时动态扩大权限。

掘金返回的临时上传地址必须属于 `*.volces.com`；知乎上传地址必须为 `zhihu-pics-upload.zhimg.com`。响应返回其他上传 host 时按 `PLATFORM_CHANGED` 失败关闭，不能临时扩大权限。

明确禁止：

- `<all_urls>`
- `cookies`
- `unlimitedStorage`
- 任意页面 Content Script
- `externally_connectable`
- 远程脚本和 `eval`

临时 Origin/Referer 请求头规则使用 `updateSessionRules()` 添加，并在对应平台任务的 `finally` 中删除。每个平台使用固定、不冲突的规则 ID。

## 11. 错误处理与重试

统一错误码：

```text
AUTH_REQUIRED
PERMISSION_DENIED
ARTICLE_INVALID
IMAGE_NOT_LOCAL
IMAGE_READ_FAILED
IMAGE_UPLOAD_FAILED
DRAFT_CREATE_FAILED
DRAFT_UPDATE_FAILED
PLATFORM_CHANGED
RATE_LIMITED
NETWORK_ERROR
UNKNOWN_REMOTE_STATE
```

处理原则：

- `401/403`、登录页重定向或平台登录错误码映射为 `AUTH_REQUIRED`。
- Service Worker 的固定域名授权预检失败时映射为 `PERMISSION_DENIED`，不发出平台请求；恢复站点访问后允许用户显式重试。
- 响应结构不再包含预期字段时映射为 `PLATFORM_CHANGED`，并保留 HTTP 状态与已脱敏响应摘要。
- 图片上传失败可重试该平台，因为草稿尚未创建。
- 创建草稿请求明确返回失败时可以重试。
- 创建草稿请求超时或连接中断、无法判断服务端是否已接受时标记 `UNKNOWN_REMOTE_STATE`，禁止自动重试，提示用户先检查平台草稿箱。
- 知乎创建空草稿后更新失败时，使用已记录草稿 ID 继续更新。
- 已成功平台永远不随批次重试再次执行。

## 12. 安全与隐私

- 文章内容只在 OpenGZH 页面、插件进程和目标平台之间流转。
- 不向 OpenGZH 自有服务器发送文章或平台会话数据。
- 不保存 Cookie、平台 token、ticket、CSRF 或图片上传临时凭证。
- 日志只记录平台 ID、阶段、HTTP 状态和脱敏错误码。
- Service Worker 对平台 ID、消息结构、发送页面 origin 和目标 URL 做白名单校验。
- 平台响应中的 HTML 和错误文本只作为字符串解析，不插入插件 UI；展示前使用 `textContent`。
- 插件 UI 位于 Shadow DOM，避免被 OpenGZH 样式影响。
- 所有远端接口均为平台后台非公开接口；适配器失效时必须失败关闭，不尝试猜测新参数或自动正式发布。

## 13. 测试策略

### 13.1 单元测试

- `article-package`：标题、Markdown、语义 HTML、微信 HTML 和图片清单一致。
- 专属标记清理：卡片与小红书分页标记不会泄漏到掘金。
- 图片预检：本地图片、Data URL、平台 CDN、普通外链分别得到正确结论。
- Manifest：`host_permissions` 精确等于十个锁定模式，不存在 `optional_host_permissions`、`<all_urls>`、`cookies`、`unlimitedStorage` 和全站 Content Script。
- Content Script/Service Worker：Content Script 源码不包含 `chrome.permissions`；Service Worker 只从固定平台 ID 派生 origins，`contains()` 返回 false 时产生 `PERMISSION_DENIED`。
- 四个适配器：登录成功、登录失效、图片上传失败、草稿成功、响应字段变化。
- 任务调度：串行执行、部分成功、已成功平台不重复、未知状态不自动重试。
- 日志脱敏：token、ticket、CSRF、AccessKey 和 SessionToken 不出现在日志文本。

平台测试使用脱敏 fixture 和 mock fetch，不在测试文件中保存真实账号或会话数据。

### 13.2 集成检查

- `npm test`
- `node --check` 检查新增原生 JavaScript 文件。
- `git diff --check`
- 构建后检查 Manifest V3、版本、插件名称、副标题、权限和文件完整性。

### 13.3 真实浏览器验收

每个平台至少验证：

1. 已登录、纯文本文章。
2. 已登录、包含本地 PNG/JPEG/GIF、代码块、列表、引用和表格的文章。
3. 未登录或会话过期。
4. 单个平台失败、其余平台继续成功。
5. 草稿页标题、正文结构和图片数量与 OpenGZH 快照一致。
6. 草稿中不存在 `img://`、`blob:` 或未批准的外链图片。
7. 安装态扩展详情只显示十个锁定 host；在一个可丢弃 Chrome Profile 中通过站点访问控制或企业策略扣留一个 host 时，预检返回 `PERMISSION_DENIED` 且无平台网络请求。

真实验收必须在 `chrome://extensions` 重新加载最新构建后的插件；仅检查源码或构建目录不算安装态验收。

## 14. 构建与发布

插件不增加打包器。Node 构建脚本只负责：

1. 校验 Manifest 和版本。
2. 清理并复制插件文件到 `dist/extension/`。
3. 排除测试、源码映射、`.DS_Store` 和本地账号数据。
4. 生成 `dist/OpenGZH-extension-v0.1.0.zip`。
5. 解压复核 Manifest V3、插件名称、副标题、版本与权限。

构建产物不包含 Wechatsync 源码、远程配置或第三方运行时。

## 15. 发布与回滚

- 插件是独立交付物；未安装插件时 OpenGZH 原有功能完全不变。
- OpenGZH 新增的导出桥没有远端写能力，插件缺失时保持静默。
- 某个平台适配器失效时，其他平台继续工作；用户可取消选择失效平台。
- 紧急回滚只需停用或卸载插件，不需要回滚文章数据。
- 已创建的远端草稿不由插件自动删除，避免误删用户内容。
- 微信公众号仍保留现有“复制到公众号”作为人工兜底；其他平台保留 Markdown/HTML 导出兜底。

## 16. MVP 验收标准

以下条件全部满足才算完成：

- 插件名称显示为 `OpenGZH`。
- 副标题显示为“微信公众号、知乎、掘金、人人都是产品经理文章同步助手”。
- 四个平台均可使用浏览器现有登录会话创建草稿。
- 成功后自动打开对应草稿编辑页。
- 登录失效时只提示重新登录，不要求用户向插件输入账号密码。
- 一个平台注册失败不影响其他平台。
- 标题、正文结构和图片在四个平台草稿中可用。
- 不自动正式发布、提交审核或删除草稿。
- 插件不保存平台凭证，不向自有服务器上传文章。
- Manifest 不包含全站访问和 Cookie 读取权限。
- 单元测试、语法检查、Manifest 检查、构建包检查和四个平台真实浏览器验收全部通过。
