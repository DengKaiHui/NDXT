# 🚀 部署指南

## 本地开发环境

已在 [START.md](START.md) 中说明，这里不再赘述。

---

## 生产环境部署

### 方案一：传统服务器部署（推荐）

#### 1. 环境准备

确保服务器已安装：
- Node.js (>= 16.x)
- npm (>= 8.x)
- Git

```bash
# 检查版本
node -v
npm -v
```

#### 2. 上传代码

**方式 A：Git 克隆**
```bash
git clone <your-repo-url>
cd NDXT
```

**方式 B：直接上传**
```bash
# 将项目打包后上传到服务器
scp -r NDXT user@your-server:/path/to/deploy
```

#### 3. 安装依赖

```bash
npm install --production
```

#### 4. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << EOF
FINNHUB_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=production
EOF
```

#### 5. 使用 PM2 守护进程

**安装 PM2：**
```bash
npm install -g pm2
```

**启动应用：**
```bash
pm2 start server.js --name ndxt-app
```

**设置开机自启：**
```bash
pm2 startup
pm2 save
```

**常用命令：**
```bash
pm2 status              # 查看状态
pm2 logs ndxt-app       # 查看日志
pm2 restart ndxt-app    # 重启应用
pm2 stop ndxt-app       # 停止应用
pm2 delete ndxt-app     # 删除应用
```

#### 6. 配置 Nginx 反向代理（可选）

**安装 Nginx：**
```bash
sudo apt install nginx  # Ubuntu/Debian
sudo yum install nginx  # CentOS
```

**配置文件示例：**
```nginx
# /etc/nginx/sites-available/ndxt
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**启用配置：**
```bash
sudo ln -s /etc/nginx/sites-available/ndxt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. 配置 HTTPS（推荐）

**使用 Let's Encrypt：**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### 方案二：Docker 部署

#### 1. 创建 Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
```

#### 2. 创建 .dockerignore

```
node_modules
.env
*.log
.DS_Store
.git
```

#### 3. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  ndxt-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - FINNHUB_API_KEY=${FINNHUB_API_KEY}
      - PORT=3000
      - NODE_ENV=production
    restart: unless-stopped
```

#### 4. 构建和启动

```bash
# 构建镜像
docker build -t ndxt-app .

# 启动容器
docker run -d \
  -p 3000:3000 \
  -e FINNHUB_API_KEY=your_key \
  --name ndxt-app \
  ndxt-app

# 或使用 docker-compose
docker-compose up -d
```

---

### 方案三：云平台部署

#### Vercel 部署（推荐用于前端）

1. 在 Vercel 导入 GitHub 仓库
2. 设置构建命令：`npm install`
3. 设置启动命令：`node server.js`
4. 添加环境变量：`FINNHUB_API_KEY`

#### Heroku 部署

1. 创建 `Procfile`：
```
web: node server.js
```

2. 部署命令：
```bash
heroku create your-app-name
heroku config:set FINNHUB_API_KEY=your_key
git push heroku main
```

#### Railway 部署

1. 连接 GitHub 仓库
2. 设置环境变量
3. 自动部署

---

## 性能优化建议

### 1. 启用压缩

在 `server.js` 中添加：
```javascript
const compression = require('compression');
app.use(compression());
```

安装依赖：
```bash
npm install compression
```

### 2. 配置缓存

**静态资源缓存：**
```javascript
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));
```

**API 响应缓存（适用于配置接口）：**
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 });

app.get('/api/config', (req, res) => {
  const cached = cache.get('config');
  if (cached) return res.json(cached);
  
  const config = getConfig();
  cache.set('config', config);
  res.json(config);
});
```

### 3. 限流保护

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 最多100次请求
});

app.use('/api/', limiter);
```

---

## 监控和日志

### 1. 日志管理

使用 `winston` 替换简单的 console.log：

```bash
npm install winston
```

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console());
}

module.exports = logger;
```

### 2. 性能监控

使用 PM2 自带的监控：
```bash
pm2 monit
```

或使用专业监控服务：
- **New Relic**
- **Datadog**
- **Sentry** (错误追踪)

---

## 安全加固

### 1. 使用 Helmet 增强安全性

```bash
npm install helmet
```

```javascript
// server.js
const helmet = require('helmet');
app.use(helmet());
```

### 2. 限制 CORS

```javascript
// server.js
const cors = require('cors');

app.use(cors({
  origin: ['https://your-domain.com'],
  credentials: true
}));
```

### 3. 隐藏技术栈信息

```javascript
app.disable('x-powered-by');
```

### 4. 使用环境变量存储敏感信息

永远不要在代码中硬编码 API Key！

---

## 备份和恢复

### 1. 配置文件备份

定期备份 `.env` 和 `config/` 目录。

### 2. 数据库备份（如果有）

```bash
# 示例：MongoDB 备份
mongodump --db ndxt --out /path/to/backup
```

### 3. 代码版本管理

使用 Git Tag 标记每次发布：
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

---

## 更新和回滚

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重启应用
pm2 restart ndxt-app
```

### 回滚到上一个版本

```bash
# 查看版本
git log --oneline

# 回滚到指定版本
git reset --hard <commit-hash>

# 重启应用
pm2 restart ndxt-app
```

---

## 故障排查

### 常见问题

**问题 1：端口被占用**
```bash
# 查找占用端口的进程
lsof -i :3000
# 杀死进程
kill -9 <PID>
```

**问题 2：依赖安装失败**
```bash
# 清除缓存
npm cache clean --force
# 删除 node_modules 重新安装
rm -rf node_modules
npm install
```

**问题 3：API 调用失败**
- 检查 API Key 是否正确
- 检查网络连接
- 查看 PM2 日志：`pm2 logs`

**问题 4：内存泄漏**
```bash
# 查看内存使用
pm2 monit
# 重启应用
pm2 restart ndxt-app
```

---

## 检查清单

部署前请确认：

- [ ] 已安装所有依赖
- [ ] 已配置 `.env` 文件
- [ ] 已配置 Finnhub API Key
- [ ] 已设置 `NODE_ENV=production`
- [ ] 已测试所有 API 接口
- [ ] 已配置 HTTPS（生产环境）
- [ ] 已设置日志管理
- [ ] 已配置自动重启（PM2）
- [ ] 已备份配置文件
- [ ] 已测试错误处理

---

## 联系支持

如遇到部署问题，请查阅：
- [README.md](README.md) - 项目文档
- [ARCHITECTURE.md](ARCHITECTURE.md) - 架构说明
- GitHub Issues

---

**祝你部署顺利！🎉**
