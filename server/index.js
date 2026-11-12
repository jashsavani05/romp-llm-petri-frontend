import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "data");
const DIAGRAMS = path.join(DATA, "diagrams");
const MODEL_FILE = path.join(DATA, "model.json");
await fs.mkdir(DIAGRAMS, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use("/diagrams", express.static(DIAGRAMS));
const PORT = process.env.PORT || 4000;
const ai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const emptyModel = () => ({ title: "", description: "", places: [], transitions: [], arcs: [], parameters: [] });
async function loadModel() {
  try { return JSON.parse(await fs.readFile(MODEL_FILE, "utf8")); }
  catch { const m = emptyModel(); await saveModel(m); return m; }
}
async function saveModel(m) { await fs.writeFile(MODEL_FILE, JSON.stringify(m, null, 2)); }
let model = await loadModel();
const makeId = p => `${p}_${randomUUID().slice(0, 7)}`;
const safeText = s => String(s || "").trim().slice(0, 100);

function createPlace({ name, tokens = 0 }) {
  name = safeText(name);
  if (!name) throw new Error("A place needs a name.");
  let found = model.places.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (found) { found.tokens = Number(tokens) || 0; return { updated: found }; }
  const i = model.places.length;
  const p = { id: makeId("p"), type: "place", name, tokens: Math.max(0, Number(tokens) || 0), x: 120 + (i % 3) * 280, y: 115 + Math.floor(i / 3) * 190 };
  model.places.push(p); return { created: p };
}
function createTransition({ name, rate = "", rate_label = "" }) {
  name = safeText(name);
  if (!name) throw new Error("A transition needs a name.");
  let found = model.transitions.find(t => t.name.toLowerCase() === name.toLowerCase());
  if (found) { found.rate = safeText(rate); found.rate_label = safeText(rate_label); return { updated: found }; }
  const i = model.transitions.length;
  const t = { id: makeId("t"), type: "transition", name, rate: safeText(rate), rate_label: safeText(rate_label), x: 260 + (i % 3) * 280, y: 130 + Math.floor(i / 3) * 190 };
  model.transitions.push(t); return { created: t };
}
function connectArc({ source, target, weight = 1 }) {
  const s = [...model.places, ...model.transitions].find(n => n.id === source || n.name.toLowerCase() === String(source || "").toLowerCase());
  const t = [...model.places, ...model.transitions].find(n => n.id === target || n.name.toLowerCase() === String(target || "").toLowerCase());
  if (!s || !t) throw new Error("Could not find both arc endpoints. Create the place/transition first.");
  if ((s.type === "place") === (t.type === "place")) throw new Error("Petri Net arcs must alternate between a place and a transition.");
  if (model.arcs.some(a => a.source === s.id && a.target === t.id)) return { message: "Connection already exists." };
  const a = { id: makeId("a"), source: s.id, target: t.id, weight: Math.max(1, Number(weight) || 1) };
  model.arcs.push(a); return { created: a };
}
function setModelInfo({ title, description, parameters = [] }) {
  model.title = safeText(title) || model.title;
  model.description = safeText(description) || model.description;
  if (Array.isArray(parameters)) model.parameters = parameters.slice(0, 12).map(p => ({ label: safeText(p.label), value: safeText(p.value) }));
  return { ok: true };
}

const tools = [
  { type: "function", name: "reset_model", description: "Start a fresh Petri Net model, clearing the previous graph.", parameters: { type: "object", properties: {}, additionalProperties: false } },
  { type: "function", name: "create_place", description: "Create a Petri Net place holding an initial token count.", parameters: { type: "object", properties: { name: { type: "string" }, tokens: { type: "integer", minimum: 0 } }, required: ["name", "tokens"], additionalProperties: false } },
  { type: "function", name: "create_transition", description: "Create a Petri Net transition and attach its rate label.", parameters: { type: "object", properties: { name: { type: "string" }, rate: { type: "string" }, rate_label: { type: "string" } }, required: ["name", "rate", "rate_label"], additionalProperties: false } },
  { type: "function", name: "connect_arc", description: "Connect an existing place and transition by a directed arc. Use exact element names.", parameters: { type: "object", properties: { source: { type: "string" }, target: { type: "string" }, weight: { type: "integer", minimum: 1 } }, required: ["source", "target", "weight"], additionalProperties: false } },
  { type: "function", name: "set_model_info", description: "Set the title, description and parameter summary for the current Petri Net.", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, parameters: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"], additionalProperties: false } } }, required: ["title", "description", "parameters"], additionalProperties: false } }
];

const instructions = `You are ROMP-LLM, a conversational scientific modelling assistant for Petri Nets.
Your interface is chat-only. Be concise, friendly and ask for only the missing information needed to create a correct model.
IMPORTANT: Never assume or invent numerical values, initial populations, rates, units, or scientific facts. If values are missing, ask the user before creating the model. Ask one compact follow-up message listing the missing values.
For a predator-prey ecosystem, collect at least: initial prey population, initial predator population, prey birth/reproduction rate, predator hunting/predation rate, and the time unit (e.g. per day). If the user only gives 50 prey and 25 predators, ask for birth rate, hunt rate and time unit. A user may provide these values in one message or across the conversation.
When all necessary values are available, create the graph using ONLY the structured tools. Do not write code or CPN ML code. Create places first, then transitions, then arcs, then set_model_info. Do not include warehouse, order, shipping or inventory examples unless explicitly requested by the user.
Predator-prey starter graph: places "Prey" and "Predators"; transitions "Prey reproduction" and "Predation". Model prey reproduction with an input arc Prey -> Prey reproduction of weight 1 and output arc Prey reproduction -> Prey of weight 2 (net +1 prey per firing). Model predation with input arcs Prey -> Predation and Predators -> Predation, each weight 1, and output arc Predation -> Predators of weight 1 (one prey is consumed; predator remains). Put the user's reproduction rate on Prey reproduction and hunt rate on Predation. Explain that these rate labels are parameters and not a validated stochastic simulation.
For other user-defined systems, ask for the relevant states, events, initial quantities and rates before building. Use plain language and explain assumptions. After tool calls, tell the user the model is ready and briefly summarize places, transitions and supplied rates.`;

async function runAssistant(history) {
  if (!ai) throw new Error("AI is not configured yet. Add your OPENAI_API_KEY to server/.env, then restart the server.");
  let input = [{ role: "system", content: instructions }, ...history.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))];
  let response = await ai.responses.create({ model: process.env.OPENAI_CHAT_MODEL || "gpt-5.5", input, tools, tool_choice: "auto" });
  let rounds = 0, changed = false;
  while (rounds < 20) {
    const calls = (response.output || []).filter(o => o.type === "function_call");
    if (!calls.length) break;
    input = [...input, ...response.output];
    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.arguments || "{}"); } catch {}
      let result;
      try {
        switch (call.name) {
          case "reset_model": model = emptyModel(); result = { ok: true }; changed = true; break;
          case "create_place": result = createPlace(args); changed = true; break;
          case "create_transition": result = createTransition(args); changed = true; break;
          case "connect_arc": result = connectArc(args); changed = true; break;
          case "set_model_info": result = setModelInfo(args); changed = true; break;
          default: result = { error: "Unknown tool." };
        }
      } catch (e) { result = { error: e.message }; }
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
      rounds++;
    }
    response = await ai.responses.create({ model: process.env.OPENAI_CHAT_MODEL || "gpt-5.5", input, tools, tool_choice: "auto" });
  }
  if (changed) await saveModel(model);
  return { reply: response.output_text || "I have updated your model.", model: changed && model.places.length ? model : null };
}

