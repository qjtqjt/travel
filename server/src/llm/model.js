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
      streaming: true,
      configuration: {
        baseURL: LLM_BASE_URL,
      },
    })
  }
  return model
}
