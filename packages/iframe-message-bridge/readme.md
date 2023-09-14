# iframe-message-bridge

[![Version npm](https://img.shields.io/npm/v/iframe-message-bridge.svg?style=flat-square)](https://www.npmjs.com/package/iframe-message-bridge)

A small tool for communicating between window and iframe.

## Usage

### Basic

```bash
npm install iframe-message-bridge
```

### Example

```ts
// top
import { Bridge } from 'iframe-bridge-promised';

const iframe = document.getElementById('iframe');

const bridge = new Bridge(iframe.contentWindow);

bridge.on('ready', () => {
  // basic
  bridge.post('say');
  // async
  bridge.post('delay').then(() => {
    console.log('complete');
  });
  // with payload
  bridge
    .post('greet', {
      name: 'John',
    })
    .then((response) => {
      // Vivian
      console.log(response.name);
    });
});
```

```ts
// iframe
import { Bridge } from 'iframe-bridge-promised';

const bridge = new Bridge(window.parent);

bridge.post('ready');

bridge.on('say', () => {
  console.log('Hello');
});

bridge.on('delay', () => {
  return Promise((resolve) => {
    setTimeout(resolve, 2000);
  });
});

bridge.on('greet', (payload) => {
  console.log(payload.name); // John
  return Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: 'Vivian',
      });
    }, 2000);
  });
});
```

### Options

#### targetWindow `required`

The target window object.

#### prefix `default: 'iframe-message-bridge'`

The prefix of event name. only used internally to prevent irrelevant postMessage event.

#### timeout `default: 20000`

The timeout of post event promise.

#### targetOrigin `default: '*'`

see [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

#### transfer `default: undefined`

see [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
