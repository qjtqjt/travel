import express from 'express'
import cors from 'cors'
import { PORT } from './config/env.js'
import { isMockMode } from './llm/model.js'
import apiRouter from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.use('/api', apiRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  const mode = isMockMode() ? 'mock（未配置 LLM_API_KEY）' : 'live（DeepSeek）'
  console.log(`travel-ai server running at http://localhost:${PORT}`)
  console.log(`LLM mode: ${mode}`)
})
