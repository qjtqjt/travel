// 从 LangChain Core 引入消息类型，用于构造对话历史（SystemMessage/HumanMessage/AIMessage/ToolMessage）
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages'
import { getChatModel, isMockMode } from '../llm/model.js'
import { getTravelTools, getToolMap } from '../llm/tools.js'
import { SYSTEM_PROMPT } from '../llm/prompts.js'
import { mockChatStream } from '../llm/mockStream.js'

// Agent 循环上限：防止模型反复调用工具死循环（一轮 = 一次模型生成 + 若干工具执行）
const MAX_AGENT_STEPS = 6

// SSE 事件下发辅助：前端按 JSON 事件解析
//   { type: 'meta',      mode }      —— 本次回复走的是 live 还是 mock
//   { type: 'reasoning', content }   —— 推理模型的思考过程片段（可不给）
//   { type: 'delta',     content }   —— 正文流式文本片段
//   { type: 'tool_call', id/name/args }  —— Agent 发起工具调用（args 为 JSON 字符串）
//   { type: 'tool_result', id/name/result } —— 工具执行结果（截断至 500 字符）
//   { type: 'error',     message }   —— 出错
//   { type: 'done' }                 —— 结束
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
      // Agent 循环（ReAct）：
      //   1. 模型流式生成，可能产生 tool_calls（请求调用工具）
      //   2. 有 tool_calls → 执行工具，结果以 ToolMessage 回填历史，回到第 1 步
      //   3. 无 tool_calls → 这轮就是最终回答，已随流式输出完毕，结束
      send({ type: 'meta', mode: 'live' })
      const modelWithTools = getChatModel().bindTools(getTravelTools())
      const toolMap = getToolMap()
      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        ...history.map((m) =>
          m.role === 'assistant' ? new AIMessage(m.content) : new HumanMessage(m.content),
        ),
      ]

      let steps = 0
      while (steps < MAX_AGENT_STEPS) {
        steps++
        const stream = await modelWithTools.stream(messages)
        // 累积流式 chunk：流结束后拿到聚合好的完整 tool_calls（含 id/name/解析后的 args）
        let finalChunk = null
        let toolChunkCount = 0
        for await (const chunk of stream) {
          if (aborted) return
          if (chunk.tool_call_chunks?.length) toolChunkCount++
          // 推理模型的思考过程在 reasoning_content 字段（LangChain 放入 additional_kwargs），
          // 单独通道下发给前端展示为"思考中"，避免思考阶段前端长时间无反馈
          const reasoning = chunk.additional_kwargs?.reasoning_content
          if (typeof reasoning === 'string' && reasoning) {
            send({ type: 'reasoning', content: reasoning })
          }
          const text = typeof chunk.content === 'string' ? chunk.content : ''
          if (text) send({ type: 'delta', content: text })
          finalChunk = finalChunk ? finalChunk.concat(chunk) : chunk
        }

        const toolCalls = finalChunk?.tool_calls ?? []
        console.log(
          '[agent] step', steps,
          'toolChunks:', toolChunkCount,
          'toolCalls:', JSON.stringify(toolCalls?.map((t) => t.name) ?? []),
          'msgTypes:', JSON.stringify(messages.map((m) => m.getType())),
        )
        if (!toolCalls.length) break

        // 回填"工具调用请求"消息：ToolMessage 必须按 tool_call_id 与之配对，否则下一轮请求会被 API 拒绝
        messages.push(
          new AIMessage({
            content: typeof finalChunk.content === 'string' ? finalChunk.content : '',
            tool_calls: toolCalls,
          }),
        )

        // 依次执行本轮所有工具调用，结果实时下发前端展示轨迹
        for (const tc of toolCalls) {
          if (aborted) return
          send({ type: 'tool_call', id: tc.id, name: tc.name, args: JSON.stringify(tc.args ?? {}) })
          let resultText
          try {
            const executor = toolMap[tc.name]
            if (!executor) throw new Error(`未知工具：${tc.name}`)
            const result = await executor.invoke(tc.args)
            resultText = typeof result === 'string' ? result : JSON.stringify(result)
          } catch (err) {
            // 工具报错不中断会话：把错误信息回填给模型，让它向用户解释或换个方式回答
            resultText = `工具执行失败：${err.message}`
          }
          send({ type: 'tool_result', id: tc.id, name: tc.name, result: resultText.slice(0, 500) })
          messages.push(new ToolMessage({ content: resultText, tool_call_id: tc.id, name: tc.name }))
        }
      }

      if (steps > MAX_AGENT_STEPS) {
        send({ type: 'error', message: `已达到最大工具调用轮数（${MAX_AGENT_STEPS}），回答可能不完整` })
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
