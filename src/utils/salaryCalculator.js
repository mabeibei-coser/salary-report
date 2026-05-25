/**
 * 薪酬计算工具函数
 * 负责数据格式化和聚合计算
 */

/**
 * 格式化金额为中文万元/元
 * @param {number} amount - 金额（元）
 * @param {boolean} showWan - 是否以万元显示
 * @returns {string} 格式化后的字符串
 */
export function formatSalary(amount, showWan = true) {
  if (amount >= 10000 && showWan) {
    const wan = (amount / 10000).toFixed(1);
    // 去掉末尾无意义的 .0
    return `${wan.replace(/\.0$/, '')}万`;
  }
  return amount.toLocaleString('zh-CN');
}

/**
 * 格式化金额为完整数字字符串（带千分位）
 * @param {number} amount
 * @returns {string}
 */
export function formatNumber(amount) {
  return amount.toLocaleString('zh-CN');
}

/**
 * 格式化百分比
 * @param {number} pct - 0-1之间的数
 * @returns {string}
 */
export function formatPercent(pct) {
  return `${Math.round(pct * 100)}%`;
}

/**
 * 计算与市场均值的对比描述
 * @param {number} diffPct - 差异百分比
 * @returns {{ text: string, color: string }}
 */
export function getComparisonText(diffPct) {
  if (diffPct > 20) {
    return { text: '显著高于市场平均水平', color: '#1b5e20' };
  } else if (diffPct > 5) {
    return { text: '高于市场平均水平', color: '#2e7d32' };
  } else if (diffPct > -5) {
    return { text: '与市场平均水平持平', color: '#64748b' };
  } else if (diffPct > -20) {
    return { text: '低于市场平均水平', color: '#c62828' };
  } else {
    return { text: '显著低于市场平均水平', color: '#b71c1c' };
  }
}

/**
 * 获取薪酬颜色（高薪偏绿，低薪偏橙）
 * @param {number} monthly - 月薪
 * @returns {string} 颜色值
 */
export function getSalaryColor(monthly) {
  if (monthly >= 50000) return '#00e676';
  if (monthly >= 35000) return '#69f0ae';
  if (monthly >= 25000) return '#b2ff59';
  if (monthly >= 18000) return '#ffd740';
  if (monthly >= 12000) return '#ffab40';
  if (monthly >= 8000) return '#ff9100';
  return '#ff6e40';
}

/**
 * 生成一句话市场定位总结
 * @param {string} position - 岗位
 * @param {string} company - 企业性质
 * @param {number} diffPct - 差异百分比
 * @param {number} monthly - 月薪
 * @returns {string}
 */
export function generateSummary(position, company, diffPct, monthly) {
  const direction = diffPct >= 0 ? '高于' : '低于';
  const absPct = Math.abs(diffPct);
  const level = monthly >= 30000 ? '高薪区间' : monthly >= 15000 ? '中等偏上' : '成长区间';

  if (diffPct > 15) {
    return `${company}的${position}岗位薪酬处于市场${level}，月薪${direction}市场均值约${absPct}%，具有较强竞争力。`;
  } else if (diffPct > 0) {
    return `${company}的${position}岗位薪酬处于市场${level}，月薪略${direction}市场均值约${absPct}%，整体与市场保持同步。`;
  } else if (diffPct > -15) {
    return `${company}的${position}岗位薪酬处于市场${level}，月薪略${direction}市场均值约${absPct}%，建议关注综合福利与成长空间。`;
  } else {
    return `${company}的${position}岗位薪酬处于市场${level}，月薪${direction}市场均值约${absPct}%，但综合福利与发展前景可能弥补薪资差距。`;
  }
}
