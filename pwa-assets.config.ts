import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Padded icons (maskable, apple-touch) use the logo background so no white frame appears.
const background = '#171717'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
})
