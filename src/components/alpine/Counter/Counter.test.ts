import { composeStories } from '@storybook/astro';
import { testStoryRenders, testStoryComposition } from '../../../../test-utils.js';
import * as stories from './Counter.stories.js';

const { Default } = composeStories(stories);

testStoryComposition('Default', Default);
testStoryRenders('Alpine Counter Default', Default);
