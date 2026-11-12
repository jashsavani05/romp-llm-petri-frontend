# ROMP-LLM Chat — Petri Net Generator

A chat-first React application. The user describes a system, the AI asks for missing model information, and then builds a structured Petri Net using API operations. The diagram is rendered as SVG in the browser and can be saved/downloaded as PNG or JPG. There is no JSON download button or warehouse workflow.

## Example
User: "Create a predator-prey model with 50 prey and 25 predators."
Assistant asks for the prey birth rate, hunt/predation rate and time unit if missing.
User: "Birth rate 0.08 per day and hunt rate 0.02 per day."
Assistant builds a model with Prey and Predators places, Reproduction and Predation transitions, arcs and transition rate labels.

## Requirements
- Node.js 20+
- OpenAI API key (for AI chat)

## Install and run (Windows PowerShell)
Open a terminal in the folder that contains the root `package.json`, then:
```powershell
npm.cmd install
Copy-Item server/.env.example server/.env
```
Edit `server/.env` and add your key:
```env
OPENAI_API_KEY=your_api_key_here
OPENAI_CHAT_MODEL=gpt-5.5
PORT=4000
```
Start:
```powershell
npm.cmd run dev
```
Open http://localhost:5173

If PowerShell cannot find `package.json`, first `cd` into the extracted `romp-llm-chat` folder. Run `dir package.json` to confirm you are in the correct directory.

## Interface features
- Scrollable conversation area with a fixed message composer.
- Chat history saved in the browser (local storage); select a previous chat in the left sidebar.
- Light/dark theme toggle in the top bar; theme choice is remembered.
- Load project demo button inserts a complete predator–prey example conversation and sample Petri Net output without requiring an API call.

## Export
The diagram card offers PNG and JPG download buttons. "Save image" stores the rendered diagram on the server. Saved diagrams appear in the small gallery accessible from the header.

## Notes
- The LLM is instructed to ask for missing information and to update the model through structured tools, not to write CPN ML code.
- The current simulator/model is a basic prototype using integer tokens and transition rate labels. It is not a full CPN ML compiler or continuous-time stochastic simulator.
- Rate labels are metadata in this prototype; they do not automatically define a statistically validated simulation.
