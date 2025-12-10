require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  finnhubApiKey: process.env.FINNHUB_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API 端点
  apis: {
    finnhub: {
      base: 'https://finnhub.io/api/v1',
      quote: '/quote',
      candle: '/stock/candle',
      metrics: '/stock/metric'
    }
  },
  
  // 计算参数配置
  calculation: {
    // PE 分档阈值
    peThresholds: {
      bubble: 35,      // > 35 泡沫
      expensive: 30,   // 30-35 偏贵
      reasonable: 25   // 25-30 合理, < 25 低估
    },
    
    // VIX 分档阈值
    vixThresholds: {
      greed: 13,       // < 13 贪婪
      calm: 18,        // 13-18 平稳
      fear: 25         // 18-25 恐慌, > 25 极恐
    },
    
    // 回撤加成阈值
    drawdownThresholds: {
      double: 20,      // > 20% 翻倍
      boost: 10        // > 10% 增加50%
    },
    
    // 决策矩阵（基础份数）
    matrix: [
      [0, 0, 0.5, 1],   // 泡沫区
      [0, 1, 2, 3],     // 偏贵区
      [1, 2, 3, 5],     // 合理区
      [3, 5, 8, 10]     // 低估区
    ]
  }
};
