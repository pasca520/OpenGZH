#!/bin/bash
#
# OpenGZH Let's Encrypt 证书申请/扩展脚本（宝塔面板环境）
# 用法：sudo bash certbot-issue.sh
# 前提：nginx 已运行，DNS 已解析，/opt/opengzh 已存在

set -euo pipefail

DOMAIN="opengzh.pasca.fun"
CERT_NAME="ev.pasca.fun"

if [ "$EUID" -ne 0 ]; then
  echo "❌ 请以 root 身份运行" >&2
  exit 1
fi

# 检查是否已在证书中
if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  echo "→ $DOMAIN 已在证书中，跳过"
  certbot certificates 2>/dev/null | grep -A5 "$CERT_NAME"
  exit 0
fi

echo "→ 扩展证书覆盖 $DOMAIN"
certbot certonly --webroot \
  -w /opt/NioEV/frontend -d ev.pasca.fun \
  -w /opt/markit -d markit.pasca.fun \
  -w /opt/opengzh -d "$DOMAIN" \
  --cert-name "$CERT_NAME" --expand --non-interactive --agree-tos

echo ""
echo "✅ 证书已扩展"
certbot certificates 2>/dev/null | grep -A5 "$CERT_NAME"
