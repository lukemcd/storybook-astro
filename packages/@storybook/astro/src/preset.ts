import type { StorybookConfigVite, FrameworkOptions } from './types.ts';
import { vitePluginStorybookAstroMiddleware } from './viteStorybookAstroMiddlewarePlugin.ts';
import { viteStorybookRendererFallbackPlugin } from './viteStorybookRendererFallbackPlugin.ts';
import { vitePluginAstroComponentMarker } from './vitePluginAstroComponentMarker.ts';
import { vitePluginAstroBuildPrerender } from './vitePluginAstroBuildPrerender.ts';
import { mergeWithAstroConfig } from './vitePluginAstro.ts';

export const core = {
  builder: '@storybook/builder-vite',
  renderer: '@storybook/astro-renderer'
};

export const viteFinal: StorybookConfigVite['viteFinal'] = async (config, { presets }) => {
  const options = await presets.apply<FrameworkOptions>('frameworkOptions');
  const { vitePlugin: storybookAstroMiddlewarePlugin, viteConfig } =
    await vitePluginStorybookAstroMiddleware(options);

  if (!config.plugins) {
    config.plugins = [];
  }

  config.plugins.push(
    storybookAstroMiddlewarePlugin,
    viteStorybookRendererFallbackPlugin(options.integrations),
    vitePluginAstroComponentMarker() as any,
    vitePluginAstroBuildPrerender(options.integrations) as any,
    ...viteConfig.plugins
  );

  // Add React/ReactDOM aliases for storybook-solidjs compatibility
  if (!config.resolve) {
    config.resolve = {};
  }
  if (!config.resolve.alias) {
    config.resolve.alias = {};
  }
  
  // Ensure React is available for storybook-solidjs
  const aliases = config.resolve.alias as Record<string, string>;

  if (!aliases['react']) {
    aliases['react'] = 'react';
  }
  if (!aliases['react-dom']) {
    aliases['react-dom'] = 'react-dom';
  }

  const finalConfig = await mergeWithAstroConfig(config, options.integrations);

  return finalConfig;
};
