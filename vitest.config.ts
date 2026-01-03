/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';
import react from '@astrojs/react';
import solid from '@astrojs/solid-js';
import vue from '@astrojs/vue';
import preact from '@astrojs/preact';
import svelte from '@astrojs/svelte';
import alpinejs from '@astrojs/alpinejs';
import { solidVitestPatch } from './lib/test-utils';

const vitestConfig = defineConfig({
  mode: 'test',
  test: {
    name: 'storybook',
    environment: 'happy-dom',
    setupFiles: ['.storybook/vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx']
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default getViteConfig(vitestConfig as any, {
  // Don't read astro.config.mjs
  configFile: false,
  // Tests specific astro config
  integrations: [
    react({
      include: ['**/react/*']
    }),
    solid({
      include: ['**/solid/*']
    }),
    preact({
      include: ['**/preact/*']
    }),
    vue(),
    svelte({ extensions: ['.svelte'] }),
    alpinejs(),
    solidVitestPatch()
  ]
});
