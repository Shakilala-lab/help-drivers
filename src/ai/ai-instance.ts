import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      'apiKey'process.env.455c4783b749f11460eb894d3609ec51670fda05',
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});