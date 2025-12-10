const axios = require('axios');
const config = require('../config');
const Logger = require('../utils/logger');

/**
 * Finnhub API 数据获取服务
 */
class FinnhubService {
  constructor(apiKey) {
    this.apiKey = apiKey || config.finnhubApiKey;
    this.baseUrl = config.apis.finnhub.base;
  }
  
  /**
   * 获取 QQQ 实时报价
   */
  async getQQQQuote() {
    try {
      const response = await axios.get(`${this.baseUrl}${config.apis.finnhub.quote}`, {
        params: {
          symbol: 'QQQ',
          token: this.apiKey
        }
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      Logger.debug('QQQ Quote fetched', response.data);
      return {
        currentPrice: response.data.c,
        highPrice: response.data.h,
        lowPrice: response.data.l,
        openPrice: response.data.o,
        previousClose: response.data.pc
      };
    } catch (error) {
      Logger.error('Failed to fetch QQQ quote', error.message);
      throw new Error('获取 QQQ 价格失败');
    }
  }
  
  /**
   * 获取 QQQ 52周高点（历史K线数据）
   */
  async get52WeekHigh() {
    try {
      const now = Math.floor(Date.now() / 1000);
      const oneYearAgo = now - 365 * 24 * 60 * 60;
      
      const response = await axios.get(`${this.baseUrl}${config.apis.finnhub.candle}`, {
        params: {
          symbol: 'QQQ',
          resolution: 'D',
          from: oneYearAgo,
          to: now,
          token: this.apiKey
        }
      });
      
      if (response.data.s === 'ok' && response.data.h && response.data.h.length > 0) {
        const high52Week = Math.max(...response.data.h);
        Logger.debug('52-week high fetched', high52Week);
        return high52Week;
      } else {
        Logger.warn('52-week high data unavailable, using fallback');
        return null; // 返回 null，由调用方决定降级策略
      }
    } catch (error) {
      Logger.error('Failed to fetch 52-week high', error.message);
      return null; // 容错处理
    }
  }
  
  /**
   * 获取所有市场数据（聚合接口）
   * 注：VIX 和 PE 已迁移到其他服务
   */
  async getAllMarketData() {
    try {
      const [quote, high52Week] = await Promise.all([
        this.getQQQQuote(),
        this.get52WeekHigh()
      ]);
      
      return {
        currentPrice: quote.currentPrice,
        high52Week: high52Week || quote.highPrice, // 降级使用今日最高价
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('Failed to fetch market data from Finnhub', error.message);
      throw error;
    }
  }
}

module.exports = FinnhubService;
