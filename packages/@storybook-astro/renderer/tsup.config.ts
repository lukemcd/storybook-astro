import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/preset.ts',
    'src/types.ts',
    'src/render.tsx',
    'src/entry-preview.ts',
    'src/index.ts',
  ],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  external: [
    'astro',
    'storybook',
    'storybook/internal/types',
    'react',
    'react-dom',
    '@storybook/react',
  ],
});
