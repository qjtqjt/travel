<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const menus = [
  { icon: 'orders-o', label: '我的行程', to: '/trip' },
  { icon: 'chat-o', label: '对话历史', to: '/chat' },
  { icon: 'star-o', label: '我的收藏' },
  { icon: 'setting-o', label: '设置' },
  { icon: 'info-o', label: '关于我们' },
]

const onClick = (to?: string) => {
  if (to) router.push(to)
  else showToast('功能即将上线，敬请期待')
}

const login = () => {
  showToast('登录功能即将上线')
}
</script>

<template>
  <div class="page profile-page">
    <!-- 用户信息头部 -->
    <div class="profile-header">
      <div class="avatar">🧳</div>
      <div class="user-info">
        <div class="nickname">游客用户</div>
        <div class="sub">登录后同步行程与对话记录</div>
      </div>
      <van-button size="small" plain color="#fff" @click="login">登录</van-button>
    </div>

    <!-- 功能菜单 -->
    <van-cell-group inset class="menu-group">
      <van-cell
        v-for="item in menus"
        :key="item.label"
        :title="item.label"
        :icon="item.icon"
        is-link
        @click="onClick(item.to)"
      />
    </van-cell-group>
  </div>
</template>

<style scoped>
.profile-page {
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 28px 20px;
  color: #fff;
  background: linear-gradient(135deg, #3b7bff 0%, #1989fa 100%);
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.user-info {
  flex: 1;
}

.nickname {
  font-size: 18px;
  font-weight: 600;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.85;
}

.menu-group {
  margin-top: 14px;
  border-radius: 10px;
  overflow: hidden;
}
</style>
