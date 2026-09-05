# travel

旅游景点智能推荐 Agent 全栈

## 技术栈

- 前端：Vue3 + Vite + TypeScript + Vant4 + Pinia + vue-router，AI 对话基于 SSE 流式输出
- 后端：Node.js + Express + LangChain.js，OpenAI 兼容协议（默认 DeepSeek），未配置 API Key 时自动 mock 模式

## 本地开发

```bash
# 前端（默认 5173 端口，/api 已代理到 3000）
npm install
npm run dev

# 后端（3000 端口）
cd server
npm install
cp .env.example .env   # 按需填入 LLM_API_KEY
npm run dev
```
