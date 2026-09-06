import { ChatOpenAI } from '@langchain/openai'
import { LLM_API_KEY, LLM_BASE_URL, LLM_MODEL } from '../config/env.js'

// 未配置 API Key 时进入 mock 模式（见 mockStream.js），前端可先行联调
export function isMockMode() {
  return !LLM_API_KEY
}

let model = null

// LangChain 模型实例（单例）。
// DeepSeek / 通义千问 / OpenAI 均兼容 OpenAI 协议，切换只需改 .env
export function getChatModel() {
  if (isMockMode()) {
    throw new Error('LLM_API_KEY 未配置，当前为 mock 模式')
  }
  if (!model) {
    model = new ChatOpenAI({
      apiKey: LLM_API_KEY,
      model: LLM_MODEL,
      temperature: 0.7,
      streaming: true, // 打字机效果
      // 推理模型默认先长时间"思考"才出正文；中转站支持该参数时关闭思考以降低首字延迟，
      // 不支持时会被自动忽略（实测返回 200）
      modelKwargs: {
        enable_thinking: false,
      },
      configuration: {
        baseURL: LLM_BASE_URL,
        // 中转站对 gzip 压缩的 SSE 响应会按压缩块缓冲（实测首字节 11s+、整段突发），
        // 显式要求不压缩，让思考/正文片段尽早流式到达
        defaultHeaders: {
          'Accept-Encoding': 'identity',
        },
        // 调试日志：打印每次 LLM 请求的模型/消息角色/工具数量（验证 Agent 循环用）
        fetch: async (url, init) => {
          try {
            const body = JSON.parse(init?.body ?? '{}')
            console.log(
              '[llm req] stream:', body.stream,
              '| model:', body.model,
              '| msgRoles:', JSON.stringify((body.messages ?? []).map((m) => m.role)),
              '| tools:', (body.tools ?? []).length,
            )
          } catch {
            // 非 JSON 请求体，忽略
          }
          return fetch(url, init)
        },
      },
    })
  }
  return model
}
