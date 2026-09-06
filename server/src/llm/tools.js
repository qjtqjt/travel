// 旅行 Agent 的工具集（Tool Calling）
// 天气：真实数据（Open-Meteo 免费API，无需 Key）；景点：内置数据模拟；预算为真实计算；行程持久化到本地 JSON
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '..', 'data')

// ---------- 天气：Open-Meteo 真实数据 ----------
// WMO weather code → 中文天气描述
const WMO_TEXT = {
  0: '晴', 1: '基本晴', 2: '局部多云', 3: '阴',
  45: '雾', 48: '雾凇',
  51: '毛毛雨', 53: '毛毛雨', 55: '浓毛毛雨', 56: '冻毛毛雨', 57: '冻毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '强冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒',
  80: '小阵雨', 81: '阵雨', 82: '强阵雨', 85: '小阵雪', 86: '阵雪',
  95: '雷暴', 96: '雷暴伴冰雹', 99: '强雷暴伴冰雹',
}
const wmoText = (code) => WMO_TEXT[code] ?? '未知天气'
// 带超时的 fetch（外部 API 不可靠时快速失败，不挂住 Agent 循环）
const fetchJson = async (url, timeoutMs = 8000) => {
  const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json()
}

const ATTRACTIONS_DB = {
  成都: [
    { name: '大熊猫繁育研究基地', intro: '近距离看滚滚，建议早上去，熊猫最活跃', ticket: '55元', duration: '半天' },
    { name: '宽窄巷子', intro: '清代古街巷，体验成都慢生活与小吃', ticket: '免费', duration: '2-3小时' },
    { name: '武侯祠·锦里', intro: '三国文化圣地，夜景和民俗小吃一流', ticket: '50元（锦里免费）', duration: '半天' },
    { name: '人民公园鹤鸣茶社', intro: '百年茶馆，体验最地道的成都盖碗茶', ticket: '免费（茶位自费）', duration: '1-2小时' },
  ],
  三亚: [
    { name: '亚龙湾', intro: '沙质最好的海湾，适合游泳和水上项目', ticket: '免费（部分区域收费）', duration: '半天' },
    { name: '蜈支洲岛', intro: '潜水胜地，海水能见度高', ticket: '144元起（含船票）', duration: '一天' },
    { name: '天涯海角', intro: '经典打卡地标，情侣必去', ticket: '80元', duration: '2-3小时' },
  ],
  北京: [
    { name: '故宫博物院', intro: '世界最大宫殿建筑群，需提前7天预约', ticket: '60元（旺季）', duration: '半天' },
    { name: '八达岭长城', intro: '长城精华段，"不到长城非好汉"', ticket: '40元', duration: '一天' },
    { name: '颐和园', intro: '皇家园林典范，昆明湖泛舟体验极佳', ticket: '30元（联票60元）', duration: '半天' },
  ],
  西安: [
    { name: '秦始皇兵马俑', intro: '世界第八大奇迹，一定要请讲解', ticket: '120元', duration: '半天' },
    { name: '大唐不夜城', intro: '夜游天花板，灯光演艺沉浸式体验', ticket: '免费', duration: '晚上3小时' },
    { name: '西安城墙', intro: '保存最完整的古代城垣，推荐骑行环游', ticket: '54元', duration: '2-3小时' },
  ],
  上海: [
    { name: '外滩', intro: '万国建筑博览群，夜景绝佳', ticket: '免费', duration: '2小时' },
    { name: '豫园·城隍庙', intro: '江南古典园林，九曲桥与南翔小笼', ticket: '40元', duration: '半天' },
    { name: '上海迪士尼', intro: '内地首座迪士尼，热门项目需早去', ticket: '475元起', duration: '一天' },
  ],
  重庆: [
    { name: '洪崖洞', intro: '现实版"千与千寻"，夜景震撼', ticket: '免费', duration: '晚上2小时' },
    { name: '李子坝轻轨穿楼', intro: '网红打卡点，看轻轨穿楼而过', ticket: '免费（乘坐2元起）', duration: '1小时' },
    { name: '磁器口古镇', intro: '千年古镇，小吃与手作聚集地', ticket: '免费', duration: '半天' },
  ],
}

// ---------- 工具定义 ----------
// 1. 查询天气（Open-Meteo 真实数据：geocoding 定位城市 → forecast 取实时+当日预报）
const queryWeather = tool(
  async ({ city }) => {
    try {
      const geo = await fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`,
      )
      const loc = geo.results?.[0]
      if (!loc) return `未找到城市「${city}」的地理信息，请确认城市名后重试。`

      const w = await fetchJson(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
          `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
          `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=1`,
      )
      const cur = w.current ?? {}
      const daily = w.daily ?? {}
      const lines = [
        `${loc.name}（${loc.country ?? ''}）实时天气：`,
        `天气：${wmoText(cur.weather_code)}`,
        `当前气温：${cur.temperature_2m}℃`,
        `今日气温：${daily.temperature_2m_min?.[0]}~${daily.temperature_2m_max?.[0]}℃`,
        `湿度：${cur.relative_humidity_2m}%｜风速：${cur.wind_speed_10m}km/h`,
        `数据时间：${cur.time}（当地时间）`,
      ]
      // 雷暴/降雪等特殊天气附加出行提示
      const code = cur.weather_code
      if (code >= 95) lines.push('出行提示：有雷暴天气，请避免户外活动，关注临近预警。')
      else if (code >= 71 && code <= 86) lines.push('出行提示：有降雪，注意保暖防滑，驾车减速慢行。')
      else if (code >= 51) lines.push('出行提示：有降雨，随身带伞，安排室内备选行程。')
      return lines.join('\n')
    } catch (err) {
      return `天气服务暂时不可用（${err.message}），请基于通用气候知识回答并说明无法提供实时数据。`
    }
  },
  {
    name: 'queryWeather',
    description: '查询指定城市的实时天气与当日预报（真实气象数据）。涉及天气、穿衣、是否下雨等实时信息时必须调用本工具，禁止凭记忆编造天气。',
    schema: z.object({
      city: z.string().describe('城市名，如：成都'),
    }),
  },
)

