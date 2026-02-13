# AGENTS.md - AI Development Guide

This document provides guidance for AI assistants working on the `@storybook/astro` project. It covers architecture, conventions, and common development tasks.

## Project Overview

**Goal**: Enable Astro components to work in Storybook by implementing a custom Storybook framework integration.

**Status**: Experimental - not production-ready

**Key Technologies**:
- Astro 6 beta (using Container API for SSR)
- Storybook 10+
- Vite 6+ (7.x supported)
- TypeScript/JavaScript (ES modules only)
- Multiple UI framework integrations (React, Vue, Svelte, Preact, Solid, Alpine.js)

## Architecture

### Two-Package System

#### 1. `packages/@storybook/astro` (Server/Framework)
**Purpose**: Storybook framework definition and server-side rendering

**Key Responsibilities**:
- Configure Vite to handle Astro components
- Set up Astro Container for server-side rendering
- Manage framework integrations (React, Vue, etc.)
- Handle module resolution for Astro runtime

**Important Files**:
- `src/preset.ts` - Framework configuration, exports `viteFinal` and `core` config
- `src/middleware.ts` - Creates Astro Container, exports `handlerFactory`, includes `patchCreateAstroCompat` for Astro compiler v2/v3 bridging
- `src/viteStorybookAstroMiddlewarePlugin.ts` - Vite plugin that handles render requests via HMR
- `src/vitePluginAstroComponentMarker.ts` - Patches Astro 6's client-side `.astro` stubs to set `isAstroComponentFactory` and preserve scoped CSS imports
- `src/vitePluginAstroFontsFallback.ts` - Stubs Astro 6's font virtual modules (`virtual:astro:assets/fonts/*`)
- `src/portable-stories.ts` - `composeStories`/`composeStory` for testing outside Storybook
- `src/integrations/` - Integration adapters for each supported framework

#### 2. `packages/@storybook/astro-renderer` (Client)
**Purpose**: Client-side rendering logic in Storybook's preview iframe

**Key Responsibilities**:
- Render components in Storybook canvas
- Send render requests to server middleware
- Handle framework fallback rendering
- Manage styles and script hydration

**Important Files**:
- `src/render.tsx` - Exports `render()` and `renderToCanvas()` functions
- `src/preset.ts` - Defines preview annotations

### Data Flow

**Astro components** (server-side rendered):
```
Story File (.stories.jsx)
    ↓
@storybook/astro-renderer (render.tsx)
    ↓ [detects isAstroComponentFactory flag]
    ↓ [sends render request via Vite HMR]
@storybook/astro (middleware.ts)
    ↓ [patchCreateAstroCompat wraps component]
    ↓ [Astro Container API renders to HTML]
@storybook/astro-renderer (render.tsx)
    ↓ [injects HTML into canvas]
    ↓ [applies scoped styles, executes client scripts]
Storybook Canvas (rendered component)
```

**Framework components** (React, Solid, Vue, etc. — delegated):
```
Story File (.stories.jsx)
    ↓
@storybook/astro-renderer (render.tsx)
    ↓ [checks parameters.renderer]
    ↓ [delegates to framework renderToCanvas BEFORE calling storyFn()]
Framework Renderer (e.g. @storybook/react-vite)
    ↓ [manages its own reactive root]
Storybook Canvas (rendered component)
```

## Code Conventions

### General
- **Module System**: ES modules only (`"type": "module"` in package.json)
- **File Extensions**: Use `.ts`, `.tsx`, `.js` explicitly in imports
- **Package Manager**: Yarn 4+ (Berry) with workspaces
- **Workspace Protocol**: Use `workspace:*` for internal package dependencies

### TypeScript
- TypeScript is used but loosely typed in many places
- `$FIXME` type is used as a temporary `any` replacement
- Type definitions are in `types.ts` files in each package

### Naming
- Framework integration files: `packages/@storybook/astro/src/integrations/[framework].ts`
- Vite plugins: Prefixed with `vite` or `vitePlugin`
- Virtual modules: Named like `virtual:astro-container-renderers`

### Imports
```typescript
// Good - explicit extension
import { handlerFactory } from './middleware.ts';

// Bad - no extension
import { handlerFactory } from './middleware';
```

## Common Development Tasks

### Adding a New Framework Integration

