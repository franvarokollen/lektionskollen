// Shows every message crossing the host ↔ add-in boundary. This is the contract, live.
export default function EventLog({ events, onClear }) {
  return (
    <div className="card eventlog">
      <div className="eventlog-head">
        <strong>postMessage log</strong>
        <span className="meta">what FVK would send / receive</span>
        <span className="spacer" />
        <button className="btn ghost" onClick={onClear} disabled={!events.length}>Clear</button>
      </div>
      {!events.length ? (
        <div className="empty">No messages yet. Press “Lektionsplan behövs” on an absence.</div>
      ) : (
        <ul>
          {events.map((e) => (
            <li key={e.id} className={e.dir}>
              <span className="mono meta">{e.time}</span>
              <span className="dir">{e.dir === 'in' ? 'add-in → FVK' : 'FVK → add-in'}</span>
              <code className="type">{e.type}</code>
              <details>
                <summary>payload</summary>
                <pre>{JSON.stringify(e.payload, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
