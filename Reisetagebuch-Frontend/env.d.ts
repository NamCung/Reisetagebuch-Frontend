/// <reference types="vite/client" />

// Damit TypeScript .vue Dateien kennt
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
