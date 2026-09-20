let vscode;
try {
  vscode = require('vscode');
} catch {
  vscode = {
    TreeItem: class {
      constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
      }
    },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    EventEmitter: class {
      constructor() {
        this.event = () => undefined;
      }

      fire() {}
    },
    ThemeIcon: class {
      constructor(id) {
        this.id = id;
      }
    },
    MarkdownString: class {
      constructor(value) {
        this.value = value;
      }
    }
  };
}

const STORAGE_KEY = 'komtan.prompts';
const WORKSPACE_STORAGE_KEY = 'komtan.workspacePrompts';
const RECENT_STORAGE_KEY = 'komtan.recentPromptIds';
const ALL_PROMPTS_CATEGORY = 'Uncategorized';
const GLOBAL_SCOPE = 'global';
const WORKSPACE_SCOPE = 'workspace';
const DEFAULT_SCOPE = GLOBAL_SCOPE;
const STARTER_PACK_VERSION_KEY = 'komtan.starterPackVersion';
const CONTENT_TYPES = [
  { value: 'prompt', label: 'Prompt', icon: 'comment-discussion' },
  { value: 'snippet', label: 'Code Snippet', icon: 'code' },
  { value: 'text', label: 'Text / Copy', icon: 'quote' },
  { value: 'template', label: 'Template', icon: 'symbol-string' },
  { value: 'command', label: 'Command', icon: 'terminal' },
  { value: 'reference', label: 'Reference', icon: 'book' }
];
const DEFAULT_CONTENT_TYPE = 'prompt';
const STARTER_PACK_VERSION = 1;
const STARTER_PACK_ITEMS = [
  {
    title: 'Code Review Prompt',
    type: 'prompt',
    category: 'Coding Prompts',
    tags: ['review', 'code', 'quality'],
    content: 'Review this code for readability, bug risk, edge cases, and missing tests. List findings by severity.\n\nCode:\n{{code}}'
  },
  {
    title: 'Debug / Error Analysis Prompt',
    type: 'prompt',
    category: 'Debug / Error Analysis',
    tags: ['debug', 'error'],
    content: 'Analyze the error message and related code below. Explain likely causes, verification steps, and the safest fixes.\n\nError:\n{{error}}\n\nCode:\n{{code}}'
  },
  {
    title: 'Show Recent Git Commits',
    type: 'command',
    category: 'Git',
    tags: ['git', 'log'],
    content: 'git log --oneline --decorate -n 20'
  },
  {
    title: 'Clean NPM Install',
    type: 'command',
    category: 'NPM / PNPM',
    tags: ['npm', 'install'],
    content: 'npm ci'
  },
  {
    title: 'API Request Template',
    type: 'template',
    category: 'API Request',
    tags: ['api', 'curl'],
    content: 'curl -X {{method}} "{{url}}" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer {{token}}" \\\n  -d \'{{body}}\''
  },
  {
    title: 'Bug Report Template',
    type: 'template',
    category: 'Bug Report',
    tags: ['bug', 'issue'],
    content: '## Summary\n{{summary}}\n\n## Expected Behavior\n{{expected}}\n\n## Actual Behavior\n{{actual}}\n\n## Steps to Reproduce\n1. {{step1}}\n2. {{step2}}\n3. {{step3}}\n\n## Environment\n{{environment}}'
  },
  {
    title: 'Email Regex Example',
    type: 'reference',
    category: 'Regex Examples',
    tags: ['regex', 'email'],
    content: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
  },
  {
    title: 'HTTP Status Quick Reference',
    type: 'reference',
    category: 'HTTP Status Codes',
    tags: ['http', 'api'],
    content: '200 OK\n201 Created\n204 No Content\n400 Bad Request\n401 Unauthorized\n403 Forbidden\n404 Not Found\n409 Conflict\n422 Unprocessable Entity\n500 Internal Server Error'
  }
];
const LEGACY_CONTENT_TYPE_MAP = {
  sql: 'template',
  email: 'text',
  checklist: 'reference',
  note: 'reference'
};
const CATEGORY_SUGGESTIONS = {
  prompt: [
    'General Prompt',
    'Coding Prompts',
    'Debug / Error Analysis',
    'Refactor',
    'SEO / Content',
    'Image Generation Prompts',
    'Data Analysis',
    'System / Role Prompts'
  ],
  snippet: [
    'PHP',
    'JavaScript / TypeScript',
    'HTML / CSS',
    'SQL',
    'Python',
    'Bash / PowerShell',
    'Regex',
    'JSON / API',
    'VS Code / Config'
  ],
  text: [
    'Canned Replies',
    'Description Copy',
    'Product Descriptions',
    'SEO Copy',
    'Social Media',
    'Email / Message',
    'Technical Explanations'
  ],
  template: [
    'API Request',
    'SQL Query',
    'PHP Function',
    'HTML Component',
    'Prompt Template',
    'Documentation',
    'Bug Report',
    'Commit / PR',
    'Project Starter Template'
  ],
  command: [
    'Git',
    'Composer',
    'NPM / PNPM',
    'Docker',
    'Linux',
    'Windows',
    'MySQL',
    'SSH',
    'VS Code'
  ],
  reference: [
    'Regex Examples',
    'HTTP Status Codes',
    'SQL Functions',
    'Git Commands',
    'CSS References',
    'API Notes',
    'Charset / Encoding',
    'Cheat Sheet'
  ],
  sql: ['SQL Query', 'MySQL', 'SQL Functions', 'Data Analysis'],
  email: ['Email / Message', 'Canned Replies', 'Customer Reply'],
  checklist: ['Pre-release', 'Code Review', 'QA Steps'],
  note: ['Project Notes', 'API Notes', 'Cheat Sheet']
};

class ScopeTreeItem extends vscode.TreeItem {
  constructor(label, scope, prompts, icon) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.scope = scope;
    this.prompts = prompts;
    this.contextValue = 'komtanScope';
    this.description = `${prompts.length}`;
    this.iconPath = new vscode.ThemeIcon(icon);
  }
}

