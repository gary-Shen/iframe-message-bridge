import ReactDOM from 'react-dom/client';
import React, { useEffect, useRef } from 'react';
import { Bridge } from 'iframe-message-bridge';

window.name = 'app1'

function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) {
      return;
    }

    const bridge = new Bridge(iframeRef.current.contentWindow!);

    bridge.on('ready', () => {
      console.log('target is ready')
      // basic
      bridge.post('say');
      // async
      bridge.post('delay').then((response) => {
        console.log(response);
      });
    });

    // with payload
    // bridge
    //   .post('greet', {
    //     name: 'asdasdasd',
    //   })
    //   .then((response) => {
    //     // Vivian
    //     console.log(response.name);
    //   });
  }, []);

  return <div>App1
    <iframe src="http://localhost:3101" ref={iframeRef} />
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
