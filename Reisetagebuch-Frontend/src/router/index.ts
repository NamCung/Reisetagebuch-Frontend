import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import DiaryView from '../views/DiaryView.vue'
import TripPlannerView from '../views/TripPlannerView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeView, meta: { requiresAuth: true } },
    { path: '/login', component: LoginView },
    { path: '/reisetagebuch', component: DiaryView, meta: { requiresAuth: true } },
    { path: '/reiseplanung', component: TripPlannerView, meta: { requiresAuth: true } },
  ]
})

// Router Guard: prüft ob Token vorhanden
router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) {
    return '/login'
  }
})

export default router
