import { composeStories } from '@storybook/astro';
import { testStoryRenders, testStoryComposition } from '@storybook/astro/testing';
import * as stories from './Accordion.stories.js';

const { Default } = composeStories(stories);

// Test basic composition
testStoryComposition('Default', Default);

// Test rendering capability
testStoryRenders('Preact Accordion Default', Default);
