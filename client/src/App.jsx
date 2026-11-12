import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, Plus, Download, Image as ImageIcon, Check, X, MessageSquare, Trash2, LoaderCircle, Sun, Moon, PanelLeftClose, PanelLeftOpen, Clock3 } from "lucide-react";

const API = "/api";
const starterMessage = {
  role: "assistant",
  text: "Hello! I'm ROMP-LLM. Describe the system you want to model, and I'll ask for any missing information before creating its Petri Net diagram.\n\nFor example: “Model a predator–prey ecosystem with 50 prey and 25 predators.”"
};

export default function App() {
  const [messages, setMessages] = useState([starterMessage]);
  const [sessions, setSessions] = useState(() => { try { return JSON.parse(localStorage.getItem("romp-chat-history") || "[]"); } catch { return []; } });
  const [activeSession, setActiveSession] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("romp-theme") || "light");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState(null);
  const [saved, setSaved] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  async function loadSaved() {
    try {
      const r = await fetch(`${API}/diagrams`);
      if (r.ok) setSaved(await r.json());
    } catch {}
  }
  useEffect(() => { loadSaved(); }, []);
  useEffect(() => { localStorage.setItem("romp-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("romp-chat-history", JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => {
    if (messages.length <= 1) return;
    const title = messages.find(m => m.role === "user")?.text?.slice(0, 48) || "New Petri Net chat";
    const id = activeSession || `chat-${Date.now()}`;
    if (!activeSession) setActiveSession(id);
    setSessions(old => [{ id, title, messages, updatedAt: new Date().toISOString() }, ...old.filter(x => x.id !== id)].slice(0, 40));
  }, [messages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setError("");
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setBusy(true);
    try {
      const history = next.slice(-16).map(m => ({ role: m.role, content: m.text }));
      const r = await fetch(`${API}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "The assistant could not complete the request.");
      const newModel = data.model || null;
      if (newModel?.places?.length) setModel(newModel);
      setMessages(old => [...old, { role: "assistant", text: data.reply || "I have updated your Petri Net.", model: newModel?.places?.length ? newModel : null }]);
    } catch (e) {
      setMessages(old => [...old, { role: "assistant", text: `I couldn't complete that request. ${e.message}` }]);
    } finally { setBusy(false); }
  }

  function newChat() {
    setActiveSession(null);
    setMessages([starterMessage]);
    setModel(null);
    setError("");
    fetch(`${API}/model/reset`, { method: "POST" }).catch(() => {});
    setShowLibrary(false);
    inputRef.current?.focus();
  }

  function openSession(session) {
    setActiveSession(session.id);
    setMessages(session.messages || [starterMessage]);
    const lastModel = [...(session.messages || [])].reverse().find(m => m.model)?.model;
    setModel(lastModel || null);
    setShowLibrary(false);
  }

  function demoChat() {
    const demoModel = {
      title: "Predator–Prey Ecosystem", description: "A simple population model with reproduction and predation",
      places: [{id:"prey",type:"place",name:"Prey",tokens:50,x:90,y:105},{id:"predators",type:"place",name:"Predators",tokens:25,x:90,y:290}],
      transitions: [{id:"birth",type:"transition",name:"Reproduction",rate:"0.08 / day",x:390,y:105},{id:"hunt",type:"transition",name:"Predation",rate:"0.02 / day",x:390,y:290}],
      arcs: [{id:"a1",source:"prey",target:"birth",weight:1},{id:"a2",source:"birth",target:"prey",weight:2},{id:"a3",source:"prey",target:"hunt",weight:1},{id:"a4",source:"predators",target:"hunt",weight:1},{id:"a5",source:"hunt",target:"predators",weight:1}],
      parameters: [{label:"Initial prey",value:"50"},{label:"Initial predators",value:"25"},{label:"Birth rate",value:"0.08 / day"},{label:"Hunt rate",value:"0.02 / day"},{label:"Time unit",value:"day"}]
    };
    setActiveSession(null); setModel(demoModel);
    setMessages([{role:"assistant",text:"Here is a complete example conversation for your ROMP-LLM Petri Net project."},{role:"user",text:"Create a predator–prey model with 50 prey and 25 predators."},{role:"assistant",text:"I have the initial populations. What are the prey reproduction rate, predator hunting rate, and time unit?"},{role:"user",text:"Prey birth rate is 0.08 per day and hunting rate is 0.02 per day. Use days."},{role:"assistant",text:"Great — I created the Petri Net with Prey and Predators places, Reproduction and Predation transitions, and the connected arcs. You can inspect and download the diagram below.",model:demoModel}]);
  }

  async function saveDiagram(blob, format, modelName) {
    const dataUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    const r = await fetch(`${API}/diagrams/save`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, format, name: modelName || "petri-net" })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Could not save image");
    await loadSaved();
    return data;
  }

  async function downloadDiagram(svgElement, format, modelName) {
    if (!svgElement) return;
    try {
      const svgText = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1800; canvas.height = 1100;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const mime = format === "jpg" ? "image/jpeg" : "image/png";
        canvas.toBlob(async blob => {
          if (!blob) return;
          const a = document.createElement("a");
          const localUrl = URL.createObjectURL(blob);
          a.href = localUrl; a.download = `${slug(modelName)}.${format}`;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(localUrl);
          try { await saveDiagram(blob, format, modelName); } catch (e) { setError(`Downloaded, but server save failed: ${e.message}`); }
        }, mime, 0.94);
      };
      img.onerror = () => { URL.revokeObjectURL(url); setError("Could not render the diagram image."); };
      img.src = url;
    } catch (e) { setError(e.message); }
  }

  return <div className={`app theme-${theme}`}>
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Sparkles size={19}/></div>
        <div><strong>ROMP<span>-LLM</span></strong><small>Petri Net AI</small></div>
      </div>
      <div className="top-actions">
        <button className="header-btn theme-toggle" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} title="Toggle theme">{theme === "light" ? <Moon size={16}/> : <Sun size={16}/>} {theme === "light" ? "Dark" : "Light"}</button>
        <button className="header-btn" onClick={() => setShowLibrary(v => !v)}><ImageIcon size={16}/> Saved diagrams <span className="count">{saved.length}</span></button>
        <button className="new-chat" onClick={newChat}><Plus size={16}/> New chat</button>
      </div>
    </header>

    {showLibrary && <div className="library-popover">
      <div className="library-head"><b>Saved diagrams</b><button onClick={() => setShowLibrary(false)}><X size={16}/></button></div>
      {saved.length ? <div className="saved-list">{saved.map(item => <a key={item.name} href={item.url} download><ImageIcon size={16}/><span>{item.name}</span><Download size={14}/></a>)}</div> : <p className="library-empty">Your saved PNG and JPG diagrams will appear here.</p>}
    </div>}

    <div className="workspace">
    {sidebarOpen && <aside className="sidebar">
      <button className="side-new" onClick={newChat}><Plus size={16}/> New chat</button>
      <button className="demo-button" onClick={demoChat}><Sparkles size={15}/> Load project demo</button>
      <div className="history-title"><Clock3 size={13}/> Recent chats</div>
      <div className="history-list">{sessions.map(session => <button key={session.id} className={`history-item ${activeSession===session.id?"active":""}`} onClick={() => openSession(session)}><MessageSquare size={14}/><span>{session.title}</span><small>{new Date(session.updatedAt).toLocaleDateString()}</small></button>)}</div>
      <div className="sidebar-foot">ROMP-LLM · Petri Net workspace</div>
    </aside>}
    <main className="chat-page">
      <div className="chat-toolbar"><button className="collapse-btn" onClick={() => setSidebarOpen(v => !v)} title="Toggle chat history">{sidebarOpen ? <PanelLeftClose size={16}/> : <PanelLeftOpen size={16}/>}</button><span>Modeling workspace</span><button className="demo-inline" onClick={demoChat}>Try demo</button></div>
      <section className="conversation">
        {messages.length === 1 && <div className="welcome">
          <div className="welcome-icon"><Sparkles size={27}/></div>
          <h1>What would you like to model?</h1>
          <p>Describe your system in your own words. I'll help you turn it into a Petri Net.</p>
          <div className="examples">
            <button onClick={() => send("Create a predator-prey model with 50 prey and 25 predators.")}>
              <span className="example-icon green"><Sparkles size={16}/></span><span><b>Predator–prey ecosystem</b><small>50 prey · 25 predators · birth and hunt rates</small></span>
            </button>
            <button onClick={() => send("I want to model a population system. Ask me what information you need.")}>
              <span className="example-icon blue"><MessageSquare size={16}/></span><span><b>Population dynamics</b><small>Describe a population and its changes</small></span>
            </button>
          </div>
        </div>}

        <div className="message-list">
          {messages.map((m, i) => <React.Fragment key={i}>
            <div className={`message-row ${m.role}`}>
              <div className={`avatar ${m.role}`}>{m.role === "assistant" ? <Bot size={17}/> : "Y"}</div>
              <div className="message-content">
                <div className="message-author">{m.role === "assistant" ? "ROMP Assistant" : "You"}</div>
                <div className="message-text">{m.text}</div>
                {m.model && <DiagramCard model={m.model} onDownload={downloadDiagram}/>}
              </div>
            </div>
          </React.Fragment>)}
          {busy && <div className="message-row assistant"><div className="avatar assistant"><Bot size={17}/></div><div className="message-content"><div className="message-author">ROMP Assistant</div><div className="thinking"><LoaderCircle size={15} className="spin"/> Thinking and updating your model…</div></div></div>}
          <div ref={bottomRef}/>
        </div>
      </section>
    </main>
    </div>

    {error && <div className="error-toast">{error}<button onClick={() => setError("")}><X size={14}/></button></div>}
    <footer className="composer-area">
      <form className="composer" onSubmit={e => { e.preventDefault(); send(); }}>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Message ROMP-LLM…" rows={1}/>
        <div className="composer-bottom">
          <span><Sparkles size={13}/> Ask Your Question</span>
          <button type="submit" disabled={!input.trim() || busy} aria-label="Send message"><Send size={17}/></button>
        </div>
      </form>
      <p className="disclaimer">ROMP-LLM can make mistakes. Check model assumptions and rate units before using results.</p>
    </footer>
  </div>;
}

