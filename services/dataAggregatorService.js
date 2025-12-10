const YahooFinanceService = require('./yahooFinanceService');
const XueqiuService = require('./xueqiuService');
const DanjuanService = require('./danjuanService');
const AlternativeDataService = require('./alternativeDataService');
const Logger = require('../utils/logger');

/**
 * 数据聚合服务
 * 智能选择最佳数据源，提供容错和降级策略
 */
class DataAggregatorService {
  constructor() {
    this.yahooService = new YahooFinanceService();
    this.xueqiuService = new XueqiuService();
    this.danjuanService = new DanjuanService();
    this.altService = new AlternativeDataService();
  }
  
  /**
   * 获取 VIX 数据（多数据源容错）
   * 优先级：Yahoo Finance > 雪球 > Alpha Vantage > Twelve Data
   */
  async getVIX() {
    Logger.info('开始获取 VIX 数据...');
    
    // 方案1: Yahoo Finance
    try {
      const vix = await this.yahooService.getVIX();
      if (vix !== null) {
        Logger.info('✓ VIX 数据来源: Yahoo Finance');
        return { value: vix, source: 'Yahoo Finance' };
      }
    } catch (error) {
      Logger.warn('Yahoo Finance VIX 获取失败');
    }
    
    // 方案2: 雪球
    try {
      const vix = await this.xueqiuService.getVIX();
      if (vix !== null) {
        Logger.info('✓ VIX 数据来源: 雪球');
        return { value: vix, source: 'Xueqiu' };
      }
    } catch (error) {
      Logger.warn('雪球 VIX 获取失败');
    }
    
    // 方案3: 备用数据源 (Alpha Vantage / Twelve Data)
    try {
      const vix = await this.altService.getVIXFromAnySource();
      if (vix !== null) {
        Logger.info('✓ VIX 数据来源: Alternative API');
        return { value: vix, source: 'Alternative API' };
      }
    } catch (error) {
      Logger.warn('备用 API VIX 获取失败');
    }
    
    Logger.error('✗ 所有 VIX 数据源均获取失败');
    return null;
  }
  
  /**
   * 获取 PE 和 PE 百分位数据
   * 优先级：雪球 > 蛋卷基金
   */
  async getPEData() {
    Logger.info('开始获取 PE 数据...');
    
    // 方案1: 雪球（获取实时 PE）
    try {
      const ndxData = await this.xueqiuService.getNasdaq100();
      if (ndxData && ndxData.pe_ttm) {
        Logger.info('✓ PE 数据来源: 雪球');
        return {
          pe: ndxData.pe_ttm,
          pePercentile: null, // 雪球不提供百分位
          source: 'Xueqiu'
        };
      }
    } catch (error) {
      Logger.warn('雪球 PE 获取失败');
    }
    
    // 方案2: 蛋卷基金（获取 PE + 百分位）
    try {
      const peData = await this.danjuanService.getNasdaqPE();
      if (peData) {
        Logger.info('✓ PE 数据来源: 蛋卷基金');
        return {
          pe: peData.pe,
          pePercentile: peData.pePercentile,
          source: 'Danjuan'
        };
      }
    } catch (error) {
      Logger.warn('蛋卷基金 PE 获取失败');
    }
    
    Logger.error('✗ 所有 PE 数据源均获取失败');
    return null;
  }
  
  /**
   * 并行获取所有数据（VIX + PE）
   */
  async getAllData() {
    Logger.info('开始并行获取市场数据...');
    
    const [vixResult, peResult] = await Promise.allSettled([
      this.getVIX(),
      this.getPEData()
    ]);
    
    const result = {
      vix: null,
      vixSource: null,
      pe: null,
      pePercentile: null,
      peSource: null,
      timestamp: new Date().toISOString()
    };
    
    // 处理 VIX 结果
    if (vixResult.status === 'fulfilled' && vixResult.value) {
      result.vix = vixResult.value.value;
      result.vixSource = vixResult.value.source;
    }
    
    // 处理 PE 结果
    if (peResult.status === 'fulfilled' && peResult.value) {
      result.pe = peResult.value.pe;
      result.pePercentile = peResult.value.pePercentile;
      result.peSource = peResult.value.source;
    }
    
    // 统计成功率
    const successCount = [result.vix, result.pe].filter(v => v !== null).length;
    Logger.info(`数据获取完成: ${successCount}/2 项成功`);
    
    return result;
  }
}

module.exports = DataAggregatorService;