class CategoryTreeItem extends vscode.TreeItem {
  constructor(label, prompts, scope) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.category = label;
    this.scope = scope;
    this.description = `${prompts.length}`;
    this.contextValue = label === 'Favorites' ? 'komtanCategoryReadonly' : 'komtanCategory';
    this.iconPath = new vscode.ThemeIcon(label === 'Favorites' ? 'star-full' : 'folder');
  }
}

class EmptyStateTreeItem extends vscode.TreeItem {
  constructor(label, description) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.contextValue = 'komtanEmptyState';
    this.iconPath = new vscode.ThemeIcon('info');
    this.command = {
      command: 'komtan.clearFilters',
      title: 'Clear Filters'
    };
  }
}

class PromptTreeItem extends vscode.TreeItem {
  constructor(prompt) {
    super(prompt.title, vscode.TreeItemCollapsibleState.None);
    const type = getContentType(prompt.type);
    const tagsText = formatTags(prompt.tags);
    this.prompt = prompt;
    this.description = [type.label, tagsText, prompt.favorite ? 'Favorite' : ''].filter(Boolean).join(' - ');
    this.tooltip = new vscode.MarkdownString(`**${escapeMarkdown(prompt.title)}**\n\n${escapeMarkdown(type.label)}${tagsText ? `\n\n${escapeMarkdown(tagsText)}` : ''}\n\n${escapeMarkdown(prompt.content)}`);
    this.contextValue = prompt.favorite ? 'komtanPromptFavorite' : 'komtanPrompt';
    this.command = {
      command: 'komtan.copyPrompt',
      title: 'Copy Item',
      arguments: [this]
    };
    this.iconPath = new vscode.ThemeIcon(prompt.favorite ? 'star-full' : type.icon);
  }
}

class PromptProvider {
  constructor(context) {
    this.context = context;
    this.searchQuery = '';
    this.typeFilter = undefined;
    this.scopeFilter = undefined;
    this.tagFilter = undefined;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    const prompts = this.getFilteredPrompts();

    if (!element) {
      if (!prompts.length) {
        if (this.hasActiveFilters() && this.getPrompts().length) {
          return [new EmptyStateTreeItem('No results found', this.getActiveFilterSummary())];
        }

        return [];
      }

      const favoritePrompts = prompts.filter(prompt => prompt.favorite);
      const globalPrompts = prompts.filter(prompt => prompt.scope === GLOBAL_SCOPE);
      const workspacePrompts = prompts.filter(prompt => prompt.scope === WORKSPACE_SCOPE);
      const items = [];

      if (favoritePrompts.length) {
        items.push(new ScopeTreeItem('Favorites', 'favorites', favoritePrompts, 'star-full'));
      }

      if (globalPrompts.length) {
        items.push(new ScopeTreeItem('Global', GLOBAL_SCOPE, globalPrompts, 'globe'));
      }

      if (workspacePrompts.length) {
        items.push(new ScopeTreeItem('Workspace', WORKSPACE_SCOPE, workspacePrompts, 'root-folder'));
      }

      return items;
    }

    if (element instanceof ScopeTreeItem) {
      const categories = groupPromptsByCategory(element.prompts);
      return categories.map(([category, categoryPrompts]) => new CategoryTreeItem(category, categoryPrompts, element.scope));
    }

    if (element instanceof CategoryTreeItem) {
      const categoryPrompts = prompts.filter(prompt => {
        if (element.scope === 'favorites') {
          return prompt.favorite && getPromptCategory(prompt) === element.label;
        }

        return prompt.scope === element.scope && getPromptCategory(prompt) === element.label;
      });

      return sortPrompts(categoryPrompts).map(prompt => new PromptTreeItem(prompt));
    }

    return [];
  }

  getPrompts() {
    return [
      ...this.context.globalState.get(STORAGE_KEY, []).map(prompt => normalizePrompt({ ...prompt, scope: GLOBAL_SCOPE })),
      ...this.context.workspaceState.get(WORKSPACE_STORAGE_KEY, []).map(prompt => normalizePrompt({ ...prompt, scope: WORKSPACE_SCOPE }))
    ];
  }

