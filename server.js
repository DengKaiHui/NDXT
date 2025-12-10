const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');
const Logger = require('./utils/logger');

const app = express();

// 中间件
app.use(cors()); // 允许跨域
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码请求体

// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.use('/api', apiRoutes);

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `路径 ${req.path} 不存在`
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  Logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : '服务器错误'
  });
});

// 启动服务器
const PORT = config.port;
app.listen(PORT, () => {
  Logger.info(`🚀 服务器启动成功！`);
  Logger.info(`📍 地址: http://localhost:${PORT}`);
  Logger.info(`🌍 环境: ${config.nodeEnv}`);
  Logger.info(`🔑 API Key 配置: ${config.finnhubApiKey ? '已配置' : '未配置（需在 .env 文件中设置）'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  Logger.info('收到 SIGTERM 信号，准备关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('收到 SIGINT 信号，准备关闭服务器...');
  process.exit(0);
});
