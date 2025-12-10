const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * Yahoo Finance API 数据获取服务
 * 用于获取 VIX 指数和 QQQ 52周高点
 */
class YahooFinanceService {
  constructor() {
    // Yahoo Finance API v8 (免费，无需 API Key)
    this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
  }
  
  /**
   * 获取 VIX 指数
   */
  async getVIX() {
    try {
      const response = await axios.get(`${this.baseUrl}/^VIX`, {
        params: {
          interval: '1d',
          range: '1d'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 10000
      });
      
      const result = response.data?.chart?.result?.[0];
      if (!result) {
        throw new Error('Invalid response structure');
      }
      
      const meta = result.meta;
      const vix = meta.regularMarketPrice;
      
      if (vix) {
        Logger.debug('VIX fetched from Yahoo Finance', vix);
        return vix;
      }
      
      throw new Error('VIX data not found');
    } catch (error) {
      Logger.error('Failed to fetch VIX from Yahoo Finance', error.message);
      return null;
    }
  }
  
  /**
   * 获取 QQQ 52周高点
   */
  async getQQQ52WeekHigh() {
    try {
      const response = await axios.get(`${this.baseUrl}/QQQ`, {
        params: {
          interval: '1d',
          range: '1y'  // 1年数据
        },
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 10000
      });
      
      const result = response.data?.chart?.result?.[0];
      if (!result) {
        throw new Error('Invalid response structure');
      }
      
      // 从 meta 中获取52周高点
      const meta = result.meta;
      const high52Week = meta.fiftyTwoWeekHigh;
      
      if (high52Week) {
        Logger.debug('QQQ 52-week high fetched from Yahoo Finance', high52Week);
        return high52Week;
      }
      
      // 降级：从K线数据计算
      const indicators = result.indicators?.quote?.[0];
      if (indicators && indicators.high && indicators.high.length > 0) {
        const calculatedHigh = Math.max(...indicators.high.filter(h => h !== null));
        Logger.debug('QQQ 52-week high calculated from candles', calculatedHigh);
        return calculatedHigh;
      }
      
      throw new Error('52-week high data not found');
    } catch (error) {
      Logger.error('Failed to fetch QQQ 52-week high from Yahoo Finance', error.message);
      return null;
    }
  }
}

module.exports = YahooFinanceService;
