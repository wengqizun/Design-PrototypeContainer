import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router/index'
import '@/styles/design-token.css'
import '@/styles/style.css'

createApp(App).use(router).mount('#app')
