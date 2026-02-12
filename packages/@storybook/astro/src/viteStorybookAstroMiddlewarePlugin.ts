import { fileURLToPath } from 'node:url';
import { createServer, type PluginOption } from 'vite';
import type { RenderRequestMessage, RenderResponseMessage } from '@storybook/astro-renderer/types';
import type { FrameworkOptions } from './types.ts';
import type { Integration } from './integrations/index.ts';
import { viteAstroContainerRenderersPlugin } from './viteAstroContainerRenderersPlugin.ts';
import { vitePluginAstroFontsFallback } from './vitePluginAstroFontsFallback.ts';

export async function vitePluginStorybookAstroMiddleware(options: FrameworkOptions) {
  const viteServer = await createViteServer(options.integrations);

  const vitePlugin = {
    name: 'storybook-astro-middleware-plugin',
    async configureServer(server) {
      const filePath = fileURLToPath(new URL('./middleware', import.meta.url));
      const middleware = await viteServer.ssrLoadModule(filePath, {
        fixStacktrace: true
      });
      const handler = await middleware.handlerFactory(options.integrations);

      server.ws.on('astro:render:request', async (data: RenderRequestMessage['data']) => {
        try {
          const html = await handler(data);

          server.ws.send('astro:render:response', {
            html,
            id: data.id
          } satisfies RenderResponseMessage['data']);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : '';
          console.error('[storybook-astro] Render error:', errorMessage);
          if (errorStack) console.error(errorStack);
          server.ws.send('astro:render:response', {
            id: data.id,
            html:
              '<div style="background: #d73838; padding: 12px; color: #f0f0f0; font-family: monospace; border-radius: 4px">' +
              '<strong>Error rendering Astro component</strong><br/>' +
              '<pre style="white-space: pre-wrap; margin-top: 8px; font-size: 12px">' +
              errorMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
              '</pre></div>'
          } satisfies RenderResponseMessage['data']);
        }
      });
    }
  } satisfies PluginOption;

  // Create asset serving plugin
  const assetServingPlugin = {
    name: 'storybook-astro-assets',
    configureServer(server) {
      server.middlewares.use('/_image', (req, res, next) => {
        // Forward the request to the Astro vite server
        viteServer.middlewares.handle(req, res, (err) => {
          if (err) {
            console.error('Asset serving error:', err);
            next();
          }
        });
      });
    }
  };

  return {
    vitePlugin,
    viteConfig: {
      plugins: [
        viteServer.config.plugins.find((plugin) => plugin.name === 'vite:css'),
        viteServer.config.plugins.find((plugin) => plugin.name === 'vite:css-post'),
        assetServingPlugin
      ].filter(Boolean)
    }
  };
}

export async function createViteServer(integrations: Integration[]) {
  const { getViteConfig } = await import('astro/config');

  const config = await getViteConfig(
    {},
    {
      configFile: false,
      integrations: await Promise.all(
        integrations.map((integration) => integration.loadIntegration())
      )
    }
  )({ mode: 'development', command: 'serve' });

  const viteServer = await createServer({
    configFile: false,
    ...config,
    plugins: [
      ...(config.plugins?.filter(Boolean) ?? []),
      viteAstroContainerRenderersPlugin(integrations),
      vitePluginAstroFontsFallback()
    ]
  });

  return viteServer;
}
