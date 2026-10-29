<script lang="ts" setup>
import AppNavbar from '@M/app/components/AppNavbar.vue'
import AppFooter from '@M/app/components/AppFooter.vue'
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
</script>

<template>
  <!-- PrimeVue Toast（用于其他提示） -->
  <Toast position="top-right" />
  <AppNavbar />
  <main>
    <RouterView />
  </main>
  <AppFooter />
</template>

<style>
main {
  min-height: 100vh;
}
</style>
