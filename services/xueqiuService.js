const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * 雪球数据获取服务
 * 用于获取 VIX、PE 等市场数据
 */
class XueqiuService {
  constructor() {
    this.baseUrl = 'https://stock.xueqiu.com/v5/stock';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://xueqiu.com/'
    };
  }
  
  /**
   * 获取 VIX 指数
   */
  async getVIX() {
    try {
      // 雪球中的 VIX 代码
      const response = await axios.get(`${this.baseUrl}/quote.json`, {
        params: {
          symbol: '.VIX',
          extend: 'detail'
        },
        headers: this.headers,
        timeout: 10000
      });
      
      const quote = response.data?.data?.quote;
      if (!quote) {
        throw new Error('Invalid response structure');
      }
      
      const vix = quote.current || quote.last_close;
      
      if (vix) {
        Logger.debug('VIX fetched from Xueqiu', vix);
        return parseFloat(vix);
      }
      
      throw new Error('VIX data not found');
    } catch (error) {
      Logger.error('Failed to fetch VIX from Xueqiu', error.message);
      return null;
    }
  }
  
  /**
   * 获取纳斯达克 100 指数信息
   */
  async getNasdaq100() {
    try {
      // 纳斯达克100指数 .NDX
      const response = await axios.get(`${this.baseUrl}/quote.json`, {
        params: {
          symbol: '.NDX',
          extend: 'detail'
        },
        headers: this.headers,
        timeout: 10000
      });
      
      const quote = response.data?.data?.quote;
      if (!quote) {
        throw new Error('Invalid response structure');
      }
      
      const data = {
        current: quote.current,
        pe_ttm: quote.pe_ttm,
        pb: quote.pb,
        timestamp: quote.timestamp
      };
      
      Logger.debug('Nasdaq 100 data fetched from Xueqiu', data);
      return data;
    } catch (error) {
      Logger.error('Failed to fetch Nasdaq 100 from Xueqiu', error.message);
      return null;
    }
  }
}

module.exports = XueqiuService;
