import { fetchPR, listOpenPRs } from '../tools/github';

async function main() {
  const owner = process.argv[2] ?? 'samflipppy';
  const repo = process.argv[3] ?? 'rubric';
  const prNumber = process.argv[4] ? Number(process.argv[4]) : undefined;

  if (prNumber) {
    const pr = await fetchPR(owner, repo, prNumber);
    console.log(JSON.stringify(pr, null, 2));
  } else {
    const prs = await listOpenPRs(owner, repo);
    console.log(JSON.stringify(prs, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
