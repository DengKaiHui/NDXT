# 🚀 快速启动指南

## 第一次使用？按这个步骤来！

### 1️⃣ 安装依赖（首次必须执行）

打开终端，进入项目目录，执行：

```bash
npm install
```

### 2️⃣ 配置 API Key（首次必须执行）

**方法一：创建 .env 文件（推荐）**

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件，填入你的 API Key
# FINNHUB_API_KEY=your_api_key_here
```

**方法二：在网页中配置**

启动服务器后，在网页界面点击"配置 API Key"按钮输入。

> 💡 **获取免费 API Key**：访问 https://finnhub.io/register 注册即可

### 3️⃣ 启动服务器

```bash
npm start
```

看到以下信息表示启动成功：

```
🚀 服务器启动成功！
📍 地址: http://localhost:3000
🌍 环境: development
🔑 API Key 配置: 已配置
```

### 4️⃣ 打开浏览器

访问：**http://localhost:3000**

---

## 🔄 开发模式（自动重启）

如果你需要修改代码，推荐使用开发模式：

```bash
npm run dev
```

代码修改后服务器会自动重启。

---

## 📱 使用方法

### 自动获取数据（推荐）

1. 点击"配置 API Key"按钮，输入你的 Finnhub API Key
2. 点击"获取实时数据"按钮
3. 系统自动填充所有数据并计算结果

### 手动输入数据

直接在右侧输入框填入：
- 当前价格（QQQ 最新价）
- 52周最高（过去一年的最高价）
- 纳指 PE（市盈率）
- VIX 指数（恐慌指数）

输入后系统自动计算并更新结果。

### 分享结果

点击"复制截图"按钮，生成高清图片并复制到剪贴板，可直接粘贴到微信、小红书等平台。

---

## ❓ 常见问题

### Q1: npm install 失败怎么办？

**A:** 尝试切换到国内镜像源：

```bash
npm install --registry=https://registry.npmmirror.com
```

### Q2: API 调用失败？

**A:** 检查以下几点：
- API Key 是否正确
- 网络连接是否正常
- 是否超出免费账户的调用频率限制（60次/分钟）

### Q3: 如何修改计算规则？

**A:** 编辑 `config/index.js` 文件，修改阈值或决策矩阵。

### Q4: 端口 3000 被占用？

**A:** 修改 `.env` 文件中的 `PORT` 参数：

```env
PORT=3001
```

---

## 🛠 项目结构速览

```
NDXT/
├── server.js              # 后端入口
├── config/                # 配置（阈值、矩阵）
├── services/              # 业务逻辑（数据获取、计算）
├── routes/                # API 路由
├── utils/                 # 工具函数
└── public/                # 前端代码
    ├── index.html         # 主页面
    └── js/                # 前端 JS 模块
        ├── api.js         # API 调用
        ├── ui.js          # UI 更新
        └── app.js         # 主逻辑
```

---

## 📚 更多文档

详细的 API 文档和开发说明请查看 [README.md](README.md)

---

**祝你投资顺利！📈**
