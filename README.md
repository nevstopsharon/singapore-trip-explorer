# 在线使用

网址：https://nevstopsharon.github.io/singapore-trip-explorer/

1. 手机或电脑打开网址，点击顶部 Day 1–Day 8 切换日期。
2. 点击右侧地点卡片，地图会定位；点击地图编号也能查看地点。
3. 在地点弹窗点击“打开 Google Maps 导航”，选择实际出行方式。
4. 底部当天步行路线仅供参考；跨区域出行请用单个地点的公交导航。
5. 分享网址即可，同行人无需 GitHub 账号。手机浏览器可将网址添加到主屏幕。

## 在 GitHub 修改行程

打开仓库 src/data.js，点击铅笔编辑，修改 time（时间）、zh（中文名）、name（英文名）、area（区域）、lat/lng（经纬度），然后 Commit changes。
不要删掉逗号、引号和括号。坐标应填写真实地点的坐标。
提交后在 Actions 查看发布结果；绿色勾表示发布成功，然后刷新网页。
公开仓库和网址都可被他人查看，请勿填写证件、订单、电话号码等私人资料。

## 自动部署

Settings → Pages → Source 为 GitHub Actions。
main 分支每次提交都会自动构建并部署，无需 Vercel、API Key 或付费域名。

---

# 新加坡行程地图（无需 Google API Key）

保留原始 8 天行程、日期切换、地点卡片、编号标记和游览顺序虚线。
地图采用 Leaflet + OpenStreetMap；地点弹窗可打开 Google Maps 公交导航。
当天路线按钮采用步行模式串联地点；Google Maps 在不同设备上可能限制途经点，逐站导航更可靠。
虚线仅表示顺序，不代表实际道路或实时公交路线。

## Windows 本地运行
安装 Node.js 22.12+，在项目文件夹打开终端：

    npm install
    npm run dev

构建：npm run build。预览构建：npm run preview。

## Vercel
导入项目，框架选择 Vite，构建命令 npm run build，输出目录 dist。
无需设置 VITE_GOOGLE_MAPS_API_KEY，也无需 Google Cloud 结算账户。
托管平台费用及使用资格以平台套餐为准。

## 后续修改
- 行程：src/data.js，修改日期、地点、时间、经纬度。
- 底图：src/map-config.js，修改 tileUrl、attribution、maxZoom。
- 样式：src/styles.css。

## 服务条件
OpenStreetMap 公共底图无需 Key，适合遵守政策的轻量交互查看。
必须保留署名，不要批量抓取、预加载城市或制作离线地图。
服务无可用性保证；大流量项目应改用合适的服务商。
https://operations.osmfoundation.org/policies/tiles/
Google 导航链接无需 API Key，打开后由 Google Maps 提供导航。
出发前仍需复核营业时间、票务和交通。
