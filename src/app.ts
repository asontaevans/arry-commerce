import cors from 'cors';
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import fs from 'fs';
import path from 'path';
import { legalPageShell, renderMarkdown } from './lib/markdown';
import { apiRouter } from './routes/api';
import { webhooksRouter } from './routes/webhooks';

function sendLegal(res: Response, title: string, mdFile: string): void {
  const full = path.join(process.cwd(), 'content', 'legal', mdFile);
  if (!fs.existsSync(full)) {
    res.status(404).send('Not found');
    return;
  }
  const md = fs.readFileSync(full, 'utf8');
  const html = legalPageShell(title, renderMarkdown(md));
  res.type('html').send(html);
}

export function createApp() {
  const app = express();

  app.use(cors());

  // Stripe webhooks need raw body for signature verification
  app.use(
    '/api/webhooks',
    express.raw({ type: 'application/json' }),
    (req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
      next();
    },
    webhooksRouter
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', apiRouter);

  // Legal pages (Stripe business website) — before static so /legal/terms wins
  app.get('/legal/terms', (_req, res) => {
    sendLegal(res, 'Terms of Service', 'TERMS_OF_SERVICE.md');
  });
  app.get('/legal/privacy', (_req, res) => {
    sendLegal(res, 'Privacy Policy', 'PRIVACY_POLICY.md');
  });
  app.get('/terms', (_req, res) => res.redirect(301, '/legal/terms'));
  app.get('/privacy', (_req, res) => res.redirect(301, '/legal/privacy'));

  const publicDir = path.join(process.cwd(), 'public');
  const contentDir = path.join(process.cwd(), 'content');
  app.use(express.static(publicDir));
  app.use('/content', express.static(contentDir));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.get('/start-here', (_req, res) => {
    res.sendFile(path.join(publicDir, 'start-here.html'));
  });

  app.use(
    (err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      res.status(500).json({ error: 'internal_error' });
    }
  );

  return app;
}
