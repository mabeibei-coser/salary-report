/**
 * 讯飞 astron-code API 服务
 * 通过 Vite proxy 代理调用大模型生成薪酬数据
 */

const API_KEY = import.meta.env.VITE_GLM_API_KEY;
const MODEL = import.meta.env.VITE_GLM_MODEL;
const PROXY_URL = '/api/chat';

const SYSTEM_PROMPT = `你是一位资深的中国薪酬数据分析专家。你必须综合用户提供的【岗位名称、企业性质、职级、最高学历、所在城市】所有五项信息，生成一份精准的结构化薪酬数据报告，薪酬数据风格为偏低保守风格。

## 输出要求

必须是纯JSON（不要markdown包裹），格式如下：

{
  "position": "岗位名称",
  "company": "企业性质",
  "rank": "职级代码",
  "rankLabel": "职级标签",
  "rankCategory": "tech或mgmt",
  "education": "学历",
  "city": "城市",
  "monthly": {"p25": 月薪, "p50": 月薪, "p75": 月薪},
  "annual": {"p25": 年薪, "p50": 年薪, "p75": 年薪},
  "bonusMonths": {"p25": 月数, "p50": 月数, "p75": 月数},
  "equity": {"p25": 金额, "p50": 金额, "p75": 金额},
  "housingFund": {"p25": 金额, "p50": 金额, "p75": 金额},
  "hourlyRate": {"p25": 金额, "p50": 金额, "p75": 金额},
  "marketComparison": {"marketAvgMonthly": 金额, "diffPct": 百分比整数},
  "marketRanking": [{"company": "企业名称", "monthly": 金额, "annual": 金额}],
  "industryAnalysis": [{"industry": "行业", "description": "描述", "monthlyRange": "范围", "annualRange": "范围", "demandLevel": "高/中/低", "salaryIncrease": "上一年度涨薪如 5.5%"}],
  "cityAnalysis": [{"city": "城市名", "monthlyAvg": 月薪均值, "costIndex": 生活成本指数(以北京=100), "salaryLevel": "高/中/低", "advantage": "该城市优势一句话"}],
  "highEarnerTraits": "该岗位较高薪资人群的特点描述，200字以内"
}

## 核心规则

### 1. 五维参数都必须影响数据
- **岗位名称**：决定薪酬基准。技术岗（开发/算法/架构）高于职能岗（行政/人事），管理岗高于执行岗
- **企业性质**：外资企业薪酬最高（系数约1.10），合资次之（1.05），国有企业福利好、公积金比例高但薪酬较低（0.85）。民营企业居中，初创公司波动大
- **职级**：P序列1-9逐级递增，P5为高级独立负责，M1-M5管理序列薪酬高于同级别P序列
- **最高学历**：博士>硕士>MBA>本科>大专>高中。硕士比本科高约15-20%，博士比硕士高约15-20%。MBA在管理岗有额外加成
- **所在城市**：用户选择城市层级，需根据层级自动生成该层级的典型城市数据。一线城市（北上广深）薪酬为基准100%，二线城市（杭州/成都/武汉/南京/苏州/西安等）约为一线80-85%，三四线城市约为一线50-70%

### 2. 数据合理性
- monthly月薪单位元，所有值为整数
- annual年薪 = 月薪 × (12 + 年终奖月数)
- hourlyRate时薪 = 月薪 ÷ (21.75 × 8)
- housingFund公积金 = 月薪 × (个人比例+公司比例)，国有企业比例最高12%+12%，民企5%+5%
- equity股权：初创公司和外资企业较高，国有企业通常为0
- bonusMonths年终奖月数：外企2-5个月，国企1-4个月，民企1-3个月，初创0-5个月

### 3. marketRanking 市场排名
必须包含5种企业性质：外资企业、合资企业、民营企业、国有企业、初创公司。按monthly降序排列。

### 4. industryAnalysis 细分行业（必须9个）
根据岗位推荐相关细分行业，如"金融科技"、"在线教育"、"电商零售"等。每个行业给出月薪范围、年薪范围、人才需求等级、"salaryIncrease"为上一年度行业平均涨薪幅度（必须在1.5%-5.5%之间，格式如"3.2%"）。

### 5. cityAnalysis 城市对比（6个典型城市）
根据用户选择的城市层级，从该层级中选取6个典型城市：
- 一线城市：北京、上海、广州、深圳、杭州、成都
- 二线城市：杭州、成都、武汉、南京、苏州、西安
- 三四线城市：长沙、合肥、郑州、昆明、南昌、贵阳
每个城市给出月薪均值、生活成本指数（北京=100）、薪酬水平、城市优势。

### 6. 2026年中国市场
数据要反映2026年中国就业市场偏低的保守水平，所有金额精确到百元。`;

/**
 * 调用 API 获取薪酬数据
 */
export async function fetchSalaryData(position, company, rank, education, city) {
  const userMessage = `请综合以下五项信息生成薪酬报告：
- 岗位名称：${position}
- 企业性质：${company}
- 岗位职级：${rank}
- 最高学历：${education}
- 所在城市：${city}

请严格按系统提示的JSON格式返回完整数据，确保所有五项参数都体现在薪酬数据中。`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '未知错误');
      throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('API 返回数据为空');
    }

    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const data = JSON.parse(cleaned);
    return validateAndNormalize(data, position, company, rank, education, city);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时（60秒），请稍后重试');
    }
    throw error;
  }
}

function validateAndNormalize(data, position, company, rank, education, city) {
  data.position = data.position || position;
  data.company = data.company || company;
  data.rank = data.rank || rank;
  data.rankLabel = data.rankLabel || rank;
  data.rankCategory = data.rankCategory || 'tech';
  data.education = data.education || education;
  data.city = data.city || city;

  const keys = ['monthly', 'annual', 'bonusMonths', 'equity', 'housingFund', 'hourlyRate'];
  for (const key of keys) {
    data[key] = data[key] || {};
    for (const p of ['p25', 'p50', 'p75']) {
      data[key][p] = Math.round(Number(data[key]?.[p]) || 0);
    }
  }

  data.marketComparison = data.marketComparison || {};
  data.marketComparison.marketAvgMonthly = Math.round(Number(data.marketComparison.marketAvgMonthly) || 0);
  data.marketComparison.diffPct = Math.round(Number(data.marketComparison.diffPct) || 0);

  data.marketRanking = (Array.isArray(data.marketRanking) ? data.marketRanking : []).map((item) => ({
    company: item.company || '',
    monthly: Math.round(Number(item.monthly) || 0),
    annual: Math.round(Number(item.annual) || 0),
  }));

  data.industryAnalysis = (Array.isArray(data.industryAnalysis) ? data.industryAnalysis : []).map((item) => ({
    industry: item.industry || '未命名行业',
    description: item.description || '',
    monthlyRange: item.monthlyRange || '--',
    annualRange: item.annualRange || '--',
    demandLevel: item.demandLevel || '中',
    salaryIncrease: item.salaryIncrease || '--',
  }));

  data.cityAnalysis = (Array.isArray(data.cityAnalysis) ? data.cityAnalysis : []).map((item) => ({
    city: item.city || '',
    monthlyAvg: Math.round(Number(item.monthlyAvg) || 0),
    costIndex: Math.round(Number(item.costIndex) || 100),
    salaryLevel: item.salaryLevel || '中',
    advantage: item.advantage || '',
  }));

  data.highEarnerTraits = data.highEarnerTraits || '该岗位较高薪资人群通常具备：丰富行业经验、核心项目主导能力、跨部门协作经验、持续学习与技术迭代能力。';

  return data;
}
