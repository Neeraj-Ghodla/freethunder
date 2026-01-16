import * as vscode from 'vscode';
import { sendHttpRequest } from './HttpService';
import { WebviewMessage, ExtensionMessage, HttpResponse } from './types';

export class FreeThunderViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'freethunder.requestView';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            if (message.type === 'sendRequest') {
                try {
                    const response = await sendHttpRequest(message.request);
                    this._sendMessage({ type: 'response', response });
                } catch (error) {
                    this._sendMessage({
                        type: 'error',
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        });
    }

    private _sendMessage(message: ExtensionMessage) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private _getHtmlForWebview(_webview: vscode.Webview): string {
        return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FreeThunder</title>
  <style>
    :root {
      --bg-primary: var(--vscode-editor-background);
      --bg-secondary: var(--vscode-sideBar-background);
      --bg-input: var(--vscode-input-background);
      --border-color: var(--vscode-input-border, #3c3c3c);
      --text-primary: var(--vscode-foreground);
      --text-secondary: var(--vscode-descriptionForeground);
      --accent: var(--vscode-button-background);
      --accent-hover: var(--vscode-button-hoverBackground);
      --success: #4caf50;
      --warning: #ff9800;
      --error: #f44336;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--text-primary);
      background: var(--bg-primary);
      padding: 12px;
      line-height: 1.4;
    }

    /* Request URL Bar */
    .url-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .method-select {
      padding: 8px 12px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-weight: 600;
      cursor: pointer;
      min-width: 100px;
    }

    .method-select:focus {
      outline: 1px solid var(--accent);
    }

    .method-select option {
      background: var(--bg-secondary);
    }

    .url-input {
      flex: 1;
      padding: 8px 12px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: inherit;
    }

    .url-input:focus {
      outline: 1px solid var(--accent);
    }

    .send-btn {
      padding: 8px 20px;
      background: var(--accent);
      border: none;
      border-radius: 4px;
      color: var(--vscode-button-foreground, #fff);
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .send-btn:hover {
      background: var(--accent-hover);
    }

    .send-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Tabs */
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 12px;
    }

    .tab {
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: var(--text-primary);
    }

    .tab.active {
      color: var(--text-primary);
      border-bottom-color: var(--accent);
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    /* Key-Value Editor */
    .kv-editor {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .kv-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .kv-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .kv-input {
      flex: 1;
      padding: 6px 10px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 12px;
    }

    .kv-input:focus {
      outline: 1px solid var(--accent);
    }

    .kv-delete {
      padding: 4px 8px;
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 14px;
    }

    .kv-delete:hover {
      color: var(--error);
      border-color: var(--error);
    }

    .add-row-btn {
      padding: 6px 12px;
      background: none;
      border: 1px dashed var(--border-color);
      border-radius: 4px;
      color: var(--text-secondary);
      cursor: pointer;
      margin-top: 8px;
    }

    .add-row-btn:hover {
      border-color: var(--accent);
      color: var(--text-primary);
    }

    /* Body Editor */
    .body-type-select {
      margin-bottom: 8px;
      padding: 6px 10px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
    }

    .body-textarea {
      width: 100%;
      min-height: 120px;
      padding: 10px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      resize: vertical;
    }

    .body-textarea:focus {
      outline: 1px solid var(--accent);
    }

    /* Response Section */
    .response-section {
      margin-top: 20px;
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
    }

    .response-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .response-title {
      font-weight: 600;
      font-size: 14px;
    }

    .response-status {
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
    }

    .response-status.success {
      background: rgba(76, 175, 80, 0.2);
      color: var(--success);
    }

    .response-status.redirect {
      background: rgba(255, 152, 0, 0.2);
      color: var(--warning);
    }

    .response-status.error {
      background: rgba(244, 67, 54, 0.2);
      color: var(--error);
    }

    .response-meta {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .response-body {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 12px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      max-height: 400px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .response-error {
      color: var(--error);
      padding: 12px;
      background: rgba(244, 67, 54, 0.1);
      border-radius: 4px;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
      padding: 20px 0;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border-color);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .hidden {
      display: none !important;
    }

    /* Response Headers */
    .response-headers {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 12px;
      font-size: 12px;
      max-height: 200px;
      overflow: auto;
    }

    .response-headers-row {
      display: flex;
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .response-headers-row:last-child {
      border-bottom: none;
    }

    .response-headers-key {
      font-weight: 600;
      min-width: 150px;
      color: var(--accent);
    }

    .response-headers-value {
      color: var(--text-primary);
      word-break: break-all;
    }
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
    <input type="text" id="url" class="url-input" placeholder="Enter request URL" value="https://httpbin.org/get">
    <button id="sendBtn" class="send-btn">Send</button>
  </div>

  <!-- Request Tabs -->
  <div class="tabs">
    <button class="tab active" data-tab="params">Params</button>
    <button class="tab" data-tab="headers">Headers</button>
    <button class="tab" data-tab="body">Body</button>
  </div>

  <!-- Params Tab -->
  <div id="params-tab" class="tab-content active">
    <div id="params-editor" class="kv-editor"></div>
    <button class="add-row-btn" data-target="params">+ Add Parameter</button>
  </div>

  <!-- Headers Tab -->
  <div id="headers-tab" class="tab-content">
    <div id="headers-editor" class="kv-editor"></div>
    <button class="add-row-btn" data-target="headers">+ Add Header</button>
  </div>

  <!-- Body Tab -->
  <div id="body-tab" class="tab-content">
    <select id="bodyType" class="body-type-select">
      <option value="json">JSON</option>
      <option value="text">Text</option>
      <option value="form">Form URL Encoded</option>
    </select>
    <textarea id="bodyContent" class="body-textarea" placeholder='{"key": "value"}'></textarea>
  </div>

  <!-- Response Section -->
  <div class="response-section">
    <div class="response-header">
      <span class="response-title">Response</span>
      <span id="responseStatus" class="response-status hidden"></span>
      <span id="responseMeta" class="response-meta"></span>
    </div>
    
    <div id="loading" class="loading hidden">
      <div class="spinner"></div>
      <span>Sending request...</span>
    </div>

    <div id="responseError" class="response-error hidden"></div>

    <!-- Response Tabs -->
    <div id="responseTabs" class="tabs hidden">
      <button class="tab active" data-restab="body">Body</button>
      <button class="tab" data-restab="headers">Headers</button>
    </div>

    <div id="responseBodyTab" class="hidden">
      <pre id="responseBody" class="response-body"></pre>
    </div>

    <div id="responseHeadersTab" class="hidden">
      <div id="responseHeaders" class="response-headers"></div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // State
    let params = [{ key: '', value: '', enabled: true }];
    let headers = [{ key: '', value: '', enabled: true }];

    // DOM Elements
    const methodSelect = document.getElementById('method');
    const urlInput = document.getElementById('url');
    const sendBtn = document.getElementById('sendBtn');
    const paramsEditor = document.getElementById('params-editor');
    const headersEditor = document.getElementById('headers-editor');
    const bodyType = document.getElementById('bodyType');
    const bodyContent = document.getElementById('bodyContent');
    const responseStatus = document.getElementById('responseStatus');
    const responseMeta = document.getElementById('responseMeta');
    const responseBody = document.getElementById('responseBody');
    const responseHeaders = document.getElementById('responseHeaders');
    const responseError = document.getElementById('responseError');
    const loading = document.getElementById('loading');
    const responseTabs = document.getElementById('responseTabs');
    const responseBodyTab = document.getElementById('responseBodyTab');
    const responseHeadersTab = document.getElementById('responseHeadersTab');

    // Render key-value editor
    function renderKVEditor(container, data, type) {
      container.innerHTML = data.map((item, index) => \`
        <div class="kv-row">
          <input type="checkbox" class="kv-checkbox" \${item.enabled ? 'checked' : ''} data-type="\${type}" data-index="\${index}" data-field="enabled">
          <input type="text" class="kv-input" placeholder="Key" value="\${item.key}" data-type="\${type}" data-index="\${index}" data-field="key">
          <input type="text" class="kv-input" placeholder="Value" value="\${item.value}" data-type="\${type}" data-index="\${index}" data-field="value">
          <button class="kv-delete" data-type="\${type}" data-index="\${index}">×</button>
        </div>
      \`).join('');
    }

    // Initialize editors
    renderKVEditor(paramsEditor, params, 'params');
    renderKVEditor(headersEditor, headers, 'headers');

    // Tab switching
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
      });
    });

    // Response tab switching
    document.querySelectorAll('.tab[data-restab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab[data-restab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        responseBodyTab.classList.add('hidden');
        responseHeadersTab.classList.add('hidden');
        
        if (tab.dataset.restab === 'body') {
          responseBodyTab.classList.remove('hidden');
        } else {
          responseHeadersTab.classList.remove('hidden');
        }
      });
    });

    // Add row buttons
    document.querySelectorAll('.add-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const newItem = { key: '', value: '', enabled: true };
        if (target === 'params') {
          params.push(newItem);
          renderKVEditor(paramsEditor, params, 'params');
        } else {
          headers.push(newItem);
          renderKVEditor(headersEditor, headers, 'headers');
        }
      });
    });

    // Handle KV editor changes
    document.addEventListener('input', (e) => {
      if (e.target.classList.contains('kv-input') || e.target.classList.contains('kv-checkbox')) {
        const { type, index, field } = e.target.dataset;
        const data = type === 'params' ? params : headers;
        const value = field === 'enabled' ? e.target.checked : e.target.value;
        data[parseInt(index)][field] = value;
      }
    });

    // Handle KV delete
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('kv-delete')) {
        const { type, index } = e.target.dataset;
        if (type === 'params') {
          params.splice(parseInt(index), 1);
          if (params.length === 0) params.push({ key: '', value: '', enabled: true });
          renderKVEditor(paramsEditor, params, 'params');
        } else {
          headers.splice(parseInt(index), 1);
          if (headers.length === 0) headers.push({ key: '', value: '', enabled: true });
          renderKVEditor(headersEditor, headers, 'headers');
        }
      }
    });

    // Send request
    sendBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) {
        responseError.textContent = 'Please enter a URL';
        responseError.classList.remove('hidden');
        return;
      }

      // Show loading
      loading.classList.remove('hidden');
      responseError.classList.add('hidden');
      responseTabs.classList.add('hidden');
      responseBodyTab.classList.add('hidden');
      responseHeadersTab.classList.add('hidden');
      responseStatus.classList.add('hidden');
      responseMeta.textContent = '';
      sendBtn.disabled = true;

      // Send message to extension
      vscode.postMessage({
        type: 'sendRequest',
        request: {
          method: methodSelect.value,
          url: url,
          headers: headers.filter(h => h.key),
          params: params.filter(p => p.key),
          body: bodyContent.value,
          bodyType: bodyType.value
        }
      });
    });

    // Handle URL input enter key
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendBtn.click();
      }
    });

    // Handle messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      loading.classList.add('hidden');
      sendBtn.disabled = false;

      if (message.type === 'response') {
        const res = message.response;
        
        // Show status
        responseStatus.textContent = res.status + ' ' + res.statusText;
        responseStatus.classList.remove('hidden', 'success', 'redirect', 'error');
        if (res.status >= 200 && res.status < 300) {
          responseStatus.classList.add('success');
        } else if (res.status >= 300 && res.status < 400) {
          responseStatus.classList.add('redirect');
        } else {
          responseStatus.classList.add('error');
        }

        // Show meta
        const sizeKB = (res.size / 1024).toFixed(2);
        responseMeta.textContent = \`\${res.time}ms • \${sizeKB} KB\`;

        // Show body
        try {
          const json = JSON.parse(res.body);
          responseBody.textContent = JSON.stringify(json, null, 2);
        } catch {
          responseBody.textContent = res.body;
        }

        // Show headers
        responseHeaders.innerHTML = Object.entries(res.headers).map(([key, value]) => \`
          <div class="response-headers-row">
            <span class="response-headers-key">\${key}</span>
            <span class="response-headers-value">\${value}</span>
          </div>
        \`).join('');

        responseTabs.classList.remove('hidden');
        responseBodyTab.classList.remove('hidden');
        responseError.classList.add('hidden');

        // Activate body tab
        document.querySelectorAll('.tab[data-restab]').forEach(t => t.classList.remove('active'));
        document.querySelector('.tab[data-restab="body"]').classList.add('active');
        responseHeadersTab.classList.add('hidden');

      } else if (message.type === 'error') {
        responseError.textContent = message.error;
        responseError.classList.remove('hidden');
        responseTabs.classList.add('hidden');
        responseBodyTab.classList.add('hidden');
        responseHeadersTab.classList.add('hidden');
        responseStatus.classList.add('hidden');
      }
    });
  </script>
</body>
</html>
`;
    }
}
