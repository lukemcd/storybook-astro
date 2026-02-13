import { composeStories } from '@storybook/astro';
import { testStoryRenders, testStoryComposition } from '@storybook/astro/testing';
import * as stories from './Counter.stories.jsx';

const { Default } = composeStories(stories);

testStoryComposition('Default', Default);
testStoryRenders('Astro Counter Default', Default);
