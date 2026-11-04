# [AdSense Slice 07/08] 让搜索与站内导航准确发现完整公开内容

本地状态：实现与本票据的本地验收完成。账户、审核及生产环境事项按[交付状态](../delivery-status.md)记录。

## Parent

[Spec] OneIMG 公开教程与 AdSense 投放准备（发布时关联实际 spec issue）

## What to build

访问者和搜索抓取者能通过有效导航及 sitemap 找到四篇教程与必要公开页面，并获得正确的页面身份和错误响应。

## Acceptance criteria

- [x] 提供 sitemap，包含完整且可公开索引的页面与四篇教程，不收录编辑器、Studio、测试路由或未知文章。
- [x] 公开页面具有准确独立的标题、描述和 canonical，首篇已交付的 metadata 不回退为所有文章共用的占位信息。
- [x] 最终导航和页脚连接所有本轮公开内容，首页、教程列表、详情与政策页面不存在死链和未完成入口。
- [x] 未知文章和错误页返回正确 HTTP 状态，不被 metadata 或 sitemap 错误声明为有效内容。
- [x] 保留合理的 robots 可访问性；不把 robots 当作安全隔离或替代广告白名单的措施。
- [x] 通过真实 HTTP 响应与浏览器页面验证 sitemap 发现到正确正文的路径，以及对应 canonical 和状态码。
- [x] 交付说明不将 SEO 或文章数量描述为 AdSense 审核通过保证，不引入分类、搜索、模板中心或多语言站。

## Blocked by

- ADS-03 — [AdSense Slice 03/08] 让用户找到真实的项目信息与数据政策
- ADS-04 — [AdSense Slice 04/08] 补齐导出、样式与本地文件三个教程闭环
