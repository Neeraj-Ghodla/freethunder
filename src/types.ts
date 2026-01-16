/**
 * Key-value pair for headers and query parameters
 */
export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * HTTP request configuration
 */
export interface HttpRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: string;
  bodyType: 'json' | 'text' | 'form';
}

/**
 * HTTP response data
 */
export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

/**
 * Message from webview to extension
 */
export interface WebviewMessage {
  type: 'sendRequest';
  request: HttpRequest;
}

/**
 * Message from extension to webview
 */
export interface ExtensionMessage {
  type: 'response' | 'error';
  response?: HttpResponse;
  error?: string;
}