1. Create integration file: `packages/@storybook/astro/src/integrations/[framework].ts`
2. Extend `BaseIntegration` class from `base.ts`
3. Implement required methods:
   - `getAstroRenderer()` - Returns Astro integration
   - `getVitePlugins()` - Returns Vite plugins for the framework
   - `getStorybookRenderer()` - Returns Storybook renderer name
   - `resolveClient()` - Handles client-side module resolution
4. Export factory function in `integrations/index.ts`
5. Add to `.storybook/main.js` configuration example

**Template**:
```typescript
import { BaseIntegration, type BaseOptions } from './base.ts';

export type Options = BaseOptions & {
  // Framework-specific options
};

export class FrameworkIntegration extends BaseIntegration {
  constructor(options?: Options) {
    super(options);
  }

  override getAstroRenderer() {
    // Return Astro framework integration
    return frameworkIntegration(/* config */);
  }

  override getVitePlugins() {
    // Return Vite plugins needed for this framework
    return [frameworkVitePlugin(/* config */)];
  }

  override getStorybookRenderer() {
    return '@storybook/framework-name';
  }

  override resolveClient(specifier: string) {
    // Handle client-side module resolution if needed
    return null;
  }
}
```

### Modifying the Render Pipeline

**Server-side (middleware.ts)**:
- Modify `handlerFactory` to change how Astro Container is created
- Update `handler` function to change render logic
- `patchCreateAstroCompat` bridges the Astro compiler v2 (3-arg `createAstro`) and v3/v6 (2-arg) calling conventions — modify if the Astro compiler changes again
- Container configuration includes custom `resolve` function for module resolution

**Client-side (render.tsx)**:
- `renderToCanvas` delegates to framework renderers BEFORE calling `storyFn()` — this ordering is critical for frameworks like Solid that manage their own reactive roots
- Modify `renderAstroComponent` to change request/response handling
- `applyAstroStyles` handles Vite's style injection for Astro components
- `activateScriptTags` re-executes `<script>` tags after HTML injection for hydration

### Debugging

**Enable Verbose Logging**:
```javascript
// Add console.log statements in:
// - packages/@storybook/astro/src/middleware.ts (server rendering)
// - packages/@storybook/astro-renderer/src/render.tsx (client rendering)
```

**Check Vite HMR Communication**:
```javascript
// In browser console:
import.meta.hot?.on('astro:render:response', (data) => {
  console.log('Render response:', data);
});
```

**Inspect Astro Container**:
```typescript
// In middleware.ts handlerFactory:
const container = await AstroContainer.create({ /* config */ });
console.log('Container created:', container);
```

### Testing

**Automated Testing**: Run with `yarn test`
- Uses Vitest with happy-dom environment
- Config: `vitest.config.ts`
- Test files use `.test.ts` extension
- All 17 test suites (36 tests) pass, covering Astro, React, Vue, Svelte, Preact, Solid, and Alpine.js

**Manual Testing**: Run with `yarn storybook`
- Example stories in `src/components/*/`
- Test different framework integrations
- Check browser console for errors

#### Testing Architecture

**Portable Stories (`composeStories`)**:
The project includes a complete `composeStories` implementation in `packages/@storybook/astro/src/portable-stories.ts` that enables testing Storybook stories outside the Storybook environment.

```typescript
// Available functions
import { composeStories, composeStory, setProjectAnnotations } from '@storybook/astro';

// Example usage
const { Default, Highlighted } = composeStories(stories);
```

**Test Utilities**:
All test utilities are available from `@storybook/astro/testing` (`packages/@storybook/astro/src/testing.ts`):

- `testStoryComposition(name, story)` - Verifies story can be imported and composed
- `testStoryRenders(name, story)` - Validates story renders successfully in Storybook context
- `cjsInteropPlugin()` - Vite plugin that wraps CJS modules for Vite 6's ESM module runner

**Vitest Config Plugins**:
The `vitest.config.ts` loads two custom plugins:
- `cjsInteropPlugin()` — Auto-detects CJS modules in `node_modules` and wraps them with ESM-compatible shims (`module`, `exports`, `require`, `__dirname`, `__filename`). Required because Vite 6's ESM runner cannot evaluate raw CJS.
- `vitePluginAstroComponentMarker()` — Same plugin used in Storybook, ensures `.astro` files have `isAstroComponentFactory` set in the test environment.

