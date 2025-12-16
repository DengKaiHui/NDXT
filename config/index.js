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
    
    // 回撤分档阈值（融入三维矩阵）
    drawdownThresholds: {
      super: 20,       // > 20% 超级折扣
      high: 10,        // 10-20% 折扣机会
      medium: 5        // 5-10% 小幅回撤, < 5% 高位运行
    },
    
    // 三维决策矩阵：matrix3D[回撤档位][PE行][VIX列]
    // 回撤档位：lowDrawdown(高位) -> mediumDrawdown(小幅) -> highDrawdown(折扣) -> superDrawdown(超级折扣)
    // PE行：0=泡沫, 1=偏贵, 2=合理, 3=低估
    // VIX列：0=贪婪, 1=平稳, 2=恐慌, 3=极恐
    matrix3D: {
      // 高位运行（回撤 <5%）- 保守策略，市场高位需谨慎
      lowDrawdown: [
        [0, 0, 0, 0.5],     // 泡沫区：高位泡沫，几乎不买
        [0, 0.5, 1, 1.5],   // 偏贵区：高位偏贵，轻仓试探
        [0.5, 1, 1.5, 2],   // 合理区：高位合理，小额定投
        [1, 2, 3, 4]        // 低估区：高位低估，稳健配置
      ],
      
      // 小幅回撤（5-10%）- 标准策略，正常定投节奏
      mediumDrawdown: [
        [0, 0, 0.5, 1],     // 泡沫区：小跌不改泡沫本质
        [0, 1, 2, 3],       // 偏贵区：开始有性价比
        [1, 2, 3, 5],       // 合理区：标准定投
        [3, 5, 8, 10]       // 低估区：积极配置
      ],
      
      // 折扣机会（10-20%）- 积极策略，回调带来机会
      highDrawdown: [
        [0, 0.5, 1, 2],     // 泡沫区：大跌后泡沫可小买
        [0.5, 2, 3, 5],     // 偏贵区：折扣后性价比提升
        [2, 4, 6, 8],       // 合理区：好机会，加大力度
        [5, 8, 12, 15]      // 低估区：黄金坑，大力买入
      ],
      
      // 超级折扣（>20%）- 激进策略，历史级别机会
      superDrawdown: [
        [0, 1, 2, 3],       // 泡沫区：暴跌后可抄底
        [1, 3, 5, 8],       // 偏贵区：大折扣，积极买入
        [3, 6, 10, 12],     // 合理区：极佳机会
        [8, 12, 16, 20]     // 低估区：千载难逢，全力配置
      ]
    }
  }
};
