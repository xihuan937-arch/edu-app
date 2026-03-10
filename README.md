# 教培获客助手 - 部署指南

## 🚀 一键部署到 Vercel（推荐）

### 第一步：安装 Node.js
前往 https://nodejs.org 下载安装 LTS 版本（如已安装可跳过）

### 第二步：安装项目依赖
打开终端/命令行，进入项目文件夹：
```bash
cd edu-app
npm install
```

### 第三步：本地预览（可选）
```bash
npm start
```
浏览器打开 http://localhost:3000 预览效果

### 第四步：部署到 Vercel
```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel（会弹出浏览器让你注册/登录）
vercel login

# 一键部署
vercel --prod
```
部署完成后会给你一个链接，例如：
https://edu-app-xxx.vercel.app

### 第五步：配置 API（重要！）
在 Vercel 控制台 → 项目设置 → Environment Variables 添加：
- Key: REACT_APP_API_KEY
- Value: 你的 Claude API Key（从 https://console.anthropic.com 获取）

然后在 src/App.js 第 25 行修改 headers：
```js
headers: {
  "Content-Type": "application/json",
  "x-api-key": process.env.REACT_APP_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
}
```

重新部署：
```bash
vercel --prod
```

## 📱 手机使用
把链接发给教培机构老板，微信打开后：
- 点右上角「···」→「在浏览器中打开」
- 再点「分享」→「添加到主屏幕」
- 就像小程序一样使用！

## 🔧 功能说明
- ✏️ 招生文案：选类型+风格，AI生成招生文案
- 🎬 视频脚本：选平台+时长，生成完整分镜脚本
- 👥 家长CRM：管理线索，AI生成跟进话术

## 📞 问题反馈
如部署遇到问题，检查：
1. Node.js 版本是否 >= 16
2. npm install 是否成功完成
3. API Key 是否正确配置
