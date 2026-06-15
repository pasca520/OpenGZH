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
