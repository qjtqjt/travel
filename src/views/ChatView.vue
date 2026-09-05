<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChatStore } from '../stores/chat'

const route = useRoute()
const chatStore = useChatStore()

const input = ref('')
const scrollRef = ref<HTMLElement | null>(null)

const quickQuestions = [
  '国庆去成都玩 3 天怎么安排？',
  '三亚 5 天预算大概多少？',
  '第一次去北京有什么注意事项？',
]

const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

// 消息增长/流式更新时自动滚到底部
watch(
  () => chatStore.messages.map((m) => m.content).join('').length,
  scrollToBottom,
)

const send = (text?: string) => {
  const content = (text ?? input.value).trim()
  if (!content || chatStore.sending) return
  input.value = ''
  chatStore.send(content)
}

// 从首页快捷入口带入的问题，进入后自动发送
if (typeof route.query.q === 'string' && route.query.q) {
  send(route.query.q)
}
</script>

<template>
  <div class="chat-page">
    <!-- mock 模式提示条 -->
    <div v-if="chatStore.mode === 'mock'" class="mock-tip">
      <van-icon name="info-o" />
      当前为模拟回复，配置 DeepSeek Key 后接入真实 AI
    </div>

    <!-- 消息列表 -->
    <div ref="scrollRef" class="msg-list">
      <div
        v-for="(msg, i) in chatStore.messages"
        :key="i"
        class="msg-row"
        :class="msg.role === 'user' ? 'is-user' : 'is-ai'"
      >
        <div class="avatar">{{ msg.role === 'user' ? '🧳' : '🤖' }}</div>
        <div class="bubble">
          <template v-if="msg.content">{{ msg.content }}</template>
          <span v-else-if="chatStore.sending && i === chatStore.messages.length - 1" class="typing">
            <van-loading size="14px" type="spinner" /> 正在思考…
          </span>
        </div>
      </div>
    </div>

    <!-- 快捷提问 -->
    <div class="quick-bar">
      <span
        v-for="q in quickQuestions"
        :key="q"
        class="quick-chip"
        @click="send(q)"
      >
        {{ q }}
      </span>
    </div>

    <!-- 输入栏 -->
    <div class="input-bar">
      <van-field
        v-model="input"
        class="input-field"
        placeholder="输入你的旅行问题…"
        @keyup.enter="send()"
      />
      <van-button
        type="primary"
        size="small"
        :loading="chatStore.sending"
        @click="send()"
      >
        发送
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-bottom: calc(50px + env(safe-area-inset-bottom));
  background: #f7f8fa;
}

.mock-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12px;
  color: #ed6a0c;
  background: #fff7e8;
}

.msg-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px 12px;
}

.msg-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.msg-row.is-user {
  flex-direction: row-reverse;
}

.avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 1px 4px rgba(100, 120, 160, 0.12);
}

.bubble {
  max-width: 76%;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fff;
  color: #323233;
  box-shadow: 0 1px 4px rgba(100, 120, 160, 0.1);
}

.is-user .bubble {
  background: #1989fa;
  color: #fff;
}

.typing {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #969799;
}

.quick-bar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  overflow-x: auto;
  background: #f7f8fa;
}

.quick-chip {
  flex-shrink: 0;
  padding: 5px 12px;
  font-size: 12px;
  color: #1989fa;
  background: #eaf2ff;
  border-radius: 14px;
  cursor: pointer;
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-top: 1px solid #ebedf0;
}

.input-field {
  flex: 1;
  padding: 6px 12px;
  border-radius: 18px;
  background: #f2f3f5;
}
</style>
