import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatView.vue'),
      meta: { title: 'AI 对话' },
    },
    {
      path: '/trip',
      name: 'trip',
      component: () => import('../views/TripView.vue'),
      meta: { title: '我的行程' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { title: '我的' },
    },
  ],
})

router.afterEach((to) => {
  document.title = `${(to.meta.title as string) ?? ''} · AI 旅行助手`
})

export default router
