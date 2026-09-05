import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { VantResolver } from '@vant/auto-import-resolver'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 自动导入 Vant 的函数式 API，如 showToast / showDialog / showConfirmDialog 等
    AutoImport({
      resolvers: [VantResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    // 自动按需注册 Vant 组件（<van-*>）并引入对应样式
    Components({
      resolvers: [VantResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  server: {
    proxy: {
      // 开发期前端 /api 请求代理到 Express 后端，避免跨域
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
