import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import type { AstroIntegration } from "astro";

/**
 * Vite plugin that wraps CJS modules with ESM-compatible shims.
 *
 * Vite 6's ESM module runner cannot evaluate raw CommonJS modules that use
 * `module.exports` or `exports`. This plugin detects CJS modules in
 * node_modules during transform and wraps them so they work in ESM context.
 */
export function cjsInteropPlugin(): Plugin {
  return {
    name: 'cjs-esm-interop',
    enforce: 'pre',
    resolveId(id, importer, options) {
      // When Vite resolves a bare import in SSR/test context, redirect
      // packages that have ESM entry points to those entries instead of
      // their CJS "main" or "require" entries.
      if (id.startsWith('.') || id.startsWith('/') || id.startsWith('\0') || id.includes('node_modules')) return;

      // Find the package's node_modules directory
      const parts = id.split('/');
      const pkgName = id.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      const subpath = parts.slice(pkgName.split('/').length).join('/');

      // Only redirect the main entry (no subpath or common subpaths)
      if (subpath && !['server-renderer', 'server', 'client'].includes(subpath)) return;

      try {
        // Find the package.json
        const nmDir = join(process.cwd(), 'node_modules', pkgName);
        const pkgJsonPath = join(nmDir, 'package.json');
        if (!existsSync(pkgJsonPath)) return;

        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

        // Check for ESM entry in exports map
        const exportKey = subpath ? `./${subpath}` : '.';
        const exportEntry = pkgJson.exports?.[exportKey];
        if (exportEntry) {
          const importEntry = exportEntry.import;
          if (importEntry) {
            const esmPath = typeof importEntry === 'string'
              ? importEntry
              : importEntry.default || importEntry.node;
            if (esmPath) {
              const resolved = join(nmDir, esmPath);
              if (existsSync(resolved)) {
                return resolved;
              }
            }
          }
        }

        // Fallback: check the "module" field
        if (!subpath && pkgJson.module) {
          const resolved = join(nmDir, pkgJson.module);
          if (existsSync(resolved)) {
            return resolved;
          }
        }
      } catch {
        // Ignore resolution errors
      }
    },
    transform(code, id) {
      // Only transform node_modules files
      if (!id.includes('node_modules')) return;
      // Skip virtual modules
      if (id.startsWith('\0')) return;
      // Skip files that already use ESM exports
      if (/\bexport\s+(default|const|let|var|function|class|\{|\*)/.test(code)) return;
      // Only wrap files that use CJS patterns
      if (!code.includes('module.exports') && !code.includes('exports.')) return;

      const dirPath = id.substring(0, id.lastIndexOf('/'));
      const fileName = id;
      return {
        code: [
          'import { createRequire as __createRequire } from "module";',
          `var __require = __createRequire("file://${dirPath}/");`,
          'var module = { exports: {} };',
          'var exports = module.exports;',
          'function require(id) { return __require(id); }',
          `var __dirname = ${JSON.stringify(dirPath)};`,
          `var __filename = ${JSON.stringify(fileName)};`,
          code,
          'export default module.exports;',
        ].join('\n'),
        map: null,
      };
    }
  };
}

export function solidVitestPatch(): AstroIntegration {
  return {
    name: 'fix-solid',
    hooks: {
      'astro:config:done': ({ config }) => {
        const solidPlugin = config.vite.plugins?.find(
          (plugin) => plugin && 'name' in plugin && plugin.name === 'solid'
        ) as Plugin | undefined;

        if (solidPlugin) {
          const originalConfigEnvironment = solidPlugin.configEnvironment;

          if (typeof originalConfigEnvironment === 'function') {
            solidPlugin.configEnvironment = async (name, config, opts) => {
              await originalConfigEnvironment(name, config, opts);

              config.resolve ??= {};
              config.resolve.conditions = config.resolve?.conditions?.filter(
                (condition) => condition !== 'browser'
              );
            };
          }
        }
      }
    }
  };
}
