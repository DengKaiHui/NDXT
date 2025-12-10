# 📊 数据源配置指南 v2.0

## 🎯 概述

本项目使用**多数据源智能切换**策略，确保数据获取的高可用性。当主数据源失败时，系统会自动尝试备用数据源。

---

## 📡 数据源架构

```
┌─────────────────────────────────────────────────────┐
│             智能数据聚合层                              │
│        (DataAggregatorService)                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  VIX 数据获取 (优先级链)                              │
│  ┌──────────┐  ┌─────────┐  ┌──────────────────┐  │
│  │ Yahoo    │→ │ 雪球     │→ │ Alpha Vantage/   │  │
│  │ Finance  │  │ (Xueqiu) │  │ Twelve Data      │  │
│  └──────────┘  └─────────┘  └──────────────────┘  │
│                                                     │
│  PE 数据获取 (优先级链)                               │
│  ┌─────────┐  ┌──────────┐                        │
│  │ 雪球     │→ │ 蛋卷基金  │                        │
│  │(Xueqiu)  │  │(Danjuan) │                        │
│  └─────────┘  └──────────┘                        │
│                                                     │
│  QQQ 价格 (单一来源)                                 │
│  ┌──────────┐                                      │
│  │ Finnhub  │                                      │
│  └──────────┘                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📋 数据源详细说明

### 1. VIX 指数数据源

#### 🥇 主数据源: Yahoo Finance
- **API**: `https://query1.finance.yahoo.com/v8/finance/chart/^VIX`
- **需要 API Key**: ❌ 否（完全免费）
- **调用限制**: 无限制
- **稳定性**: ⭐⭐⭐⭐⭐
- **响应速度**: ~500ms
- **数据更新**: 实时
- **优点**: 稳定可靠，无需注册
- **缺点**: 偶尔会有 CORS 限制（服务端调用无问题）

**示例响应**:
```json
{
  "chart": {
    "result": [{
      "meta": {
        "regularMarketPrice": 17.23
      }
    }]
  }
}
```

---

#### 🥈 备用数据源1: 雪球 (Xueqiu)
- **API**: `https://stock.xueqiu.com/v5/stock/quote.json?symbol=.VIX`
- **需要 API Key**: ❌ 否
- **调用限制**: 未明确限制
- **稳定性**: ⭐⭐⭐⭐
- **响应速度**: ~800ms
- **数据更新**: 延迟15分钟左右
- **优点**: 国内访问快，数据格式友好
- **缺点**: 可能需要设置 Cookie，数据有延迟

**示例响应**:
```json
{
  "data": {
    "quote": {
      "symbol": ".VIX",
      "current": 17.23,
      "last_close": 16.85
    }
  }
}
```

---

#### 🥉 备用数据源2: Alpha Vantage
- **API**: `https://www.alphavantage.co/query`
- **需要 API Key**: ✅ 是（免费注册）
- **调用限制**: 5次/分钟，500次/天
- **稳定性**: ⭐⭐⭐⭐
- **响应速度**: ~1000ms
- **注册**: https://www.alphavantage.co/support/#api-key
- **配置**: 在 `.env` 中设置 `ALPHA_VANTAGE_API_KEY`

**优点**: 官方 API，数据准确
**缺点**: 需要注册，调用限制较严格

---

#### 🥉 备用数据源3: Twelve Data
- **API**: `https://api.twelvedata.com/quote`
- **需要 API Key**: ✅ 是（免费注册）
- **调用限制**: 800次/天
- **稳定性**: ⭐⭐⭐⭐
- **响应速度**: ~800ms
- **注册**: https://twelvedata.com/
- **配置**: 在 `.env` 中设置 `TWELVE_DATA_API_KEY`

**优点**: 数据全面，响应较快
**缺点**: 免费额度有限

---

### 2. PE 数据源

#### 🥇 主数据源: 雪球 (Xueqiu)
- **API**: `https://stock.xueqiu.com/v5/stock/quote.json?symbol=.NDX`
- **需要 API Key**: ❌ 否
- **数据项**: 
  - PE TTM (市盈率)
  - 当前价格
  - PB (市净率)
- **稳定性**: ⭐⭐⭐⭐
- **响应速度**: ~800ms
- **优点**: 国内访问快，实时性好
- **缺点**: 不提供 PE 百分位数据

**示例响应**:
```json
{
  "data": {
    "quote": {
      "symbol": ".NDX",
      "current": 16500.25,
      "pe_ttm": 35.6,
      "pb": 8.2
    }
  }
}
```

---

#### 🥈 备用数据源: 蛋卷基金 (Danjuan)
- **API**: `https://danjuanfunds.com/djapi/index_eva/dj?index_code=CSI931142`
- **需要 API Key**: ❌ 否
- **数据项**:
  - PE (市盈率)
  - PE Percentile (PE 百分位)
- **稳定性**: ⭐⭐⭐
- **响应速度**: ~1500ms
- **优点**: 提供百分位数据（历史分位）
- **缺点**: 可能受 CORS 限制，响应较慢

**示例响应**:
```json
{
  "data": {
    "items": [{
      "index_code": "NDX",
      "pe": 35.6,
      "pe_percentile": 85.2
    }]
  }
}
```

---

### 3. QQQ 价格数据源

#### 🥇 唯一数据源: Finnhub
- **API**: `https://finnhub.io/api/v1/quote`
- **需要 API Key**: ✅ 是（必需）
- **调用限制**: 60次/分钟（免费账户）
- **稳定性**: ⭐⭐⭐⭐⭐
- **注册**: https://finnhub.io/register
- **配置**: 在 `.env` 中设置 `FINNHUB_API_KEY`

