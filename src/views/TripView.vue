<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Trip {
  id: number
  title: string
  date: string
  desc: string
  budget: string
  tags: string[]
}

// mock 行程数据（后续接后端接口替换）
const trips = ref<Trip[]>([
  {
    id: 1,
    title: '成都 3 日美食之旅',
    date: '2026-10-01 ~ 10-03',
    desc: '宽窄巷子 · 大熊猫基地 · 锦里古街 · 火锅',
    budget: '预算 ¥2500/人',
    tags: ['国庆', '美食'],
  },
  {
    id: 2,
    title: '三亚 5 日海岛度假',
    date: '出行时间待定',
    desc: '亚龙湾 · 蜈支洲岛 · 天涯海角',
    budget: '预估 ¥5000/人',
    tags: ['海岛', '待规划'],
  },
])

const startPlan = () => {
  router.push('/chat')
}

const notReady = () => {
  showToast('行程详情即将上线')
}
</script>

<template>
  <div class="page trip-page">
    <div class="header">
      <h2>我的行程</h2>
      <van-button type="primary" size="small" icon="plus" @click="startPlan">
        AI 生成行程
      </van-button>
    </div>

    <van-empty v-if="trips.length === 0" description="还没有行程，去问问 AI 吧">
      <van-button type="primary" round size="small" @click="startPlan">开始规划</van-button>
    </van-empty>

    <div v-else class="trip-list">
      <van-card
        v-for="trip in trips"
        :key="trip.id"
        :title="trip.title"
        :desc="trip.desc"
        :tag="trip.tags[0]"
        price=""
      >
        <template #tags>
          <van-tag v-for="tag in trip.tags" :key="tag" plain type="primary" class="trip-tag">
            {{ tag }}
          </van-tag>
        </template>
        <template #footer>
          <div class="card-footer">
            <span class="budget">{{ trip.budget }}</span>
            <span class="date">{{ trip.date }}</span>
          </div>
          <van-button size="mini" plain type="primary" @click="notReady">查看详情</van-button>
          <van-button size="mini" type="primary" @click="startPlan">继续规划</van-button>
        </template>
      </van-card>
    </div>
  </div>
</template>

<style scoped>
.trip-page {
  padding: 0 12px calc(60px + env(safe-area-inset-bottom));
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 4px;
}

.header h2 {
  margin: 0;
  font-size: 18px;
  color: #323233;
}

.trip-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trip-list :deep(.van-card) {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(100, 120, 160, 0.08);
}

.trip-tag {
  margin-right: 6px;
}

.card-footer {
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
  font-size: 12px;
}

.budget {
  color: #ee0a24;
  font-weight: 600;
}

.date {
  color: #969799;
  margin-top: 2px;
}
</style>
