import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/google-genai';

export const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'rubric-216';
export const LOCATION = 'us-central1';
export const MODEL = 'vertexai/gemini-2.5-flash';

export const ai = genkit({
  plugins: [vertexAI({ projectId: PROJECT_ID, location: LOCATION })],
  model: MODEL,
});
