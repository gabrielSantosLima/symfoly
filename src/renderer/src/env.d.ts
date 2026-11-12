/// <reference types="vite/client" />

import type { SymfolyApi } from '../../shared/api'

declare global {
  interface Window {
    symfoly: SymfolyApi
  }
}
