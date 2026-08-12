# OpenGZH 部署指南

纯静态站点，推 main 即部署到 `https://opengzh.pasca.fun`。

## 架构

```
本地 push → GitHub Actions → rsync → 服务器 /opt/opengzh
                                         │
                                         └─ nginx (80/443) → opengzh.pasca.fun
```

## 服务器环境

| 项目 | 值 |
|---|---|
| 系统 | OpenCloudOS 9.4 |
| nginx | 宝塔面板（`/www/server/nginx/`） |
| 管理 | `/etc/init.d/nginx reload` |
| 证书 | Let's Encrypt，与 ev.pasca.fun / markit.pasca.fun 共享 |
| 站点目录 | `/opt/opengzh` |
| vhost 配置 | `/www/server/nginx/conf/opengzh.conf` |

## GitHub Secrets

`https://github.com/pasca520/OpenGZH/settings/secrets/actions`：

| Secret | 值 |
|---|---|
| `DEPLOY_SSH_KEY` | SSH 私钥（对应服务器 root 的 authorized_keys） |
| `REMOTE_HOST` | `106.53.130.64` |
| `REMOTE_USER` | `root` |
| `REMOTE_PORT` | `22` |

## 首次部署

```bash
# 1. 添加 GitHub Secrets（见上表）
# 2. 本地推送触发
git push origin main
# 3. 观察 Actions: https://github.com/pasca520/OpenGZH/actions
```

## 运维

```bash
# 手动 nginx reload
ssh root@106.53.130.64 '/etc/init.d/nginx reload'

# 查看证书
ssh root@106.53.130.64 'certbot certificates'

# 证书续期（自动）
ssh root@106.53.130.64 'certbot renew --dry-run'
```

## 访问统计（GoAccess）

PV/UV 统计基于 nginx access log，由 GoAccess 每 5 分钟生成 JSON，再经自研生成器渲染为中文仪表盘，前端零改动。

| 项目 | 值 |
|---|---|
| 登录引导页 | `https://opengzh.pasca.fun/stats-welcome`（公开，指引登录） |
| 报告地址 | `https://opengzh.pasca.fun/stats/`（basic auth 保护） |
| 日志文件 | `/www/wwwlogs/opengzh.pasca.fun.log`（COMBINED 格式） |
| 报告目录 | `/www/wwwstats/opengzh/`（站点目录之外，rsync 部署不覆盖） |
| 生成脚本 | `/usr/local/bin/opengzh-stats.sh`（GoAccess JSON → 中文仪表盘，PV/UV 累计） |
| 仪表盘生成器 | 仓库 `deploy/stats/opengzh-report.py` → 服务器 `/usr/local/bin/opengzh-report.py` |
| 引导页 | 仓库 `deploy/stats/welcome.html` → 服务器 `/www/wwwstats/welcome.html` |
| cron | `/etc/crontab` 中 `*/5 * * * *` |
| 轮转 | `/etc/logrotate.d/opengzh`（周轮转，保留 8 份，压缩） |

```bash
# 手动刷新一次报告
ssh root@106.53.130.64 '/usr/local/bin/opengzh-stats.sh'

# 修改统计页密码（用户名 pasca）
ssh root@106.53.130.64 "htpasswd /www/wwwstats/.htpasswd pasca"   # 或:
ssh root@106.53.130.64 "printf 'pasca:%s\n' \$(openssl passwd -apr1 '新密码') > /www/wwwstats/.htpasswd"

# 升级仪表盘生成器（从仓库同步）
scp deploy/stats/opengzh-report.py root@106.53.130.64:/usr/local/bin/opengzh-report.py
scp deploy/stats/welcome.html     root@106.53.130.64:/www/wwwstats/welcome.html
ssh root@106.53.130.64 '/usr/local/bin/opengzh-stats.sh'
```

> 说明：仪表盘支持明暗两态（跟随系统）、WCAG AA 对比度、手机端自适应；图表依赖 Chart.js（jsdelivr CDN）。GoAccess 的 `log-format COMBINED` 见 `/etc/goaccess.conf`。

