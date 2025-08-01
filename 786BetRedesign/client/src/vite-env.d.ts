/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_STRIPE_PUBLISHABLE_KEY: string
    // add more env vars here as needed
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  