**Solid Testing Limitation**:
Solid components render correctly in Storybook's browser but have an SSR/client compilation mismatch in Vitest. The Vitest config uses a non-recursive glob (`**/solid/*.tsx`) so `vite-plugin-solid` does not compile nested component files. Without this, Vitest's happy-dom environment compiles Solid in client mode (calling `template()`), but the runtime resolves to `server.js` where `template` is aliased to `notSup()`. Composition tests pass; actual Solid rendering is validated in the browser.

**Test Structure**:
All component tests follow a uniform pattern:
```typescript
import { composeStories } from '@storybook/astro';
import { testStoryRenders, testStoryComposition } from '@storybook/astro/testing';
import * as stories from './Component.stories.jsx';

const { Default } = composeStories(stories);

// Test basic composition
testStoryComposition('Default', Default);

// Test rendering capability
testStoryRenders('Component Default', Default);
```

### Developing Portable Stories

**Implementation Location**: `packages/@storybook/astro/src/portable-stories.ts`

The portable stories implementation provides testing capabilities outside Storybook. Key components:

- **Render Function**: Mimics the main renderer's behavior for testing — detects Astro components via `isAstroComponentFactory`, delegates framework components by `parameters.renderer`
- **Storybook API Compatibility**: Matches the API of other framework portable stories implementations
- **brokenRenderers**: Currently an empty array `[]`. If a framework integration breaks, add its name here to produce clear test failures instead of cryptic errors

**Exports**:
- `composeStories(storiesImport, projectAnnotations?)` - Compose all stories from import
- `composeStory(story, componentAnnotations, projectAnnotations?, exportsName?)` - Compose single story
- `setProjectAnnotations(annotations)` - Set global config for tests

### Building

The project uses a development workflow without compilation:
- Packages are consumed directly from source via `workspace:*` protocol
- No build step required for development
- Storybook reads TypeScript files directly via Vite

## Key Concepts

### Astro Container API
- Server-side rendering without a full Astro build
- Created in `middleware.ts` via `AstroContainer.create()`
- Renders components to HTML string: `container.renderToString(Component, { props, slots })`

### Virtual Modules
```typescript
// Defined in Vite plugins
'virtual:astro-container-renderers' // Provides addRenderers function
'virtual:storybook-renderer-fallback' // Provides framework renderers
```

### Component Detection
Astro components are identified by:
```typescript
if (Component.isAstroComponentFactory) {
  // This is an Astro component — route to server-side rendering
}
```

**Astro 6 note**: The client-side Vite transform of `.astro` files in Astro 6 no longer sets this flag. The `vitePluginAstroComponentMarker` plugin detects the Astro 6 stub pattern (which throws "Astro components cannot be used in the browser") and replaces it with a stub that sets `isAstroComponentFactory = true`, preserves `moduleId`, and imports scoped style sub-modules.

### Framework Fallback
Stories can specify a renderer to bypass Astro rendering:
```javascript
export const MyStory = {
  parameters: {
    renderer: 'react', // Uses React renderer directly
  },
};
```

## Common Issues

### Module Resolution Errors
**Symptom**: `Cannot find module` or `Failed to resolve import`
**Fix**: Check that file extensions are included in imports and that virtual modules are properly configured in Vite plugins. For Astro 6 font modules, check `vitePluginAstroFontsFallback.ts`.

### Styles Not Applying
**Symptom**: Component renders but styles are missing
**Fix**: In Astro 6, scoped CSS is loaded via style sub-module imports generated by `vitePluginAstroComponentMarker`. Check that the plugin is detecting `<style>` blocks in the `.astro` source and generating the correct `?astro&type=style&index=N&lang.css` imports. Also check `applyAstroStyles()` in `render.tsx`.

### Props Not Passing Through
**Symptom**: Component renders but props are undefined or wrong
**Fix**: Check `patchCreateAstroCompat()` in `middleware.ts`. The Astro compiler v2 calls `createAstro($$Astro, $$props, $$slots)` (3 args) but the Astro 6 runtime expects `createAstro($$props, $$slots)` (2 args). The wrapper detects and bridges this.

### Framework Components Render Blank or Show React Elements
**Symptom**: A framework component (e.g. Solid) shows nothing or logs "Unrecognized value. Skipped inserting {$$typeof: Symbol(react.transitional.element)}"
**Fix**: Check that the framework's `include` glob in `.storybook/main.js` uses recursive `**` patterns (e.g. `**/solid/**` not `**/solid/*`). A non-recursive glob won't match files in subdirectories, causing them to be compiled by `@vitejs/plugin-react` instead of the correct framework plugin.