// 2. 搜索景点
const searchAttractions = tool(
  async ({ city, keyword }) => {
    const list = ATTRACTIONS_DB[city]
    if (!list) return `暂无「${city}」的景点数据，请基于通用知识谨慎推荐，并说明数据可能不准确。`
    const filtered = keyword
      ? list.filter((a) => a.name.includes(keyword) || a.intro.includes(keyword))
      : list
    if (!filtered.length) return `「${city}」没有匹配"${keyword}"的景点记录。`
    return filtered
      .map((a, i) => `${i + 1}. ${a.name}｜门票：${a.ticket}｜建议游玩：${a.duration}\n   ${a.intro}`)
      .join('\n')
  },
  {
    name: 'searchAttractions',
    description: '搜索指定城市的热门景点信息（简介/门票/建议游玩时长）。推荐具体景点前应调用本工具，不要编造不存在的景点。',
    schema: z.object({
      city: z.string().describe('城市名，如：成都'),
      keyword: z.string().optional().describe('可选过滤关键词，如：熊猫'),
    }),
  },
)

// 3. 估算预算（真实计算逻辑）
const BUDGET_PER_DAY = {
  economy: { hotel: 150, food: 80, traffic: 50, ticket: 40 }, // 经济型
  comfort: { hotel: 400, food: 150, traffic: 100, ticket: 80 }, // 舒适型
  luxury: { hotel: 1000, food: 350, traffic: 200, ticket: 150 }, // 豪华型
}
const LEVEL_NAMES = { economy: '经济型', comfort: '舒适型', luxury: '豪华型' }

const estimateBudget = tool(
  async ({ destination, days, people, level }) => {
    const p = BUDGET_PER_DAY[level] ?? BUDGET_PER_DAY.comfort
    const perDay = p.hotel + p.food + p.traffic + p.ticket
    const hotel = p.hotel * days * Math.ceil(people / 2) // 房间按2人一间
    const subtotal = (p.food + p.traffic + p.ticket) * days * people
    const total = hotel + subtotal
    return [
      `${destination} ${days}天 ${people}人（${LEVEL_NAMES[level]}）预算明细：`,
      `- 住宿：¥${hotel}（¥${p.hotel}/间/晚 × ${Math.ceil(people / 2)}间 × ${days}晚）`,
      `- 餐饮：¥${p.food * days * people}（¥${p.food}/人/天）`,
      `- 市内交通：¥${p.traffic * days * people}`,
      `- 门票娱乐：¥${p.ticket * days * people}`,
      `合计：约 ¥${total}（人均 ¥${Math.round(total / people)}）`,
      `注：不含往返大交通（机票/高铁）与购物。`,
    ].join('\n')
  },
  {
    name: 'estimateBudget',
    description: '按天数/人数/消费档位计算旅行预算明细（住宿/餐饮/交通/门票）。涉及预算问题时必须调用本工具，不要心算。',
    schema: z.object({
      destination: z.string().describe('目的地，如：成都'),
      days: z.number().int().positive().describe('行程天数'),
      people: z.number().int().positive().describe('出行人数'),
      level: z.enum(['economy', 'comfort', 'luxury']).describe('消费档位：economy经济/comfort舒适/luxury豪华'),
    }),
  },
)

// 4. 保存行程（真实持久化到 data/itineraries.json）
const saveItinerary = tool(
  async ({ destination, days, plan }) => {
    await fs.mkdir(DATA_DIR, { recursive: true })
    const file = path.join(DATA_DIR, 'itineraries.json')
    let list = []
    try {
      list = JSON.parse(await fs.readFile(file, 'utf-8'))
      if (!Array.isArray(list)) list = []
    } catch {
      // 文件不存在或损坏，从空列表开始
    }
    const record = {
      id: `trip_${Date.now().toString(36)}`,
      destination,
      days,
      plan,
      createdAt: new Date().toISOString(),
    }
    list.push(record)
    await fs.writeFile(file, JSON.stringify(list, null, 2), 'utf-8')
    return `行程已保存，编号 ${record.id}（目的地：${destination}，${days}天）。`
  },
  {
    name: 'saveItinerary',
    description: '把为用户制定的行程方案持久化保存。仅当用户明确表达"保存/帮我记下这份行程"时调用；调用前需已有完整行程文本。',
    schema: z.object({
      destination: z.string().describe('目的地城市'),
      days: z.number().int().positive().describe('行程天数'),
      plan: z.string().describe('完整的行程方案文本（Markdown）'),
    }),
  },
)

const TOOL_LIST = [queryWeather, searchAttractions, estimateBudget, saveItinerary]

// 名称 → 工具实例 的映射，供 Agent 循环执行调用
export function getTravelTools() {
  return TOOL_LIST
}

export function getToolMap() {
  return Object.fromEntries(TOOL_LIST.map((t) => [t.name, t]))
}
