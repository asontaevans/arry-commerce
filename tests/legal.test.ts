import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { renderMarkdown } from '../src/lib/markdown';
import http from 'http';

const legalDir = path.join(process.cwd(), 'content', 'legal');

describe('legal documents', () => {
  it('ships Terms and Privacy markdown', () => {
    expect(fs.existsSync(path.join(legalDir, 'TERMS_OF_SERVICE.md'))).toBe(true);
    expect(fs.existsSync(path.join(legalDir, 'PRIVACY_POLICY.md'))).toBe(true);
  });

  it('Terms cover required topics', () => {
    const t = fs.readFileSync(path.join(legalDir, 'TERMS_OF_SERVICE.md'), 'utf8').toLowerCase();
    for (const needle of [
      '18',
      'financial advice',
      'account balance',
      'nav',
      'refund',
      'chargeback',
      'discord',
      'stripe',
      'prohibited',
    ]) {
      expect(t).toContain(needle);
    }
  });

  it('Privacy covers data collected and Stripe', () => {
    const t = fs.readFileSync(path.join(legalDir, 'PRIVACY_POLICY.md'), 'utf8').toLowerCase();
    for (const needle of [
      'discord',
      'email',
      'ip',
      'stripe',
      'retention',
      'privacy@',
      '18',
    ]) {
      expect(t).toContain(needle);
    }
  });

  it('renders markdown headings', () => {
    const html = renderMarkdown('# Hello\n\nWorld **bold**');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('serves /legal/terms and /legal/privacy', async () => {
    const app = createApp();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('no port');
    const port = addr.port;

    try {
      for (const route of ['/legal/terms', '/legal/privacy']) {
        const res = await fetch(`http://127.0.0.1:${port}${route}`);
        expect(res.status).toBe(200);
        const body = await res.text();
        expect(body).toContain('Arry Alerts');
        expect(body.toLowerCase()).toMatch(/terms|privacy/);
      }
      const home = await fetch(`http://127.0.0.1:${port}/`);
      expect(home.status).toBe(200);
      const homeHtml = await home.text();
      expect(homeHtml).toContain('Arry Alerts');
      expect(homeHtml).toContain('/legal/terms');
      expect(homeHtml).toContain('/legal/privacy');
      expect(homeHtml).toContain('discord.gg/svQZGsxJtD');
      expect(homeHtml.toLowerCase()).toContain('stripe');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
});
