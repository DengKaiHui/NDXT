# 🏗️ 架构设计文档

## 概述

本项目采用**前后端分离架构**，使用 Node.js + Express 构建 RESTful API，前端使用原生 JavaScript + 模块化设计。

---

## 🎯 设计原则

1. **职责分离**：UI 显示、业务逻辑、数据获取完全解耦
2. **模块化**：每个模块单一职责，便于维护和测试
3. **可配置**：阈值和矩阵参数集中管理
4. **可扩展**：易于添加新的数据源和计算规则

---

## 📊 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器 (Browser)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              public/index.html (UI 层)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ▲                                 │
│                            │                                 │
│  ┌─────────────┬──────────┴──────────┬─────────────────┐  │
│  │  api.js     │      ui.js          │     app.js      │  │
│  │ (API调用)   │   (界面更新)        │   (主逻辑)      │  │
│  └─────────────┴─────────────────────┴─────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP Request
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Server (后端)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               server.js (入口 + 中间件)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              routes/api.js (路由层)                   │  │
│  │  - /api/market-data    获取市场数据                   │  │
│  │  - /api/calculate      计算投资决策                   │  │
│  │  - /api/config         获取配置信息                   │  │
│  │  - /api/health         健康检查                       │  │
│  └──────────────────────────────────────────────────────┘  │
│             │                              │                 │
│             ▼                              ▼                 │
│  ┌──────────────────────┐    ┌───────────────────────────┐ │
│  │ finnhubService.js    │    │ calculationService.js     │ │
│  │ (数据获取服务)        │    │ (计算逻辑服务)             │ │
│  │                      │    │                           │ │
│  │ - getQQQQuote()      │    │ - calculateDrawdown()     │ │
│  │ - get52WeekHigh()    │    │ - getPERow()              │ │
│  │ - getVIX()           │    │ - getVIXColumn()          │ │
│  │ - getPE()            │    │ - calculate()             │ │
│  │ - getAllMarketData() │    │ - generateAction()        │ │
│  └──────────────────────┘    └───────────────────────────┘ │
│             │                                                │
│             ▼                                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              config/index.js (配置管理)               │  │
│  │  - PE/VIX/回撤阈值                                     │  │
│  │  - 决策矩阵数据                                        │  │
│  │  - API 端点配置                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ External API Call
                          ▼
                ┌─────────────────────┐
                │   Finnhub API       │
                │  (第三方数据源)      │
                └─────────────────────┘
```

---

## 🔀 数据流向

### 1. 获取实时数据流程

```
[用户点击按钮] 
    → app.js.fetchRealTimeData()
    → api.js.getMarketData(apiKey)
    → [HTTP GET] /api/market-data
    → routes/api.js (参数验证)
    → finnhubService.getAllMarketData()
    → [调用 Finnhub API 获取数据]
    → 返回数据到前端
    → ui.js.updateInputs(data)
    → app.js.handleCalculate()
    → [调用计算接口]
```

### 2. 计算决策流程

```
[用户输入数据/自动触发]
    → app.js.handleCalculate()
    → api.js.calculate(inputs)
    → [HTTP POST] /api/calculate
    → routes/api.js (参数验证)
    → calculationService.calculate()
        ├─ calculateDrawdown()        # 计算回撤
        ├─ getPERow()                 # 确定 PE 档位
        ├─ getVIXColumn()             # 确定 VIX 档位
        ├─ getDrawdownMultiplier()    # 计算回撤加成
        └─ generateAction()           # 生成操作建议
    → 返回计算结果
    → ui.js.updateResults(result)
        ├─ 更新顶部指标
        ├─ 更新标签颜色
        ├─ 更新操作建议
        └─ 高亮矩阵单元格
