import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, '..');
const SOURCE_DIR = path.join(REPOSITORY_ROOT, 'extension');
const DIST_DIR = path.join(REPOSITORY_ROOT, 'dist');
const OUTPUT_DIR = path.join(DIST_DIR, 'extension');
const VERSION = '0.1.0';
const ARCHIVE_PATH = path.join(DIST_DIR, `OpenGZH-extension-v${VERSION}.zip`);
const FORBIDDEN_PERMISSIONS = ['<all_urls>', 'cookies', 'unlimitedStorage'];
const REQUIRED_PERMISSIONS = Object.freeze(['storage', 'scripting', 'declarativeNetRequestWithHostAccess']);
const REQUIRED_HOST_PERMISSIONS = Object.freeze([
  'https://mp.weixin.qq.com/*',
  'https://www.zhihu.com/*',
  'https://zhuanlan.zhihu.com/*',
  'https://api.zhihu.com/*',
  'https://zhihu-pics-upload.zhimg.com/*',
  'https://juejin.cn/*',
  'https://api.juejin.cn/*',
  'https://imagex.bytedanceapi.com/*',
  'https://tos-d-x-lf.douyin.com/*',
  'https://*.volces.com/*',
  'https://www.woshipm.com/*',
]);
const REQUIRED_OPTIONAL_HOST_PERMISSIONS = Object.freeze(['https://*/*']);
const REQUIRED_ARCHIVE_ENTRIES = Object.freeze([
  'manifest.json',
  'src/content/open-gzh.js',
  'src/background/service-worker.js',
  'assets/icon-128.png',
]);

export function shouldCopyExtensionPath(relativePath) {
  if (typeof relativePath !== 'string') return false;
  const normalized = relativePath.replaceAll('\\', '/');
  const segments = normalized.toLowerCase().split('/');
  const lower = normalized.toLowerCase();
  if (normalized.startsWith('/') || /^[a-z]:\//i.test(normalized) || segments.includes('..')) return false;
  return !segments.includes('tests')
    && !lower.endsWith('.map')
    && !lower.endsWith('.har')
    && !lower.endsWith('.md')
    && !segments.includes('.ds_store')
    && !segments.includes('.env');
}

export function validateArchiveListing(listing) {
  for (const entry of String(listing).split(/\r?\n/).filter(Boolean)) {
    if (!shouldCopyExtensionPath(entry)) throw new Error(`压缩包包含禁止文件: ${entry}`);
  }
}

export function validateArchiveRootListing(listing) {
  const entries = new Set(String(listing).split(/\r?\n/).filter(Boolean));
  for (const required of REQUIRED_ARCHIVE_ENTRIES) {
    if (!entries.has(required)) throw new Error(`压缩包缺少根目录文件: ${required}`);
  }
  if ([...entries].some((entry) => entry === 'extension' || entry.startsWith('extension/'))) {
    throw new Error('压缩包不得嵌套 extension 目录');
  }
}

export function validateExtensionManifest(manifest) {
  if (manifest.manifest_version !== 3) throw new Error('Manifest 必须是 MV3');
  if (manifest.name !== 'OpenGZH' || manifest.short_name !== 'OpenGZH') throw new Error('插件名称错误');
  if (manifest.description !== '微信公众号、知乎、掘金、人人都是产品经理文章同步助手') throw new Error('插件副标题错误');
  if (manifest.version !== VERSION) throw new Error(`插件版本必须是 ${VERSION}`);
  if (JSON.stringify(manifest.permissions) !== JSON.stringify(REQUIRED_PERMISSIONS)) {
    throw new Error('Manifest 权限必须且只能包含已锁定权限');
  }
  if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(REQUIRED_HOST_PERMISSIONS)) {
    throw new Error('Manifest 必须且只能包含已锁定的平台域名');
  }
  if (JSON.stringify(manifest.optional_host_permissions) !== JSON.stringify(REQUIRED_OPTIONAL_HOST_PERMISSIONS)) {
    throw new Error('Manifest 可选域名权限必须且只能按来源申请 HTTPS 图片权限');
  }
  const serialized = JSON.stringify(manifest);
  if (FORBIDDEN_PERMISSIONS.some((permission) => serialized.includes(permission))) throw new Error('Manifest 包含禁止权限');
  if (Object.hasOwn(manifest, 'externally_connectable')) throw new Error('禁止 externally_connectable');
  return manifest;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`${command} 失败: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout;
}

async function assertIcons() {
  for (const size of [16, 48, 128]) await stat(path.join(SOURCE_DIR, 'assets', `icon-${size}.png`));
}

async function copyRuntime() {
  const expectedOutput = path.join(REPOSITORY_ROOT, 'dist', 'extension');
  if (OUTPUT_DIR !== expectedOutput) throw new Error('拒绝清理未批准目录');
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });
  await cp(SOURCE_DIR, OUTPUT_DIR, {
    recursive: true,
    filter(source) {
      const relative = path.relative(SOURCE_DIR, source);
      return !relative || shouldCopyExtensionPath(relative);
    },
  });
}

function inspectArchive() {
  const listing = run('/usr/bin/unzip', ['-Z1', ARCHIVE_PATH]);
  validateArchiveListing(listing);
  validateArchiveRootListing(listing);
  const archivedManifest = JSON.parse(run('/usr/bin/unzip', ['-p', ARCHIVE_PATH, 'manifest.json']));
  validateExtensionManifest(archivedManifest);
}

export async function buildExtension() {
  const manifest = JSON.parse(await readFile(path.join(SOURCE_DIR, 'manifest.json'), 'utf8'));
  validateExtensionManifest(manifest);
  await assertIcons();
  await copyRuntime();
  await rm(ARCHIVE_PATH, { force: true });
  run('/usr/bin/zip', ['-X', '-r', ARCHIVE_PATH, 'manifest.json', 'assets', 'src'], { cwd: OUTPUT_DIR });
  inspectArchive();
  return ARCHIVE_PATH;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildExtension()
    .then((archive) => console.log(`Built ${path.relative(REPOSITORY_ROOT, archive)}`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
