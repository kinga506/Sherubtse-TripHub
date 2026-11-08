const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');

test('shared layout includes accessible navigation and mobile toggle', () => {
  const header = read('views/partials/header.ejs');
  expect(header).toContain('data-nav-toggle');
  expect(header).toContain('aria-expanded="false"');
  expect(header).toContain('Skip to main content');
  expect(header).toContain('href="/workspace/student#organise-trip"');
  expect(header).toContain('hasCoordinatingTrips');
  expect(header).toContain('name="_csrf"');
});

test('original brand tagline and institutional disclaimer preserved', () => {
  const index = read('views/index.ejs');
  const footer = read('views/partials/footer.ejs');
  expect(index).toContain('Explore. <span>Experience.</span> Connect.');
  expect(footer).toContain('Explore. Experience. Connect.');
  expect(footer).toMatch(/does not imply official college endorsement/);
});

test('design-system examples are labeled as demonstration only', () => {
  const preview = read('views/design-system.ejs');
  expect(preview).toContain('data-dialog-open="demo-dialog"');
  expect(preview).toContain('data-demo-form');
  expect(preview).toContain('badge-success');
  expect(preview).toContain('loading-inline');
  expect(preview).toContain('empty-state');
  expect(preview).toContain('This page is for project development');
});

test('CSS provides responsive layouts, focus ring, and reduced motion', () => {
  const css = read('public/css/styles.css');
  expect(css).toContain('prefers-reduced-motion');
  expect(css).toContain(':focus-visible');
  expect(css).toContain('@media(max-width:760px)');
  expect(css).toContain('.site-nav.is-open');
});

test('UI controls escape user content by using textContent, not innerHTML', () => {
  const js = read('public/js/ui.js');
  expect(js).toContain('text.textContent = message');
  expect(js).not.toContain('innerHTML');
  expect(js).toContain("event.preventDefault()");
});
