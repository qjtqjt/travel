import { Router } from 'express'
import { chatStream } from '../controllers/chatController.js'

const router = Router()

// POST /api/chat —— SSE 流式对话
router.post('/', chatStream)

export default router
