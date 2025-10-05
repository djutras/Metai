#!/usr/bin/env node
import { logCrawlRun } from '../db/logCrawlRun';

const workflowName = process.argv[2];
const runId = process.env.GITHUB_RUN_ID;
const runNumber = process.env.GITHUB_RUN_NUMBER;
const actor = process.env.GITHUB_ACTOR;
const eventName = process.env.GITHUB_EVENT_NAME;

if (!workflowName) {
  console.error('Usage: node log-crawl-run.ts <workflow-name>');
  process.exit(1);
}

const metadata = {
  runNumber,
  actor,
  eventName,
  triggeredAt: new Date().toISOString()
};

logCrawlRun(workflowName, runId, metadata)
  .then(() => {
    console.log('Successfully logged crawl run');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to log crawl run:', error);
    process.exit(1);
  });
