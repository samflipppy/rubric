import { generateRubricFlow } from '../flows/generateRubric';

async function main() {
  const owner = process.argv[2] ?? 'samflipppy';
  const repo = process.argv[3] ?? 'rubric';
  const prNumber = Number(process.argv[4] ?? '1');

  console.log(`Fetching PR ${owner}/${repo}#${prNumber}...`);
  const rubric = await generateRubricFlow({ owner, repo, prNumber });
  console.log(JSON.stringify(rubric, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
