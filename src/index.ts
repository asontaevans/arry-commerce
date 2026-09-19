import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(
    `[arry-commerce] listening on ${config.baseUrl} (port ${config.port})`
  );
  console.log(
    `[arry-commerce] Stripe key set: ${!config.stripe.secretKey.includes('REPLACE_ME')}`
  );
  console.log(
    `[arry-commerce] Discord bot configured: ${Boolean(config.discord.botToken)}`
  );
});
