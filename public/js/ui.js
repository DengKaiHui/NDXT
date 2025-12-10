/**
 * UI 更新模块 - 负责界面渲染和用户交互
 */
const UI = {
  // DOM 元素缓存
  elements: {},
  
  /**
   * 初始化 DOM 元素引用
   */
  init() {
    this.elements = {
      // 输入框
      inPrice: document.getElementById('inPrice'),
      inHigh: document.getElementById('inHigh'),
      inPE: document.getElementById('inPE'),
      inVIX: document.getElementById('inVIX'),
      
      // 显示区域
      dispPE: document.getElementById('dispPE'),
      dispVIX: document.getElementById('dispVIX'),
      dispDD: document.getElementById('dispDD'),
      tagPE: document.getElementById('tagPE'),
      tagVIX: document.getElementById('tagVIX'),
      tagDD: document.getElementById('tagDD'),
      
      // 操作建议
      actionBigText: document.getElementById('actionBigText'),
      actionSubText: document.getElementById('actionSubText'),
      
      // 其他
      drawdownBadge: document.getElementById('drawdownBadge'),
      currentDate: document.getElementById('currentDate')
    };
    
    // 设置今日日期
    this.updateDate();
  },
  
  /**
   * 更新日期显示
   */
  updateDate() {
    const d = new Date();
    const dateStr = `${d.getMonth()+1}-${d.getDate().toString().padStart(2, '0')}`;
    this.elements.currentDate.innerText = `${dateStr} 纳指100 市场温度`;
  },
  
  /**
   * 更新输入框数据
   */
  updateInputs(data) {
    if (data.currentPrice) {
      this.elements.inPrice.value = data.currentPrice.toFixed(2);
    }
    if (data.high52Week) {
      this.elements.inHigh.value = data.high52Week.toFixed(2);
    }
    if (data.pe) {
      this.elements.inPE.value = data.pe.toFixed(2);
    }
    if (data.vix) {
      this.elements.inVIX.value = data.vix.toFixed(2);
    }
    
    // 显示 PE 百分位信息（如果有）
    if (data.pePercentile !== undefined && data.pePercentile !== null) {
      const peLabel = document.querySelector('label[for="inPE"]') || 
                     document.querySelector('input#inPE')?.previousElementSibling;
      if (peLabel) {
        const percentile = data.pePercentile.toFixed(1);
        peLabel.innerHTML = `纳指 PE <span class="text-xs text-gray-500">(百分位: ${percentile}%)</span>`;
      }
    }
  },
  
  /**
   * 获取输入框数据
   */
  getInputs() {
    return {
      currentPrice: parseFloat(this.elements.inPrice.value),
      high52Week: parseFloat(this.elements.inHigh.value),
      pe: parseFloat(this.elements.inPE.value),
      vix: parseFloat(this.elements.inVIX.value)
    };
  },
  
  /**
   * 验证输入数据
   */
  validateInputs() {
    const inputs = this.getInputs();
    return !Object.values(inputs).some(v => isNaN(v));
  },
  
  /**
   * 清除所有高亮
   */
  clearHighlights() {
    document.querySelectorAll('.cell').forEach(el => {
      el.classList.remove('active-cell');
      // 恢复原始内容
      if (el.getAttribute('data-original')) {
        el.innerHTML = el.getAttribute('data-original');
      }
    });
    this.elements.drawdownBadge.classList.add('hidden');
  },
  
  /**
   * 更新计算结果显示
   * @param {Object} result - 后端返回的计算结果
   */
  updateResults(result) {
    const { inputs, results, labels, action } = result;
    
    // 1. 更新顶部指标 - PE 主值
    const dispPEElement = document.getElementById('dispPE');
    if (dispPEElement) {
      dispPEElement.innerText = inputs.pe;
    }
    
    // 2. 更新 PE 百分位（如果有）
    const pePercentileElement = document.getElementById('pePercentile');
    if (pePercentileElement && result.pePercentile !== undefined && result.pePercentile !== null) {
      pePercentileElement.innerText = `(${result.pePercentile.toFixed(0)}%)`;
      pePercentileElement.style.display = 'inline';
    } else if (pePercentileElement) {
      pePercentileElement.style.display = 'none';
    }
    
    // 3. 更新其他指标
    this.elements.dispVIX.innerText = inputs.vix;
    this.elements.dispDD.innerText = results.drawdown.toFixed(1) + '%';
    
    // 4. 更新 PE 标签
    this.updateTag(this.elements.tagPE, labels.pe);
    
    // 5. 更新 VIX 标签
    this.updateTag(this.elements.tagVIX, labels.vix);
    
    // 6. 更新回撤标签
    this.updateDrawdownTag(labels.drawdown, results.drawdown);
    
    // 7. 更新操作建议
    this.elements.actionBigText.innerText = action.title;
    this.elements.actionSubText.innerText = action.subtitle;
    
    // 8. 高亮矩阵单元格
    this.highlightCell(results.row, results.col, results.finalUnits);
  },
  
  /**
   * 更新标签样式
   */
  updateTag(element, labelData) {
    element.innerText = labelData.text;
    
    const colors = [
      { bg: '#ef4444', color: 'white' },  // 红色
      { bg: '#facc15', color: 'white' },  // 黄色
      { bg: '#22c55e', color: 'white' },  // 绿色
      { bg: '#15803d', color: 'white' }   // 深绿色
    ];
    
    const style = colors[labelData.level];
    element.style.background = style.bg;
    element.style.color = style.color;
  },
  
  /**
   * 更新回撤标签
   */
  updateDrawdownTag(labelData, drawdown) {
    this.elements.tagDD.innerText = labelData.text;
    
    if (labelData.level >= 2) {
      this.elements.drawdownBadge.classList.remove('hidden');
    }
    
    const styles = [
      { bg: 'rgba(255, 255, 255, 0.2)', color: 'white', bold: false },     // 高位
      { bg: '#fbbf24', color: '#78350f', bold: false },                     // 小幅回撤
      { bg: '#f97316', color: 'white', bold: true },                        // 折扣机会
      { bg: '#dc2626', color: 'white', bold: true }                         // 超级折扣
    ];
    
    const style = styles[labelData.level];
    this.elements.tagDD.style.background = style.bg;
    this.elements.tagDD.style.color = style.color;
    this.elements.tagDD.style.fontWeight = style.bold ? 'bold' : 'normal';
  },
  
  /**
   * 高亮矩阵单元格
   */
  highlightCell(row, col, finalUnits) {
    const cellId = `c_${row}_${col}`;
    const cell = document.getElementById(cellId);
    
    if (cell) {
      cell.classList.add('active-cell');
      
      // 保存原始内容
      if (!cell.getAttribute('data-original')) {
        cell.setAttribute('data-original', cell.innerHTML);
      }
      
      // 更新显示份数
      const originalHtml = cell.getAttribute('data-original');
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = originalHtml;
      const desc = tempDiv.querySelector('span').outerHTML;
      
      cell.innerHTML = `${finalUnits}份<br>${desc}`;
    }
  },
  
  /**
   * 按钮加载状态
   */
  setButtonLoading(button, loading, text = '') {
    if (loading) {
      button.disabled = true;
      button.setAttribute('data-original-html', button.innerHTML);
      button.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>' + (text ? ` ${text}` : '');
    } else {
      button.disabled = false;
      const originalHTML = button.getAttribute('data-original-html');
      if (originalHTML) {
        button.innerHTML = originalHTML;
      }
    }
  },
  
  /**
   * 显示临时状态（成功/失败）
   */
  showButtonStatus(button, success, message, duration = 2000) {
    const icon = success ? '✅' : '❌';
    button.innerHTML = `${icon} ${message}`;
    
    setTimeout(() => {
      const originalHTML = button.getAttribute('data-original-html');
      if (originalHTML) {
        button.innerHTML = originalHTML;
      }
    }, duration);
  }
};
