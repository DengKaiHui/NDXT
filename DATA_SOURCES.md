# 📊 数据来源说明

本项目使用多个数据源，确保数据获取的稳定性和完整性。

---

## 数据源概览

| 数据项 | 数据源 | API Key | 调用限制 | 稳定性 | 备注 |
|-------|-------|---------|---------|-------|------|
| QQQ 价格 | Finnhub | 需要 | 60次/分钟 | ⭐⭐⭐⭐ | 实时行情数据 |
| 52周高点 | Finnhub | 需要 | 60次/分钟 | ⭐⭐⭐ | 历史数据，失败时降级为当日最高 |
| VIX 指数 | Yahoo Finance | 不需要 | 无限制 | ⭐⭐⭐⭐⭐ | 免费稳定 |
| PE 数据 | 蛋卷基金 | 不需要 | 未知 | ⭐⭐⭐ | 可能受 CORS 限制 |
| PE 百分位 | 蛋卷基金 | 不需要 | 未知 | ⭐⭐⭐ | 同 PE 数据 |

---

## 1. Finnhub API

**官网**: https://finnhub.io/

### 用途
- 获取 QQQ（纳斯达克100 ETF）实时价格
- 获取 QQQ 52周最高价（历史K线数据）

### 优势
- 数据实时准确
- API 设计规范
- 免费账户可用

### 限制
- 需要注册获取 API Key
- 免费账户：60次/分钟
- 历史数据可能需要付费账户（部分功能）

### 获取 API Key
1. 访问 https://finnhub.io/register
2. 注册免费账户
3. 在 Dashboard 中找到 API Key
4. 将 API Key 配置到 `.env` 文件

### 示例请求
```bash
# 获取 QQQ 实时报价
curl "https://finnhub.io/api/v1/quote?symbol=QQQ&token=YOUR_API_KEY"

# 获取历史K线数据
curl "https://finnhub.io/api/v1/stock/candle?symbol=QQQ&resolution=D&from=1640000000&to=1672500000&token=YOUR_API_KEY"
```

---

## 2. Yahoo Finance API

**官网**: https://finance.yahoo.com/

### 用途
- 获取 VIX（恐慌指数）实时数据

### 优势
- 完全免费，无需 API Key
- 数据稳定可靠
- 无调用频率限制

### 限制
- 非官方 API，可能随时变动
- 响应格式较复杂

### 为什么使用 Yahoo Finance 获取 VIX？
Finnhub 免费账户获取 VIX 数据不稳定，经常返回空值。Yahoo Finance 提供免费稳定的 VIX 数据，是更好的选择。

### 示例请求
```bash
# 获取 VIX 数据
curl "https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=1d"
```

### 响应格式
```json
{
  "chart": {
    "result": [{
      "meta": {
        "regularMarketPrice": 17.3,
        "symbol": "^VIX"
      }
    }]
  }
}
```

---

## 3. 蛋卷基金 API

**官网**: https://danjuanfunds.com/

### 用途
- 获取纳斯达克 100 指数的 PE（市盈率）
- 获取 PE 百分位数据

### 优势
- 提供专业的指数估值数据
- 包含 PE 百分位（历史分位数）
- 免费，无需注册

### 限制
- 可能受 CORS 跨域限制
- API 文档不公开，接口可能变动
- 建议从服务端调用

### API 端点
```
GET https://danjuanfunds.com/djapi/index_eva/dj?index_code=CSI931142
```

### 响应格式
```json
{
  "data": {
    "items": [
      {
        "index_code": "NDX",
        "index_name": "纳斯达克100",
        "pe": 36.52,
        "pe_percentile": 85.3,
        "pb": 8.52,
        "pb_percentile": 82.1
      }
    ]
  }
}
```

### 注意事项
1. **CORS 问题**：前端直接调用可能被浏览器拦截，建议通过服务端代理
2. **数据更新频率**：通常每日更新一次
3. **查找逻辑**：返回数据中需要找到 `index_code: "NDX"` 的项

---

## 数据获取流程

### 后端聚合逻辑