function slug(s) {
  return String(s || "petri-net").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "petri-net";
}

function DiagramCard({ model, onDownload }) {
  const svgRef = useRef(null);
  const [saving, setSaving] = useState("");
  const name = model.title || "Petri Net model";
  return <div className="diagram-card">
    <div className="diagram-card-head"><div><div className="ready"><Check size={13}/> Petri Net generated</div><b>{name}</b><small>{model.description || "Structured Petri Net visualization"}</small></div><span className="diagram-badge">MODEL</span></div>
    <PetriDiagram model={model} svgRef={svgRef}/>
    <div className="diagram-details">
      {(model.parameters || []).map((p, i) => <div key={i}><span>{p.label}</span><b>{p.value}</b></div>)}
    </div>
    <div className="download-row">
      <span><ImageIcon size={14}/> Diagram image</span>
      <div>
        <button disabled={!!saving} onClick={async () => {setSaving("png"); await onDownload(svgRef.current, "png", name); setSaving("");}}>{saving === "png" ? "Preparing…" : <><Download size={14}/> PNG</>}</button>
        <button disabled={!!saving} onClick={async () => {setSaving("jpg"); await onDownload(svgRef.current, "jpg", name); setSaving("");}}>{saving === "jpg" ? "Preparing…" : <><Download size={14}/> JPG</>}</button>
      </div>
    </div>
    <p className="save-note">Images are downloaded to your computer and saved in your ROMP-LLM image library.</p>
  </div>;
}

