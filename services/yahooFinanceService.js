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
    
    // 频率控制
    this.lastRequestTime = 0;
    this.minInterval = 2000; // 最小请求间隔2秒
  }
  
  /**
   * 频率控制：确保请求间隔不小于 minInterval
   */
  async _rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      const delay = this.minInterval - timeSinceLastRequest;
      Logger.debug(`Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }
  
  /**
   * 获取增强的请求配置（模拟真实浏览器）
   */
  _getConfig() {
    return {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com'
      },
      timeout: 15000 // 增加超时时间到15秒
    };
  }
  
  /**
   * 获取 VIX 指数
   */
  async getVIX() {
    try {
      // 应用频率控制
      await this._rateLimit();
      
      const config = this._getConfig();
      const response = await axios.get(`${this.baseUrl}/^VIX`, {
        ...config,
        params: {
          interval: '1d',
          range: '1d'
        }
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
      // 应用频率控制
      await this._rateLimit();
      
      const config = this._getConfig();
      const response = await axios.get(`${this.baseUrl}/QQQ`, {
        ...config,
        params: {
          interval: '1d',
          range: '1y'  // 1年数据
        }
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
