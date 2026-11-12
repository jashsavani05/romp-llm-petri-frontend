# ROMP-LLM: AI-Powered Petri Net Generator

## Project Overview

ROMP-LLM is an AI-powered web application that converts natural language system requirements into structured Petri Net diagrams.

Users describe a system in a conversational chat interface. The AI assistant identifies missing parameters, asks follow-up questions, and generates a Petri Net model containing places, transitions, arcs, initial tokens, and transition rate labels.

The application provides a simple, interactive interface inspired by modern AI chat applications.

## Features

- **AI-powered chat:** Describe a system using natural language.
- **Interactive model generation:** Generate Petri Net places, transitions, and arcs.
- **Clarification questions:** The AI asks for missing model parameters before generating the diagram.
- **Chat history:** Revisit previous conversations.
- **Scrollable interface:** Convenient conversation navigation.
- **Dark and light themes:** Switch between visual themes.
- **Demo conversation:** Explore a predator–prey example.
- **Diagram preview:** View generated Petri Net diagrams.
- **Image export:** Download diagrams in PNG and JPG formats.
- **Saved diagrams:** Store generated diagram images on the server.

## Example Use Case: Predator–Prey Model

A user can request:

"Create a predator–prey model with 50 prey and 25 predators."

The AI assistant can ask for additional information, including:

- Prey birth rate
- Predator hunting or predation rate
- Time unit

After receiving the required information, the application generates a Petri Net model with:

- Prey place
- Predators place
- Reproduction transition
- Predation transition
- Connecting arcs
- Initial token counts
- Transition rate labels

## Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS
- Lucide React icons

### Backend
- Node.js
- Express.js
- OpenAI API

### Diagram Output
- SVG-based Petri Net rendering
- PNG and JPG image export

## Project Structure

```text
romp-llm-chat/
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── data/
│   │   └── diagrams/
│   ├── index.js
│   ├── package.json
│   └── .env.example
├── package.json
├── .gitignore
└── README.md
```

## Requirements

- Node.js 20 or later
- npm
- Git (for source-code management)
- OpenAI API key for live AI functionality

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/romp-llm-petri-net-generator.git
```

Enter the project directory:

```bash
cd romp-llm-petri-net-generator
```

Install dependencies:

```bash
npm install
```

Create the backend environment file:

```bash
cp server/.env.example server/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item server/.env.example server/.env
```

Open `server/.env` and configure your API key:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_CHAT_MODEL=your_available_model_name
PORT=4000
```

Never publish your real API key.

## Run the Application

Start the frontend and backend together:

```bash
npm run dev
```

On Windows PowerShell, you can also run:

```powershell
npm.cmd run dev
```

Open the application in your browser:

http://localhost:5173

## Build the Frontend

To create a production frontend build:

```bash
npm run build
```

The generated frontend files will be available in:

```text
client/dist/
```

## Important Notes

- The frontend and backend are separate components of this application.
- The Vite development server proxies API requests to the local backend.
- Live AI functionality requires a valid OpenAI API key.
- The demo conversation can be used without making an AI API call.
- This prototype creates Petri Net diagrams and displays transition rate labels. It is not yet a full CPN ML compiler or statistically validated stochastic simulator.

## Future Improvements

- Advanced Petri Net editing
- More Petri Net model types
- Model validation
- Simulation engine
- Improved diagram layout
- Deployment to a public hosting platform
- User authentication and cloud-based project storage

## Author

Developed as an AI-assisted Petri Net modeling project.

