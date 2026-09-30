import type { CapacitorConfig } from '@capacitor/cli'

// Native iPhone app shell around the same web build and question database.
const config: CapacitorConfig = {
  appId: 'au.dkt.trainer',
  appName: 'DKT Trainer',
  webDir: 'dist',
}

export default config
