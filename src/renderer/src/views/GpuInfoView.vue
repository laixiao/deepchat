<template>
  <div class="w-full h-full flex flex-col">
    <GPUInfo />
  </div>
</template>

<script setup lang="ts">
import GPUInfo from '@/components/GPUInfo.vue'
import { useI18n } from 'vue-i18n'
import { useTitle } from '@vueuse/core'
import { onMounted } from 'vue'

const { t } = useI18n()
const title = useTitle()

// 设置页面标题
onMounted(() => {
  title.value = t('routes.gpu')
})
</script>

<style scoped>
</style>