// mock 模式：模拟大模型流式输出（打字机效果），用于无 API Key 时的前后端联调

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function buildReply(userInput) {
  return [
    `收到你的问题：「${userInput}」`,
    '',
    '你好！我是你的 AI 旅行助手。（当前为 mock 模拟回复，在 server/.env 配置 LLM_API_KEY 后将接入 DeepSeek 真实大模型）',
    '',
    '关于你的行程，我可以帮你：',
    '1. 按天规划路线和交通安排',
    '2. 推荐必去景点与当地美食',
    '3. 估算旅行预算和住宿区域',
    '4. 提醒天气情况与行前注意事项',
    '',
    '试试告诉我更完整的信息，例如：「国庆假期去成都玩 3 天，预算 3000，喜欢美食和大熊猫」。',
  ].join('\n')
}

// async generator：逐段产出文本，与 LangChain model.stream 的消费方式一致
export async function* mockChatStream(userInput) {
  const reply = buildReply(userInput)
  // 按 2~4 个字符切分，模拟真实流式节奏
  const chunks = reply.match(/.{1,3}/gs) || []
  for (const chunk of chunks) {
    await delay(40)
    yield chunk
  }
}