```javascript
// routes/api.js
router.get('/api/market-data', async (req, res) => {
  // 并行获取所有数据源
  const [finnhubData, vix, peData] = await Promise.allSettled([
    finnhubService.getAllMarketData(),  // Finnhub
    yahooService.getVIX(),               // Yahoo Finance
    danjuanService.getNasdaqPE()         // 蛋卷基金
  ]);
  
  // 组装返回数据
  return {
    currentPrice: finnhubData.value.currentPrice,
    high52Week: finnhubData.value.high52Week,
    vix: vix.value,
    pe: peData.value?.pe,
    pePercentile: peData.value?.pePercentile
  };
});
```

### 降级策略

1. **52周高点获取失败** → 使用当日最高价
2. **VIX 获取失败** → 返回 null，提示用户手动输入
3. **PE 获取失败** → 返回 null，提示用户手动输入
4. **部分数据失败** → 继续返回成功的数据，标注失败项

---

## 容错处理

### 1. Promise.allSettled
使用 `Promise.allSettled` 而非 `Promise.all`，确保即使部分数据源失败，也能返回成功的数据。

```javascript
const [result1, result2, result3] = await Promise.allSettled([
  api1(), api2(), api3()
]);

// 检查每个结果的状态
if (result1.status === 'fulfilled') {
  console.log(result1.value);
} else {
  console.error(result1.reason);
}
```

### 2. 超时处理
为每个 API 调用设置超时时间（10秒）：

```javascript
const response = await axios.get(url, { timeout: 10000 });
```

### 3. 错误日志
记录详细的错误信息，便于排查问题：

```javascript
Logger.error('Failed to fetch VIX', {
  error: error.message,
  code: error.code,
  url: url
});
```

---

## 前端处理

### 数据获取成功
```javascript
const data = await API.getMarketData(apiKey);
UI.updateInputs(data);  // 自动填充输入框
```

### 部分数据失败
```javascript
if (!data.vix || !data.pe) {
  alert('部分数据获取失败，请手动输入：' + missing.join('、'));
}
```

### 完全失败
```javascript
catch (error) {
  alert('数据获取失败: ' + error.message);
}
```

---

## 数据更新频率

| 数据项 | 更新频率 | 说明 |
|-------|---------|------|
| QQQ 价格 | 实时 | 交易时间内实时更新 |
| 52周高点 | 每日 | 基于历史数据计算 |
| VIX | 实时 | 交易时间内实时更新 |
| PE | 每日 | 通常收盘后更新 |
| PE 百分位 | 每日 | 基于历史数据计算 |

---

## 如何切换数据源

### 添加新的 VIX 数据源

1. 创建新服务类：
```javascript
// services/newVixService.js
class NewVixService {
  async getVIX() {
    // 实现获取逻辑
  }
}
```

2. 在路由中使用：
```javascript
const newVixService = new NewVixService();
const vix = await newVixService.getVIX();
```

### 添加备用 PE 数据源

可以添加多个 PE 数据源，按优先级尝试：

```javascript
async function getPEWithFallback() {
  try {
    return await danjuanService.getNasdaqPE();
  } catch (error) {
    Logger.warn('Danjuan failed, trying backup...');
    return await backupService.getPE();
  }
}
```

---

## 常见问题

### Q1: 为什么不直接用 Finnhub 获取所有数据？
**A:** Finnhub 免费账户对某些数据（如 VIX、PE）的支持不稳定，使用多数据源可以提高成功率。

### Q2: 蛋卷基金 API 调用失败怎么办？
**A:** 
1. 检查网络连接
2. 确认从服务端调用（避免 CORS 问题）
3. 如果仍然失败，手动输入 PE 数据

### Q3: Yahoo Finance API 会不会失效？
**A:** 可能。这是非官方 API，建议监控其稳定性，并准备备用方案。

### Q4: 如何提高数据获取成功率？
**A:**
1. 使用多数据源并行获取
2. 设置合理的超时时间
3. 实现降级策略
4. 缓存最近一次成功的数据

---

## 数据质量保证

### 1. 数据校验
```javascript
if (isNaN(vix) || vix < 0 || vix > 100) {
  throw new Error('Invalid VIX value');
}
```

### 2. 数据范围检查
```javascript
const VALID_RANGES = {
  pe: [10, 100],
  vix: [5, 80],
  price: [100, 1000]
};
```

### 3. 异常值检测
对比最近的历史数据，检测异常波动。

---

**建议**：定期检查各数据源的可用性，及时调整数据获取策略。
