import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import LoginCallbackView from '../views/LoginCallbackView.vue'
import { oktaAuth } from '../okta'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/login/callback',
      name: 'callback',
      component: LoginCallbackView,
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/reisetagebuch',
      name: 'diary',
      component: () => import('../views/DiaryView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reiseplanung',
      name: 'trip-planner',
      component: () => import('../views/TripPlannerView.vue'),
      meta: { requiresAuth: true }
    },
  ],
})


router.beforeEach(async (to, _from) => {
  if (to.meta.requiresAuth) {
    const eingeloggt = await oktaAuth.isAuthenticated()
    if (!eingeloggt) {
      return '/login'
    }
  }
  return true
})

export default router
