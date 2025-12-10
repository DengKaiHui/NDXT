/**
 * 应用主逻辑 - 协调 API 和 UI 模块
 */
const App = {
  /**
   * 初始化应用
   */
  init() {
    UI.init();
    this.bindEvents();
    console.log('✅ 应用初始化完成');
  },
  
  /**
   * 绑定事件监听
   */
  bindEvents() {
    // 输入框变化时自动计算
    ['inPrice', 'inHigh', 'inPE', 'inVIX'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', () => this.handleCalculate());
      }
    });
  },
  
  /**
   * 获取/设置 API Key
   */
  getApiKey() {
    return localStorage.getItem('finnhub_api_key') || '';
  },
  
  setApiKey(key) {
    localStorage.setItem('finnhub_api_key', key);
  },
  
  /**
   * 处理计算逻辑
   */
  async handleCalculate(pePercentile = null) {
    // 清除高亮
    UI.clearHighlights();
    
    // 验证输入
    if (!UI.validateInputs()) {
      return;
    }
    
    try {
      const inputs = UI.getInputs();
      const result = await API.calculate(inputs);
      
      // 如果有 PE 百分位数据，附加到结果中
      if (pePercentile !== null) {
        result.pePercentile = pePercentile;
      }
      
      UI.updateResults(result);
    } catch (error) {
      console.error('计算失败:', error);
    }
  },
  
  /**
   * 获取实时数据
   */
  async fetchRealTimeData(button) {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      alert('⚠️ 请先配置 Finnhub API Key\n\n点击下方"配置 API Key"按钮设置');
      toggleApiConfig();
      return;
    }
    
    UI.setButtonLoading(button, true);
    
    try {
      const data = await API.getMarketData(apiKey);
      
      // 更新输入框
      UI.updateInputs(data);
      
      // 检查数据完整性并提示
      const missing = [];
      if (!data.vix) missing.push('VIX');
      if (!data.pe) missing.push('PE');
      
      if (missing.length > 0) {
        console.warn(`部分数据获取失败: ${missing.join(', ')}`);
        console.log('数据来源:', data.dataSource);
      }
      
      // 自动计算（传入 PE 百分位）
      await this.handleCalculate(data.pePercentile);
      
      // 显示成功状态
      if (missing.length === 0) {
        UI.showButtonStatus(button, true, '数据已更新');
      } else {
        UI.setButtonLoading(button, false);
        alert(`✅ 部分数据已更新\n\n⚠️ 以下数据获取失败，请手动输入：\n${missing.join('、')}\n\n💡 VIX 数据来源：Yahoo Finance\n💡 PE 数据来源：蛋卷基金`);
        UI.showButtonStatus(button, true, `已更新 (${missing.length}项需手动输入)`);
      }
      
    } catch (error) {
      console.error('获取数据失败:', error);
      UI.setButtonLoading(button, false);
      
      let errorMessage = '数据获取失败';
      if (error.message.includes('API')) {
        errorMessage += '\n请检查 API Key 是否正确';
      } else if (error.message.includes('network')) {
        errorMessage += '\n请检查网络连接';
      } else {
        errorMessage += '\n' + error.message;
      }
      
      alert('⚠️ ' + errorMessage);
      UI.showButtonStatus(button, false, '获取失败');
    }
  },
  
  /**
   * 分享截图
   */
  async shareImage(button) {
    const shareArea = document.getElementById('shareArea');
    
    UI.setButtonLoading(button, true);
    
    try {
      // 临时移除 body 缩放
      document.body.classList.add('capturing');
      
      // 生成截图
      const canvas = await html2canvas(shareArea, {
        backgroundColor: '#f8f9fa',
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 0,
        removeContainer: true
      });
      
      // 恢复缩放
      document.body.classList.remove('capturing');
      
      // 创建 3:4 比例画布
      const targetWidth = 1080;
      const targetHeight = 1440;
      
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = targetWidth;
      finalCanvas.height = targetHeight;
      const ctx = finalCanvas.getContext('2d');
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 填充背景
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // 计算缩放
      const scale = Math.min(
        targetWidth / canvas.width,
        targetHeight / canvas.height
      );
      
      const scaledWidth = canvas.width * scale;
      const scaledHeight = canvas.height * scale;
      
      const x = (targetWidth - scaledWidth) / 2;
      const y = (targetHeight - scaledHeight) / 2;
      
      ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
      
      // 复制到剪贴板
      finalCanvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          
          UI.setButtonLoading(button, false);
          UI.showButtonStatus(button, true, '已复制到剪贴板');
          
        } catch (clipboardError) {
          console.error('复制失败，降级为下载:', clipboardError);
          
          // 降级：下载图片
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const d = new Date();
          const dateStr = `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
          link.download = `纳指100市场温度_${dateStr}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          
          UI.setButtonLoading(button, false);
          UI.showButtonStatus(button, true, '已保存（不支持剪贴板）', 2500);
        }
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('截图失败:', error);
      document.body.classList.remove('capturing');
      UI.setButtonLoading(button, false);
      UI.showButtonStatus(button, false, '截图失败');
    }
  }
};

// API Key 管理（全局函数，供 HTML 调用）
function toggleApiConfig() {
  const panel = document.getElementById('apiConfigPanel');
  const input = document.getElementById('apiKeyInput');
  
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    input.value = App.getApiKey();
  } else {
    panel.classList.add('hidden');
  }
}

function saveApiKey() {
  const input = document.getElementById('apiKeyInput');
  const apiKey = input.value.trim();
  
  if (apiKey) {
    App.setApiKey(apiKey);
    alert('✅ API Key 已保存！');
    toggleApiConfig();
  } else {
    alert('⚠️ 请输入有效的 API Key');
  }
}

// 全局函数（供 HTML 按钮调用）
function fetchFromFinnhub() {
  const button = event.target.closest('button');
  App.fetchRealTimeData(button);
}

function shareImage() {
  const button = event.target.closest('button');
  App.shareImage(button);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
