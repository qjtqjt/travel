// 对话消息类型（与后端 /api/chat 入参一致）
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export type LlmMode = 'live' | 'mock'

interface StreamHandlers {
  onMeta?: (mode: LlmMode) => void
  onDelta?: (text: string) => void
  onError?: (message: string) => void
  onDone?: () => void
}

/**
 * 调用后端 SSE 流式对话接口。
 * 事件协议：{ type: 'meta'|'delta'|'error'|'done', ... }
 */
export async function streamChat(
  messages: ChatMessage[],
  handlers: StreamHandlers,
): Promise<void> {
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })

    if (!resp.ok || !resp.body) {
      handlers.onError?.(`服务异常（HTTP ${resp.status}）`)
      handlers.onDone?.()
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE 以 \n\n 分隔事件，按行解析
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload) continue

        try {
          const evt = JSON.parse(payload)
          if (evt.type === 'meta') handlers.onMeta?.(evt.mode)
          else if (evt.type === 'delta') handlers.onDelta?.(evt.content ?? '')
          else if (evt.type === 'error') handlers.onError?.(evt.message ?? '未知错误')
          else if (evt.type === 'done') {
            handlers.onDone?.()
            return
          }
        } catch {
          // 忽略半包 JSON 解析错误，等下一段
        }
      }
    }
    handlers.onDone?.()
  } catch (err) {
    handlers.onError?.(err instanceof Error ? err.message : '网络请求失败')
    handlers.onDone?.()
  }
}