app.get("/api/model", (_req, res) => res.json(model));
app.post("/api/model/reset", async (_req, res) => { model = emptyModel(); await saveModel(model); res.json({ ok: true }); });
app.post("/api/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body.messages) ? req.body.messages.slice(-16) : [];
    if (!messages.length) return res.status(400).json({ error: "A chat message is required." });
    const history = messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 5000) }));
    res.json(await runAssistant(history));
  } catch (e) { res.status(500).json({ error: e.message || "Assistant error." }); }
});

app.get("/api/diagrams", async (_req, res) => {
  const names = (await fs.readdir(DIAGRAMS)).filter(n => /\.(png|jpg)$/i.test(n)).sort().reverse();
  res.json(names.map(name => ({ name, url: `/diagrams/${name}` })));
});
app.post("/api/diagrams/save", async (req, res) => {
  try {
    const { dataUrl, format, name } = req.body || {};
    if (!["png", "jpg"].includes(format)) return res.status(400).json({ error: "Only PNG and JPG are supported." });
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
    if (!match) return res.status(400).json({ error: "Invalid image data." });
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 15 * 1024 * 1024) return res.status(413).json({ error: "Image is too large." });
    const safeName = String(name || "petri-net").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "petri-net";
    const filename = `${safeName}-${Date.now()}.${format}`;
    await fs.writeFile(path.join(DIAGRAMS, filename), buffer);
    res.json({ name: filename, url: `/diagrams/${filename}` });
  } catch (e) { res.status(500).json({ error: e.message || "Could not save image." }); }
});

app.listen(PORT, () => console.log(`ROMP-LLM API listening on http://localhost:${PORT}`));
