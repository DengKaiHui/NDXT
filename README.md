# 纳指100 市场温度计

基于 PE、VIX、回撤三维度的投资决策辅助工具（前后端分离版本）

## 📁 项目结构

```
NDXT/
├── server.js              # 服务器入口文件
├── package.json           # 项目依赖配置
├── .env                   # 环境变量（需自行创建）
├── .env.example           # 环境变量示例
├── config/
│   └── index.js          # 配置管理（阈值、矩阵参数）
├── routes/
│   └── api.js            # API 路由定义
├── services/
│   ├── finnhubService.js         # Finnhub 数据获取服务
│   ├── yahooFinanceService.js    # Yahoo Finance 服务（VIX）
│   ├── xueqiuService.js          # 雪球服务（VIX、PE）
│   ├── danjuanService.js         # 蛋卷基金服务（PE）
│   ├── alternativeDataService.js # 备用数据源服务
│   ├── dataAggregatorService.js  # 数据聚合服务（智能切换）
│   └── calculationService.js     # 计算逻辑服务
├── utils/
│   └── logger.js         # 日志工具
└── public/               # 前端静态文件
    ├── index.html        # 主页面
    └── js/
        ├── api.js        # 前端 API 调用模块
        ├── ui.js         # 前端 UI 更新模块
        └── app.js        # 前端主逻辑模块
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的 Finnhub API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 必需: Finnhub API Key (用于获取 QQQ 价格)
FINNHUB_API_KEY=your_api_key_here
PORT=3000

# 可选: 备用数据源 API Keys (提高数据获取成功率)
# ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
# TWELVE_DATA_API_KEY=your_twelve_data_key
```

**注册 API Key**:
- Finnhub (必需): https://finnhub.io/register
- Alpha Vantage (可选): https://www.alphavantage.co/support/#api-key
- Twelve Data (可选): https://twelvedata.com/

### 3. 测试数据源（推荐）

运行数据源测试，检查可用性：

```bash
npm run test:data
```

这将测试所有数据源并给出推荐配置。

### 4. 启动服务器
NODE_ENV=development
```

> 💡 获取免费 API Key：https://finnhub.io/register

### 3. 启动服务器

**开发模式（自动重启）：**
```bash
npm run dev
```

**生产模式：**
```bash
npm start
```

服务器启动后，访问：http://localhost:3000

## 📡 API 接口文档

### 数据来源说明

本项目使用**多数据源智能切换**策略，确保高可用性：

| 数据项 | 主数据源 | 备用数据源 | 说明 |
|-------|---------|----------|------|
| QQQ 价格 | Finnhub | - | 需要 API Key（免费账户60次/分钟） |
| 52周高点 | Finnhub | - | 获取失败时降级为当日最高价 |
| VIX 指数 | Yahoo Finance | 雪球 → Alpha Vantage → Twelve Data | **多级降级**，主数据源免费 |
| PE 数据 | 雪球 | 蛋卷基金 | **多级降级**，均免费 |
| PE 百分位 | 蛋卷基金 | - | 历史分位数据 |

**降级策略**: 当主数据源失败时，自动尝试备用数据源，无需人工干预。

**详细配置**: 查看 `DATA_SOURCES_V2.md` 了解完整的数据源配置指南。

### 1. 获取市场数据

**GET** `/api/market-data?apiKey=YOUR_API_KEY`

返回 QQQ 价格、52周高点、VIX、PE、PE百分位数据。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "currentPrice": 500.25,
    "high52Week": 520.30,
    "vix": 17.3,
    "pe": 36.5,
    "pePercentile": 85.2,
    "timestamp": "2024-12-05T10:00:00.000Z",
    \"dataSource\": {
      \"price\": \"Finnhub\",
      \"vix\": \"Yahoo Finance\",
      \"pe\": \"Xueqiu\"
    }
  }
}
```

### 2. 计算投资决策

**POST** `/api/calculate`

**请求体：**
```json
{
  "pe": 36.5,
  "vix": 17.3,
  "currentPrice": 500.25,
  "high52Week": 520.30
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "inputs": { "pe": 36.5, "vix": 17.3, "currentPrice": 500.25, "high52Week": 520.3 },
    "results": {
      "drawdown": 3.86,
      "row": 0,
      "col": 1,
      "baseUnits": 0,
      "multiplier": 1,
      "finalUnits": 0
    },
    "labels": {
      "pe": { "text": "泡沫", "level": 0 },
      "vix": { "text": "平稳", "level": 1 },
      "drawdown": { "text": "高位运行", "level": 0 }
    },
    "action": {
      "title": "观望",
      "subtitle": "估值过高，等待回调"
    }
  }
}
```

### 3. 获取配置

**GET** `/api/config`

返回计算阈值和决策矩阵配置。

### 4. 健康检查

**GET** `/api/health`

检查服务器状态。

## 🧩 模块说明

### 后端模块

#### 1. **config/index.js** - 配置管理
- PE/VIX/回撤阈值配置
- 决策矩阵基础数据
- API 端点配置

#### 2. **services/finnhubService.js** - Finnhub 数据获取
- `getQQQQuote()` - 获取 QQQ 实时报价
- `get52WeekHigh()` - 获取 52 周高点
- `getAllMarketData()` - 聚合获取价格数据