  getFilteredPrompts() {
    const query = this.searchQuery.trim().toLocaleLowerCase('tr-TR');
    return this.getPrompts().filter(prompt => {
      if (this.typeFilter && prompt.type !== this.typeFilter) {
        return false;
      }

      if (this.scopeFilter && prompt.scope !== this.scopeFilter) {
        return false;
      }

      if (this.tagFilter && !normalizeTags(prompt.tags).some(tag => tag.toLocaleLowerCase('tr-TR') === this.tagFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        prompt.title,
        getScopeLabel(prompt.scope),
        prompt.scope,
        getContentType(prompt.type).label,
        prompt.type,
        prompt.category || '',
        ...(prompt.tags || []),
        prompt.content
      ].join('\n').toLocaleLowerCase('tr-TR');

      return haystack.includes(query);
    });
  }

  async savePrompts(prompts) {
    const normalizedPrompts = prompts.map(normalizePrompt);
    await this.context.globalState.update(STORAGE_KEY, normalizedPrompts.filter(prompt => prompt.scope === GLOBAL_SCOPE));
    await this.context.workspaceState.update(WORKSPACE_STORAGE_KEY, normalizedPrompts.filter(prompt => prompt.scope === WORKSPACE_SCOPE));
    this.refresh();
  }

  getRecentPrompts() {
    const promptsById = new Map(this.getPrompts().map(prompt => [prompt.id, prompt]));
    return this.context.globalState.get(RECENT_STORAGE_KEY, [])
      .map(id => promptsById.get(id))
      .filter(Boolean);
  }

  async markPromptUsed(prompt) {
    const recentIds = this.context.globalState.get(RECENT_STORAGE_KEY, []);
    const nextIds = [prompt.id, ...recentIds.filter(id => id !== prompt.id)].slice(0, 20);
    await this.context.globalState.update(RECENT_STORAGE_KEY, nextIds);
  }

  setSearchQuery(query) {
    this.searchQuery = query || '';
    this.refresh();
  }

  setTypeFilter(type) {
    this.typeFilter = type;
    this.refresh();
  }

  setScopeFilter(scope) {
    this.scopeFilter = scope;
    this.refresh();
  }

  setTagFilter(tag) {
    this.tagFilter = tag ? tag.toLocaleLowerCase('tr-TR') : undefined;
    this.refresh();
  }

  clearFilters() {
    this.searchQuery = '';
    this.typeFilter = undefined;
    this.scopeFilter = undefined;
    this.tagFilter = undefined;
    this.refresh();
  }

  hasActiveFilters() {
    return Boolean(this.searchQuery.trim() || this.typeFilter || this.scopeFilter || this.tagFilter);
  }

  getActiveFilterSummary() {
    const parts = [];

    if (this.searchQuery.trim()) {
      parts.push(`search: ${this.searchQuery.trim()}`);
    }

    if (this.typeFilter) {
      parts.push(`type: ${getContentType(this.typeFilter).label}`);
    }

    if (this.scopeFilter) {
      parts.push(`scope: ${getScopeLabel(this.scopeFilter)}`);
    }

    if (this.tagFilter) {
      parts.push(`#${this.tagFilter}`);
    }

    return parts.length ? `${parts.join(' - ')}; click to clear` : '';
  }

  getAllTags() {
    return [...new Set(this.getPrompts().flatMap(prompt => normalizeTags(prompt.tags)))]
      .sort((a, b) => a.localeCompare(b, 'tr'));
  }
}

function activate(context) {
  const provider = new PromptProvider(context);
  context.subscriptions.push(vscode.window.registerTreeDataProvider('komtan.prompts', provider));

  context.subscriptions.push(
    vscode.commands.registerCommand('komtan.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('komtan.addPrompt', () => openPromptEditor(provider)),
    vscode.commands.registerCommand('komtan.editPrompt', item => openPromptEditor(provider, getPromptFromItem(item))),
    vscode.commands.registerCommand('komtan.editCategory', item => editCategory(provider, item)),
    vscode.commands.registerCommand('komtan.deleteCategory', item => deleteCategory(provider, item)),
    vscode.commands.registerCommand('komtan.searchPrompts', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search items',
        placeHolder: 'Title, category, snippet, command, or text',
        value: provider.searchQuery
      });

      if (query === undefined) {
        return;
      }

      provider.setSearchQuery(query);
    }),
    vscode.commands.registerCommand('komtan.clearSearch', () => provider.setSearchQuery('')),
    vscode.commands.registerCommand('komtan.filterByType', async () => {
      const picked = await vscode.window.showQuickPick(
        CONTENT_TYPES.map(type => ({ label: type.label, description: type.value, value: type.value })),
        { placeHolder: 'Filter by content type' }
      );
      if (!picked) return;

      provider.setTypeFilter(picked.value);
    }),
    vscode.commands.registerCommand('komtan.filterByScope', async () => {
      const picked = await vscode.window.showQuickPick(
        [
          { label: 'Global', value: GLOBAL_SCOPE },
          { label: 'Workspace', value: WORKSPACE_SCOPE }
        ],
        { placeHolder: 'Filter by scope' }
      );
      if (!picked) return;

      provider.setScopeFilter(picked.value);
    }),
    vscode.commands.registerCommand('komtan.filterByTag', async () => {
      const tags = provider.getAllTags();
      if (!tags.length) {
        vscode.window.showInformationMessage('Komtan: No tags available to filter.');
        return;
      }

      const picked = await vscode.window.showQuickPick(
        tags.map(tag => ({ label: `#${tag}`, value: tag })),
        { placeHolder: 'Filter by tag' }
      );
      if (!picked) return;

      provider.setTagFilter(picked.value);
    }),
    vscode.commands.registerCommand('komtan.clearFilters', () => provider.clearFilters()),
    vscode.commands.registerCommand('komtan.exportLibrary', () => exportLibrary(provider)),
    vscode.commands.registerCommand('komtan.importLibrary', () => importLibrary(provider)),
    vscode.commands.registerCommand('komtan.previewPrompt', async item => {
      const prompt = await resolvePrompt(provider, item, 'Select an item to preview');
      if (!prompt) return;

      openPromptPreview(provider, prompt);
    }),
    vscode.commands.registerCommand('komtan.bulkAddTags', () => bulkAddTags(provider)),
    vscode.commands.registerCommand('komtan.bulkChangeCategory', () => bulkChangeCategory(provider)),
    vscode.commands.registerCommand('komtan.bulkChangeScope', () => bulkChangeScope(provider)),
    vscode.commands.registerCommand('komtan.bulkDelete', () => bulkDelete(provider)),
    vscode.commands.registerCommand('komtan.installStarterPack', () => installStarterPack(provider)),
    vscode.commands.registerCommand('komtan.quickCopy', async () => {
      const prompt = await pickPrompt(provider, provider.getPrompts(), 'Select an item to copy');
      if (!prompt) return;

      await copyPromptContent(provider, prompt);
    }),
    vscode.commands.registerCommand('komtan.quickInsert', async () => {
      const prompt = await pickPrompt(provider, provider.getPrompts(), 'Select an item to insert into the editor');
      if (!prompt) return;

      await insertPromptContent(provider, prompt);
    }),
    vscode.commands.registerCommand('komtan.quickCopyFavorite', async () => {
      const prompt = await pickPrompt(provider, provider.getPrompts().filter(current => current.favorite), 'Select a favorite item to copy');
      if (!prompt) return;

      await copyPromptContent(provider, prompt);
    }),
    vscode.commands.registerCommand('komtan.quickRecent', async () => {
      const prompt = await pickPrompt(provider, provider.getRecentPrompts(), 'Select from recent items');
      if (!prompt) return;

      const action = await vscode.window.showQuickPick(
        [
          { label: 'Copy', action: 'copy' },
          { label: 'Insert into Editor', action: 'insert' }
        ],
        { placeHolder: `Choose an action for "${prompt.title}"` }
      );

      if (action?.action === 'copy') {
        await copyPromptContent(provider, prompt);
      }

      if (action?.action === 'insert') {
        await insertPromptContent(provider, prompt);
      }
    }),
    vscode.commands.registerCommand('komtan.copyPrompt', async item => {
      const prompt = await resolvePrompt(provider, item, 'Select an item to copy');
      if (!prompt) return;

      const content = await renderPromptContent(prompt);
      if (content === undefined) return;

      await vscode.env.clipboard.writeText(content);
      vscode.window.showInformationMessage(`Komtan: "${prompt.title}" copied to the clipboard.`);
    }),
    vscode.commands.registerCommand('komtan.insertPrompt', async item => {
      const prompt = await resolvePrompt(provider, item, 'Select an item to insert into the editor');
      if (!prompt) return;

      const content = await renderPromptContent(prompt);
      if (content === undefined) return;

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        const document = await vscode.workspace.openTextDocument({
          language: 'plaintext',
          content
        });
        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage('Komtan: No active text editor was found, so the item was opened in a new temporary file.');
        return;
      }

      await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, content);
      });
    }),
    vscode.commands.registerCommand('komtan.duplicatePrompt', async item => {
      const prompt = await resolvePrompt(provider, item, 'Select an item to duplicate');
      if (!prompt) return;

      const prompts = provider.getPrompts();
      const duplicate = createDuplicatePrompt(prompt, prompts.map(current => current.title));
      await provider.savePrompts([...prompts, duplicate]);
      vscode.window.showInformationMessage(`Komtan: "${prompt.title}" duplicated.`);
    }),
    vscode.commands.registerCommand('komtan.toggleFavorite', async item => {
      const prompt = await resolvePrompt(provider, item, 'Select an item to toggle as favorite');
      if (!prompt) return;

      const prompts = provider.getPrompts().map(current => current.id === prompt.id
        ? { ...current, favorite: !current.favorite }
        : current);

      await provider.savePrompts(prompts);
    }),
    vscode.commands.registerCommand('komtan.deletePrompt', async item => {
      const prompt = await resolvePrompt(provider, item, 'Select an item to delete');
      if (!prompt) return;

      const answer = await vscode.window.showWarningMessage(
        `Delete "${prompt.title}"?`,
        { modal: true },
        'Delete'
      );
      if (answer !== 'Delete') return;

      await provider.savePrompts(provider.getPrompts().filter(current => current.id !== prompt.id));
    })
  );
}

