# message-bridge

A small tool for communicating between window and iframe.

## Usage

```ts
// top 
import { Bridge } from 'iframe-bridge-promised';

const iframe = document.getElementById('iframe');

const bridge = new Bridge(iframe.contentWindow);

// basic
bridge.post({ event: 'say' })
// async
bridge.post({ event: 'delay' }).then(() => {
  console.log('complete');
})
```

```ts
// iframe 
import { Bridge } from 'iframe-bridge-promised';

const bridge = new Bridge(window.parent);

bridge.registerMessageHandler('say', () => {
  console.log('Hello');
});

bridge.registerMessageHandler('delay', () => {
  return Promise(resolve => {
    setTimeout(resolve, 2000);
  })
});
```