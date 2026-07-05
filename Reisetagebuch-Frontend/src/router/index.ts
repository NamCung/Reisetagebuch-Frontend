import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

/* Einfacher Router ohne Login/Auth */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/reisetagebuch',
      name: 'diary',
      component: () => import('../views/DiaryView.vue'),
    },
    {
      path: '/reiseplanung',
      name: 'trip-planner',
      component: () => import('../views/TripPlannerView.vue'),
    },
  ],
})

export default router
