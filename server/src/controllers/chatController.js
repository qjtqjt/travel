import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { getChatModel, isMockMode } from '../llm/model.js'
import { SYSTEM_PROMPT } from '../llm/prompts.js'
import { mockChatStream } from '../llm/mockStream.js'

// SSE 事件下发辅助：前端按 JSON 事件解析
//   { type: 'meta',  mode }      —— 本次回复走的是 live 还是 mock
//   { type: 'delta', content }   —— 流式文本片段
//   { type: 'error', message }   —— 出错
//   { type: 'done' }             —— 结束
function sseSender(res) {
  return (event) => res.write(`data: ${JSON.stringify(event)}\n\n`)
}

// POST /api/chat  body: { messages: [{ role: 'user' | 'assistant', content: string }] }
export async function chatStream(req, res) {
  const send = sseSender(res)

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // 禁用反向代理缓冲，保证流式实时下发
  })

  // 监听客户端提前断开（注意：Node 16+ 中 req 的 'close' 在请求体读完后即触发，
  // 必须用 res 的 'close' 并以 writableEnded 区分"正常结束"与"异常断开"）
  let aborted = false
  res.on('close', () => {
    if (!res.writableEnded) aborted = true
  })

  try {
    const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : []
    const history = rawMessages.filter(
      (m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'),
    )
    const lastUser = [...history].reverse().find((m) => m.role === 'user')

    if (!lastUser) {
      send({ type: 'error', message: 'messages 中缺少有效的用户消息' })
      send({ type: 'done' })
      return res.end()
    }

    if (isMockMode()) {
      send({ type: 'meta', mode: 'mock' })
      for await (const chunk of mockChatStream(lastUser.content)) {
        if (aborted) return
        send({ type: 'delta', content: chunk })
      }
    } else {
      send({ type: 'meta', mode: 'live' })
      const model = getChatModel()
      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        ...history.map((m) =>
          m.role === 'assistant' ? new AIMessage(m.content) : new HumanMessage(m.content),
        ),
      ]
      const stream = await model.stream(messages)
      for await (const chunk of stream) {
        if (aborted) return
        const text = typeof chunk.content === 'string' ? chunk.content : ''
        if (text) send({ type: 'delta', content: text })
      }
    }

    send({ type: 'done' })
    res.end()
  } catch (err) {
    console.error('[chat] error:', err)
    if (!aborted) {
      send({ type: 'error', message: err.message || '对话服务异常' })
      send({ type: 'done' })
      res.end()
    }
  }
}
