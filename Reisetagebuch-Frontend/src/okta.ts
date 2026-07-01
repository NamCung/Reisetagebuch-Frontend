import { OktaAuth } from '@okta/okta-auth-js'

const OKTA_BASE_URL = import.meta.env.VITE_OKTA_BASE_URL as string
const OKTA_CLIENT_ID = import.meta.env.VITE_OKTA_CLIENT_ID as string

const oktaAuth = new OktaAuth({
  issuer: OKTA_BASE_URL + '/oauth2/default',
  clientId: OKTA_CLIENT_ID,
  redirectUri: window.location.origin + '/login/callback',
  scopes: ['openid', 'profile', 'email'],
  pkce: true,
})

export { oktaAuth }
