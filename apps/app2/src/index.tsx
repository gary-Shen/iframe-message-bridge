import ReactDOM from 'react-dom/client';
import React, { useEffect, useRef } from 'react';
import { Bridge } from 'iframe-message-bridge';

window.name = 'app2'

function App() {
  const bridge = useRef(new Bridge(window.parent));

  useEffect(() => {
    bridge.current.on('say', () => {
      console.log('Hello');
    });

    bridge.current.on('delay', () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('Hi im here'), 2000);
      });
    });

    bridge.current.on('greet', () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            name: 'Vivian',
          });
        }, 2000);
      });
    });

    bridge.current.post('ready');
  }, []);

  return <div>App2</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
