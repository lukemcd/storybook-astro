import { readFileSync } from 'node:fs';
import type { PluginOption } from 'vite';

/**
 * Vite plugin that patches Astro 6's client-side .astro file transforms for Storybook.
 *
 * In Astro 6, the client-side transform of .astro files produces a stub function that
 * throws "Astro components cannot be used in the browser" without setting the
 * `isAstroComponentFactory` marker. Storybook's renderer relies on this marker to detect
 * Astro components and route them to server-side rendering via the Container API.
 *
 * This plugin also preserves the component's scoped CSS by importing the style sub-modules
 * that the Astro Vite plugin exposes. Without this, the client-side stub would strip all
 * CSS since Astro 6 no longer includes style imports in client-side .astro transforms.
 */
export function vitePluginAstroComponentMarker(): PluginOption {
  return {
    name: 'storybook-astro-component-marker',
    enforce: 'post',

    transform(code: string, id: string) {
      // Only process main .astro modules (not sub-modules like ?astro&type=style)
      if (!id.endsWith('.astro')) return null;

      // Detect the Astro 6 client-side stub pattern
      if (!code.includes('Astro components cannot be used in the browser')) return null;

      const moduleId = id;

      // Count <style> blocks in the original source to generate CSS imports.
      // The Astro Vite plugin exposes each <style> block as a sub-module:
      //   Component.astro?astro&type=style&index=N&lang.css
      const styleImports = generateStyleImports(moduleId);

      return {
        code: `
${styleImports}
const __astro_component = () => {
  throw new Error('Astro components are rendered server-side by Storybook.');
};
__astro_component.isAstroComponentFactory = true;
__astro_component.moduleId = ${JSON.stringify(moduleId)};
export default __astro_component;
`,
        map: null,
      };
    },
  };
}

/**
 * Reads the original .astro source file and generates import statements
 * for each <style> block, using the Astro Vite plugin's sub-module convention.
 */
function generateStyleImports(filePath: string): string {
  try {
    const source = readFileSync(filePath, 'utf-8');
    const styleCount = countStyleBlocks(source);

    return Array.from({ length: styleCount }, (_, i) =>
      `import ${JSON.stringify(`${filePath}?astro&type=style&index=${i}&lang.css`)};`
    ).join('\n');
  } catch {
    return '';
  }
}

/**
 * Counts the number of top-level <style> blocks in an Astro component's source.
 * Only counts opening tags that are NOT inside the frontmatter fence (---).
 */
function countStyleBlocks(source: string): number {
  // Strip frontmatter
  const withoutFrontmatter = source.replace(/^---[\s\S]*?---/m, '');
  // Match <style> opening tags (with optional attributes)
  const matches = withoutFrontmatter.match(/<style(\s|>)/g);
  return matches ? matches.length : 0;
}