```

---

## 📦 模块详细说明

### 后端模块

#### 1. **server.js** - 服务器入口
- 初始化 Express 应用
- 配置中间件（CORS、JSON 解析）
- 挂载路由
- 静态文件服务
- 错误处理

#### 2. **routes/api.js** - 路由层
**职责**：
- API 端点定义
- 请求参数校验
- 响应格式统一
- 错误捕获和处理

**端点列表**：
- `GET /api/market-data` - 获取市场数据
- `POST /api/calculate` - 计算投资决策
- `GET /api/config` - 获取配置信息
- `GET /api/health` - 健康检查

#### 3. **services/finnhubService.js** - 数据获取服务
**职责**：
- 封装 Finnhub API 调用
- 数据转换和清洗
- 错误处理和降级策略

**主要方法**：
```javascript
class FinnhubService {
  async getQQQQuote()      // 获取 QQQ 实时报价
  async get52WeekHigh()    // 获取 52 周高点（历史数据）
  async getVIX()           // 获取 VIX 指数
  async getPE()            // 获取 PE 数据
  async getAllMarketData() // 聚合获取所有数据
}
```

**降级策略**：
- 52周高点获取失败 → 使用当日最高价
- PE 数据获取失败 → 返回 null，提示手动输入

#### 4. **services/calculationService.js** - 计算逻辑服务
**职责**：
- 核心计算逻辑
- 决策规则实现
- 标签和文案生成

**主要方法**：
```javascript
class CalculationService {
  calculateDrawdown(price, high)         // 计算回撤百分比
  getPERow(pe)                           // 确定 PE 行索引 (0-3)
  getVIXColumn(vix)                      // 确定 VIX 列索引 (0-3)
  getDrawdownMultiplier(drawdown)        // 计算回撤加成倍数
  getPELabel(pe)                         // 获取 PE 标签
  getVIXLabel(vix)                       // 获取 VIX 标签
  getDrawdownLabel(drawdown)             // 获取回撤标签
  calculate(params)                      // 核心计算逻辑
  generateAction(finalUnits, row, col)   // 生成操作建议文案
}
```

**计算逻辑**：
```
1. 输入：PE, VIX, currentPrice, high52Week
2. 计算回撤 = (high52Week - currentPrice) / high52Week * 100
3. 确定矩阵坐标 (row, col)
4. 获取基础份数 = matrix[row][col]
5. 应用回撤加成：
   - 回撤 > 20% → 份数 × 2
   - 回撤 > 10% → 份数 × 1.5
   - 否则 → 份数 × 1
