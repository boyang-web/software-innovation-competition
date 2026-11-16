# 织游 · Android 学习 Demo

将织纹工坊与三维木偶整合成一条移动端学习闭环：理解经纬 → 平纹排错 → 反馈 → 样布应用到木偶 → 收藏作品与学习记录。Android 8.0+，离线可运行。

## 运行

```sh
npm ci
npm run dev
npm test
npm run build
# Java 17 + Android SDK 35 + Gradle 8.11.1
# 初次本地构建先创建 ~/.android/debug.keystore，或设置 DEMO_KEYSTORE 等签名环境变量
gradle -p android assembleRelease lintRelease
```

## 架构

- `src/learning.js`：课程状态、存档校验、平纹评估和可解释反馈。
- `src/main.js`：手机导航、课程、挑战、制作、作品记录。
- `src/doll-view.js`：将织纹算法生成的 Canvas 直接应用到原仓库 PegDoll 三维模型；管理渲染与资源释放。
- `src/vendor/`：两仓库复用的核心代码，来源见 THIRD_PARTY.md。
- `android/`：Java 原生 Activity + AndroidX WebViewAssetLoader，通过 HTTPS 本地资源域加载打包资产；禁用文件访问，无远端页面内嵌，无 JavaScript 原生桥。
- `.github/workflows/android-release.yml`：测试、Web 构建、Android 构建及 lint、上传 APK；v 标签自动发布 GitHub Release。

## Android 边界

触屏交点、至少 48px 按钮、竖屏滚动、系统安全区域、返回键、后台暂停、三维资源释放、WebGL 失败降级。本机持久化，无账号、云同步或危险权限。三维 WebGL 的兼容性需在实际手机继续验证。

导师当前为离线规则反馈，未连接大模型；后续可通过服务端检索有出处课程资料，并读取结构化任务状态提供分级提示，密钥不得放入 APK。首版课程是传统织造基础，不宣称真实非遗工艺完整仿真。收藏记录包含作品配色和器形，非图片导出。

Release 使用 Demo 签名。仓库 Secret `DEMO_KEYSTORE_BASE64` 可保存稳定 Demo 签名（默认密码 android、别名 androiddebugkey）；未配置时 CI 临时生成，新构建可能需卸载旧版才能安装。正式发布前改用独立正式签名并提高 versionCode。

## 验证

`npm test` 验证平纹邻接关系、错误定位、损坏存档恢复。`tests/mobile.mjs` 使用 Playwright 验证完整手机闭环、重载持久化、三维 Canvas 与窄屏溢出。Android CI 执行 assembleRelease 和 lintRelease。未将浏览器测试等同于真机测试。