**数据项**:
- 当前价格 (current price)
- 52周高点 (52-week high)
- 开盘价、最高价、最低价等

---

## 🔧 配置步骤

### 1. 基础配置（必需）

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env 文件
nano .env
```

```bash
# 必需: Finnhub API Key (用于 QQQ 价格)
FINNHUB_API_KEY=your_finnhub_api_key_here
```

### 2. 备用 API 配置（可选，建议配置）

如果主数据源失败率较高，建议配置以下备用 API：

```bash
# 可选: Alpha Vantage (用于 VIX 备用)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# 可选: Twelve Data (用于 VIX 备用)
TWELVE_DATA_API_KEY=your_twelve_data_key
```

---

## 🧪 测试数据源

运行测试脚本，检查各个数据源的可用性：

```bash
npm run test:data
```

测试输出示例：
```
====================================
    数据源可用性测试
====================================

📊 测试 VIX 数据源:

✅ VIX - Yahoo Finance: 成功 (543ms)
   数据: 17.23

✅ VIX - 雪球: 成功 (782ms)
   数据: 17.23

❌ VIX - Alpha Vantage: 失败 - 未配置 API Key (12ms)

📈 测试 PE 数据源:

✅ PE - 雪球 (Nasdaq 100): 成功 (815ms)
   数据: { current: 16500.25, pe_ttm: 35.6 }

✅ PE - 蛋卷基金: 成功 (1450ms)
   数据: { pe: 35.6, pePercentile: 85.2 }

====================================
    测试结果统计
====================================

总计: 4/6 个数据源可用

VIX 可用数据源 (2): Yahoo Finance, 雪球
PE 可用数据源 (2): 雪球 (Nasdaq 100), 蛋卷基金

📝 推荐配置:

✅ VIX 推荐使用: Yahoo Finance
✅ PE 推荐使用: 雪球 (Nasdaq 100)

====================================
```

---

## 📊 数据获取流程

### VIX 获取流程
```
1. 尝试 Yahoo Finance
   ├─ 成功 → 返回数据 ✅
   └─ 失败 ↓

2. 尝试雪球
   ├─ 成功 → 返回数据 ✅
   └─ 失败 ↓

3. 尝试 Alpha Vantage (如果配置)
   ├─ 成功 → 返回数据 ✅
   └─ 失败 ↓

4. 尝试 Twelve Data (如果配置)
   ├─ 成功 → 返回数据 ✅
   └─ 失败 ↓

5. 返回 null (所有数据源失败) ❌
```

### PE 获取流程
```
1. 尝试雪球 (Nasdaq 100)
   ├─ 成功 → 返回 PE 数据 ✅
   └─ 失败 ↓

2. 尝试蛋卷基金
   ├─ 成功 → 返回 PE + PE 百分位 ✅
   └─ 失败 ↓

3. 返回 null (所有数据源失败) ❌
```

---

## 🎯 最佳实践

### 1. 推荐配置方案

**方案A: 纯免费（无需额外注册）**
```bash
# 仅配置 Finnhub
FINNHUB_API_KEY=your_finnhub_key
```
- VIX: Yahoo Finance → 雪球
- PE: 雪球 → 蛋卷基金
- 预期成功率: 85-90%

**方案B: 高可靠性（推荐）**
```bash
# Finnhub + Alpha Vantage
FINNHUB_API_KEY=your_finnhub_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
```
- VIX: Yahoo Finance → 雪球 → Alpha Vantage
- PE: 雪球 → 蛋卷基金
- 预期成功率: 95%+

**方案C: 最高可靠性（企业级）**
```bash
# 全部配置
FINNHUB_API_KEY=your_finnhub_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
TWELVE_DATA_API_KEY=your_twelve_data_key
```
- VIX: 4层降级保护
- PE: 2层降级保护
- 预期成功率: 98%+

---

### 2. 故障排查

#### 问题1: VIX 数据获取失败
```bash
# 1. 运行测试
npm run test:data

# 2. 查看日志
# 检查是否有 CORS、超时等错误

# 3. 解决方案
- 配置 Alpha Vantage 或 Twelve Data API Key
- 检查网络连接和防火墙设置
```

#### 问题2: PE 数据获取失败
```bash
# 1. 雪球和蛋卷基金都可能受 CORS 限制
# 2. 确保服务端调用（而非浏览器直接调用）
# 3. 考虑配置代理服务器
```

#### 问题3: 所有数据源都失败
```bash
# 可能原因:
- 网络连接问题
- 防火墙/代理设置
- API 服务商临时故障

# 解决:
- 检查网络连接
- 配置更多备用数据源
- 等待服务恢复
```

---

## 🔐 安全建议

1. **不要提交 API Key**: `.env` 文件已加入 `.gitignore`
2. **定期轮换**: 定期更新 API Key
3. **监控使用量**: 避免超出免费额度
4. **生产环境**: 使用付费账户，提高稳定性

---

## 📈 性能优化

### 并行请求
系统使用 `Promise.allSettled()` 并行请求所有数据源，大幅提升响应速度：

```javascript
const [finnhubData, aggregatedData] = await Promise.allSettled([
  finnhubService.getAllMarketData(),  // QQQ 价格
  dataAggregator.getAllData()         // VIX + PE
]);
```

### 超时设置
每个请求都设置了 10 秒超时：
```javascript
timeout: 10000  // 10 秒超时
```

### 智能降级
失败时自动切换到备用数据源，无需人工干预。

---

## 📞 技术支持

如有问题，请查看：
1. 日志输出（服务端控制台）
2. 运行 `npm run test:data` 检查数据源状态
3. 查看 `DATA_SOURCES.md` 了解更多细节

---

**更新日期**: 2024-12-05  
**版本**: v2.0
