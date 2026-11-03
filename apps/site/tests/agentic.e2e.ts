import { test } from '@e2e-dev/web';

const skip = process.env.ANTHROPIC_API_KEY ? false : 'set ANTHROPIC_API_KEY to run agent tests';

test('a shopper can tell what the shop sells', { skip }, async ({ app, agent }) => {
  await app.open('/');
  await agent.assert('the page says the shop sells personalised picture frames or keepsake gifts');
});
