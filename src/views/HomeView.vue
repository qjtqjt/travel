<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const quickEntries = [
  { icon: 'location-o', text: '行程规划', query: '帮我规划一次3天的旅行' },
  { icon: 'fire-o', text: '热门目的地' },
  { icon: 'cloud-o', text: '天气查询' },
  { icon: 'balance-o', text: '预算估算', query: '帮我估算旅行预算' },
]

const destinations = [
  {
    name: '成都',
    desc: '美食与慢生活',
    img: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
      '成都宽窄巷子古街，红灯笼，青瓦白墙，旅游风景摄影',
    )}&image_size=landscape_4_3`,
  },
  {
    name: '三亚',
    desc: '海岛度假胜地',
    img: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
      '三亚亚龙湾热带海滩，碧海蓝天，椰林沙滩，旅游风景摄影',
    )}&image_size=landscape_4_3`,
  },
  {
    name: '西安',
    desc: '千年古都',
    img: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
      '西安古城墙与大雁塔夜景，唐代风格，旅游风景摄影',
    )}&image_size=landscape_4_3`,
  },
]

const goChat = (query?: string) => {
  router.push({ path: '/chat', query: query ? { q: query } : undefined })
}

const comingSoon = () => {
  showToast('功能即将上线，敬请期待')
}
</script>

<template>
  <div class="page home-page">
    <van-search
      class="search"
      placeholder="想去哪里？问问 AI 旅行助手"
      readonly
      shape="round"
      @click="goChat()"
    />

    <div class="content">
      <!-- Banner -->
      <div class="banner" @click="goChat()">
        <div class="banner-text">
          <h2>AI 帮你做旅行攻略</h2>
          <p>行程 · 美食 · 预算 · 天气，一键规划</p>
        </div>
        <van-icon name="chat" class="banner-icon" />
      </div>

      <!-- 快捷入口 -->
      <van-grid :column-num="4" :border="false" class="quick-grid">
        <van-grid-item
          v-for="item in quickEntries"
          :key="item.text"
          :icon="item.icon"
          :text="item.text"
          @click="item.query ? goChat(item.query) : comingSoon()"
        />
      </van-grid>

      <!-- 热门目的地 -->
      <h3 class="section-title">热门目的地</h3>
      <div class="dest-list">
        <div
          v-for="dest in destinations"
          :key="dest.name"
          class="dest-card"
          @click="goChat(`推荐一下${dest.name}的玩法`)"
        >
          <van-image :src="dest.img" fit="cover" width="100%" height="120" radius="8" />
          <div class="dest-info">
            <span class="dest-name">{{ dest.name }}</span>
            <span class="dest-desc">{{ dest.desc }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
}

.search {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, #e8f1ff 0%, #f7f8fa 100%);
}

.content {
  padding: 0 12px;
}

.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 18px;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #3b7bff 0%, #1989fa 100%);
}

.banner-text h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.banner-text p {
  margin: 0;
  font-size: 12px;
  opacity: 0.9;
}

.banner-icon {
  font-size: 40px;
  opacity: 0.85;
}

.quick-grid {
  margin-top: 12px;
  border-radius: 12px;
  overflow: hidden;
}

.section-title {
  margin: 18px 4px 10px;
  font-size: 16px;
  color: #323233;
}

.dest-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dest-card {
  background: #fff;
  border-radius: 10px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(100, 120, 160, 0.08);
}

.dest-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 4px 4px;
}

.dest-name {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}

.dest-desc {
  font-size: 12px;
  color: #969799;
}
</style>
