import type Lenis from 'lenis'

declare global {
  interface Window {
    __sdhsLenis?: {
      lenis: Lenis
      rafId: number
    }
  }
}
