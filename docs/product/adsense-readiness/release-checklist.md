# AdSense 配置与发布交付清单

适用范围：本轮只交付代码、公开内容、合成验证和启用步骤。不部署，不操作 Google 后台，不请求或点击真实广告。广告默认关闭。

## 配置项

配置由服务端读取，不放在教程正文、客户端本地存储或遥测中。不要把真实值粘贴到 issue、评论、截图和验证报告。

| 配置项 | 用途与有效条件 |
| --- | --- |
| ONEIMG_ADS_ENABLED | 仅精确值 1 表示请求开启；未设置及其他值均关闭。 |
| ONEIMG_ADS_CLIENT | Google 提供的发布商配置；必须满足 ca-pub- 加 16 位数字。 |
| ONEIMG_ADS_SLOT | Google 提供的手动展示广告位；必须为 10 位数字。 |
| ONEIMG_CMP_ENABLED | 仅精确值 1 允许连接 Google CMP。 |
| ONEIMG_GOOGLE_CMP_SRC | 从官方账户消息代码中取得的独立 Google CMP 脚本 URL；必须为 HTTPS 的 fundingchoicesmessages.google.com /i/ 发布商路径。不自行拼装或猜测生产地址。 |
| ONEIMG_CMP_INDEPENDENT_VERIFIED | 仅当授权维护者已证明账户的官方 CMP 标签可以独立于广告资源运行，且覆盖正式域名与所需地区时才设为 1。它是接入审核条件，不是用户同意值。 |

缺失、格式无效或 CMP 接入尚未核验时，广告保持关闭。CMP 运行时仍必须提供正式信号；配置开关不能替代用户选择。网页中第三方标签所需的公开账户标识属于其网络协议的一部分，不是秘密凭据，但报告仍只记录去敏结果。

## Cloudflare Workers 运行时配置

应用在请求时从服务端读取广告与 CMP 环境变量。当前 `/privacy` 和 `/blog/[slug]` 是动态渲染路由；本地 Workerd 预览已通过命令行注入虚构变量验证请求时配置读取。此验证不代表 Cloudflare Dashboard 或生产 Worker 已配置。

`wrangler.toml` 保留项目现有的 2025-03-01 兼容日期，并显式打开 `nodejs_compat_populate_process_env`，使运行时的 `process.env` 可读取 Worker 环境变量。正式启用前，授权维护者应在正确的 Cloudflare Worker 环境设置服务端变量，然后先验证动态页面和配置失效时的关闭行为。不要把真实值提交到仓库、报告或截图。