function openPromptPreview(provider, prompt) {
  const panel = vscode.window.createWebviewPanel(
    'komtanPromptPreview',
    `Preview: ${prompt.title}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getPromptPreviewHtml(prompt);
  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'copy') {
      await copyPromptContent(provider, prompt);
    }

    if (message.command === 'insert') {
      await insertPromptContent(provider, prompt);
    }

    if (message.command === 'edit') {
      openPromptEditor(provider, prompt);
      panel.dispose();
    }
  });
}

async function bulkAddTags(provider) {
  const prompts = await pickManyPrompts(provider, 'Select items to tag');
  if (!prompts.length) return;

  const tagsInput = await vscode.window.showInputBox({
    prompt: 'Tags to add',
    placeHolder: 'Example: php, wordpress, api',
    ignoreFocusOut: true
  });

  if (tagsInput === undefined) return;

  const tagsToAdd = normalizeTags(tagsInput);
  if (!tagsToAdd.length) {
    vscode.window.showWarningMessage('Komtan: No tags were provided.');
    return;
  }

  const selectedIds = new Set(prompts.map(prompt => prompt.id));
  const nextPrompts = provider.getPrompts().map(prompt => {
    if (!selectedIds.has(prompt.id)) return prompt;
    return {
      ...prompt,
      tags: normalizeTags([...prompt.tags, ...tagsToAdd])
    };
  });

  await provider.savePrompts(nextPrompts);
  vscode.window.showInformationMessage(`Komtan: Added tags to ${prompts.length} item(s).`);
}

async function bulkChangeCategory(provider) {
  const prompts = await pickManyPrompts(provider, 'Select items to move to another category');
  if (!prompts.length) return;

  const category = await vscode.window.showInputBox({
    prompt: 'New category',
    placeHolder: 'Example: API Request, Git, Debug / Error Analysis',
    ignoreFocusOut: true
  });

  if (category === undefined) return;

  const nextCategory = category.trim() || undefined;
  const selectedIds = new Set(prompts.map(prompt => prompt.id));
  const nextPrompts = provider.getPrompts().map(prompt => selectedIds.has(prompt.id)
    ? { ...prompt, category: nextCategory }
    : prompt);

  await provider.savePrompts(nextPrompts);
  vscode.window.showInformationMessage(`Komtan: Updated the category for ${prompts.length} item(s).`);
}

async function bulkChangeScope(provider) {
  const prompts = await pickManyPrompts(provider, 'Select items to move to another scope');
  if (!prompts.length) return;

  const scope = await vscode.window.showQuickPick(
    [
      { label: 'Global', value: GLOBAL_SCOPE },
      { label: 'Workspace', value: WORKSPACE_SCOPE }
    ],
    { placeHolder: 'Select the new scope' }
  );

  if (!scope) return;

  const selectedIds = new Set(prompts.map(prompt => prompt.id));
  const nextPrompts = provider.getPrompts().map(prompt => selectedIds.has(prompt.id)
    ? { ...prompt, scope: scope.value }
    : prompt);

  await provider.savePrompts(nextPrompts);
  vscode.window.showInformationMessage(`Komtan: Updated the scope for ${prompts.length} item(s).`);
}

async function bulkDelete(provider) {
  const prompts = await pickManyPrompts(provider, 'Select items to delete');
  if (!prompts.length) return;

  const answer = await vscode.window.showWarningMessage(
    `Delete ${prompts.length} item(s)?`,
    { modal: true },
    'Delete'
  );

  if (answer !== 'Delete') return;

  const selectedIds = new Set(prompts.map(prompt => prompt.id));
  await provider.savePrompts(provider.getPrompts().filter(prompt => !selectedIds.has(prompt.id)));
  vscode.window.showInformationMessage(`Komtan: Deleted ${prompts.length} item(s).`);
}

async function installStarterPack(provider) {
  const currentPrompts = provider.getPrompts();
  const existingStarterTitles = new Set(currentPrompts.map(prompt => prompt.title));
  const starterPrompts = STARTER_PACK_ITEMS
    .filter(item => !existingStarterTitles.has(item.title))
    .map(item => normalizePrompt({
      id: createPromptId(),
      scope: GLOBAL_SCOPE,
      favorite: false,
      ...item
    }));

  if (!starterPrompts.length) {
    vscode.window.showInformationMessage('Komtan: The starter pack is already installed.');
    await provider.context.globalState.update(STARTER_PACK_VERSION_KEY, STARTER_PACK_VERSION);
    return;
  }

  await provider.savePrompts([...currentPrompts, ...starterPrompts]);
  await provider.context.globalState.update(STARTER_PACK_VERSION_KEY, STARTER_PACK_VERSION);
  vscode.window.showInformationMessage(`Komtan: Added ${starterPrompts.length} starter item(s).`);
}

async function exportLibrary(provider) {
  const prompts = provider.getPrompts();
  if (!prompts.length) {
    vscode.window.showInformationMessage('Komtan: There are no items to export.');
    return;
  }

  const exportFileName = `komtan-library-${new Date().toISOString().slice(0, 10)}.json`;
  const defaultUri = vscode.workspace.workspaceFolders?.[0]
    ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, exportFileName)
    : vscode.Uri.file(exportFileName);
  const target = await vscode.window.showSaveDialog({
    defaultUri,
    filters: {
      'JSON': ['json']
    },
    saveLabel: 'Export'
  });

  if (!target) {
    return;
  }

  const payload = {
    app: 'komtan',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: prompts
  };

  await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(`${JSON.stringify(payload, null, 2)}\n`));
  vscode.window.showInformationMessage(`Komtan: Exported ${prompts.length} item(s).`);
}

async function importLibrary(provider) {
  const sources = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      'JSON': ['json']
    },
    openLabel: 'Import'
  });

  if (!sources?.length) {
    return;
  }

  let payload;
  try {
    const bytes = await vscode.workspace.fs.readFile(sources[0]);
    payload = JSON.parse(new TextDecoder('utf-8').decode(bytes));
  } catch (error) {
    vscode.window.showErrorMessage('Komtan: Could not read the JSON file.');
    return;
  }

  const importedPrompts = parseImportedPrompts(payload);
  if (!importedPrompts.length) {
    vscode.window.showWarningMessage('Komtan: No valid items were found to import.');
    return;
  }

  const mode = await vscode.window.showQuickPick(
    [
      { label: 'Add to existing library', value: 'merge' },
      { label: 'Replace existing library', value: 'replace' }
    ],
    { placeHolder: `How should ${importedPrompts.length} item(s) be imported?` }
  );

  if (!mode) {
    return;
  }

  const nextPrompts = mode.value === 'replace'
    ? importedPrompts
    : mergePrompts(provider.getPrompts(), importedPrompts);

  await provider.savePrompts(nextPrompts);
  vscode.window.showInformationMessage(`Komtan: Imported ${importedPrompts.length} item(s).`);
}

function parseImportedPrompts(payload) {
  const items = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(normalizePrompt)
    .filter(prompt => prompt.title && prompt.content);
}

function mergePrompts(currentPrompts, importedPrompts) {
  const usedIds = new Set(currentPrompts.map(prompt => prompt.id));
  const nextImportedPrompts = importedPrompts.map(prompt => {
    if (!usedIds.has(prompt.id)) {
      usedIds.add(prompt.id);
      return prompt;
    }

    const nextPrompt = { ...prompt, id: createPromptId() };
    usedIds.add(nextPrompt.id);
    return nextPrompt;
  });

  return [...currentPrompts, ...nextImportedPrompts];
}

async function editCategory(provider, item) {
  const category = getCategoryFromItem(item);
  if (!category) return;

  const nextCategory = await vscode.window.showInputBox({
    prompt: 'Rename category',
    placeHolder: 'Example: Code, SEO, SQL',
    value: category === ALL_PROMPTS_CATEGORY ? '' : category
  });

  if (nextCategory === undefined) {
    return;
  }

  const normalizedCategory = nextCategory.trim() || undefined;
  const prompts = provider.getPrompts().map(prompt => {
    if (prompt.scope !== item.scope || getPromptCategory(prompt) !== category) {
      return prompt;
    }

    return {
      ...prompt,
      category: normalizedCategory
    };
  });

  await provider.savePrompts(prompts);
}

async function deleteCategory(provider, item) {
  const category = getCategoryFromItem(item);
  if (!category) return;

  const prompts = provider.getPrompts();
  const categoryPrompts = prompts.filter(prompt => prompt.scope === item.scope && getPromptCategory(prompt) === category);
  const answer = await vscode.window.showWarningMessage(
    `Delete category "${category}" and its ${categoryPrompts.length} item(s)?`,
    { modal: true },
    'Delete'
  );

  if (answer !== 'Delete') {
    return;
  }

  await provider.savePrompts(prompts.filter(prompt => prompt.scope !== item.scope || getPromptCategory(prompt) !== category));
}

function openPromptEditor(provider, existingPrompt) {
  const panel = vscode.window.createWebviewPanel(
    'komtanPromptEditor',
    existingPrompt ? 'Edit Item' : 'New Item',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = getPromptEditorHtml(existingPrompt);

  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'cancel') {
      panel.dispose();
      return;
    }

    if (message.command !== 'save') {
      return;
    }

    const payload = sanitizePromptPayload(message.prompt);
    if (!payload.title || !payload.content) {
      vscode.window.showWarningMessage('Komtan: Title and content are required.');
      return;
    }

    const sensitiveMatches = detectSensitiveContent(payload.content);
    if (sensitiveMatches.length) {
      const answer = await vscode.window.showWarningMessage(
        `Komtan: This item looks like it may contain sensitive data (${sensitiveMatches.join(', ')}). Save it anyway?`,
        { modal: true },
        'Save'
      );

      if (answer !== 'Save') {
        return;
      }
    }

    const prompts = provider.getPrompts();
    const prompt = {
      id: existingPrompt?.id || createPromptId(),
      ...payload
    };

    const nextPrompts = existingPrompt
      ? prompts.map(current => current.id === existingPrompt.id ? prompt : current)
      : [...prompts, prompt];

    await provider.savePrompts(nextPrompts);
    vscode.window.showInformationMessage(`Komtan: "${prompt.title}" saved.`);
    panel.dispose();
  });
}

async function renderPromptContent(prompt) {
  const variables = extractTemplateVariables(prompt.content);
  if (!variables.length) {
    return prompt.content;
  }

  const values = {};
  for (const variable of variables) {
    const value = await vscode.window.showInputBox({
      prompt: `Enter "${variable}" for "${prompt.title}"`,
      placeHolder: variable,
      ignoreFocusOut: true
    });

    if (value === undefined) {
      return undefined;
    }

    values[variable] = value;
  }

  return applyTemplateVariables(prompt.content, values);
}

async function copyPromptContent(provider, prompt) {
  const content = await renderPromptContent(prompt);
  if (content === undefined) return;

  await vscode.env.clipboard.writeText(content);
  await provider.markPromptUsed(prompt);
  vscode.window.showInformationMessage(`Komtan: "${prompt.title}" copied to the clipboard.`);
}

async function insertPromptContent(provider, prompt) {
  const content = await renderPromptContent(prompt);
  if (content === undefined) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    const document = await vscode.workspace.openTextDocument({
      language: 'plaintext',
      content
    });
    await vscode.window.showTextDocument(document);
    await provider.markPromptUsed(prompt);
    vscode.window.showInformationMessage('Komtan: No active text editor was found, so the item was opened in a new temporary file.');
    return;
  }

  await editor.edit(editBuilder => {
    editBuilder.insert(editor.selection.active, content);
  });
  await provider.markPromptUsed(prompt);
}

async function pickPrompt(provider, prompts, placeHolder) {
  const normalizedPrompts = prompts.map(normalizePrompt);
  if (!normalizedPrompts.length) {
    vscode.window.showInformationMessage('Komtan: There are no saved items in this list.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    sortPrompts(normalizedPrompts).map(current => ({
      label: current.favorite ? `$(star-full) ${current.title}` : current.title,
      description: [getScopeLabel(current.scope), getContentType(current.type).label, current.category || ALL_PROMPTS_CATEGORY, formatTags(current.tags)].filter(Boolean).join(' - '),
      detail: current.content,
      prompt: current
    })),
    { placeHolder, matchOnDescription: true, matchOnDetail: true }
  );

  return picked?.prompt;
}

async function pickManyPrompts(provider, placeHolder) {
  const prompts = sortPrompts(provider.getFilteredPrompts());
  if (!prompts.length) {
    vscode.window.showInformationMessage('Komtan: There are no items to select.');
    return [];
  }

  const picked = await vscode.window.showQuickPick(
    prompts.map(current => ({
      label: current.favorite ? `$(star-full) ${current.title}` : current.title,
      description: [getScopeLabel(current.scope), getContentType(current.type).label, current.category || ALL_PROMPTS_CATEGORY, formatTags(current.tags)].filter(Boolean).join(' - '),
      detail: current.content,
      prompt: current
    })),
    {
      canPickMany: true,
      placeHolder,
      matchOnDescription: true,
      matchOnDetail: true
    }
  );

  return picked?.map(item => item.prompt) || [];
}

function extractTemplateVariables(content) {
  const variables = new Set();
  const pattern = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    variables.add(match[1]);
  }

  return [...variables];
}

function applyTemplateVariables(content, values) {
  return content.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (match, variable) => {
    return Object.prototype.hasOwnProperty.call(values, variable) ? values[variable] : match;
  });
}

async function resolvePrompt(provider, item, placeHolder) {
  const prompt = getPromptFromItem(item);
  if (prompt) {
    return prompt;
  }

  const prompts = provider.getFilteredPrompts();
  if (!prompts.length) {
    vscode.window.showInformationMessage('Komtan: No saved items found.');
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    sortPrompts(prompts).map(current => ({
      label: current.favorite ? `$(star-full) ${current.title}` : current.title,
      description: [getScopeLabel(current.scope), getContentType(current.type).label, current.category || ALL_PROMPTS_CATEGORY, formatTags(current.tags)].filter(Boolean).join(' - '),
      detail: current.content,
      prompt: current
    })),
    { placeHolder, matchOnDescription: true, matchOnDetail: true }
  );

  return picked?.prompt;
}

function getPromptFromItem(item) {
  return item?.prompt;
}

function getCategoryFromItem(item) {
  if (!(item instanceof CategoryTreeItem) || item.category === 'Favorites') {
    return undefined;
  }

  return item.category;
}

function normalizePrompt(prompt) {
  return {
    id: prompt.id || createPromptId(),
    title: String(prompt.title || '').trim(),
    content: String(prompt.content || ''),
    type: getContentType(prompt.type).value,
    scope: getPromptScope(prompt.scope),
    category: String(prompt.category || '').trim() || undefined,
    tags: normalizeTags(prompt.tags),
    favorite: Boolean(prompt.favorite)
  };
}

function sanitizePromptPayload(prompt) {
  return {
    title: String(prompt?.title || '').trim(),
    content: String(prompt?.content || '').trim(),
    type: getContentType(prompt?.type).value,
    scope: getPromptScope(prompt?.scope),
    category: String(prompt?.category || '').trim() || undefined,
    tags: normalizeTags(prompt?.tags),
    favorite: Boolean(prompt?.favorite)
  };
}

function createDuplicatePrompt(prompt, existingTitles = [], createId = createPromptId) {
  const normalizedPrompt = normalizePrompt(prompt);
  const duplicateTitle = createDuplicateTitle(normalizedPrompt.title, existingTitles);

  return {
    ...normalizedPrompt,
    id: createId(),
    title: duplicateTitle,
    favorite: false
  };
}

function createDuplicateTitle(title, existingTitles = []) {
  const baseTitle = `${String(title || '').trim() || 'Untitled'} Copy`;
  const titleSet = new Set(existingTitles.map(current => String(current).trim()));

  if (!titleSet.has(baseTitle)) {
    return baseTitle;
  }

  let index = 2;
  while (titleSet.has(`${baseTitle} ${index}`)) {
    index += 1;
  }

  return `${baseTitle} ${index}`;
}

function detectSensitiveContent(content) {
  const checks = [
    { label: 'private key', pattern: /-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/i },
    { label: 'api key', pattern: /\b(api[_-]?key|apikey)\b\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i },
    { label: 'token', pattern: /\b(access[_-]?token|auth[_-]?token|bearer|token)\b\s*[:=]\s*["']?[A-Za-z0-9_\-.]{20,}/i },
    { label: 'password', pattern: /\b(password|passwd|pwd)\b\s*[:=]\s*["']?[^"'\s]{8,}/i },
    { label: 'github token', pattern: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/ },
    { label: 'openai key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
    { label: 'aws access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
    { label: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
    { label: 'connection string', pattern: /\b(mongodb|postgres|postgresql|mysql|redis):\/\/[^ \n]+/i }
  ];

  return checks
    .filter(check => check.pattern.test(content))
    .map(check => check.label);
}

function normalizeTags(tags) {
  const rawTags = Array.isArray(tags)
    ? tags
    : String(tags || '').split(',');

  return [...new Set(rawTags
    .map(tag => String(tag).trim())
    .filter(Boolean))];
}

function formatTags(tags) {
  const normalizedTags = normalizeTags(tags);
  return normalizedTags.length ? normalizedTags.map(tag => `#${tag}`).join(' ') : '';
}

function getContentType(value) {
  const normalizedValue = LEGACY_CONTENT_TYPE_MAP[value] || value;
  return CONTENT_TYPES.find(type => type.value === normalizedValue) || CONTENT_TYPES.find(type => type.value === DEFAULT_CONTENT_TYPE);
}

function getPromptScope(value) {
  return value === WORKSPACE_SCOPE ? WORKSPACE_SCOPE : DEFAULT_SCOPE;
}

function getScopeLabel(scope) {
  return scope === WORKSPACE_SCOPE ? 'Workspace' : 'Global';
}

function createPromptId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function groupPromptsByCategory(prompts) {
  const groups = new Map();

  for (const prompt of prompts) {
    const category = getPromptCategory(prompt);
    if (!groups.has(category)) {
      groups.set(category, []);
    }

    groups.get(category).push(prompt);
  }

  return [...groups.entries()].sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB, 'tr'));
}

