const assert = require('node:assert/strict');
const test = require('node:test');

const { __test } = require('../extension');

test('normalizes comma-separated tags with trimming and dedupe', () => {
  assert.deepEqual(__test.normalizeTags(' php, wordpress, api, php '), ['php', 'wordpress', 'api']);
  assert.equal(__test.formatTags(['php', 'api']), '#php #api');
});

test('extracts and applies template variables', () => {
  const content = 'Merhaba {{ isim }}, {{proje}} icin {{ticket}} kaydini incele.';
  assert.deepEqual(__test.extractTemplateVariables(content), ['isim', 'proje', 'ticket']);
  assert.equal(
    __test.applyTemplateVariables(content, { isim: 'Gurkan', proje: 'Komtan', ticket: 'KMT-1' }),
    'Merhaba Gurkan, Komtan icin KMT-1 kaydini incele.'
  );
});

test('detects sensitive-looking content', () => {
  const fakeOpenAiKey = `OPENAI_API_KEY=${'sk-' + 'abcdefghijklmnopqrstuvwxyz123456'}`;
  const fakeGenericApiKey = `api_${'key'}=${'abcdefghijklmnopqrstuvwxyz123456'}`;

  assert.deepEqual(__test.detectSensitiveContent(fakeOpenAiKey), ['openai key']);
  assert.deepEqual(__test.detectSensitiveContent(fakeGenericApiKey), ['api key']);
  assert.deepEqual(__test.detectSensitiveContent('normal reusable snippet'), []);
});

test('normalizes prompt defaults and legacy types', () => {
  const prompt = __test.normalizePrompt({
    title: 'SQL helper',
    content: 'SELECT 1',
    type: 'sql',
    scope: 'workspace',
    tags: 'sql, report'
  });

  assert.equal(prompt.type, 'template');
  assert.equal(prompt.scope, 'workspace');
  assert.deepEqual(prompt.tags, ['sql', 'report']);
  assert.equal(prompt.favorite, false);
});

test('creates duplicate prompts with unique title and fresh id', () => {
  const duplicate = __test.createDuplicatePrompt(
    {
      id: 'original-id',
      title: 'API Request',
      content: 'curl {{url}}',
      type: 'template',
      scope: 'workspace',
      category: 'API Request',
      tags: ['api'],
      favorite: true
    },
    ['API Request', 'API Request Copy'],
    () => 'duplicate-id'
  );

  assert.equal(duplicate.id, 'duplicate-id');
  assert.equal(duplicate.title, 'API Request Copy 2');
  assert.equal(duplicate.content, 'curl {{url}}');
  assert.equal(duplicate.scope, 'workspace');
  assert.equal(duplicate.category, 'API Request');
  assert.deepEqual(duplicate.tags, ['api']);
  assert.equal(duplicate.favorite, false);
});

test('renders fenced code blocks in preview content', () => {
  const rendered = __test.renderPreviewContent('Before\n```js\nconsole.log("x");\n```\nAfter', 'snippet');
  assert.match(rendered, /class="code-title">js/);
  assert.match(rendered, /<pre><code>console\.log\(&quot;x&quot;\);<\/code><\/pre>/);
  assert.match(rendered, /Before/);
  assert.match(rendered, /After/);
});
