const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * 备用数据源服务
 * 整合多个数据源，提供更高的可靠性
 */
class AlternativeDataService {
  constructor() {
    this.sources = {
      // Alpha Vantage (需要免费 API Key)
      alphaVantage: {
        baseUrl: 'https://www.alphavantage.co/query',
        apiKey: process.env.ALPHA_VANTAGE_API_KEY
      },
      // Marketstack (需要免费 API Key)
      marketstack: {
        baseUrl: 'http://api.marketstack.com/v1',
        apiKey: process.env.MARKETSTACK_API_KEY
      },
      // Twelve Data (需要免费 API Key)
      twelveData: {
        baseUrl: 'https://api.twelvedata.com',
        apiKey: process.env.TWELVE_DATA_API_KEY
      }
    };
  }
  
  /**
   * 从 Alpha Vantage 获取 VIX
   */
  async getVIXFromAlphaVantage() {
    if (!this.sources.alphaVantage.apiKey) {
      return null;
    }
    
    try {
      const response = await axios.get(this.sources.alphaVantage.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: 'VIX',
          apikey: this.sources.alphaVantage.apiKey
        },
        timeout: 10000
      });
      
      const quote = response.data?.['Global Quote'];
      if (quote && quote['05. price']) {
        const vix = parseFloat(quote['05. price']);
        Logger.debug('VIX fetched from Alpha Vantage', vix);
        return vix;
      }
      
      return null;
    } catch (error) {
      Logger.error('Failed to fetch VIX from Alpha Vantage', error.message);
      return null;
    }
  }
  
  /**
   * 从 Twelve Data 获取 VIX
   */
  async getVIXFromTwelveData() {
    if (!this.sources.twelveData.apiKey) {
      return null;
    }
    
    try {
      const response = await axios.get(`${this.sources.twelveData.baseUrl}/quote`, {
        params: {
          symbol: 'VIX',
          apikey: this.sources.twelveData.apiKey
        },
        timeout: 10000
      });
      
      if (response.data && response.data.close) {
        const vix = parseFloat(response.data.close);
        Logger.debug('VIX fetched from Twelve Data', vix);
        return vix;
      }
      
      return null;
    } catch (error) {
      Logger.error('Failed to fetch VIX from Twelve Data', error.message);
      return null;
    }
  }
  
  /**
   * 尝试所有可用的数据源获取 VIX
   */
  async getVIXFromAnySource() {
    const methods = [
      this.getVIXFromAlphaVantage.bind(this),
      this.getVIXFromTwelveData.bind(this)
    ];
    
    for (const method of methods) {
      try {
        const result = await method();
        if (result !== null) {
          return result;
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }
}

module.exports = AlternativeDataService;
