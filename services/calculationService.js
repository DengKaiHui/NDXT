const config = require('../config');

/**
 * 市场温度计算服务
 * 采用三维决策矩阵：PE × VIX × 回撤
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
   * 根据回撤确定矩阵层级
   * @param {number} drawdown - 回撤百分比
   * @returns {string} 矩阵层级键名
   */
  getDrawdownLevel(drawdown) {
    if (drawdown > this.config.drawdownThresholds.super) {
      return 'superDrawdown';  // >20% 超级折扣
    }
    if (drawdown > this.config.drawdownThresholds.high) {
      return 'highDrawdown';   // 10-20% 折扣机会
    }
    if (drawdown > this.config.drawdownThresholds.medium) {
      return 'mediumDrawdown'; // 5-10% 小幅回撤
    }
    return 'lowDrawdown';      // <5% 高位运行
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
    if (drawdown > this.config.drawdownThresholds.super) {
      return { text: '超级折扣', level: 3 };
    }
    if (drawdown > this.config.drawdownThresholds.high) {
      return { text: '折扣机会', level: 2 };
    }
    if (drawdown > this.config.drawdownThresholds.medium) {
      return { text: '小幅回撤', level: 1 };
    }
    return { text: '高位运行', level: 0 };
  }
  
  /**
   * 核心计算逻辑：根据 PE、VIX、回撤三维矩阵计算投资份数
   * @param {Object} params - { pe, vix, currentPrice, high52Week }
   * @returns {Object} 计算结果
   */
  calculate({ pe, vix, currentPrice, high52Week }) {
    // 1. 计算回撤
    const drawdown = this.calculateDrawdown(currentPrice, high52Week);
    
    // 2. 确定三维矩阵坐标
    const row = this.getPERow(pe);
    const col = this.getVIXColumn(vix);
    const drawdownLevel = this.getDrawdownLevel(drawdown);
    
    // 3. 从三维矩阵直接获取份数（无需乘法加成）
    const finalUnits = this.config.matrix3D[drawdownLevel][row][col];
    
    // 4. 生成标签
    const peLabel = this.getPELabel(pe);
    const vixLabel = this.getVIXLabel(vix);
    const drawdownLabel = this.getDrawdownLabel(drawdown);
    
    // 5. 生成操作建议
    const action = this.generateAction(finalUnits, row, col, drawdownLabel.level);
    
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
        drawdownLevel,
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
   * @param {number} finalUnits - 最终份数
   * @param {number} row - PE行索引
   * @param {number} col - VIX列索引
   * @param {number} drawdownLevel - 回撤等级 (0-3)
   */
  generateAction(finalUnits, row, col, drawdownLevel) {
    const hasDrawdownBonus = drawdownLevel >= 2; // 折扣机会或超级折扣
    const isSuperDrawdown = drawdownLevel === 3;
    
    if (finalUnits === 0) {
      if (row === 0 && col === 0) {
        return { title: '空仓', subtitle: '泡沫+贪婪，风险极高' };
      } else if (row === 0) {
        return { title: '观望', subtitle: '估值过高，等待回调' };
      } else if (col === 0) {
        return { title: '观望', subtitle: '市场贪婪，耐心等待' };
      } else {
        return { title: '观望', subtitle: '性价比不高，耐心等待' };
      }
    }
    
    if (finalUnits >= 15) {
      return {
        title: '全力买入',
        subtitle: isSuperDrawdown ? '历史级机会，超级折扣' : '千载难逢，重仓配置'
      };
    }
    
    if (finalUnits >= 10) {
      return {
        title: '大力买入',
        subtitle: hasDrawdownBonus ? '黄金机会，回撤加持' : '优质时机，积极配置'
      };
    }
    
    if (finalUnits >= 5) {
      return {
        title: '积极买入',
        subtitle: hasDrawdownBonus ? '好机会，含折扣加成' : '性价比高，加大力度'
      };
    }
    
    if (finalUnits >= 2) {
      return {
        title: '稳健买入',
        subtitle: hasDrawdownBonus ? '合适机会，含折扣加成' : '合适时机，定投加仓'
      };
    }
    
    if (finalUnits >= 1) {
      if (row === 0 && col === 3) {
        return {
          title: '试探抄底',
          subtitle: hasDrawdownBonus ? '极恐+折扣，小额试水' : '极恐情绪，谨慎试探'
        };
      }
      return {
        title: '谨慎买入',
        subtitle: hasDrawdownBonus ? '小额试探，含折扣' : '小额尝试，保守配置'
      };
    }
    
    return { title: '少量买入', subtitle: '轻仓参与，谨慎观望' };
  }
}

module.exports = CalculationService;
