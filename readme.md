# message-bridge

A small tool for communicating between window and iframe.

## Usage

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