#### 3. **services/yahooFinanceService.js** - Yahoo Finance 数据获取
- `getVIX()` - 获取 VIX 指数（免费，无需 API Key）

#### 4. **services/xueqiuService.js** - 雪球数据获取
- `getVIX()` - 获取 VIX 指数（备用）
- `getNasdaq100()` - 获取纳斯达克 100 PE 数据

#### 5. **services/danjuanService.js** - 蛋卷基金数据获取
- `getNasdaqPE()` - 获取纳斯达克 100 的 PE 和 PE 百分位

#### 6. **services/alternativeDataService.js** - 备用数据源
- `getVIXFromAlphaVantage()` - Alpha Vantage VIX 数据
- `getVIXFromTwelveData()` - Twelve Data VIX 数据

#### 7. **services/dataAggregatorService.js** - 数据聚合服务 ⭐
- `getVIX()` - 智能获取 VIX（自动降级）
- `getPEData()` - 智能获取 PE（自动降级）
- `getAllData()` - 并行获取所有数据

#### 8. **services/calculationService.js** - 计算逻辑
- `calculateDrawdown()` - 计算回撤
- `getPERow() / getVIXColumn()` - 确定矩阵坐标
- `getDrawdownMultiplier()` - 计算回撤加成
- `calculate()` - 核心计算逻辑
- `generateAction()` - 生成操作建议

#### 9. **routes/api.js** - 路由层
- 参数校验
- 错误处理
- API 接口暴露

### 前端模块

#### 1. **js/api.js** - API 调用
- 封装 fetch 请求
- 统一错误处理
- 提供 `getMarketData()` 和 `calculate()` 方法

#### 2. **js/ui.js** - UI 更新
- DOM 元素管理
- 输入框数据读写
- 计算结果可视化
- 按钮状态管理

#### 3. **js/app.js** - 主逻辑
- 协调 API 和 UI 模块
- 事件绑定
- 业务流程控制

## 🎯 决策矩阵说明

### 三维度评估体系

1. **PE（估值维度）**
   - 泡沫（>35）
   - 偏贵（30-35）
   - 合理（25-30）
   - 低估（<25）

2. **VIX（情绪维度）**
   - 贪婪（<13）
   - 平稳（13-18）
   - 恐慌（18-25）
   - 极恐（>25）

3. **回撤（折扣维度）**
   - 无折扣（<5%）
   - 小幅回撤（5-10%）
   - 折扣机会（10-20%，份数×1.5）
   - 超级折扣（>20%，份数×2）

### 基础份数矩阵

|          | 贪婪 | 平稳 | 恐慌 | 极恐 |
|----------|------|------|------|------|
| **泡沫** | 0    | 0    | 0.5  | 1    |
| **偏贵** | 0    | 1    | 2    | 3    |
| **合理** | 1    | 2    | 3    | 5    |
| **低估** | 3    | 5    | 8    | 10   |

## 🔧 自定义配置

修改 `config/index.js` 中的参数可调整计算规则：

```javascript
calculation: {
  peThresholds: { bubble: 35, expensive: 30, reasonable: 25 },
  vixThresholds: { greed: 13, calm: 18, fear: 25 },
  drawdownThresholds: { double: 20, boost: 10 },
  matrix: [
    [0, 0, 0.5, 1],
    [0, 1, 2, 3],
    [1, 2, 3, 5],
    [3, 5, 8, 10]
  ]
}
```

## 📝 开发建议

### 测试数据源可用性

运行测试脚本检查各数据源状态：

```bash
npm run test:data
```

### 添加新的数据源

在 `services/` 目录下创建新的服务类，然后在 `dataAggregatorService.js` 中注册：

```javascript
// services/newDataService.js
class NewDataService {
  async getVIX() {
    // 实现数据获取逻辑
  }
}

// services/dataAggregatorService.js
// 在 getVIX() 方法中添加新的数据源
async getVIX() {
  // 尝试现有数据源...
  
  // 添加新数据源
  try {
    const newService = new NewDataService();
    const vix = await newService.getVIX();
    if (vix !== null) {
      return { value: vix, source: 'New Data Source' };
    }
  } catch (error) {
    Logger.warn('新数据源获取失败');
  }
}
```

### 修改计算规则

修改 `services/calculationService.js` 中的相关方法。

### 扩展 API

在 `routes/api.js` 中添加新的路由：

```javascript
router.get('/new-endpoint', async (req, res) => {
  // 处理逻辑
});
```

## ⚠️ 注意事项

1. **API Key 安全**：不要将 `.env` 文件提交到版本控制系统
2. **免费账户限制**：Finnhub 免费账户有调用频率限制（60次/分钟）
3. **数据源可靠性**：
   - **多级降级策略**: VIX 和 PE 数据都有多个备用数据源
   - **推荐配置备用 API**: 虽然主数据源免费，但配置备用 API 可提高成功率至 95%+
   - **查看详细文档**: `DATA_SOURCES_V2.md` 包含完整的数据源配置指南
4. **测试数据源**: 运行 `npm run test:data` 检查各数据源可用性
5. **CORS 配置**：生产环境建议限制允许的域名
5. **数据准确性**：数据仅供参考，不构成投资建议

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
