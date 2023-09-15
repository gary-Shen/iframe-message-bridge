import ReactDOM from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { Route, Routes } from 'react-router';
import { Bridge } from 'iframe-message-bridge';
import { BrowserRouter } from 'react-router-dom';

import './index.css';

function Home() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridge = useRef<Bridge>();
  const [value, setValue] = useState('');
  const handleSubmit = () => {
    bridge.current!.post('send', value);
  };

  useEffect(() => {
    if (!iframeRef.current) {
      return;
    }

    bridge.current = new Bridge(iframeRef.current.contentWindow!);

    bridge.current.on('ready', () => {
      console.log('target is ready');
      // basic
      bridge.current!.post('say');
      // async
      bridge.current!.post('delay').then((response) => {
        console.log(response);
      });
      // with payload
      bridge
        .current!.post('greet', {
          name: 'asdasdasd',
        })
        .then((response) => {
          // Vivian
          console.log(response);
        });
    });

    return () => bridge.current!.destroy();
  }, []);

  return (
    <div className="home">
      <div className="title">Parent</div>
      <div className="input-group">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
        />
        <button onClick={handleSubmit}>Send</button>
      </div>
      <div className="iframe-wrapper">
        <iframe src="/child" ref={iframeRef} />
      </div>
    </div>
  );
}

function Child() {
  const bridge = useRef(new Bridge(window.parent));
  const [valueFromParent, setValueFromParent] = useState('');

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

    bridge.current.on('send', (payload: string) => {
      setValueFromParent(payload);
    });

    bridge.current.post('ready');

    return () => bridge.current.destroy();
  }, []);

  return (
    <div className="child">
      <div className="title">Child</div>
      <div className="content">{valueFromParent}</div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/child" element={<Child />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
