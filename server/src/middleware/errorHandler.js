// 统一错误处理中间件（SSE 响应中的错误在控制器内处理，这里兜底普通 JSON 接口）
export function errorHandler(err, req, res, next) {
  console.error('[server error]', err)
  if (res.headersSent) return next(err)
  res.status(500).json({
    success: false,
    message: err.message || '服务器内部错误',
  })
}
