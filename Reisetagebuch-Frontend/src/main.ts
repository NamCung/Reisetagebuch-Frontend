import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index'
import axios from 'axios'

// Token bei jedem Axios-Request automatisch mitsenden
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

createApp(App).use(router).mount('#app')