### HMR Not Working
**Symptom**: Changes don't reflect without full reload
**Fix**: Verify Vite HMR event listeners are registered in `render.tsx` init function

### Framework Integration Not Working
**Symptom**: Framework components don't render or throw errors
**Fix**: 
1. Check that integration is added to `.storybook/main.js` with recursive `include` globs
2. Verify Vite plugins are returned from `getVitePlugins()`
3. Ensure Astro renderer is configured correctly in `getAstroRenderer()`
4. In `render.tsx`, framework renderers are delegated to BEFORE `storyFn()` — if this order is wrong, reactive frameworks will have orphaned effects

### Alpine.js Not Starting
**Symptom**: Alpine.js components are not interactive
**Fix**: Check that Alpine is started in the init function of `render.tsx` and that entrypoint file exists

### CJS Modules Failing in Tests
**Symptom**: `SyntaxError: Cannot use import statement` or `module is not defined` in Vitest
**Fix**: The `cjsInteropPlugin()` from `@storybook/astro/testing` wraps CJS modules for Vite 6's ESM runner. If a new CJS dependency causes failures, check that the plugin's detection heuristics (`module.exports`/`exports.` patterns) match the module's format.

## Development Workflow

1. **Start Storybook**: `yarn storybook`
2. **Make Changes**: Edit files in `packages/@storybook/*/src/`
3. **Test**: Changes hot-reload automatically (most of the time)
4. **Verify**: Check browser console and Storybook UI for errors
5. **Run Tests**: `yarn test` before committing

## External Resources

- [Storybook Framework API](https://storybook.js.org/docs/configure/integration/frameworks)
- [Astro Container API Docs](https://docs.astro.build/en/reference/container-reference/)
- [Vite Plugin API](https://vitejs.dev/guide/api-plugin.html)
- [Original Feature Request](https://github.com/storybookjs/storybook/issues/18356)

## Getting Help

When asking for help from AI or humans:
1. Include the full error message and stack trace
2. Specify which package the issue is in (`@storybook/astro` vs `@storybook/astro-renderer`)
3. Mention what you were trying to accomplish
4. Include relevant code snippets with file paths
5. Note whether the issue is server-side (Node/Vite) or client-side (browser)

## Astro 6 Compatibility Layers

These are the key adaptations made for Astro 6 beta. If Astro's APIs change in future releases, these are the places to update:

1. **`vitePluginAstroComponentMarker.ts`** — Detects the Astro 6 client-side stub pattern and replaces it. If Astro changes the stub text or reintroduces `isAstroComponentFactory`, this plugin may need updating or removal.
2. **`patchCreateAstroCompat()` in `middleware.ts`** — Bridges the 3-arg (compiler v2) and 2-arg (compiler v3/Astro 6) `createAstro` calling conventions. Can be removed once the compiler is updated to match the runtime.
3. **`vitePluginAstroFontsFallback.ts`** — Stubs font virtual modules. Can be removed if Astro's font plugin properly handles the Storybook SSR context.
4. **`cjsInteropPlugin()` in `@storybook/astro/testing`** — Wraps CJS modules for Vite 6+'s ESM runner. May be simplified as dependencies migrate to ESM.
5. **Framework delegation order in `render.tsx`** — `renderToCanvas()` delegates to framework renderers BEFORE calling `storyFn()`. This ordering was changed for Astro 6's updated framework integrations; reverting it would break Solid and potentially other reactive frameworks.

## Future Considerations

- **Performance**: Current implementation makes network requests for each render
- **Type Safety**: Many areas use loose typing that could be improved
- **Testing**: Expand test coverage for edge cases and error scenarios
- **Error Handling**: Better error messages and recovery
- **Documentation**: API documentation and more usage examples
- **Production Build**: Static build support (currently dev-only)
- **Portable Stories**: Consider delegating to framework-specific composeStories when available
- **Astro Stable Release**: Once Astro 6 exits beta, remove or simplify compatibility layers as APIs stabilize
- **Solid Test Rendering**: The SSR/client compilation mismatch prevents Solid from rendering in Vitest; explore `document` shims or compilation mode overrides to enable full test rendering
