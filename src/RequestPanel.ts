import * as vscode from 'vscode';
import { sendHttpRequest } from './HttpService';
import { WebviewMessage } from './types';

export class RequestPanel {
  public static currentPanels: Map<string, RequestPanel> = new Map();
  private static panelCounter = 0;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private readonly _id: string;

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    RequestPanel.panelCounter++;
    const id = `request-${RequestPanel.panelCounter}`;
    const panel = new RequestPanel(extensionUri, column || vscode.ViewColumn.One, id);
    RequestPanel.currentPanels.set(id, panel);
  }

  private constructor(extensionUri: vscode.Uri, column: vscode.ViewColumn, id: string) {
    this._extensionUri = extensionUri;
    this._id = id;

    this._panel = vscode.window.createWebviewPanel(
      'freethunderRequest',
      'New Request',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.iconPath = {
      light: vscode.Uri.joinPath(extensionUri, 'media', 'icon.svg'),
      dark: vscode.Uri.joinPath(extensionUri, 'media', 'icon.svg'),
    };

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        if (message.type === 'sendRequest') {
          try {
            const response = await sendHttpRequest(message.request);
            this._panel.webview.postMessage({ type: 'response', response });
          } catch (error) {
            this._panel.webview.postMessage({
              type: 'error',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    RequestPanel.currentPanels.delete(this._id);
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }

  private _getHtmlForWebview(): string {
    return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Request</title>
  <style>
    :root {
      --bg-primary: #1e1e1e;
      --bg-secondary: #252526;
      --bg-tertiary: #2d2d30;
      --bg-input: #1e1e1e;
      --border-color: #404040;
      --text-primary: #cccccc;
      --text-secondary: #808080;
      --text-placeholder: #5a5a5a;
      --accent: #0e639c;
      --accent-hover: #1177bb;
      --success: #4ec9b0;
      --error: #f14c4c;
      --link: #3794ff;
      --checkbox-bg: #3c3c3c;
      --checkbox-checked: #0e639c;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: var(--text-primary);
      background: var(--bg-primary);
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* URL Bar */
    .url-bar {
      display: flex;
      gap: 10px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      align-items: center;
    }

    .method-select {
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 13px;
      cursor: pointer;
    }

    .url-input {
      flex: 1;
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 13px;
    }

    .url-input:focus, .method-select:focus {
      outline: 1px solid var(--accent);
    }

    .send-btn {
      padding: 8px 24px;
      background: var(--accent);
      border: none;
      border-radius: 4px;
      color: #fff;
      font-weight: 500;
      cursor: pointer;
    }

    .send-btn:hover { background: var(--accent-hover); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Main Layout */
    .main-content {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .request-panel, .response-panel {
      width: 50%;
      display: flex;
      flex-direction: column;
    }

    .response-panel {
      border-left: 1px solid var(--border-color);
    }

    /* Tabs */
    .tabs-bar {
      display: flex;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: 0 16px;
    }

    .tab {
      padding: 10px 16px;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 13px;
      position: relative;
    }

    .tab:hover { color: var(--text-primary); }
    .tab.active { color: var(--text-primary); }
    .tab.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
    }

    .tab-badge {
      font-size: 10px;
      vertical-align: super;
      margin-left: 2px;
    }

    .tab-content {
      display: none;
      flex: 1;
      overflow: auto;
      padding: 16px 20px;
    }

    .tab-content.active { display: flex; flex-direction: column; }

    /* Section Header */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 14px;
      color: var(--text-primary);
    }

    .section-action {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-size: 13px;
    }

    .section-action input[type="checkbox"] {
      width: 16px;
      height: 16px;
    }

    /* Key-Value Rows */
    .kv-list {
      display: flex;
      flex-direction: column;
    }

    .kv-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .kv-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--checkbox-checked);
      cursor: pointer;
      flex-shrink: 0;
    }

    .kv-inputs {
      display: flex;
      flex: 1;
      gap: 0;
    }

    .kv-input {
      flex: 1;
      padding: 8px 0;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
      font-size: 13px;
    }

    .kv-input::placeholder {
      color: var(--text-placeholder);
    }

    .kv-input:focus {
      outline: none;
      border-bottom-color: var(--accent);
    }

    .kv-input.key {
      margin-right: 24px;
    }

    /* Body Tab */
    .body-types-bar {
      display: flex;
      gap: 0;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .body-type-tab {
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 13px;
      position: relative;
    }

    .body-type-tab:hover { color: var(--text-primary); }
    .body-type-tab.active { color: var(--text-primary); }
    .body-type-tab.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
    }

    .body-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .body-label {
      font-size: 14px;
      color: var(--text-primary);
    }

    .format-btn {
      padding: 4px 12px;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 13px;
    }

    .format-btn:hover { color: var(--text-primary); }

    .body-editor-container {
      display: flex;
      flex: 1;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      overflow: hidden;
      min-height: 200px;
    }

    .body-line-numbers {
      padding: 12px 0;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.5;
      text-align: right;
      user-select: none;
      min-width: 40px;
    }

    .body-line-numbers div {
      padding: 0 12px;
    }

    .body-textarea {
      flex: 1;
      padding: 12px;
      background: var(--bg-input);
      border: none;
      color: var(--text-primary);
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.5;
      resize: none;
    }

    .body-textarea:focus { outline: none; }

    /* Response Status Bar */
    .status-bar {
      display: flex;
      gap: 24px;
      padding: 10px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      font-size: 13px;
    }

    .status-item {
      display: flex;
      gap: 6px;
    }

    .status-label { color: var(--text-secondary); }
    .status-value { color: var(--text-primary); }
    .status-value.success { color: var(--success); }
    .status-value.error { color: var(--error); }

    /* Response Body */
    .response-body-container {
      display: flex;
      flex: 1;
      overflow: hidden;
      background: var(--bg-input);
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.5;
    }

    .line-numbers {
      padding: 12px 0;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      text-align: right;
      user-select: none;
      min-width: 40px;
      border-right: 1px solid var(--border-color);
    }

    .line-numbers div { padding: 0 12px; }

    .response-code {
      flex: 1;
      padding: 12px 16px;
      overflow: auto;
      white-space: pre;
    }

    /* Response Headers List */
    .response-headers-list { padding: 0; }

    .header-row {
      display: flex;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .header-key {
      min-width: 180px;
      color: var(--link);
    }

    .header-value {
      flex: 1;
      word-break: break-all;
    }

    /* States */
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--text-secondary);
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex: 1;
      color: var(--text-secondary);
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-color);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-message {
      color: var(--error);
      padding: 16px;
      background: rgba(241, 76, 76, 0.1);
      border-radius: 4px;
      margin: 16px;
    }

    .hidden { display: none !important; }

    /* JSON Syntax */
    .json-key { color: #9cdcfe; }
    .json-string { color: #ce9178; }
    .json-number { color: #b5cea8; }
    .json-boolean { color: #569cd6; }
    .json-null { color: #569cd6; }
  </style>
</head>
<body>
  <!-- URL Bar -->
  <div class="url-bar">
    <select id="method" class="method-select">
      <option value="GET">GET</option>
      <option value="POST">POST</option>
      <option value="PUT">PUT</option>
      <option value="PATCH">PATCH</option>
      <option value="DELETE">DELETE</option>
    </select>
    <input type="text" id="url" class="url-input" placeholder="https://api.example.com/endpoint" value="https://httpbin.org/get">
    <button id="sendBtn" class="send-btn">Send</button>
  </div>

  <div class="main-content">
    <!-- Request Panel -->
    <div class="request-panel">
      <div class="tabs-bar">
        <button class="tab active" data-tab="query">Query</button>
        <button class="tab" data-tab="headers">Headers</button>
        <button class="tab" data-tab="body">Body</button>
      </div>

      <!-- Query Tab -->
      <div id="query-tab" class="tab-content active">
        <div class="section-header">
          <span class="section-title">Query Parameters</span>
        </div>
        <div id="params-list" class="kv-list"></div>
      </div>

      <!-- Headers Tab -->
      <div id="headers-tab" class="tab-content">
        <div class="section-header">
          <span class="section-title">HTTP Headers</span>
          <label class="section-action">
            <input type="checkbox" id="rawHeaders">
            <span>Raw</span>
          </label>
        </div>
        <div id="headers-list" class="kv-list"></div>
      </div>

      <!-- Body Tab -->
      <div id="body-tab" class="tab-content">
        <div class="body-types-bar">
          <button class="body-type-tab active" data-type="json">JSON</button>
          <button class="body-type-tab" data-type="xml">XML</button>
          <button class="body-type-tab" data-type="text">Text</button>
          <button class="body-type-tab" data-type="form">Form</button>
          <button class="body-type-tab" data-type="form-encode">Form-encode</button>
        </div>
        <div class="body-header">
          <span class="body-label">JSON Content</span>
          <button class="format-btn" id="formatBtn">Format</button>
        </div>
        <div class="body-editor-container">
          <div id="bodyLineNumbers" class="body-line-numbers"><div>1</div></div>
          <textarea id="bodyContent" class="body-textarea" placeholder=""></textarea>
        </div>
      </div>
    </div>

    <!-- Response Panel -->
    <div class="response-panel">
      <div id="statusBar" class="status-bar hidden">
        <div class="status-item">
          <span class="status-label">Status:</span>
          <span id="statusValue" class="status-value"></span>
        </div>
        <div class="status-item">
          <span class="status-label">Size:</span>
          <span id="sizeValue" class="status-value"></span>
        </div>
        <div class="status-item">
          <span class="status-label">Time:</span>
          <span id="timeValue" class="status-value"></span>
        </div>
      </div>

      <div id="responseTabs" class="tabs-bar hidden">
        <button class="tab active" data-restab="response">Response</button>
        <button class="tab" data-restab="headers">Headers<span id="headersCount" class="tab-badge"></span></button>
      </div>

      <div id="emptyState" class="empty-state">
        Click Send to make a request
      </div>

      <div id="loading" class="loading hidden">
        <div class="spinner"></div>
        <span>Sending request...</span>
      </div>

      <div id="responseError" class="error-message hidden"></div>

      <div id="response-tab" class="tab-content active hidden">
        <div class="response-body-container">
          <div id="lineNumbers" class="line-numbers"></div>
          <div id="responseCode" class="response-code"></div>
        </div>
      </div>

      <div id="headers-response-tab" class="tab-content hidden">
        <div id="responseHeadersList" class="response-headers-list"></div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // State
    let params = [{ key: '', value: '', enabled: false }];
    let headers = [
      { key: 'Accept', value: '*/*', enabled: true },
      { key: 'User-Agent', value: 'FreeThunder (https://github.com/freethunder)', enabled: true },
      { key: '', value: '', enabled: false }
    ];
    let bodyType = 'json';

    // Elements
    const methodSelect = document.getElementById('method');
    const urlInput = document.getElementById('url');
    const sendBtn = document.getElementById('sendBtn');
    const paramsList = document.getElementById('params-list');
    const headersList = document.getElementById('headers-list');
    const bodyContent = document.getElementById('bodyContent');
    const bodyLineNumbers = document.getElementById('bodyLineNumbers');
    const statusBar = document.getElementById('statusBar');
    const statusValue = document.getElementById('statusValue');
    const sizeValue = document.getElementById('sizeValue');
    const timeValue = document.getElementById('timeValue');
    const responseTabs = document.getElementById('responseTabs');
    const lineNumbers = document.getElementById('lineNumbers');
    const responseCode = document.getElementById('responseCode');
    const responseHeadersList = document.getElementById('responseHeadersList');
    const headersCount = document.getElementById('headersCount');
    const responseError = document.getElementById('responseError');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    const responseTab = document.getElementById('response-tab');
    const headersResponseTab = document.getElementById('headers-response-tab');
    const formatBtn = document.getElementById('formatBtn');

    // Render key-value list
    function renderKVList(container, data, type) {
      container.innerHTML = data.map((item, index) => \`
        <div class="kv-row">
          <input type="checkbox" \${item.enabled ? 'checked' : ''} data-type="\${type}" data-index="\${index}" data-field="enabled">
          <div class="kv-inputs">
            <input type="text" class="kv-input key" placeholder="\${type === 'params' ? 'parameter' : 'header'}" value="\${item.key}" data-type="\${type}" data-index="\${index}" data-field="key">
            <input type="text" class="kv-input value" placeholder="value" value="\${item.value}" data-type="\${type}" data-index="\${index}" data-field="value">
          </div>
        </div>
      \`).join('');
    }

    // Update body line numbers
    function updateBodyLineNumbers() {
      const lines = bodyContent.value.split('\\n');
      bodyLineNumbers.innerHTML = lines.map((_, i) => \`<div>\${i + 1}</div>\`).join('');
    }

    // Add new row when typing in last empty row
    function checkAndAddRow(type, index) {
      const data = type === 'params' ? params : headers;
      if (index === data.length - 1 && data[index].key) {
        data.push({ key: '', value: '', enabled: false });
        renderKVList(type === 'params' ? paramsList : headersList, data, type);
      }
    }

    // Syntax highlight JSON
    function highlightJson(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?)/g, (match) => {
          let cls = 'json-string';
          if (/:$/.test(match)) cls = 'json-key';
          return '<span class="' + cls + '">' + match + '</span>';
        })
        .replace(/\\b(true|false)\\b/g, '<span class="json-boolean">$1</span>')
        .replace(/\\bnull\\b/g, '<span class="json-null">null</span>')
        .replace(/\\b(-?\\d+\\.?\\d*([eE][+-]?\\d+)?)\\b/g, '<span class="json-number">$1</span>');
    }

    // Initialize
    renderKVList(paramsList, params, 'params');
    renderKVList(headersList, headers, 'headers');
    updateBodyLineNumbers();

    // Body content changes
    bodyContent.addEventListener('input', updateBodyLineNumbers);

    // Format button
    formatBtn.addEventListener('click', () => {
      try {
        const json = JSON.parse(bodyContent.value);
        bodyContent.value = JSON.stringify(json, null, 2);
        updateBodyLineNumbers();
      } catch {}
    });

    // Tab switching - Request
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.request-panel .tab[data-tab]').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.request-panel .tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
      });
    });

    // Tab switching - Response
    document.querySelectorAll('.tab[data-restab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab[data-restab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        responseTab.classList.add('hidden');
        headersResponseTab.classList.add('hidden');
        if (tab.dataset.restab === 'response') {
          responseTab.classList.remove('hidden');
        } else {
          headersResponseTab.classList.remove('hidden');
        }
      });
    });

    // Body type tabs
    document.querySelectorAll('.body-type-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.body-type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        bodyType = tab.dataset.type;
        
        // Update label
        const labels = { json: 'JSON Content', xml: 'XML Content', text: 'Text Content', form: 'Form Data', 'form-encode': 'Form URL Encoded' };
        document.querySelector('.body-label').textContent = labels[bodyType] || 'Content';
      });
    });

    // Handle input changes
    document.addEventListener('input', (e) => {
      const target = e.target;
      if (target.dataset.type && target.dataset.index !== undefined) {
        const { type, index, field } = target.dataset;
        const data = type === 'params' ? params : headers;
        const idx = parseInt(index);
        
        if (field === 'enabled') {
          data[idx].enabled = target.checked;
        } else {
          data[idx][field] = target.value;
          // Auto-enable when typing
          if (target.value && !data[idx].enabled) {
            data[idx].enabled = true;
            renderKVList(type === 'params' ? paramsList : headersList, data, type);
          }
          checkAndAddRow(type, idx);
        }
      }
    });

    // Send request
    sendBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) {
        responseError.textContent = 'Please enter a URL';
        responseError.classList.remove('hidden');
        emptyState.classList.add('hidden');
        return;
      }

      loading.classList.remove('hidden');
      emptyState.classList.add('hidden');
      responseError.classList.add('hidden');
      statusBar.classList.add('hidden');
      responseTabs.classList.add('hidden');
      responseTab.classList.add('hidden');
      headersResponseTab.classList.add('hidden');
      sendBtn.disabled = true;

      vscode.postMessage({
        type: 'sendRequest',
        request: {
          method: methodSelect.value,
          url: url,
          headers: headers.filter(h => h.key && h.enabled),
          params: params.filter(p => p.key && p.enabled),
          body: bodyContent.value,
          bodyType: bodyType === 'form-encode' ? 'form' : bodyType
        }
      });
    });

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendBtn.click();
    });

    // Handle response
    window.addEventListener('message', (event) => {
      const message = event.data;
      loading.classList.add('hidden');
      sendBtn.disabled = false;

      if (message.type === 'response') {
        const res = message.response;
        
        statusBar.classList.remove('hidden');
        statusValue.textContent = res.status + ' ' + res.statusText;
        statusValue.classList.remove('success', 'error');
        statusValue.classList.add(res.status >= 200 && res.status < 300 ? 'success' : 'error');
        
        let sizeStr = res.size + ' Bytes';
        if (res.size >= 1024) sizeStr = (res.size / 1024).toFixed(2) + ' KB';
        sizeValue.textContent = sizeStr;
        
        let timeStr = res.time + ' ms';
        if (res.time >= 1000) timeStr = (res.time / 1000).toFixed(2) + ' s';
        timeValue.textContent = timeStr;

        let formattedBody = res.body;
        try {
          const json = JSON.parse(res.body);
          formattedBody = JSON.stringify(json, null, 2);
        } catch {}

        const lines = formattedBody.split('\\n');
        lineNumbers.innerHTML = lines.map((_, i) => \`<div>\${i + 1}</div>\`).join('');
        
        try {
          JSON.parse(res.body);
          responseCode.innerHTML = highlightJson(formattedBody);
        } catch {
          responseCode.textContent = formattedBody;
        }

        const headerEntries = Object.entries(res.headers);
        headersCount.textContent = headerEntries.length;
        responseHeadersList.innerHTML = headerEntries.map(([key, value]) => \`
          <div class="header-row">
            <span class="header-key">\${key}</span>
            <span class="header-value">\${value}</span>
          </div>
        \`).join('');

        responseTabs.classList.remove('hidden');
        responseTab.classList.remove('hidden');
        
        document.querySelectorAll('.tab[data-restab]').forEach(t => t.classList.remove('active'));
        document.querySelector('.tab[data-restab="response"]').classList.add('active');
        headersResponseTab.classList.add('hidden');
        responseError.classList.add('hidden');
        emptyState.classList.add('hidden');

      } else if (message.type === 'error') {
        responseError.textContent = message.error;
        responseError.classList.remove('hidden');
        statusBar.classList.add('hidden');
        responseTabs.classList.add('hidden');
        responseTab.classList.add('hidden');
        headersResponseTab.classList.add('hidden');
        emptyState.classList.add('hidden');
      }
    });
  </script>
</body>
</html>
`;
  }
}
