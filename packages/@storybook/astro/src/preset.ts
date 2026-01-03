import type { StorybookConfigVite, FrameworkOptions } from './types.ts';
import { vitePluginStorybookAstroMiddleware } from './viteStorybookAstroMiddlewarePlugin.ts';
import { viteStorybookRendererFallbackPlugin } from './viteStorybookRendererFallbackPlugin.ts';
import { mergeWithAstroConfig } from './vitePluginAstro.ts';

export const core = {
  builder: '@storybook/builder-vite',
  renderer: '@storybook/astro-renderer'
};

export const viteFinal: StorybookConfigVite['viteFinal'] = async (config, { presets }) => {
  const options = await presets.apply<FrameworkOptions>('frameworkOptions');
  
  // Keep Vite in development mode for HMR and dev features
  // We'll handle Astro's dev/prod split separately in our plugin
  if (!config.mode) {
    config.mode = 'development';
  }
  
  const { vitePlugin: storybookAstroMiddlewarePlugin, viteConfig } =
    await vitePluginStorybookAstroMiddleware(options);

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

  // First merge with Astro config to get Astro's transformation plugins
  const finalConfig = await mergeWithAstroConfig(config, options.integrations);
  
  // Then add our custom plugins AFTER Astro's plugins
  if (!finalConfig.plugins) {
    finalConfig.plugins = [];
  }

  // Add a plugin to ensure .astro files have isAstroComponentFactory set
  const ensureAstroComponentFactory = {
    name: 'ensure-astro-component-factory',
    enforce: 'post' as const,
    async transform(code: string, id: string) {
      // Only process .astro files after they've been transformed
      if (id.endsWith('.astro') && !id.includes('?')) {
        // Check if isAstroComponentFactory is already set
        if (code.includes('isAstroComponentFactory')) {
          return null;
        }
        
        // Read the original .astro file to extract styles
        const fs = await import('node:fs/promises');
        let styleContent = '';

        try {
          const astroSource = await fs.readFile(id, 'utf-8');
          // Extract content between <style> and </style> tags
          const styleMatch = astroSource.match(/<style[^>]*>([\s\S]*?)<\/style>/i);

          if (styleMatch) {
            styleContent = styleMatch[1];
          }
        } catch {
          // File read failed, continue without styles
        }
        
        // Create a mock component factory with inline styles
        const mockFactory = `
const AstroComponentFactory = function() {};
AstroComponentFactory.isAstroComponentFactory = true;
AstroComponentFactory.moduleId = ${JSON.stringify(id)};

// Inject styles into document head
if (typeof document !== 'undefined') {
  const styleId = 'astro-style-' + ${JSON.stringify(id)};
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = ${JSON.stringify(styleContent)};
    document.head.appendChild(style);
  }
}

export default AstroComponentFactory;
`;
        
        return { code: mockFactory, map: null };
      }

      return null;
    }
  };

  finalConfig.plugins.push(
    ensureAstroComponentFactory,
    storybookAstroMiddlewarePlugin,
    viteStorybookRendererFallbackPlugin(options.integrations),
    ...viteConfig.plugins
  );

  return finalConfig;
};