OpenNext 对本地、构建期和运行时变量的区别见[环境变量说明](https://opennext.js.org/cloudflare/howtos/env-vars)；Cloudflare 对 `process.env` 的兼容日期和标志说明见[Workers 文档](https://developers.cloudflare.com/changelog/post/2025-03-11-process-env-support/)。

## 官方契约与接入冲突

2026-11-01 核对了以下官方资料：

- [Google Privacy & Messaging API](https://developers.google.com/funding-choices/fc-api-docs)：CONSENT_API_READY 只说明 API 可调用；使用 TCF 事件、CONSENT_MODE_DATA_READY 和正式 consent mode 状态，而不是自行保存布尔同意值。
- [Google AdSense 创建欧洲法规消息](https://support.google.com/adsense/answer/10960768?hl=en)：文档要求页面放置 AdSense code。这与本站政策页不得加载 AdSense 广告脚本的约束存在实际接入风险。
- [Google 的 CMP 要求](https://support.google.com/adsense/answer/13554116?hl=en)：认证 CMP 及适用地区要求。
- [广告隐私披露](https://support.google.com/adsense/answer/1348695?hl=en)：Google 与第三方 Cookie、个性化广告及选择说明。
- [IAB GPP CMP API 1.1](https://github.com/InteractiveAdvertisingBureau/Global-Privacy-Platform/blob/main/Core/CMP%20API%20Specification.md)：使用 ping、addEventListener 与 parsedSections 监听美国州退出选择，不能用初始状态覆盖后续变化。

代码支持官方独立 Google CMP 标签和正式 API，但没有从 AdSense 广告脚本反向引导 CMP。账户若只能提供依赖 AdSense code 的消息，请保持 ONEIMG_ADS_ENABLED 关闭，不设置独立验证标记，也不把合成测试当作接入成功。需要 Google 官方支持的独立接入方式，或另行评审产品边界变更。不能为了开启广告在政策页偷偷加载 AdSense。

## 请求与隐私规则

- 仅四篇真实教程详情具备一个正文后的手动广告位。首页、列表、About、政策、赞助、编辑器、Studio、测试场景及错误页均不加载 AdSense。
- 非广告页的隐私入口使用整页导航到 /privacy#choices；用户点击后才连接配置好的 CMP。编辑器不加载 CMP。
- 正式 CMP 的广告存储、广告用户数据、个性化目的均为已授权或不适用，且 TCF 与美国州信号无阻塞，才请求广告。本期保守地不为拒绝用户请求有限或非个性化广告；未配置的目的也不自动放行。
- 欧洲选择通过官方 showRevocationMessage 重新打开。适用美国州的默认退出入口由 Google CMP 提供，本站不隐藏或替换它。
- 撤回导致已有广告不再符合条件时，整页刷新结束旧执行上下文；重新打开隐私设置本身也先整页离开教程。
- 广告无填充、失败、被拦截或超时不阻塞阅读与创作。预留区域保留，不循环请求，不自动刷新广告。
- 不采集作品、图片、文件名、剪贴板或本地记录监测广告。公开页与编辑器同源，页面执行隔离不等于存储权限隔离。

## 授权维护者的后台操作类别

1. 核对正式域名与 AdSense 站点状态；核对所需审核和域名归属，记录实际结果。
2. 在 Privacy & messaging 中配置适用地区消息、隐私政策地址、语言、拒绝和管理选项，以及适用的美国州消息；确认官方可独立运行的标签与 consent mode 目的配置。不要把 Auto ads 或自动兜底消息当作页面边界的替代方案。
3. 发布消息并在正式域名、目标地区及浏览器中复核。验证待选择、接受、拒绝、已保存、重开、修改、撤回及资源不可用。欧洲法规消息不代表全球全部法律义务已覆盖。
4. 创建一个手动展示广告位，关闭 Auto ads、锚定、悬浮、插屏和刷新功能。保留内容与创作入口的间距。
5. 在受保护的部署配置里设置账户值；独立 CMP 证据通过后才设置验证标记，最后设置广告开关。

## ads.txt

在正式域名根路径检查 /ads.txt 返回 200 和纯文本授权记录。Google DIRECT 记录的发布商 ID 应与受保护的 ONEIMG_ADS_CLIENT 去掉 ca- 前缀后相同，认证机构 ID 与 Google 官方要求一致。检查时只输出匹配与否，不输出 ID。

2026-11-01 和 2026-11-04 只读核对：正式域名 /ads.txt 返回 200，内容与仓库一致。AdSense 账号发布商 ID 与仓库 Google DIRECT 记录匹配（报告不记录 ID）。

AdSense 网站列表仍显示 ads.txt“未找到”，状态更新时间为 2025-12-21；原因未确认。不要替换或改写已经匹配的记录。Google 说明更新通常需几天反映，低流量站点最长约一个月；等待重新抓取后复核，参见 [Google ads.txt 疑难排解](https://support.google.com/adsense/answer/12171244?hl=en)。ads.txt 可达和账号 ID 匹配不代表站点审核通过。

## 正式域名演练

依次验证首页 → 教程列表 → 四篇正文 → 编辑器，以及页脚 → 政策 → 隐私设置。对桌面与手机检查正文、截图、焦点、广告预留空间及创作入口。未知教程应返回 HTTP 404，sitemap 应只包含有效公开页面。

在广告开启且 CMP 就绪的真实环境验证教程请求、隐私选择变化、进入编辑器后的完整页面跳转，以及编辑器、Studio、错误页没有广告请求。不要点击真实广告进行验收；使用网络观测与 Google 官方预览机制。用专用虚构内容完成恢复、编辑、PNG 与 .oneimg 保存恢复，避免真实用户作品进入截图。

## 关闭与回退

将 ONEIMG_ADS_ENABLED 取消或设为 0，再按正常部署流程更新服务。若 CMP 也应停止连接，同时关闭 ONEIMG_CMP_ENABLED。对已打开的教程页进行刷新后复核：不再存在广告脚本请求和广告位；编辑器和本地存储不需要迁移或清理。停止新增请求不能从服务端撤销访客已经打开的旧页面上下文。

## 状态必须分开记录

| 状态 | 本轮结论 |
| --- | --- |
| 本地代码与合成浏览器验证 | 详见 delivery-status.md 的实际命令与结果。 |
| AdSense 账户配置与独立 CMP 标签 | 发布商 ID 与 ads.txt 匹配；Auto ads 已关闭；已创建一个响应式展示广告单元。独立 CMP 和 Cloudflare 运行时变量仍待配置。 |
| Google 站点审核 | 未核验，不承诺结果。 |
| 新版本生产部署 | 未执行。 |
| 真实 CMP 与广告验收 | 未执行；合成测试不替代该项。 |
