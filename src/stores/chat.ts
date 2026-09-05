import { defineStore } from 'pinia'
import { ref } from 'vue'
import { streamChat, type ChatMessage, type LlmMode } from '../api/chat'

const WELCOME =
  '你好！我是你的 AI 旅行助手 🧳\n' +
  '可以告诉我目的地、天数和预算，例如：\n' +
  '「国庆去成都玩 3 天，预算 3000，喜欢美食」\n' +
  '我来帮你规划行程～'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([{ role: 'assistant', content: WELCOME }])
  const sending = ref(false)
  const mode = ref<LlmMode | null>(null)

  async function send(content: string) {
    const text = content.trim()
    if (!text || sending.value) return

    // 请求体：历史消息 + 本次提问（不含占位回复）
    const payload: ChatMessage[] = [
      ...messages.value.map((m) => ({ ...m })),
      { role: 'user', content: text },
    ]

    messages.value.push({ role: 'user', content: text })
    const reply: ChatMessage = { role: 'assistant', content: '' }
    messages.value.push(reply)

    sending.value = true
    await streamChat(payload, {
      onMeta: (m) => {
        mode.value = m
      },
      onDelta: (t) => {
        reply.content += t
      },
      onError: (msg) => {
        reply.content += `${reply.content ? '\n\n' : ''}[出错了] ${msg}`
      },
    })
    sending.value = false
  }

  return { messages, sending, mode, send }
})
