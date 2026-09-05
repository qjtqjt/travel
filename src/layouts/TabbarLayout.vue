<script setup lang="ts">
const tabs = [
  { to: '/', icon: 'home-o', label: '首页' },
  { to: '/chat', icon: 'chat-o', label: 'AI 对话' },
  { to: '/trip', icon: 'orders-o', label: '行程' },
  { to: '/profile', icon: 'user-o', label: '我的' },
]
</script>

<template>
  <div class="layout">
    <router-view />
    <van-tabbar route safe-area-inset-bottom>
      <van-tabbar-item v-for="tab in tabs" :key="tab.to" :to="tab.to" :icon="tab.icon">
        {{ tab.label }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100%;
}
</style>
