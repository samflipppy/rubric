import { onCallGenkit, onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { generateRubricFlow } from './flows/generateRubric';
import { generateBriefFlow } from './flows/generateBrief';
import { answerPRQuestionFlow } from './flows/answerPRQuestion';
import { listOpenPRs } from './tools/github';

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const githubToken = defineSecret('GITHUB_TOKEN');

export const generateBrief = onCallGenkit(
  { invoker: 'public', secrets: [githubToken] },
  generateBriefFlow,
);

export const generateRubric = onCallGenkit(
  { invoker: 'public', secrets: [githubToken] },
  generateRubricFlow,
);

export const answerPRQuestion = onCallGenkit(
  { invoker: 'public', secrets: [githubToken] },
  answerPRQuestionFlow,
);

export const listPRs = onRequest(
  { cors: true, invoker: 'public', secrets: [githubToken] },
  async (req, res) => {
    const owner = (req.query.owner as string) ?? req.body?.owner;
    const repo = (req.query.repo as string) ?? req.body?.repo;
    if (!owner || !repo) {
      res.status(400).json({ error: 'owner and repo required' });
      return;
    }
    const prs = await listOpenPRs(owner, repo);
    res.json({ prs });
  },
);
