# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta.3] - 2026-02-16

### Fixed
- Astro 6 peer dependency fix was missing from beta.2 publish due to branch sync issue

## [0.1.0-beta.2] - 2026-02-16

### Fixed
- Astro 6 peer dependency compatibility — `astro` peer dep now accepts `^5.5.3 || ^6.0.0-beta.0`
- All `@astrojs/*` integration peer deps updated for Astro 6 beta versions

### Added
- `yarn lint` and `yarn lint:fix` scripts
- Versioning and branching strategy documentation (`docs/VERSIONING.md`)
- Storybook docs panel typography overrides for light background readability
- Mobile hamburger navigation for the website

### Changed
- Accordion components updated to dark theme styling across all 7 frameworks
- Website "Components Demo" renamed to "Sample Components"
- Navigation reordered: About, Contribute, Sample Components, Storybook Demo
- About page text contrast improved (`#c9d1d9` for paragraphs/lists, styled inline code and code blocks)

## [0.1.0-beta.1] - 2025-06-15

### Added
- Astro 6 component rendering in Storybook via the Container API
- Multi-framework support: React, Vue, Svelte, Solid, Preact, Alpine.js
- Server-side rendering with middleware pipeline
- Portable stories (`composeStories`) for vitest integration
- Testing utilities (`testStoryRenders`, `testStoryComposition`)
- Framework integration helpers with glob-based routing
- Astro website with component demos and documentation
- Header and Footer components with configurable props and Storybook controls
- Contribute page and CONTRIBUTING.md with branching strategy

### Notes
- Requires Astro 6 (beta) and Storybook 8.6+
- This is the first public beta release under the `@storybook-astro` organization
