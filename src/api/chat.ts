// 对话消息类型（role/content 与后端 /api/chat 入参一致；reasoning 仅前端展示用）
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
}

export type LlmMode = 'live' | 'mock'

interface StreamHandlers {
  onMeta?: (mode: LlmMode) => void
  onReasoning?: (text: string) => void
  onDelta?: (text: string) => void
  onError?: (message: string) => void
  onDone?: () => void
}

// 空闲超时：超过该时长没有任何数据到达（网络中断/后端重启/上游挂起），主动中止
const IDLE_TIMEOUT_MS = 90_000

/**
 * 调用后端 SSE 流式对话接口。
 * 事件协议：{ type: 'meta'|'reasoning'|'delta'|'error'|'done', ... }
 */
export async function streamChat(
  messages: ChatMessage[],
  handlers: StreamHandlers,
): Promise<void> {
  const controller = new AbortController()
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let timedOut = false

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, IDLE_TIMEOUT_MS)
  }

  try {
    resetIdleTimer()
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
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
      resetIdleTimer() // 每收到一段数据就重置空闲计时
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
          else if (evt.type === 'reasoning') handlers.onReasoning?.(evt.content ?? '')
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
    if (timedOut) {
      handlers.onError?.('响应超时（90 秒无数据），请检查网络后重试')
    } else if ((err as Error)?.name === 'AbortError') {
      // 请求被主动取消，不提示
    } else {
      handlers.onError?.(err instanceof Error ? err.message : '网络请求失败')
    }
    handlers.onDone?.()
  } finally {
    if (idleTimer) clearTimeout(idleTimer)
  }
}
