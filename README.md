# 织游 · 山海工坊 v0.5

把文化资料、工具操作、实际织物、错误诊断、独立迁移与木偶创作连接成一条持续任务。不是完整非遗技艺复原，也不是已经验证学习成效的教育产品。

[下载 Android Release](https://github.com/boyang-web/software-innovation-competition/releases/latest)

## 体验路线

进门点工序盒，翻开旁边的手札做四项初次观察，再通过纺、染、织、绣的材料变化和墙上的补纹架练习。换样检验与回访会留下各项首次作答。也可直接体验补纹架。对照左侧原样、转动木珠补出平纹与斜纹，三块样布的进度自动保存。下列委托把这些结构带回织机。

1. 在资料台研读文化语境与经纬原理。
2. 接受第一份委托，选纱并完成 12 根经线的整经。
3. 提综打开梭口 → 交替投梭 → 控制打纬，完成六纬平纹。
4. 放大布面和交织图，检查真实逐纬记录；有错先拆回修复。
5. 提交验收，回答结构、文化归属和迁移解释题。
6. 在木偶台选择器形、木材、布面构图，直接在三维表面绘制。
7. 保存完整作品，导出配方或样布。继续故障修复、独立迁移与斜纹任务。

## 本地运行

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm test
# 另一终端，已安装 Google Chrome
npm run test:e2e
npm run build
# Java 17 / Android SDK 35 / Gradle 8.11.1
# 本地签名先生成 ~/.android/debug.keystore，或配置 DEMO_KEYSTORE 等环境变量
gradle -p android assembleRelease lintRelease
# 已启动设备或模拟器
gradle -p android connectedDebugAndroidTest
```

APK 包含全部三维与课程资产，可离线使用。手机需要支持现代 ES 模块的 Android System WebView；三维不支持时提供工具与交织图降级，仍可完成操作。没有真实手机兼容性矩阵保证。

## 架构

- `src/content/course.js`：四份委托、课程来源、纱线材料、解释评价题。
- `src/domain/loom.js`：纯函数状态机、操作约束、每纬快照、事件记录、结构/色序/密度评价、分级诊断。
- `src/domain/store.js`：v2 存档验证、异常恢复、作品配方与数据持久化。
- `src/scene/workshop.js`：程序化三维房间和工具、提综/投梭/打纬动画、相机、Raycaster UV 绘制、资源生命周期。
- `src/scene/fabric.js`：以真实经线颜色、逐纬浮沉掩码和打纬参数生成布面与交织图。
- `src/vendor/`：复用两个仓库的木偶、木纹、器形、印章与织造规则，来源见 THIRD_PARTY.md。
- `src/main.js`：移动任务流与工具控制；结构/场景/反馈模块独立于 UI。
- `server/mentor.mjs`：可选模型服务；密钥仅保留在服务端，以课程依据、当前状态和最近24步操作构造请求。
- `android/`：WebViewAssetLoader 本地 HTTPS 资源、导航隔离、返回键、后台暂停、系统文件导出桥。

详细机制和验收范围见 [架构说明](docs/architecture.md)。

## 配置大模型导师

复制 `.env.example` 为 `.env`，在服务端设置 `AI_BASE_URL`（含兼容 API 前缀，例如 `/v1`）、`AI_MODEL`、`AI_API_KEY`，运行 `npm run mentor`。通过你自己的 HTTPS 反向代理发布 `/api/mentor`，然后在 App「我的档案 → 设置」填写该服务域名。接口采用兼容 Chat Completions 的模型服务协议。

未配置模型返回 503，App 提供明确反馈并保留离线诊断。只有用户点击请求才发送当前任务；不会上传整个收藏库。独立迁移关即使直接调用服务端也不提供分步答案。服务限制来源域、请求大小、频率及上游超时。公开部署还应添加适合实际用户规模的身份验证、配额和运维监控。

## 验证与发布

- `npm test`：操作顺序、拒绝操作不污染状态、故障定位与修复、迁移相位和色序、斜纹、张力快照、存档、模型接口边界。
- `npm run test:e2e`：四关真实 UI 闭环、织错拒收、拆纬、三维射线绘制、作品重载、导出、320/390/768px。
- GitHub Actions：上述测试、APK 构建与 Android lint、Android 35 模拟器安装和真实 WebView 启动/本机持久化测试，全部通过后发布版本 Release。
- v0.3 起缓存 Demo 签名；正式发行请在仓库 Secret `DEMO_KEYSTORE_BASE64` 配置稳定独立签名。v0.1 临时签名无法继承，升级冲突时需卸载旧版。

## 内容与技术边界

文化内容根据 UNESCO 和中国非遗网编写，通用框架织机不是踞腰织机的精确复制；张力与密度为教学近似。配色、几何装饰、木偶为个人创作，不作为传统纹样含义或族属判断。课程尚未经过传承人审校或真实用户学习效果实验。模型服务可连接但不含默认付费密钥。
