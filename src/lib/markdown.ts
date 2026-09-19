/**
 * Minimal Markdown → HTML for legal pages (no external dep).
 * Supports: ATX headings, paragraphs, ul/ol, bold, italic, links, hr, code.
 */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const closeLists = () => {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  };

  for (const raw of lines) {
    const line = raw;
    if (/^\s*$/.test(line)) {
      flushPara();
      closeLists();
      continue;
    }
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      flushPara();
      closeLists();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushPara();
      closeLists();
      out.push('<hr />');
      continue;
    }
    const ul = /^[-*]\s+(.+)$/.exec(line);
    if (ul) {
      flushPara();
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul>');
        inUl = true;
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    const ol = /^\d+\.\s+(.+)$/.exec(line);
    if (ol) {
      flushPara();
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol>');
        inOl = true;
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    closeLists();
    para.push(line.trim());
  }
  flushPara();
  closeLists();
  return out.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(s: string): string {
  let t = escapeHtml(s);
  t = t.replace(
    /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    '<a href="$2" rel="noopener">$1</a>'
  );
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  return t;
}

export function legalPageShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Arry Alerts</title>
  <style>
    :root { color-scheme: dark; --bg:#070b10; --text:#e8eef5; --muted:#9aa7b5; --accent:#2dd4bf; --line:#243041; --card:#121a24; }
    body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; background:var(--bg); color:var(--text); line-height:1.6; }
    header { border-bottom:1px solid var(--line); padding:1rem 1.25rem; }
    header a { color:var(--muted); text-decoration:none; margin-right:1rem; font-size:.92rem; }
    header a:hover { color:var(--accent); }
    .brand { color:var(--text) !important; font-weight:700; }
    main { max-width:740px; margin:0 auto; padding:2rem 1.25rem 4rem; }
    h1 { font-size:1.75rem; margin:0 0 1rem; }
    h2 { font-size:1.2rem; margin:2rem 0 .6rem; }
    h3 { font-size:1.05rem; margin:1.4rem 0 .4rem; }
    p, li { color:var(--muted); }
    strong { color:var(--text); }
    a { color:var(--accent); }
    code { background:var(--card); padding:.1rem .35rem; border-radius:4px; font-size:.9em; }
    hr { border:0; border-top:1px solid var(--line); margin:2rem 0; }
    ul, ol { padding-left:1.25rem; }
    footer { max-width:740px; margin:0 auto; padding:0 1.25rem 3rem; color:var(--muted); font-size:.85rem; }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/">Arry Alerts</a>
    <a href="/legal/terms">Terms</a>
    <a href="/legal/privacy">Privacy</a>
    <a href="/start-here">Start here</a>
    <a href="https://discord.gg/svQZGsxJtD">Discord</a>
  </header>
  <main>
${bodyHtml}
  </main>
  <footer>
    <p><a href="/legal/terms">Terms of Service</a> · <a href="/legal/privacy">Privacy Policy</a> · Payments by Stripe</p>
  </footer>
</body>
</html>`;
}
