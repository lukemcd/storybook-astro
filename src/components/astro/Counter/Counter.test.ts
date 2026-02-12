import { composeStories } from '@storybook/astro';
import { testStoryRenders, testStoryComposition } from '../../../../test-utils.js';
import * as stories from './Counter.stories.jsx';

const { Default } = composeStories(stories);

testStoryComposition('Default', Default);
testStoryRenders('Astro Counter Default', Default);
