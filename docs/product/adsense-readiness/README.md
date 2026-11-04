# AdSense 投放准备：本地实现与交付记录

状态：ADS-01 至 ADS-08 的本地实现、自动化验收和交付清单已完成。Google 账户配置、CMP 账户发布、站点审核和生产部署属于外部待办，尚未执行；广告保持默认关闭。详见[交付状态](./delivery-status.md)与[配置和发布清单](./release-checklist.md)。

本目录记录已确认的产品规格、8 张本地切片票据、实际交付证据及上线前工作。GitHub Issues 未创建；当前 ADS 编号仅用于本地依赖跟踪。

## 文档入口

- [产品规格](./spec.md)：问题、方案、用户故事、实现与测试决策、范围边界。
- [ADS-01 至 ADS-08 本地票据](./tickets/)：逐张说明行为验收及直接阻塞关系，所有本地验收项已勾选。
- [交付状态](./delivery-status.md)：实际测试结果、运行限制和未执行的外部事项。
- [配置与发布清单](./release-checklist.md)：安全启用条件、后台操作类别、正式域名复核与关闭方式。
- [教程正文和配图](./content/)：四篇真实教程及示例材料，均位于项目 docs 目录。

## Ticket 状态与依赖

| ID | Ticket | 本地状态 | Blocked by |
| --- | --- | --- | --- |
| ADS-01 | [建立公开页与编辑区的广告执行边界](./tickets/01-editor-ad-script-boundary.md) | 完成 | 无 |
| ADS-02 | [从教程入口完成第一次图文导出](./tickets/02-first-real-tutorial.md) | 完成 | ADS-01 |
| ADS-03 | [让用户找到真实的项目信息与数据政策](./tickets/03-public-trust-pages.md) | 完成 | ADS-01 |
| ADS-04 | [补齐导出、样式与本地文件三个教程闭环](./tickets/04-remaining-editor-guides.md) | 完成 | ADS-02 |
| ADS-05 | [接入可重新打开的 Google CMP 隐私选择](./tickets/05-google-cmp-privacy-choices.md) | 完成 | ADS-03 |
| ADS-06 | [在合规就绪的教程详情页展示一个受控广告位](./tickets/06-controlled-tutorial-ad-slot.md) | 完成 | ADS-02、ADS-05 |
| ADS-07 | [让搜索与站内导航准确发现完整公开内容](./tickets/07-public-content-discovery.md) | 完成 | ADS-03、ADS-04 |
| ADS-08 | [完成默认关闭广告的发布前演练与交付](./tickets/08-readiness-rehearsal-and-handoff.md) | 完成；外部上线条件仍待授权维护者处理 | ADS-06、ADS-07 |

直接阻塞边为：ADS-01 → ADS-02、ADS-03；ADS-02 → ADS-04、ADS-06；ADS-03 → ADS-05、ADS-07；ADS-04 → ADS-07；ADS-05 → ADS-06；ADS-06、ADS-07 → ADS-08。全部八张票据的本地行为均已交付；ADS-08 通过文档和合成环境演练记录外部条件，没有将账户或生产事项误报为本地完成。

## 验收范围

现有 Playwright 浏览器路径覆盖页面、URL、HTTP 状态、导出结果及浏览器请求。第三方 CMP 和广告响应均在浏览器上下文中合成，不访问真实广告服务。具体命令、通过数、全量套件的非 AdSense 失败和外部待办见[交付状态](./delivery-status.md)。

本实现只建立同源页面执行边界，不形成浏览器存储权限隔离；不改变既有本地存储格式与默认编辑入口。未部署生产版本、未操作 Google 后台、未申请或代替 Google 判断审核结果，也未请求或点击真实广告。