6. 生成标签和操作建议
7. 返回完整结果
```

#### 5. **config/index.js** - 配置管理
**职责**：
- 集中管理所有配置参数
- 环境变量读取
- 计算参数定义

**配置项**：
```javascript
{
  port: 3000,
  finnhubApiKey: '...',
  
  calculation: {
    peThresholds: { bubble: 35, expensive: 30, reasonable: 25 },
    vixThresholds: { greed: 13, calm: 18, fear: 25 },
    drawdownThresholds: { double: 20, boost: 10 },
    matrix: [
      [0, 0, 0.5, 1],   // 泡沫区
      [0, 1, 2, 3],     // 偏贵区
      [1, 2, 3, 5],     // 合理区
      [3, 5, 8, 10]     // 低估区
    ]
  }
}
```

#### 6. **utils/logger.js** - 日志工具
**职责**：
- 统一日志输出格式
- 日志级别控制

---

### 前端模块

#### 1. **public/js/api.js** - API 调用模块
**职责**：
- 封装 HTTP 请求
- 统一错误处理
- 响应数据格式化

**主要方法**：
```javascript
const API = {
  async request(endpoint, options)     // 通用请求方法
  async getMarketData(apiKey)          // 获取市场数据
  async calculate(params)              // 计算投资决策
  async getConfig()                    // 获取配置
  async healthCheck()                  // 健康检查
}
```

#### 2. **public/js/ui.js** - UI 更新模块
**职责**：
- DOM 元素管理
- 界面渲染
- 视觉反馈

**主要方法**：
```javascript
const UI = {
  init()                              // 初始化 DOM 引用
  updateDate()                        // 更新日期显示
  updateInputs(data)                  // 更新输入框
  getInputs()                         // 获取输入数据
  validateInputs()                    // 验证输入
  clearHighlights()                   // 清除高亮
  updateResults(result)               // 更新计算结果
  updateTag(element, labelData)       // 更新标签样式
  highlightCell(row, col, units)      // 高亮单元格
  setButtonLoading(btn, loading)      // 按钮加载状态
  showButtonStatus(btn, success, msg) // 显示临时状态
}
```

#### 3. **public/js/app.js** - 主逻辑模块
**职责**：
- 协调 API 和 UI 模块
- 事件监听和绑定
- 业务流程控制
- LocalStorage 管理

**主要方法**：
```javascript
const App = {
  init()                              // 应用初始化
  bindEvents()                        // 绑定事件监听
  getApiKey() / setApiKey(key)        // API Key 管理
  handleCalculate()                   // 处理计算逻辑
  fetchRealTimeData(button)           // 获取实时数据
  fillDemoData()                      // 填充演示数据
  shareImage(button)                  // 分享截图
}
```

---

## 🔐 安全性考虑

1. **API Key 存储**
   - 后端：存储在 `.env` 文件（不提交到 Git）
   - 前端：存储在 LocalStorage（仅用于临时存储）

2. **CORS 配置**
   - 开发环境：允许所有域名
   - 生产环境：建议限制允许的域名

3. **参数校验**
   - 后端对所有输入进行类型和范围校验
   - 前端进行基础验证

4. **错误处理**
   - 生产环境不暴露敏感错误信息
   - 开发环境输出详细日志

---

## 🚀 扩展性设计

### 添加新的数据源

1. 在 `services/` 创建新服务类
2. 实现数据获取方法
3. 在 `routes/api.js` 添加路由
4. 前端调用新接口

示例：
```javascript
// services/yahooFinanceService.js
class YahooFinanceService {
  async getMarketData() {
    // 实现逻辑
  }
}

// routes/api.js
router.get('/yahoo-data', async (req, res) => {
  const service = new YahooFinanceService();
  const data = await service.getMarketData();
  res.json({ success: true, data });
});
```

### 修改计算规则

只需修改 `config/index.js` 和 `services/calculationService.js`，前端代码无需改动。

### 添加新的指标维度

1. 在 `config/index.js` 添加新的阈值配置
2. 在 `calculationService.js` 添加计算方法
3. 前端 `ui.js` 添加显示逻辑

---

## 📈 性能优化

1. **并行请求**：`finnhubService.getAllMarketData()` 使用 `Promise.all()` 并行获取数据
2. **前端缓存**：API Key 存储在 LocalStorage
3. **DOM 优化**：UI 模块缓存 DOM 引用
4. **降级策略**：数据获取失败时使用备用方案

---

## 🧪 测试建议

### 后端测试
```javascript
// 使用 Jest 或 Mocha
describe('CalculationService', () => {
  it('should calculate drawdown correctly', () => {
    const service = new CalculationService();
    const result = service.calculateDrawdown(100, 120);
    expect(result).toBeCloseTo(16.67);
  });
});
```

### API 测试
```bash
# 使用 curl 测试
curl -X POST http://localhost:3000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"pe": 36.5, "vix": 17.3, "currentPrice": 500, "high52Week": 520}'
```

---

## 📚 技术栈

### 后端
- **Node.js** - 运行时环境
- **Express** - Web 框架
- **axios** - HTTP 客户端
- **dotenv** - 环境变量管理
- **cors** - 跨域支持

### 前端
- **原生 JavaScript** - 无框架依赖
- **Tailwind CSS** - UI 样式
- **html2canvas** - 截图功能
- **模块化设计** - 清晰的代码组织

---

## 🎓 最佳实践

1. **单一职责**：每个模块只负责一件事
2. **依赖注入**：服务类接受参数而非硬编码
3. **错误优先**：始终处理错误情况
4. **日志记录**：关键操作记录日志
5. **配置分离**：参数集中管理
6. **代码复用**：提取公共逻辑

---

**设计理念：简洁、清晰、可维护**
