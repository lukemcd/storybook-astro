import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
// This file has been automatically migrated to valid ESM format by Storybook.
import { react, solid, preact, vue, svelte, alpinejs } from '@storybook/astro/integrations';

/** @type { import('@storybook/astro').StorybookConfig } */
const config = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-docs")
  ],
  framework: {
    name: "@storybook/astro",
    options: {
      integrations: [
        react({
          include: ['**/react/**']
        }),
        solid({
          include: ['**/solid/**']
        }),
        preact({
          include: ['**/preact/**']
        }),
        vue(),
        svelte(),
        alpinejs({
          entrypoint: './.storybook/alpine-entrypoint.js'
        })
      ]
    },
  },
};

export default config;

function getAbsolutePath(value) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
