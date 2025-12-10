/**
 * API 调用模块 - 负责与后端通信
 */
const API = {
  // 基础 URL（开发环境自动检测）
  baseURL: window.location.origin,
  
  /**
   * 通用请求方法
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || data.message || '请求失败');
      }
      
      return data.data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },
  
  /**
   * 获取市场数据
   * @param {string} apiKey - Finnhub API Key
   * @returns {Promise<Object>} { currentPrice, high52Week, vix, pe, timestamp }
   */
  async getMarketData(apiKey) {
    return this.request(`/market-data?apiKey=${encodeURIComponent(apiKey)}`, {
      method: 'GET'
    });
  },
  
  /**
   * 计算投资决策
   * @param {Object} params - { pe, vix, currentPrice, high52Week }
   * @returns {Promise<Object>} 计算结果
   */
  async calculate(params) {
    return this.request('/calculate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },
  
  /**
   * 获取配置信息
   * @returns {Promise<Object>} 配置数据
   */
  async getConfig() {
    return this.request('/config', {
      method: 'GET'
    });
  },
  
  /**
   * 健康检查
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    return this.request('/health', {
      method: 'GET'
    });
  }
};
