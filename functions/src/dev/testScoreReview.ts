import { generateRubricFlow } from '../flows/generateRubric';
import { scoreReviewFlow } from '../flows/scoreReview';
import type { Answer } from '../schemas/review';

async function main() {
  const owner = process.argv[2] ?? 'samflipppy';
  const repo = process.argv[3] ?? 'rubric';
  const prNumber = Number(process.argv[4] ?? '1');

  console.log(`Generating rubric for ${owner}/${repo}#${prNumber}...`);
  const rubric = await generateRubricFlow({ owner, repo, prNumber });

  // Simulate: reviewer answers "yes" to everything.
  const answers: Answer[] = rubric.questions.map((q) => ({ questionId: q.id, answer: 'yes' }));

  console.log('Scoring all-yes review...');
  const allYes = await scoreReviewFlow({ rubric, answers });
  console.log('--- ALL YES ---');
  console.log(JSON.stringify(allYes, null, 2));

  // Simulate: reviewer answers "no" to the first intent question.
  const intentQ = rubric.questions.find((q) => q.tier === 'intent');
  if (intentQ) {
    const answersWithNo: Answer[] = rubric.questions.map((q) =>
      q.id === intentQ.id
        ? { questionId: q.id, answer: 'no', note: 'Unrelated file changes spotted' }
        : { questionId: q.id, answer: 'yes' },
    );
    console.log('Scoring intent-no review...');
    const withNo = await scoreReviewFlow({ rubric, answers: answersWithNo });
    console.log('--- INTENT NO ---');
    console.log(JSON.stringify(withNo, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
