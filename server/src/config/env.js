import dotenv from 'dotenv'

dotenv.config()

export const PORT = Number(process.env.PORT) || 3000

// DeepSeek（OpenAI 兼容协议）相关配置
export const LLM_API_KEY = process.env.LLM_API_KEY || ''
export const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1'
export const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-chat'
