import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { streamChat, type ChatMessage, type LlmMode } from '../api/chat'

const WELCOME =
  '你好！我是你的 AI 旅行助手 🧳\n' +
  '可以告诉我目的地、天数和预算，例如：\n' +
  '「国庆去成都玩 3 天，预算 3000，喜欢美食」\n' +
  '我来帮你规划行程～'

// 打字机平滑参数：上游可能整段缓冲后突发到达，统一在客户端按固定节奏吐字
const TYPE_TICK_MS = 24 // 刷新间隔
const TYPE_CHARS_PER_TICK = 3 // 每次吐出字符数（约 125 字/秒，接近自然打字节奏）

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([{ role: 'assistant', content: WELCOME }])
  const sending = ref(false)
  const mode = ref<LlmMode | null>(null)

  async function send(content: string) {
    const text = content.trim()
    if (!text || sending.value) return

    // 请求体：历史消息 + 本次提问（只取 role/content，reasoning 不回传后端）
    const payload: ChatMessage[] = [
      ...messages.value.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ]

    messages.value.push({ role: 'user', content: text })
    // 必须 reactive() 包装：直接改 push 进数组的原始对象不会触发视图更新，
    // 闭包里的引用拿不到响应式代理（打字机/思考过程不刷新的根因）
    const reply = reactive<ChatMessage>({ role: 'assistant', content: '', reasoning: '' })
    messages.value.push(reply)

    // 打字机队列：onDelta 只入队，定时器按固定节奏把字符搬到气泡上
    let pending = ''
    let streamEnded = false
    const drain = () => {
      if (pending.length) {
        const n = Math.min(TYPE_CHARS_PER_TICK, pending.length)
        reply.content += pending.slice(0, n)
        pending = pending.slice(n)
      }
      if (streamEnded && !pending.length) {
        clearInterval(timer)
        sending.value = false
      }
    }
    const timer = setInterval(drain, TYPE_TICK_MS)

    sending.value = true
    await streamChat(payload, {
      onMeta: (m) => {
        mode.value = m
      },
      onReasoning: (t) => {
        // 思考过程实时追加（思考阶段就有内容可看，不用干等）
        reply.reasoning = (reply.reasoning ?? '') + t
      },
      onDelta: (t) => {
        pending += t
      },
      onToolCall: (e) => {
        // Agent 发起工具调用：轨迹入列（含参数，结果待回填）
        if (!reply.tools) reply.tools = []
        reply.tools.push({ id: e.id, name: e.name, args: e.args })
      },
      onToolResult: (e) => {
        // 工具执行完成：按 id 找到对应轨迹项回填结果
        const t = reply.tools?.find((x) => x.id === e.id)
        if (t) t.result = e.result
      },
      onError: (msg) => {
        pending += `${reply.content || pending ? '\n\n' : ''}[出错了] ${msg}`
      },
    })

    // 流结束后继续把队列里的文字打完，再解除发送态
    streamEnded = true
    drain()
  }

  return { messages, sending, mode, send }
})
