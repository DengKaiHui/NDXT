/**
 * 数据源测试脚本
 * 测试各个数据源的可用性和响应速度
 */

const YahooFinanceService = require('./services/yahooFinanceService');
const XueqiuService = require('./services/xueqiuService');
const DanjuanService = require('./services/danjuanService');
const AlternativeDataService = require('./services/alternativeDataService');
const DataAggregatorService = require('./services/dataAggregatorService');

async function testDataSource(name, asyncFunc) {
  const startTime = Date.now();
  try {
    const result = await asyncFunc();
    const duration = Date.now() - startTime;
    
    if (result) {
      console.log(`✅ ${name}: 成功 (${duration}ms)`);
      console.log(`   数据:`, result);
      return { success: true, duration, data: result };
    } else {
      console.log(`❌ ${name}: 失败 - 返回 null (${duration}ms)`);
      return { success: false, duration };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${name}: 失败 - ${error.message} (${duration}ms)`);
    return { success: false, duration, error: error.message };
  }
}

async function main() {
  console.log('====================================');
  console.log('    数据源可用性测试');
  console.log('====================================\n');
  
  const yahooService = new YahooFinanceService();
  const xueqiuService = new XueqiuService();
  const danjuanService = new DanjuanService();
  const altService = new AlternativeDataService();
  const aggregator = new DataAggregatorService();
  
  // 测试 VIX 数据源
  console.log('📊 测试 VIX 数据源:\n');
  
  const vixTests = [
    ['Yahoo Finance', () => yahooService.getVIX()],
    ['雪球', () => xueqiuService.getVIX()],
    ['Alpha Vantage', () => altService.getVIXFromAlphaVantage()],
    ['Twelve Data', () => altService.getVIXFromTwelveData()]
  ];
  
  const vixResults = {};
  for (const [name, func] of vixTests) {
    vixResults[name] = await testDataSource(`VIX - ${name}`, func);
    console.log('');
  }
  
  // 测试 PE 数据源
  console.log('\n📈 测试 PE 数据源:\n');
  
  const peTests = [
    ['雪球 (Nasdaq 100)', () => xueqiuService.getNasdaq100()],
    ['蛋卷基金', () => danjuanService.getNasdaqPE()]
  ];
  
  const peResults = {};
  for (const [name, func] of peTests) {
    peResults[name] = await testDataSource(`PE - ${name}`, func);
    console.log('');
  }
  
  // 测试聚合服务
  console.log('\n🔄 测试数据聚合服务:\n');
  
  const aggResult = await testDataSource('数据聚合服务 (所有数据)', () => aggregator.getAllData());
  
  // 统计结果
  console.log('\n====================================');
  console.log('    测试结果统计');
  console.log('====================================\n');
  
  const allResults = { ...vixResults, ...peResults };
  const successCount = Object.values(allResults).filter(r => r.success).length;
  const totalCount = Object.keys(allResults).length;
  
  console.log(`总计: ${successCount}/${totalCount} 个数据源可用`);
  console.log('');
  
  // VIX 可用性
  const vixAvailable = Object.entries(vixResults)
    .filter(([_, r]) => r.success)
    .map(([name]) => name);
  console.log(`VIX 可用数据源 (${vixAvailable.length}):`, vixAvailable.join(', ') || '无');
  
  // PE 可用性
  const peAvailable = Object.entries(peResults)
    .filter(([_, r]) => r.success)
    .map(([name]) => name);
  console.log(`PE 可用数据源 (${peAvailable.length}):`, peAvailable.join(', ') || '无');
  
  // 推荐配置
  console.log('\n📝 推荐配置:\n');
  if (vixAvailable.length === 0) {
    console.log('⚠️  VIX 数据源全部失败，建议配置备用 API Key (Alpha Vantage / Twelve Data)');
  } else {
    console.log(`✅ VIX 推荐使用: ${vixAvailable[0]}`);
  }
  
  if (peAvailable.length === 0) {
    console.log('⚠️  PE 数据源全部失败，请检查网络连接');
  } else {
    console.log(`✅ PE 推荐使用: ${peAvailable[0]}`);
  }
  
  console.log('\n====================================\n');
}

// 运行测试
main().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
