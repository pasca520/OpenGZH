#!/bin/bash
#
# OpenGZH 服务器初始化脚本（宝塔面板 nginx 环境）
# 用法（root 执行）：bash setup-server.sh
# 已完成的步骤会自动跳过
#

set -euo pipefail

DOMAIN="opengzh.pasca.fun"
SITE_DIR="/opt/opengzh"
NGINX_CONF="/www/server/nginx/conf/opengzh.conf"
NGINX_MAIN="/www/server/nginx/conf/nginx.conf"
NGINX_INCLUDE_LINE="include /www/server/nginx/conf/opengzh.conf;"
CERT_NAME="ev.pasca.fun"

if [ "$EUID" -ne 0 ]; then
  echo "❌ 请以 root 身份运行：bash $0" >&2
  exit 1
fi

echo "→ 创建站点目录 $SITE_DIR"
install -d -m 0755 "$SITE_DIR"

if [ ! -f "$NGINX_CONF" ]; then
  echo "→ 部署 nginx 配置到 $NGINX_CONF"
  cp "$(dirname "$0")/nginx-opengzh.conf" "$NGINX_CONF"
else
  echo "→ $NGINX_CONF 已存在，跳过"
fi

if ! grep -qF "$NGINX_INCLUDE_LINE" "$NGINX_MAIN"; then
  echo "→ 添加 include 到 $NGINX_MAIN"
  sed -i "/include.*markit.conf/a $NGINX_INCLUDE_LINE" "$NGINX_MAIN"
else
  echo "→ include 已存在，跳过"
fi

echo "→ 测试 nginx 配置"
if ! /usr/bin/nginx -t; then
  echo "❌ nginx 配置有误" >&2
  exit 1
fi

echo "→ reload nginx"
/etc/init.d/nginx reload

if ! certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  echo "→ 扩展证书覆盖 $DOMAIN"
  certbot certonly --webroot \
    -w /opt/NioEV/frontend -d ev.pasca.fun \
    -w /opt/markit -d markit.pasca.fun \
    -w /opt/opengzh -d "$DOMAIN" \
    --cert-name "$CERT_NAME" --expand --non-interactive --agree-tos
fi

echo ""
echo "✅ 初始化完成"
echo "   访问 https://$DOMAIN"
