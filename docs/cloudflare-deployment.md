# Cloudflare OpenNext 部署

更新日期：2026-11-05

## 发布目标与工具

本项目使用 Next.js、OpenNext Cloudflare 适配器和 Wrangler，发布到现有 Worker `oneimgai`，正式域名为 `https://oneimgai.com`。部署配置来自根目录 `wrangler.toml`；Worker 入口为 `.open-next/worker.js`，静态资源来自 `.open-next/assets`。

- Node.js：22.23.4，根目录 `.node-version` 是本地与 CI 的版本依据。
- pnpm：10.17.1，由 `packageManager` 字段固定。
- Next.js：15.5.28；React / React DOM：19.3.1。
- OpenNext Cloudflare：1.20.14；Wrangler：4.155.0，具体传递依赖由 `pnpm-lock.yaml` 固定。

## 构建和发布

本地构建使用非 WSL 系统，或交由 CI 执行；WSL 环境遵循项目的构建限制。先确认 Node.js 和 pnpm 与上面的固定版本一致，并核对 Wrangler 当前登录的账号：

```sh
node --version
pnpm --version
pnpm exec wrangler whoami
```

若未登录，由账号持有人执行 `pnpm exec wrangler login` 完成登录。发布时确认根目录 `wrangler.toml` 的 Worker 名称为 `oneimgai`。

正式发布前确认本地 `public/ads.txt` 存在且为已核验文件。该文件被仓库忽略；独立检出或 CI 发布应通过受控配置提供文件，再执行构建，发布后核对 `/ads.txt` 返回 200。不要在报告中记录真实发布商值。

切换到 `.node-version` 指定的 Node.js，完成 Wrangler 登录后运行：

```sh
pnpm install --frozen-lockfile
pnpm run cf:build
pnpm run cf:deploy -- --keep-vars
```

`pnpm run deploy` 仍保留原来的 OpenNext 构建并发布入口。`--keep-vars` 保留 Dashboard 管理的运行时普通变量；应用广告和 CMP 是否启用仍由各自运行时配置决定。

部署前可执行无上传检查：

```sh
pnpm exec wrangler deploy --dry-run --keep-vars
```

本次生产发布通过上述本地命令执行。源码提交和推送后，仍需通过发布命令或已配置的 Workers Builds 完成下一次上线。

如果另行配置 Workers Builds，使用以下设置：

| 配置项 | 值 |
| --- | --- |
| 发布目标 | 现有 Worker `oneimgai` |
| 项目根目录 | 仓库根目录 |
| 构建命令 | `pnpm run cf:build` |
| 部署命令 | `pnpm run cf:deploy -- --keep-vars` |
| Node.js | `.node-version` 中的 `22.23.4` |

若 Dashboard 存在 `NODE_VERSION` 覆盖值，应与 `.node-version` 一致。这些是 Worker 项目的配置，不能填写到旧 Pages 项目的静态输出流程中。

## 发布后验收

先核对当前生产版本及流量比例：

```sh
pnpm exec wrangler deployments status --name oneimgai --json
```

再检查正式域名，首页、教程、编辑器、隐私页、站点地图和 `ads.txt` 应返回 200；不存在的教程应返回 404。浏览器中确认 JS、CSS、字体加载，以及创建、导出和恢复流程。检查 `ads.txt` 时比较已核验的本地原文件与线上响应，不把正文复制到报告。

```sh
curl -I https://oneimgai.com/
curl -I https://oneimgai.com/blog/quick-start
curl -I https://oneimgai.com/editor
curl -I https://oneimgai.com/ads.txt
```

## 需要回退时

选择曾经验收通过且静态资产完整的版本，再执行回退。将下面的 `VERSION_ID` 替换为已核对的版本 ID；回退命令会立即更新生产流量。

```sh
pnpm exec wrangler versions list --name oneimgai
pnpm exec wrangler versions view VERSION_ID --name oneimgai --json
pnpm exec wrangler rollback VERSION_ID --name oneimgai
```

