#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenGZH 流量统计仪表盘生成器
============================
输入：GoAccess --output=json 生成的 JSON（合并当前+历史访问日志）
输出：自包含的中文仪表盘 HTML（暖色品牌风，适配明暗两态）

用法：opengzh-report.py <input.json> <output.html>
依赖：仅 Python 3 标准库；趋势/时段图表使用 Chart.js（jsdelivr CDN）
"""
import json
import html
import sys
from datetime import datetime


# ---------------------------------------------------------------- 基础工具

def esc(s):
    return html.escape(str(s), quote=True)


def fmt(n):
    try:
        return f"{int(float(n)):,}"
    except (TypeError, ValueError):
        return "0"


def fmt_bytes(b):
    try:
        b = int(float(b))
    except (TypeError, ValueError):
        return "0 B"
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if b < 1024:
            return f"{b:.1f} {unit}" if unit != "B" else f"{b} B"
        b /= 1024
    return f"{b:.1f} PB"


def safe_len(items):
    return len(items) if items else 0


def top(items, n):
    """按 hits 降序取前 n 条；输入为 GoAccess data 列表。"""
    if not items:
        return []
    items = sorted(items, key=lambda it: it.get("hits", {}).get("count", 0), reverse=True)
    return items[:n]


def max_count(items):
    if not items:
        return 1
    return max((it.get("hits", {}).get("count", 0) for it in items), default=1)


def parse_date(ymd):
    try:
        return datetime.strptime(str(ymd), "%Y%m%d")
    except ValueError:
        return None


def cn_percent(count, total):
    if not total:
        return "0"
    return f"{count / total * 100:.1f}"


# ---------------------------------------------------------------- 组件渲染

STATUS_MAP = {
    "2xx": ("2xx 成功", "green"),
    "3xx": ("3xx 重定向", "amber"),
    "4xx": ("4xx 客户端错误", "red"),
    "5xx": ("5xx 服务器错误", "red"),
}
STATUS_KEY = {"2xx Success": "2xx", "3xx Redirection": "3xx",
              "4xx Client Errors": "4xx", "5xx Server Errors": "5xx"}


def status_desc(raw):
    """把 '200 - OK: The request...' 精简为 '200 OK'。"""
    s = str(raw)
    code = s.split(" ")[0] if " " in s else s
    tail = s.split(" - ", 1)[-1] if " - " in s else ""
    short = tail.split(":")[0].strip()
    if short:
        return f"{code} {short}"
    return code


def bar_row(label, count, maxv, total, sub=""):
    pct = cn_percent(count, total)
    w = f"{count / maxv * 100:.1f}" if maxv else "0"
    return (
        f'<div class="bar-row">'
        f'<div class="bar-top"><span class="bar-label" title="{esc(label)}">{esc(label)}</span>'
        f'<span class="bar-num"><b>{fmt(count)}</b>{f"<em>{esc(sub)}</em>" if sub else ""}</span></div>'
        f'<div class="bar-track"><div class="bar-fill" style="width:{w}%"></div></div>'
        f'<div class="bar-foot"><span>{pct}% 占总访问</span></div>'
        f'</div>'
    )


def bar_list(items, total, n=8):
    if not items:
        return '<div class="empty">暂无数据</div>'
    maxv = max_count(items)
    out = []
    for it in top(items, n):
        c = it.get("hits", {}).get("count", 0)
        out.append(bar_row(it.get("data", "未知"), c, maxv, total))
    return "".join(out)


def kpi_card(label, value, sub, icon, tone="accent"):
    return (
        f'<div class="kpi {tone}">'
        f'<div class="kpi-icon">{icon}</div>'
        f'<div class="kpi-body"><div class="kpi-label">{esc(label)}</div>'
        f'<div class="kpi-value">{esc(value)}</div>'
        f'<div class="kpi-sub">{esc(sub)}</div></div>'
        f'</div>'
    )


def card(title, inner, cls="", tip=""):
    tip_html = f'<span class="card-tip">{esc(tip)}</span>' if tip else ""
    return (
        f'<section class="card {cls}">'
        f'<header class="card-head"><h2>{esc(title)}</h2>{tip_html}</header>'
        f'<div class="card-body">{inner}</div>'
        f'</section>'
    )


# ---------------------------------------------------------------- 主流程

def build(data):
    g = data.get("general", {})
    pv = int(g.get("total_requests", 0))
    uv = int(g.get("unique_visitors", 0))
    failed = int(g.get("failed_requests", 0))
    valid = int(g.get("valid_requests", 0))
    bw = g.get("bandwidth", 0)
    updated = g.get("date_time", "")
    start_d = g.get("start_date", "")
    end_d = g.get("end_date", "")

    def date_disp(d):
        try:
            dt = datetime.strptime(str(d), "%d/%b/%Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            return str(d)

    # ---- 趋势（近 30 天）
    trend_labels, trend_pv, trend_uv = [], [], []
    vd = data.get("visitors", {}).get("data", [])
    if vd:
        rows = []
        for it in vd:
            dt = parse_date(it.get("data", ""))
            if dt:
                rows.append((dt, it.get("hits", {}).get("count", 0),
                             it.get("visitors", {}).get("count", 0)))
        rows.sort(key=lambda r: r[0])
        for dt, p, u in rows[-30:]:
            trend_labels.append(dt.strftime("%m/%d"))
            trend_pv.append(p)
            trend_uv.append(u)

    # ---- 时段分布（24 小时）
    hours = [0] * 24
    vh = data.get("visit_time", {}).get("data", [])
    for it in vh:
        try:
            h = int(it.get("data", ""))
            if 0 <= h <= 23:
                hours[h] += it.get("hits", {}).get("count", 0)
        except ValueError:
            pass
    has_hours = any(hours)

    # ---- 状态码
    sc_items = []
    sc_data = data.get("status_codes", {}).get("data", [])
    for it in sc_data:
        key = STATUS_KEY.get(it.get("data", ""))
        if not key:
            continue
        group, tone = STATUS_MAP.get(key, (it.get("data", ""), "amber"))
        cnt = it.get("hits", {}).get("count", 0)
        detail = [status_desc(sub.get("data", "")) for sub in it.get("items", [])]
        sc_items.append((group, tone, cnt, detail))
    sc_html = ""
    if sc_items:
        maxv = max(c for _, _, c, _ in sc_items)
        for group, tone, cnt, detail in sorted(sc_items, key=lambda x: -x[2]):
            w = f"{cnt / maxv * 100:.1f}" if maxv else "0"
            detail_txt = " · ".join(detail[:4]) if detail else ""
            sc_html += (
                f'<div class="sc-row"><div class="sc-top"><span class="sc-chip {tone}">{esc(group)}</span>'
                f'<span class="sc-count">{fmt(cnt)}<em>{cn_percent(cnt, pv)}%</em></span></div>'
                f'<div class="bar-track"><div class="bar-fill {tone}" style="width:{w}%"></div></div>'
                f'<div class="sc-detail">{esc(detail_txt)}</div></div>'
            )
    else:
        sc_html = '<div class="empty">暂无数据</div>'

    # ---- 排名区块
    reqs = top(data.get("requests", {}).get("data", []), 10)
    req_html = bar_list(data.get("requests", {}).get("data", []), pv, 10)
    refs = data.get("referrers", {}).get("data", [])
    for it in refs:
        if it.get("data", "").strip() in ("-", ""):
            it["data"] = "直接访问（无来源）"
    ref_html = bar_list(refs, pv, 10)
    os_html = bar_list(data.get("os", {}).get("data", []), pv, 6)
    br_html = bar_list(data.get("browsers", {}).get("data", []), pv, 6)

    hosts = top(data.get("hosts", {}).get("data", []), 10)
    hosts_html = ""
    if hosts:
        maxh = max_count(hosts)
        rows = []
        for i, it in enumerate(hosts, 1):
            c = it.get("hits", {}).get("count", 0)
            v = it.get("visitors", {}).get("count", 0)
            w = f"{c / maxh * 100:.1f}" if maxh else "0"
            rows.append(
                f'<tr><td class="rank">{i}</td><td class="ip">{esc(it.get("data", ""))}</td>'
                f'<td class="hits">{fmt(c)}<span class="bar-track mini"><span class="bar-fill" style="width:{w}%"></span></span></td>'
                f'<td class="uv">{fmt(v)}</td></tr>'
            )
        hosts_html = (
            '<table class="tbl"><thead><tr><th>#</th><th>访客 IP</th><th>访问次数</th><th>独立访客</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table>'
        )
    else:
        hosts_html = '<div class="empty">暂无数据</div>'

    nf = top(data.get("not_found", {}).get("data", []), 5)
    nf_html = ""
    if nf:
        nf_html = '<ul class="nf">' + "".join(
            f'<li><span class="nf-path">{esc(it.get("data", ""))}</span><span class="nf-count">{fmt(it.get("hits", {}).get("count", 0))} 次</span></li>'
            for it in nf) + "</ul>"
    else:
        nf_html = '<div class="empty">暂无 404 请求</div>'

    # ---- 头部
    header = (
        f'<div class="brand"><svg viewBox="0 0 32 32" class="logo" aria-hidden="true">'
        f'<rect x="3" y="11" width="4" height="14" rx="1.5" fill="#C4473A"/>'
        f'<rect x="14" y="6" width="4" height="19" rx="1.5" fill="#E89A8C"/>'
        f'<rect x="25" y="15" width="4" height="10" rx="1.5" fill="#C4473A"/>'
        f'</svg><div class="brand-txt">OpenGZH <em>访问统计</em></div></div>'
        f'<div class="meta"><span class="pill">统计区间 {esc(date_disp(start_d))} ~ {esc(date_disp(end_d))}</span>'
        f'<span class="pill muted">更新于 {esc(updated)}</span></div>'
    )

    # ---- KPI
    failed_pct = cn_percent(failed, pv)
    avg = f"{pv / uv:.1f}" if uv else "0"
    kpis = (
        kpi_card("总访问量（PV）", fmt(pv), f"有效 {fmt(valid)} · 无效 {fmt(failed)}",
                 '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17l5-6 4 4 6-8"/><path d="M14 7h5v5"/></svg>') +
        kpi_card("独立访客（UV）", fmt(uv), f"人均访问 {avg} 次",
                 '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>') +
        kpi_card("失败请求", fmt(failed), f"占全部请求 {failed_pct}%",
                 '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.1"/></svg>', "warn") +
        kpi_card("流量消耗", fmt_bytes(bw), f"覆盖 {safe_len(vd)} 天",
                 '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 14v3M9 10v7M14 6v11M19 12v5"/></svg>', "green")
    )

    # ---- 图表数据（注入到页面 JS）
    chart_js = json.dumps({
        "labels": trend_labels, "pv": trend_pv, "uv": trend_uv,
        "hours": hours,
    })

    # ---- 区块
    trend_card = card("访问趋势（近 30 天）", '<div class="chart-wrap"><canvas id="trendChart"></canvas></div>',
                      "col-2", "蓝色=PV 绿色=UV")
    hours_card = card("时段分布（24 小时）", '<div class="chart-wrap"><canvas id="hoursChart"></canvas></div>',
                      "col-1", "按服务器本地时间")
    pages_card = card("热门页面 Top 10", req_html, "col-1")
    ref_card = card("来源 Referrer Top 10", ref_html, "col-1")
    os_card = card("操作系统 Top 6", os_html, "col-1")
    br_card = card("浏览器 Top 6", br_html, "col-1")
    sc_card = card("状态码", sc_html, "col-1")
    hosts_card = card("访客 IP Top 10", hosts_html, "col-1", "按 IP+User-Agent 去重")
    nf_card = card("404 页面", nf_html, "col-1")

    grid = (trend_card + hours_card + pages_card + ref_card + os_card
            + br_card + sc_card + hosts_card + nf_card)

    footer = (
        f'<footer class="foot">数据来自 nginx 访问日志（GoAccess 1.9.1）· 每 5 分钟自动刷新'
        f'<span class="dot">·</span> 退出后需重新登录'
        f'</footer>'
    )

    html_text = PAGE_TEMPLATE.format(
        title="OpenGZH · 访问统计",
        header=header,
        kpis=kpis,
        grid=grid,
        chart_js=chart_js,
        footer=footer,
    )
    return html_text


# ---------------------------------------------------------------- 页面模板

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{title}</title>
<style>
:root{{
  --bg:#FBF8F3; --surface:#FFFFFF; --surface-2:#F5F1EA; --border:#ECE7DE;
  --text:#1A1714; --text-2:#6F6A61; --text-3:#746E62;
  --accent:#C4473A; --accent-2:#E89A8C; --accent-soft:#F5E2DE;
  --green:#1B7A5E; --green-soft:#DEEBE4; --green-deep:#16634D;
  --amber:#B97E14; --amber-soft:#F6ECD9; --amber-deep:#87550A;
  --red:#C4473A; --red-soft:#F5E2DE; --red-deep:#A93A2E;
  --shadow:0 1px 2px rgba(26,23,20,.05),0 10px 30px rgba(26,23,20,.06);
  --radius:16px;
}}
@media (prefers-color-scheme: dark){{
  :root{{
    --bg:#161412; --surface:#201D1A; --surface-2:#2A2621; --border:#38332B;
    --text:#F0ECE4; --text-2:#B3AC9F; --text-3:#A49D90;
    --accent:#E07A6C; --accent-2:#C96051; --accent-soft:rgba(224,122,108,.16);
    --green:#58A586; --green-soft:rgba(88,165,134,.16); --green-deep:#6FB599;
    --amber:#D9A441; --amber-soft:rgba(217,164,65,.16); --amber-deep:#D9A441;
    --red:#E07A6C; --red-soft:rgba(224,122,108,.16); --red-deep:#E98D80;
    --shadow:0 1px 2px rgba(0,0,0,.4),0 12px 32px rgba(0,0,0,.35);
  }}
}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{-webkit-text-size-adjust:100%}}
body{{
  background:var(--bg); color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif;
  line-height:1.55; -webkit-font-smoothing:antialiased;
}}
::selection{{background:var(--accent-soft)}}
:focus-visible{{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}}
/* 顶栏 */
.topbar{{
  position:sticky;top:0;z-index:20;
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:14px 24px; background:color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter:saturate(1.4) blur(12px); border-bottom:1px solid var(--border);
}}
.brand{{display:flex;align-items:center;gap:12px}}
.logo{{width:30px;height:30px}}
.brand-txt{{font-size:17px;font-weight:700;letter-spacing:.2px}}
.brand-txt em{{font-style:normal;color:var(--text-2);font-weight:600;margin-left:6px}}
.meta{{display:flex;gap:8px;flex-wrap:wrap}}
.pill{{
  font-size:12px;color:var(--text-2);background:var(--surface-2);
  border:1px solid var(--border);border-radius:999px;padding:4px 10px;
}}
.pill.muted{{opacity:.85}}
.container{{max-width:1180px;margin:0 auto;padding:24px 20px 40px}}
/* KPI */
.kpis{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px}}
.kpi{{
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:18px 18px 16px; display:flex;gap:14px; align-items:flex-start;
  box-shadow:var(--shadow); position:relative; overflow:hidden;
}}
.kpi::after{{
  content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent);
}}
.kpi.warn::after{{background:var(--amber)}}
.kpi.green::after{{background:var(--green)}}
.kpi-icon{{
  width:40px;height:40px;flex:none;border-radius:11px;display:grid;place-items:center;
  background:var(--accent-soft);color:var(--accent);
}}
.kpi.warn .kpi-icon{{background:var(--amber-soft);color:var(--amber)}}
.kpi.green .kpi-icon{{background:var(--green-soft);color:var(--green)}}
.kpi-icon svg{{width:22px;height:22px}}
.kpi-body{{min-width:0}}
.kpi-label{{font-size:13px;color:var(--text-2)}}
.kpi-value{{font-size:28px;font-weight:800;letter-spacing:.3px;line-height:1.25;font-variant-numeric:tabular-nums}}
.kpi-sub{{font-size:12px;color:var(--text-3);margin-top:2px}}
/* 卡片网格 */
.grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}}
.card{{
  background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  box-shadow:var(--shadow); overflow:hidden; min-width:0;
}}
.card.col-2{{grid-column:span 2}}
.card-head{{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 18px;border-bottom:1px solid var(--border);
}}
.card-head h2{{font-size:14px;font-weight:700}}
.card-tip{{font-size:12px;color:var(--text-3);font-weight:400}}
.card-body{{padding:16px 18px}}
.chart-wrap{{position:relative;height:260px}}
.empty{{color:var(--text-3);font-size:13px;padding:18px 0;text-align:center}}
/* 排行条形 */
.bar-row{{margin-bottom:14px}}
.bar-row:last-child{{margin-bottom:0}}
.bar-top{{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:5px}}
.bar-label{{
  font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  max-width:68%;color:var(--text);
}}
.bar-num{{font-size:12px;color:var(--text-2);white-space:nowrap;font-variant-numeric:tabular-nums}}
.bar-num b{{font-size:13px;color:var(--text);font-weight:700}}
.bar-num em{{font-style:normal;color:var(--text-3);margin-left:6px}}
.bar-track{{height:8px;background:var(--surface-2);border-radius:99px;overflow:hidden}}
.bar-fill{{height:100%;border-radius:99px;background:var(--accent);transition:width .5s ease}}
.bar-fill.green{{background:var(--green)}}
.bar-fill.amber{{background:var(--amber)}}
.bar-fill.red{{background:var(--red)}}
.bar-foot{{font-size:11px;color:var(--text-3);margin-top:3px}}
/* 状态码 */
.sc-row{{margin-bottom:14px}}
.sc-top{{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:5px}}
.sc-chip{{font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px}}
.sc-chip.green{{background:var(--green-soft);color:var(--green-deep)}}
.sc-chip.amber{{background:var(--amber-soft);color:var(--amber-deep)}}
.sc-chip.red{{background:var(--red-soft);color:var(--red-deep)}}
.sc-count{{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}}
.sc-count em{{font-style:normal;font-weight:500;color:var(--text-3);margin-left:6px;font-size:11px}}
.sc-detail{{font-size:11px;color:var(--text-3);margin-top:4px;line-height:1.6}}
/* 表格 */
.tbl{{width:100%;border-collapse:collapse;font-size:13px}}
.tbl th{{
  text-align:left;font-weight:600;color:var(--text-2);font-size:12px;
  padding:0 0 8px;border-bottom:1px solid var(--border);
}}
.tbl td{{padding:7px 0;border-bottom:1px solid var(--border);vertical-align:middle}}
.tbl tr:last-child td{{border-bottom:none}}
.tbl .rank{{width:28px;color:var(--text-3);font-variant-numeric:tabular-nums}}
.tbl .ip{{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;font-weight:600}}
.tbl .hits{{width:46%;color:var(--text-2);font-variant-numeric:tabular-nums}}
.tbl .uv{{width:56px;text-align:right;color:var(--text-2);font-variant-numeric:tabular-nums}}
.bar-track.mini{{display:block;height:4px;margin-top:4px}}
/* 404 */
.nf{{list-style:none}}
.nf li{{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px}}
.nf li:last-child{{border-bottom:none}}
.nf-path{{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.nf-count{{color:var(--text-2);white-space:nowrap;font-variant-numeric:tabular-nums}}
/* 页脚 */
.foot{{
  max-width:1180px;margin:0 auto;padding:4px 20px 32px;color:var(--text-3);
  font-size:12px;display:flex;gap:8px;flex-wrap:wrap;
}}
.foot .dot{{opacity:.6}}
@media (max-width:900px){{
  .kpis{{grid-template-columns:repeat(2,1fr)}}
  .grid{{grid-template-columns:1fr}}
  .card.col-2{{grid-column:span 1}}
}}
@media (max-width:520px){{
  .topbar{{flex-direction:column;align-items:flex-start;padding:12px 16px}}
  .container{{padding:16px 12px 28px}}
  .kpis{{grid-template-columns:repeat(2,1fr);gap:10px}}
  .kpi{{flex-direction:column;gap:8px;padding:14px}}
  .kpi-value{{font-size:22px}}
  .card-body{{padding:12px 14px}}
  .chart-wrap{{height:210px}}
}}
@media (prefers-reduced-motion: reduce){{
  *{{transition:none!important;animation:none!important}}
}}
</style>
</head>
<body>
<header class="topbar">{header}</header>
<main class="container">
  <section class="kpis">{kpis}</section>
  <section class="grid">{grid}</section>
</main>
{footer}
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
(function(){{
  if(!window.Chart){{return;}}
  var D={chart_js};
  var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;
  var mq=window.matchMedia("(prefers-color-scheme: dark)");
  var C={{
    grid:"rgba(127,127,127,.14)", text:dark?"#B3AC9F":"#6F6A61",
    pv:dark?"#E07A6C":"#C4473A", uv:dark?"#58A586":"#1B7A5E",
    accent:"#E07A6C", accentSoft:"rgba(224,122,108,.16)",
  }};
  function mkCharts(){{
    var trend=document.getElementById("trendChart");
    if(trend && D.labels && D.labels.length){{
      new Chart(trend,{{
        type:"line",
        data:{{labels:D.labels,datasets:[
          {{label:"PV",data:D.pv,borderColor:C.pv,backgroundColor:function(c){{
            var g=c.chart.ctx.createLinearGradient(0,0,0,c.chart.height||260);
            g.addColorStop(0,"rgba(196,71,58,.18)");g.addColorStop(1,"rgba(196,71,58,0)");return g;}},fill:true,
            tension:.35,borderWidth:2,pointRadius:0,pointHitRadius:12,pointHoverRadius:4}},
          {{label:"UV",data:D.uv,borderColor:C.uv,backgroundColor:"transparent",fill:false,
            tension:.35,borderWidth:2,borderDash:[5,4],pointRadius:0,pointHitRadius:12,pointHoverRadius:4}}
        ]}},
        options:chartOpts(["PV","UV"])
      }});
    }}
    var hc=document.getElementById("hoursChart");
    if(hc && D.hours){{
      new Chart(hc,{{
        type:"bar",
        data:{{labels:Array.from({{length:24}},function(_,i){{return i+"时";}}),
          datasets:[{{label:"访问量",data:D.hours,backgroundColor:"rgba(196,71,58,.75)",
            borderRadius:3,borderSkipped:false}}]}},
        options:chartOpts([])
      }});
    }}
  }}
  function chartOpts(legends){{
    return {{
      responsive:true,maintainAspectRatio:false,
      interaction:{{mode:"index",intersect:false}},
      plugins:{{
        legend:legends.length?{{labels:{{usePointStyle:true,boxWidth:8,boxHeight:8,padding:14,color:C.text}},position:"top",align:"end"}}:{{display:false}},
        tooltip:{{backgroundColor:"rgba(20,18,16,.92)",titleColor:"#fff",bodyColor:"#fff",
          padding:10,cornerRadius:8,displayColors:true,boxPadding:3,
          callbacks:{{label:function(ctx){{return ctx.dataset.label+": "+Number(ctx.parsed.y).toLocaleString("zh-CN");}}}}}}
      }},
      scales:{{
        x:{{grid:{{display:false}},ticks:{{color:C.text,font:{{size:11}},maxRotation:0,autoSkip:true,maxTicksLimit:12}}}},
        y:{{beginAtZero:true,grid:{{color:C.grid}},border:{{display:false}},
          ticks:{{color:C.text,font:{{size:11}},callback:function(v){{if(v>=1000)return (v/1000)+"k";return v;}}}}}}
      }}
    }};
  }}
  mkCharts();
  mq.addEventListener("change",function(){{location.reload();}});
}})();
</script>
</body>
</html>
"""


def main():
    if len(sys.argv) != 3:
        print("用法: opengzh-report.py <input.json> <output.html>", file=sys.stderr)
        return 1
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)
    html_text = build(data)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(html_text)
    print(f"OK -> {sys.argv[2]} ({len(html_text):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
