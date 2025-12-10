const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * 蛋卷基金数据获取服务
 * 用于获取纳斯达克 100 指数的 PE 和 PE 百分位
 */
class DanjuanService {
  constructor() {
    this.baseUrl = 'https://danjuanfunds.com/djapi';
  }
  
  /**
   * 获取纳斯达克 100 的 PE 和 PE 百分位
   * @returns {Promise<{pe: number, pePercentile: number}>}
   */
  async getNasdaqPE() {
    try {
      const response = await axios.get(`${this.baseUrl}/index_eva/dj`, {
        params: {
          index_code: 'CSI931142'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://danjuanfunds.com/'
        },
        timeout: 10000
      });
      
      const data = response.data?.data;
      if (!data || !Array.isArray(data.items)) {
        throw new Error('Invalid response structure');
      }
      
      // 在返回的数组中找到 NDX (纳斯达克100)
      const ndxData = data.items.find(item => item.index_code === 'NDX');
      
      if (!ndxData) {
        throw new Error('NDX data not found in response');
      }
      
      const pe = ndxData.pe;
      const pePercentile = ndxData.pe_percentile;
      
      if (pe && pePercentile !== undefined) {
        Logger.debug('NDX PE data fetched from Danjuan', { pe, pePercentile });
        return {
          pe: parseFloat(pe),
          pePercentile: parseFloat(pePercentile) * 100  // 转换为百分比（0-100）
        };
      }
      
      throw new Error('PE data incomplete');
    } catch (error) {
      Logger.error('Failed to fetch PE from Danjuan', error.message);
      
      // 如果是 CORS 错误，提供更友好的提示
      if (error.message.includes('CORS') || error.code === 'ENOTFOUND') {
        Logger.warn('Danjuan API may be blocked by CORS or network restrictions');
      }
      
      return null;
    }
  }
  
  /**
   * 尝试通过代理获取数据（备用方案）
   * 注：需要配置代理服务器
   */
  async getNasdaqPEWithProxy(proxyUrl) {
    try {
      const response = await axios.get(proxyUrl, {
        params: {
          url: `${this.baseUrl}/index_eva/dj?index_code=CSI931142`
        },
        timeout: 10000
      });
      
      // 根据代理返回格式解析
      const data = response.data;
      // 处理逻辑同上...
      
      return null;
    } catch (error) {
      Logger.error('Failed to fetch PE via proxy', error.message);
      return null;
    }
  }
}

module.exports = DanjuanService;
