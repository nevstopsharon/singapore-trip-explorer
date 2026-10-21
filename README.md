# Singapore Trip Explorer

在线地图：https://nevstopsharon.github.io/singapore-trip-explorer/

2026.12.10–12.22 新加坡参考行程，只安排著名景点与商场，不安排餐馆。
- 12.12 全天环球影城。
- 12.13 下午至 12.14 中午只安排住宿内部活动。
- 12.14–12.17 酒店待定。
- 12.17–12.22 仅记录裕廊西区域住宿，无景点计划。

住宿只存储大致区域，不含酒店名称、住宅地址、门牌、订单或精确住宿坐标。
地图住宿圆圈仅为区域示意；导航只用于公共景点和商场。
行程详见 [行程安排](行程安排.md)。

## 使用
顶部日期可横向滑动，点击切换日期。点击景点卡片定位，点击编号弹窗打开 Google Maps 导航或官网。公共地点虚线表示顺序，不代表实际道路；跨区域请逐站选择交通方式。
住宿卡片仅定位大片区域；未定酒店不设置位置。17–22 日不显示导航按钮。

## 修改行程
推荐编辑 itinerary.json，再运行 `python update_itinerary.py`（Python 3.10+，仅标准库，无需 pip 安装）。
脚本开头为用户配置区，除修改数据文件外通常不需要修改代码。
脚本会更新 src/data.js，并生成 新加坡行程安排.md。提交数据和生成文件到 main 后自动发布。
也可直接编辑 src/data.js，但下次运行脚本会以 itinerary.json 覆盖。
住宿条目使用 type=stay 和 region 区域代号，不填写坐标、地址或酒店名。

## 本地构建
Node.js 22.12+：

    npm ci
    npm run dev
    npm run build

## GitHub Pages
main 提交自动部署；Settings → Pages → Source 为 GitHub Actions。
Actions 绿色勾表示部署完成，随后刷新网址。无需 API Key、Vercel 或付费域名。
GitHub Free 公共仓库适用免费 Pages；网站公开可访问。

## 地图服务与出发前复核
Leaflet + OpenStreetMap。保留署名，不进行批量下载、预加载或离线抓取。
公共底图无可用性保证；服务政策：https://operations.osmfoundation.org/policies/tiles/
时间是建议时间，不是门票预约。环球影城、温室门票与灯光秀节庆规则以官网当日安排为准。