function PetriDiagram({ model, svgRef }) {
  const places = model.places || [];
  const transitions = model.transitions || [];
  const arcs = model.arcs || [];
  const all = [...places, ...transitions];
  const byId = Object.fromEntries(all.map(n => [n.id, n]));
  const getCenter = n => n.type === "place" ? {x:n.x+58,y:n.y+48} : {x:n.x+58,y:n.y+25};
  const width = Math.max(860, ...all.map(n => (n.x || 0) + 180));
  const height = Math.max(420, ...all.map(n => (n.y || 0) + 145));
  return <div className="diagram-scroll"><svg ref={svgRef} className="petri-svg" viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="petri-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#64748b"/></marker></defs>
    <rect width={width} height={height} fill="#fff"/>
    <text x="28" y="35" fontSize="17" fontWeight="700" fill="#26364d">{model.title || "Petri Net"}</text>
    {arcs.map((a,i) => {const s=byId[a.source],t=byId[a.target]; if(!s||!t)return null; const p1=getCenter(s),p2=getCenter(t); return <g key={a.id||i}><path d={`M${p1.x},${p1.y} L${p2.x},${p2.y}`} stroke="#64748b" strokeWidth="2.2" fill="none" markerEnd="url(#petri-arrow)"/>{a.weight>1&&<text x={(p1.x+p2.x)/2} y={(p1.y+p2.y)/2-8} fill="#64748b" fontSize="12">{a.weight}</text>}</g>})}
    {places.map((p,i)=><g key={p.id||i}><circle cx={p.x+58} cy={p.y+48} r="43" fill="#eff6ff" stroke="#5288c8" strokeWidth="2.5"/><text x={p.x+58} y={p.y+45} textAnchor="middle" fontSize="12" fontWeight="700" fill="#285b91">{p.tokens ?? 0}</text><text x={p.x+58} y={p.y+108} textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">{p.name}</text><text x={p.x+58} y={p.y+124} textAnchor="middle" fontSize="10" fill="#8290a3">Place</text></g>)}
    {transitions.map((t,i)=><g key={t.id||i}><rect x={t.x+32} y={t.y} width="52" height="50" rx="5" fill="#fff3dc" stroke="#d69a32" strokeWidth="2.5"/><text x={t.x+58} y={t.y+70} textAnchor="middle" fontSize="12" fontWeight="700" fill="#76501a">{t.name}</text><text x={t.x+58} y={t.y+86} textAnchor="middle" fontSize="10" fill="#9a7336">{t.rate || ""}</text></g>)}
  </svg></div>;
}
