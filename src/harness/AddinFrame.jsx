// Hosts the add-in exactly the way FVK will: iframe + postMessage. Nothing shared but messages.
import { useEffect, useRef } from 'react';
import { PROTOCOL, sendToAddin } from '../lib/bridge.js';

const EMBED_URL = `${import.meta.env.BASE_URL}embed.html`;

export default function AddinFrame({ init, onEvent, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (e.source !== ref.current?.contentWindow) return;
      const m = e.data;
      if (!m || m.protocol !== PROTOCOL) return;
      onEvent(m.type, m.payload, 'in');
      if (m.type === 'lk:ready') {
        sendToAddin(ref.current, 'lk:init', init);
        onEvent('lk:init', { ...init, token: init.token ? '•••' : undefined }, 'out');
      }
      if (m.type === 'lk:close') onClose();
    };
    window.addEventListener('message', fn);
    return () => window.removeEventListener('message', fn);
  }, [init, onEvent, onClose]);

  return (
    <div className="overlay host-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="host-frame">
        <div className="host-frame-bar">
          <span>🧩 Lektionskollen add-in <span className="meta">iframe · {EMBED_URL}</span></span>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>
        <iframe ref={ref} src={EMBED_URL} title="Lektionskollen" allow="clipboard-write; local-network-access" />
      </div>
    </div>
  );
}