回退会将选定代码版本设为当前部署；连接的 KV、D1 等资源和其中的数据不会跟随回退。回退后重新执行上面的页面、资源和版本验收。详见 [Cloudflare Workers 回退说明](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)。

## 旧 Pages 构建的区别

Git 历史中的 `90e1062`（2025-06-21）已将应用迁到 OpenNext + Workers，线上历史发布来源为 Wrangler。旧 Pages 项目 `oneimg` 与正式 Worker `oneimgai` 是两个独立项目。Pages 的 `.vercel/output/static` 输出配置不能发布 OpenNext Worker；`.open-next/assets` 也只是静态资源部分。已移除会临时下载旧适配器的 `pages:build` 脚本。

## 本次失败原因与兼容修正

1. 遗留的 `npx @cloudflare/next-on-pages` 会在依赖未安装时临时解析适配器和 Wrangler，引发 npm peer 依赖冲突。
2. Pages v2 默认 Node.js 18.17.1 无法解析当前 `string-width` 的 `/v` 正则语法；当前 Wrangler 也要求 Node.js 22 以上。
3. Node.js 对齐后，原有 Next.js 14.2.5 被 OpenNext 的支持期检查拒绝。将 Next.js 对齐到受支持的 15 维护版，并升级 OpenNext 的兼容补丁；App Router 的异步 headers / params 与 React 19 引用类型按升级要求调整。

Cloudflare 本地开发上下文只在 Next.js 开发服务器阶段初始化，避免 `next typegen` 生成声明后因开发代理存活而不能退出。

公开页和编辑器之间保留完整文档导航，使跨页后第三方广告脚本退出。相关文件对 `@next/next/no-html-link-for-pages` 使用限定范围的规则覆盖，其他 lint 规则照常执行。`.eslintignore` 排除 Playwright 的 `test-results`、`playwright-report` 和 `blob-report` 生成目录，避免提交钩子把历史报告当成源码解析。

## 验证记录

- Node.js 18.17.1 加载原 `string-width 8.2.2` 原样复现正则语法错误；Node.js 22.23.4 下加载成功。
- 原始 OpenNext 构建在 Node.js 22 下复现 Next.js 14.2.5 支持期检查失败。
- `typecheck` 先执行 `next typegen` 再执行 TypeScript，避免干净检出时缺少 Next.js 15 的路由声明；修正后的 `pnpm run typecheck` 与 `pnpm run lint` 通过。
- 正常 `pnpm run cf:build` 通过，生成 `.open-next/worker.js`，未使用跳过支持检查的参数。
- Wrangler 部署 dry run 通过：Worker gzip 约 2197.60 KiB，绑定为 ASSETS。
- 构建产物的本地 Workerd 预览上，现有 `public-content` 与 `adsense-boundary` 共 8 项场景通过，覆盖桌面/手机公开页、教程、站点地图、键盘导航、编辑器内容保留、PNG 导出、备份恢复和广告隔离。
- 构建保留两条非阻塞提示：现有兼容日期较旧，以及编辑器依赖 bundle 中的重复 case 警告。

## 本次生产发布

- Worker：`oneimgai`，正式域名：`https://oneimgai.com`。
- 版本：`24c976b2-6201-4e71-bf76-625869c217a9`，已核对承接 100% 流量。
- 发布时间（UTC）：`2026-11-05T07:08:23.967155Z`。
- 最终 Worker gzip 2200.26 KiB，静态资产 330 项。
- 首页构建标识与本次构建一致；公开页面、四篇教程、编辑器、隐私页、站点地图及 robots 均返回 200，未知教程返回 404。JS、CSS 与自托管 WOFF2 字体均返回 200。
- `ads.txt` 已从原有本地文件保留到发布资产，线上响应字节与原文件一致。
- 发布副本来自已提交源码及本次兼容修复，不包含工作区中原有的未提交旧数据迁移功能。

## 参考

- [Cloudflare OpenNext 部署](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [Cloudflare 构建环境与 Node 版本](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Next.js 支持政策](https://nextjs.org/support-policy)
- [Next.js 15 升级要求](https://nextjs.org/docs/app/guides/upgrading/version-15)
