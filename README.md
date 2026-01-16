# FreeThunder

A lightweight HTTP client extension for VS Code, similar to Thunder Client.

## Features

- **HTTP Methods**: Support for GET, POST, PUT, PATCH, DELETE
- **Headers**: Add custom request headers
- **Query Parameters**: Easy parameter management
- **Request Body**: JSON, Text, and Form URL Encoded body types
- **Response Viewer**: Formatted response with status, timing, and size
- **VS Code Integration**: Native activity bar integration with dedicated panel

## Usage

1. Click the FreeThunder icon (⚡) in the activity bar
2. Select the HTTP method (GET, POST, PUT, PATCH, DELETE)
3. Enter the request URL
4. Configure headers, params, and body as needed
5. Click **Send** to execute the request
6. View the response with status, timing, headers, and body

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Run tests
npm run test
```

## Testing the Extension

1. Open this project in VS Code
2. Press `F5` to launch the Extension Development Host
3. In the new VS Code window, click the FreeThunder icon in the activity bar
4. Try making requests to test APIs like:
   - GET: `https://httpbin.org/get`
   - POST: `https://httpbin.org/post` with JSON body
   - PUT: `https://httpbin.org/put`
   - PATCH: `https://httpbin.org/patch`
   - DELETE: `https://httpbin.org/delete`

## License

MIT
