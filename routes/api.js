const express = require('express');
const router = express.Router();
const FinnhubService = require('../services/finnhubService');
const YahooFinanceService = require('../services/yahooFinanceService');
const DataAggregatorService = require('../services/dataAggregatorService');
const CalculationService = require('../services/calculationService');
const Logger = require('../utils/logger');

/**
 * GET /api/market-data
 * 获取实时市场数据（QQQ价格、52周高点、VIX、PE、PE百分位）
 * 数据来源（多数据源智能切换）：
 * - QQQ价格：Finnhub
 * - 52周高点：Yahoo Finance → Finnhub（降级）
 * - VIX：Yahoo Finance → 雪球 → Alpha Vantage/Twelve Data（自动降级）
 * - PE、PE百分位：雪球 → 蛋卷基金（自动降级）
 */
router.get('/market-data', async (req, res) => {
  try {
    const apiKey = req.query.apiKey || req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: '缺少 API Key',
        message: '请在请求中提供 Finnhub API Key'
      });
    }
    
    // 并行获取所有数据
    const finnhubService = new FinnhubService(apiKey);
    const yahooService = new YahooFinanceService();
    const dataAggregator = new DataAggregatorService();
    
    const [finnhubData, yahoo52Week, aggregatedData] = await Promise.allSettled([
      finnhubService.getQQQQuote(),     // 仅获取价格
      yahooService.getQQQ52WeekHigh(),  // Yahoo 获取52周高点
      dataAggregator.getAllData()       // VIX + PE
    ]);
    
    // 处理 Finnhub 数据（必需）
    if (finnhubData.status === 'rejected') {
      throw new Error('获取 QQQ 数据失败: ' + finnhubData.reason.message);
    }
    
    // 处理52周高点（优先 Yahoo，降级到 Finnhub）
    let high52Week = null;
    let high52WeekSource = 'failed';
    
    if (yahoo52Week.status === 'fulfilled' && yahoo52Week.value) {
      high52Week = yahoo52Week.value;
      high52WeekSource = 'Yahoo Finance';
    } else {
      // 降级：使用 Finnhub 计算
      try {
        const finnhubHigh = await finnhubService.get52WeekHigh();
        if (finnhubHigh) {
          high52Week = finnhubHigh;
          high52WeekSource = 'Finnhub';
        } else {
          // 最终降级：使用今日最高价
          high52Week = finnhubData.value.highPrice;
          high52WeekSource = 'Finnhub (today high)';
        }
      } catch (error) {
        high52Week = finnhubData.value.highPrice;
        high52WeekSource = 'Finnhub (today high)';
      }
    }
    
    // 组装返回数据
    const aggData = aggregatedData.status === 'fulfilled' ? aggregatedData.value : {};
    
    const result = {
      currentPrice: finnhubData.value.currentPrice,
      high52Week: high52Week,
      vix: aggData.vix || null,
      pe: aggData.pe || null,
      pePercentile: aggData.pePercentile || null,
      timestamp: new Date().toISOString(),
      dataSource: {
        price: 'Finnhub',
        high52Week: high52WeekSource,
        vix: aggData.vixSource || 'failed',
        pe: aggData.peSource || 'failed'
      }
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('Market data API error', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/calculate
 * 计算投资决策（基于 PE、VIX、价格、52周高点）
 */
router.post('/calculate', (req, res) => {
  try {
    const { pe, vix, currentPrice, high52Week } = req.body;
    
    // 参数校验
    if (!pe || !vix || !currentPrice || !high52Week) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
        message: '请提供 pe, vix, currentPrice, high52Week'
      });
    }
    
    // 数值校验
    const numPE = parseFloat(pe);
    const numVIX = parseFloat(vix);
    const numPrice = parseFloat(currentPrice);
    const numHigh = parseFloat(high52Week);
    
    if (isNaN(numPE) || isNaN(numVIX) || isNaN(numPrice) || isNaN(numHigh)) {
      return res.status(400).json({
        success: false,
        error: '参数格式错误',
        message: '所有参数必须是有效数字'
      });
    }
    
    const calculationService = new CalculationService();
    const result = calculationService.calculate({
      pe: numPE,
      vix: numVIX,
      currentPrice: numPrice,
      high52Week: numHigh
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    Logger.error('Calculation API error', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/config
 * 获取计算配置（阈值、矩阵等）
 */
router.get('/config', (req, res) => {
  const config = require('../config');
  res.json({
    success: true,
    data: {
      peThresholds: config.calculation.peThresholds,
      vixThresholds: config.calculation.vixThresholds,
      drawdownThresholds: config.calculation.drawdownThresholds,
      matrix: config.calculation.matrix
    }
  });
});

/**
 * GET /api/health
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
