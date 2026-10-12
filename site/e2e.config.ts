import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { anthropic } from '@ai-sdk/anthropic';

// E2E_BASE_URL points the suite at a deployed preview, stage, or production. Without it the runner
// serves the built site through wrangler dev, the same Worker that deploys.
const deployedUrl = process.env.E2E_BASE_URL;

export default {
  agents: {
    default: {
      model: anthropic('claude-sonnet-5-5'),
      system: 'You are a thorough QA agent for a personalised gift shop. Verify every outcome on screen.',
    },
  },
  targets: [
    {
      engine: web(),
      app: deployedUrl
        ? {
            url: deployedUrl,
            identity: 'butterlu-site',
            environment: process.env.E2E_ENVIRONMENT === 'production' ? 'production' : 'staging',
          }
        : {
            url: 'http://127.0.0.1:8787',
            identity: 'butterlu-site',
            command: {
              executable: 'bunx',
              args: ['wrangler', 'dev', '--port', '8787', '--ip', '127.0.0.1'],
              log: '.e2e/logs/app.log',
              reuseExisting: true,
            },
          },
    },
  ],
} satisfies E2EConfig;