function sortPrompts(prompts) {
  return [...prompts].sort((a, b) => {
    if (a.favorite !== b.favorite) {
      return a.favorite ? -1 : 1;
    }

    return a.title.localeCompare(b.title, 'tr');
  });
}

function getPromptCategory(prompt) {
  return prompt.category || ALL_PROMPTS_CATEGORY;
}

function escapeMarkdown(value) {
  return String(value).replace(/[\\`*_{}[\]()#+\-.!|>]/g, '\\$&');
}

function getPromptEditorHtml(prompt) {
  const title = escapeHtml(prompt?.title || '');
  const category = escapeHtml(prompt?.category || '');
  const tags = escapeHtml(normalizeTags(prompt?.tags).join(', '));
  const content = escapeHtml(prompt?.content || '');
  const selectedType = getContentType(prompt?.type).value;
  const selectedScope = getPromptScope(prompt?.scope);
  const typeOptions = CONTENT_TYPES.map(type => {
    const selected = type.value === selectedType ? 'selected' : '';
    return `<option value="${escapeHtml(type.value)}" ${selected}>${escapeHtml(type.label)}</option>`;
  }).join('');
  const categorySuggestionsJson = JSON.stringify(CATEGORY_SUGGESTIONS);
  const favorite = prompt?.favorite ? 'checked' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      color-scheme: light dark;
      --gap: 14px;
    }

    body {
      margin: 0;
      padding: 24px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    form {
      display: grid;
      gap: var(--gap);
      max-width: 940px;
    }

    label {
      display: grid;
      gap: 6px;
      font-weight: 600;
    }

    input,
    select,
    textarea {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 4px;
      padding: 9px 10px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      font: inherit;
    }

    input[type="checkbox"] {
      width: auto;
      min-width: 16px;
      height: 16px;
      margin: 0;
    }

    textarea {
      min-height: 360px;
      resize: vertical;
      line-height: 1.5;
      font-family: var(--vscode-editor-font-family);
    }

    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
      gap: var(--gap);
    }

    .meta-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(180px, 240px) minmax(0, 1fr);
      gap: var(--gap);
    }

    .favorite {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      justify-self: start;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 4px;
    }

    button {
      border: 0;
      border-radius: 4px;
      padding: 8px 14px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
      font: inherit;
    }

    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    @media (max-width: 720px) {
      body {
        padding: 16px;
      }

      .row {
        grid-template-columns: 1fr;
      }

      .meta-row {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <form id="prompt-form">
    <div class="row">
      <label>
        Title
        <input id="title" type="text" value="${title}" placeholder="Example: Code review assistant" autofocus>
      </label>
      <label>
        Content type
        <select id="type">
          ${typeOptions}
        </select>
      </label>
    </div>

    <div class="meta-row">
      <label>
        Category
        <input id="category" type="text" value="${category}" placeholder="Suggestions update when you choose a type" list="category-options">
        <datalist id="category-options"></datalist>
      </label>
      <label>
        Scope
        <select id="scope">
          <option value="${GLOBAL_SCOPE}" ${selectedScope === GLOBAL_SCOPE ? 'selected' : ''}>Global</option>
          <option value="${WORKSPACE_SCOPE}" ${selectedScope === WORKSPACE_SCOPE ? 'selected' : ''}>This Workspace</option>
        </select>
      </label>
      <label>
        Tags
        <input id="tags" type="text" value="${tags}" placeholder="Example: php, wordpress, api">
      </label>
    </div>

    <label class="favorite">
      <input id="favorite" type="checkbox" ${favorite}>
      <span>Add to favorites</span>
    </label>

    <label>
      Content
      <textarea id="content" placeholder="Write a prompt, snippet, command, SQL query, note, or reusable text here">${content}</textarea>
    </label>

    <div class="actions">
      <button class="secondary" type="button" id="cancel">Cancel</button>
      <button type="submit">Save</button>
    </div>
  </form>

  <script>
    const vscode = acquireVsCodeApi();
    const form = document.getElementById('prompt-form');
    const typeSelect = document.getElementById('type');
    const categoryInput = document.getElementById('category');
    const categoryOptions = document.getElementById('category-options');
    const categorySuggestions = ${categorySuggestionsJson};

    function refreshCategoryOptions() {
      const suggestions = categorySuggestions[typeSelect.value] || [];
      categoryOptions.replaceChildren(...suggestions.map(category => {
        const option = document.createElement('option');
        option.value = category;
        return option;
      }));

      if (!categoryInput.value && suggestions.length) {
        categoryInput.placeholder = suggestions[0];
      }
    }

    typeSelect.addEventListener('change', refreshCategoryOptions);
    refreshCategoryOptions();

    document.getElementById('cancel').addEventListener('click', () => {
      vscode.postMessage({ command: 'cancel' });
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      vscode.postMessage({
        command: 'save',
        prompt: {
          title: document.getElementById('title').value,
          type: document.getElementById('type').value,
          scope: document.getElementById('scope').value,
          category: document.getElementById('category').value,
          tags: document.getElementById('tags').value,
          favorite: document.getElementById('favorite').checked,
          content: document.getElementById('content').value
        }
      });
    });
  </script>
</body>
</html>`;
}

function getPromptPreviewHtml(prompt) {
  const type = getContentType(prompt.type);
  const tagsText = formatTags(prompt.tags);
  const meta = [
    ['Scope', getScopeLabel(prompt.scope)],
    ['Type', type.label],
    ['Category', prompt.category || ALL_PROMPTS_CATEGORY],
    ['Tags', tagsText || '-']
  ];
  const content = renderPreviewContent(prompt.content, prompt.type);
  const metaHtml = meta.map(([label, value]) => `
    <div class="meta-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 24px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    main {
      display: grid;
      gap: 18px;
      max-width: 980px;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }

    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }

    .meta-item {
      display: grid;
      gap: 4px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 10px;
      background: var(--vscode-sideBar-background);
    }

    .meta-item span {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    button {
      border: 0;
      border-radius: 4px;
      padding: 8px 12px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
      font: inherit;
    }

    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }

    .content {
      display: grid;
      gap: 12px;
    }

    .text-block,
    pre {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 16px;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-textCodeBlock-background);
      font-family: var(--vscode-editor-font-family);
      line-height: 1.5;
    }

    .text-block {
      font-family: var(--vscode-font-family);
    }

    .code-title {
      margin: 0 0 -8px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      font-family: var(--vscode-editor-font-family);
    }

    code {
      font-family: var(--vscode-editor-font-family);
    }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(prompt.title)}</h1>
    <section class="meta">${metaHtml}</section>
    <div class="actions">
      <button type="button" data-command="copy">Copy</button>
      <button type="button" data-command="insert">Insert into Editor</button>
      <button class="secondary" type="button" data-command="edit">Edit</button>
    </div>
    <section class="content">${content}</section>
  </main>
  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('button[data-command]').forEach(button => {
      button.addEventListener('click', () => {
        vscode.postMessage({ command: button.dataset.command });
      });
    });
  </script>
</body>
</html>`;
}

function renderPreviewContent(content, type) {
  const parts = splitFencedCodeBlocks(content);

  if (parts.length === 1 && parts[0].kind === 'text') {
    return renderTextPreview(parts[0].value, type);
  }

  return parts.map(part => {
    if (part.kind === 'code') {
      const language = part.language || inferPreviewLanguage(type, part.value);
      return `${language ? `<p class="code-title">${escapeHtml(language)}</p>` : ''}<pre><code>${escapeHtml(part.value)}</code></pre>`;
    }

    return renderTextPreview(part.value, type);
  }).join('');
}

function splitFencedCodeBlocks(content) {
  const parts = [];
  const pattern = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', value: content.slice(lastIndex, match.index) });
    }

    parts.push({ kind: 'code', language: match[1] || '', value: match[2].replace(/\n$/, '') });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ kind: 'text', value: content.slice(lastIndex) });
  }

  return parts.filter(part => part.value.trim());
}

function renderTextPreview(content, type) {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return '';
  }

  if (type === 'snippet' || type === 'command') {
    return `<pre><code>${escapeHtml(trimmedContent)}</code></pre>`;
  }

  return `<div class="text-block">${escapeHtml(trimmedContent)}</div>`;
}

function inferPreviewLanguage(type, content) {
  if (type === 'command') return 'shell';
  if (type === 'snippet') return 'code';
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/i.test(content)) return 'sql';
  if (/^\s*[{[]/.test(content)) return 'json';
  return '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  __test: {
    applyTemplateVariables,
    createDuplicatePrompt,
    createDuplicateTitle,
    detectSensitiveContent,
    extractTemplateVariables,
    formatTags,
    getContentType,
    getPromptScope,
    normalizePrompt,
    normalizeTags,
    renderPreviewContent,
    splitFencedCodeBlocks
  }
};
