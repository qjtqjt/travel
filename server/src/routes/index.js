import { Router } from 'express'
import chatRouter from './chat.js'
import { isMockMode } from '../llm/model.js'

const router = Router()

// GET /api/health —— 健康检查，同时标识当前 LLM 模式
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isMockMode() ? 'mock' : 'live',
  })
})

router.use('/chat', chatRouter)

export default router
