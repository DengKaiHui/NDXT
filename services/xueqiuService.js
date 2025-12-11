const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * 雪球数据获取服务
 * 用于获取 VIX、PE 等市场数据
 */
class XueqiuService {
  constructor() {
    this.baseUrl = 'https://stock.xueqiu.com/v5/stock';
    
    // 生成随机 device_id 模拟真实用户
    const deviceId = 'web_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // 增强请求头，模拟真实浏览器
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://xueqiu.com/',
      'Origin': 'https://xueqiu.com',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'Cookie': `device_id=${deviceId}; xq_a_token=`
    };
    
    // 频率控制
    this.lastRequestTime = 0;
    this.minInterval = 2000;
  }
  
  /**
   * 频率控制
   */
  async _rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      const delay = this.minInterval - timeSinceLastRequest;
      Logger.debug(`Xueqiu rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }
  
  /**
   * 获取 VIX 指数
   */
  async getVIX() {
    try {
      // 应用频率控制
      await this._rateLimit();
      
      // 雪球中的 VIX 代码
      const response = await axios.get(`${this.baseUrl}/quote.json`, {
        params: {
          symbol: '.VIX',
          extend: 'detail'
        },
        headers: this.headers,
        timeout: 15000
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
      // 应用频率控制
      await this._rateLimit();
      
      // 纳斯达克100指数 .NDX
      const response = await axios.get(`${this.baseUrl}/quote.json`, {
        params: {
          symbol: '.NDX',
          extend: 'detail'
        },
        headers: this.headers,
        timeout: 15000
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
