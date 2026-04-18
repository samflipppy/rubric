import { onCallGenkit, onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { generateRubricFlow } from './flows/generateRubric';
import { scoreReviewFlow } from './flows/scoreReview';
import { listOpenPRs } from './tools/github';

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

export const generateRubric = onCallGenkit({ invoker: 'public' }, generateRubricFlow);

export const scoreReview = onCallGenkit({ invoker: 'public' }, scoreReviewFlow);

export const listPRs = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  const owner = (req.query.owner as string) ?? req.body?.owner;
  const repo = (req.query.repo as string) ?? req.body?.repo;
  if (!owner || !repo) {
    res.status(400).json({ error: 'owner and repo required' });
    return;
  }
  const prs = await listOpenPRs(owner, repo);
  res.json({ prs });
});
