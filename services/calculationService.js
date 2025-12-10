const config = require('../config');

/**
 * 市场温度计算服务
 */
class CalculationService {
  constructor() {
    this.config = config.calculation;
  }
  
  /**
   * 计算回撤百分比
   * @param {number} currentPrice - 当前价格
   * @param {number} high52Week - 52周最高价
   * @returns {number} 回撤百分比
   */
  calculateDrawdown(currentPrice, high52Week) {
    if (!currentPrice || !high52Week || high52Week === 0) {
      return 0;
    }
    return ((high52Week - currentPrice) / high52Week) * 100;
  }
  
  /**
   * 根据 PE 确定行索引
   * @param {number} pe - PE 值
   * @returns {number} 行索引 (0-3)
   */
  getPERow(pe) {
    if (pe <= this.config.peThresholds.reasonable) return 3; // 低估
    if (pe <= this.config.peThresholds.expensive) return 2;  // 合理
    if (pe <= this.config.peThresholds.bubble) return 1;     // 偏贵
    return 0; // 泡沫
  }
  
  /**
   * 根据 VIX 确定列索引
   * @param {number} vix - VIX 值
   * @returns {number} 列索引 (0-3)
   */
  getVIXColumn(vix) {
    if (vix >= this.config.vixThresholds.fear) return 3;     // 极恐
    if (vix >= this.config.vixThresholds.calm) return 2;     // 恐慌
    if (vix >= this.config.vixThresholds.greed) return 1;    // 平稳
    return 0; // 贪婪
  }
  
  /**
   * 获取 PE 标签
   */
  getPELabel(pe) {
    if (pe > this.config.peThresholds.bubble) return { text: '泡沫', level: 0 };
    if (pe > this.config.peThresholds.expensive) return { text: '偏贵', level: 1 };
    if (pe > this.config.peThresholds.reasonable) return { text: '合理', level: 2 };
    return { text: '低估', level: 3 };
  }
  
  /**
   * 获取 VIX 标签
   */
  getVIXLabel(vix) {
    if (vix >= this.config.vixThresholds.fear) return { text: '极恐', level: 3 };
    if (vix >= this.config.vixThresholds.calm) return { text: '恐慌', level: 2 };
    if (vix >= this.config.vixThresholds.greed) return { text: '平稳', level: 1 };
    return { text: '贪婪', level: 0 };
  }
  
  /**
   * 获取回撤标签
   */
  getDrawdownLabel(drawdown) {
    if (drawdown > this.config.drawdownThresholds.double) {
      return { text: '超级折扣', level: 3 };
    }
    if (drawdown > this.config.drawdownThresholds.boost) {
      return { text: '折扣机会', level: 2 };
    }
    if (drawdown > 5) {
      return { text: '小幅回撤', level: 1 };
    }
    return { text: '高位运行', level: 0 };
  }
  
  /**
   * 计算回撤加成倍数
   */
  getDrawdownMultiplier(drawdown) {
    if (drawdown > this.config.drawdownThresholds.double) return 2;
    if (drawdown > this.config.drawdownThresholds.boost) return 1.5;
    return 1;
  }
  
  /**
   * 核心计算逻辑：根据 PE、VIX、回撤计算投资份数
   * @param {Object} params - { pe, vix, currentPrice, high52Week }
   * @returns {Object} 计算结果
   */
  calculate({ pe, vix, currentPrice, high52Week }) {
    // 1. 计算回撤
    const drawdown = this.calculateDrawdown(currentPrice, high52Week);
    
    // 2. 确定矩阵坐标
    const row = this.getPERow(pe);
    const col = this.getVIXColumn(vix);
    
    // 3. 获取基础份数
    const baseUnits = this.config.matrix[row][col];
    
    // 4. 应用回撤加成
    const multiplier = this.getDrawdownMultiplier(drawdown);
    const finalUnits = parseFloat((baseUnits * multiplier).toFixed(1));
    
    // 5. 生成标签
    const peLabel = this.getPELabel(pe);
    const vixLabel = this.getVIXLabel(vix);
    const drawdownLabel = this.getDrawdownLabel(drawdown);
    
    // 6. 生成操作建议
    const action = this.generateAction(finalUnits, row, col, multiplier);
    
    return {
      // 输入数据
      inputs: {
        pe,
        vix,
        currentPrice,
        high52Week
      },
      
      // 计算结果
      results: {
        drawdown: parseFloat(drawdown.toFixed(2)),
        row,
        col,
        baseUnits,
        multiplier,
        finalUnits
      },
      
      // 标签
      labels: {
        pe: peLabel,
        vix: vixLabel,
        drawdown: drawdownLabel
      },
      
      // 操作建议
      action
    };
  }
  
  /**
   * 生成操作建议文案
   */
  generateAction(finalUnits, row, col, multiplier) {
    const hasBonus = multiplier > 1;
    
    if (finalUnits === 0) {
      if (row === 0 && col === 0) {
        return { title: '空仓', subtitle: '泡沫+贪婪，风险极高' };
      } else if (row === 0 && col === 1) {
        return { title: '观望', subtitle: '估值过高，等待回调' };
      } else if (row === 1 && col === 0) {
        return { title: '观望', subtitle: '偏贵+贪婪，耐心等待' };
      } else {
        return { title: '观望', subtitle: '性价比不高，耐心等待' };
      }
    }
    
    if (finalUnits >= 10) {
      return {
        title: '全力买入',
        subtitle: hasBonus ? '千载难逢，大跌加成' : '黄金机会，重仓配置'
      };
    }
    
    if (finalUnits >= 5) {
      return {
        title: '大力买入',
        subtitle: hasBonus ? '优质机会，含回撤加成' : '优质时机,积极配置'
      };
    }
    
    if (finalUnits >= 2) {
      return {
        title: '稳健买入',
        subtitle: hasBonus ? '合适机会，含回撤加成' : '合适时机，定投加仓'
      };
    }
    
    if (finalUnits >= 1) {
      if (row === 0 && col === 3) {
        return {
          title: '试探抄底',
          subtitle: hasBonus ? '极恐情绪，含回撤加成' : '极恐情绪，小额试水'
        };
      }
      return {
        title: '谨慎买入',
        subtitle: hasBonus ? '小额试探，含回撤加成' : '小额尝试，保守配置'
      };
    }
    
    return { title: '少量买入', subtitle: '轻仓参与，谨慎观望' };
  }
}

module.exports = CalculationService;
