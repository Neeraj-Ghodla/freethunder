import { HttpRequest, HttpResponse } from './types';

/**
 * Send an HTTP request and return the response
 */
export async function sendHttpRequest(request: HttpRequest): Promise<HttpResponse> {
    const startTime = Date.now();

    // Build URL with query parameters
    const url = new URL(request.url);
    for (const param of request.params) {
        if (param.enabled && param.key) {
            url.searchParams.append(param.key, param.value);
        }
    }

    // Build headers
    const headers: Record<string, string> = {};
    for (const header of request.headers) {
        if (header.enabled && header.key) {
            headers[header.key] = header.value;
        }
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
        method: request.method,
        headers,
    };

    // Add body for non-GET requests
    if (request.method !== 'GET' && request.body) {
        if (request.bodyType === 'json') {
            headers['Content-Type'] = 'application/json';
            fetchOptions.body = request.body;
        } else if (request.bodyType === 'form') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            fetchOptions.body = request.body;
        } else {
            headers['Content-Type'] = 'text/plain';
            fetchOptions.body = request.body;
        }
        fetchOptions.headers = headers;
    }

    try {
        const response = await fetch(url.toString(), fetchOptions);
        const endTime = Date.now();

        // Get response body
        const bodyText = await response.text();

        // Extract response headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        return {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body: bodyText,
            time: endTime - startTime,
            size: new TextEncoder().encode(bodyText).length,
        };
    } catch (error) {
        throw new Error(`Request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
