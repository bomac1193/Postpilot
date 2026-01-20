# Minimal Grid Planner + AI Assistant

This lightweight setup focuses on two things:

1. **Draft-only Instagram grid planner** – upload images (or pick a color swatch), add captions, and reorder a 3×N grid with drag-and-drop. Everything lives in browser state/localStorage.
2. **AI caption + content-idea assistant** – backed by the OpenAI API with two focused endpoints.

The React client (in `client/`) now ships inside the main Express server. When you run the normal Postpanda backend on port 3000 you can visit **`http://localhost:3000/alchemy`** to use the minimalist planner UI.

## 1. Prerequisites

- Node 18+ (Vite warns that Node 20 is ideal, but Node 18 works with warnings).
- An OpenAI API key.

## 2. Environment Variables

### Server (existing Postpanda `.env`)

Add/update the OpenAI key that both the legacy AI features and the new planner use:

```
OPENAI_API_KEY=sk-your-key
```

### Client (optional for dev)

If you run the Vite dev server on `5173`, point it back to the main API:

```
VITE_API_URL=http://localhost:3000
```

## 3. Install Dependencies

From the repo root:

```
cd client && npm install
```

## 4. Run the App

### Option A – single command from repo root

```
npm run mini:dev
```

This runs the primary Postpanda backend (port 3000) **and** the Vite dev server (port 5173) together.

### Option B – separate terminals

```
# Terminal 1 – main backend with all routes/UI on :3000
npm run mini:server

# Terminal 2
npm run mini:client  # vite dev server
```

### Production build served by Express

```
npm run mini:build
```

This outputs `client/dist/`. The Express server automatically serves it at `http://localhost:3000/alchemy` once the folder exists.

## 5. API Summary

- `POST /api/alchemy/captions`
  - Body: `{ "idea": "string", "tone": "gothic|..." }`
  - Returns: `{ "captions": ["..."] }`
- `POST /api/alchemy/ideas`
  - Body: `{ "niche": "string", "examples": ["optional"] }`
  - Returns: `{ "ideas": [{ "title": "", "description": "", "format": "reel|photo|carousel" }] }`

Both endpoints call OpenAI via `src/services/alchemyAiService.js` with minimal guardrails and JSON parsing helpers.

## 6. Frontend Highlights

- `GridPlanner` – drag-and-drop grid, selection states, local persistence.
- `PostEditor` – edit caption, see preview, trigger the AI caption assistant.
- `AiCaptionPanel` – send idea + tone to `/api/alchemy/captions`, click results to insert.
- `ContentIdeasPanel` – niche/existing themes input, lists generated ideas from `/api/alchemy/ideas`.

Use this foundation to evolve into a richer creator workspace.
