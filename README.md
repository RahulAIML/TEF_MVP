# TEF Canada B2 Reading MVP

Full-stack MVP for TEF Canada Reading Comprehension practice:

- AI-generated French reading passage (250-300 words)
- 8 MCQ questions with explanations
- Word meaning helper
- Answer submission and scoring

## Tech Stack

- Frontend: Next.js 14 (App Router), React, TypeScript, TailwindCSS, shadcn-style UI components
- Backend: FastAPI (Python)
- AI: Gemini API
- Communication: REST API

## Project Structure

```text
project/
  frontend/
    app/
    components/
    services/
    types/
  backend/
    main.py
    ai_service.py
    schemas.py
    routers/
      reading.py
      dictionary.py
      submission.py
```

## Environment Variables

Backend (`backend/.env`):

```env
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
FRONTEND_ORIGIN=http://localhost:3000
```

Note:
- `GEMINI_API_KEY` is preferred.
- `OPENAI_API_KEY` is also supported as fallback (to match requested env naming).

Frontend (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Run Locally

## 1) Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API base URL: `http://localhost:8000`

## 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

## API Endpoints

1. `GET /generate-reading-exercise`
- Generates title + French passage + 8 MCQs.

2. `POST /word-meaning`

Request:

```json
{
  "word": "entreprise"
}
```

3. `POST /submit-reading`

Request:

```json
{
  "answers": ["B", "A", "D", "C", "A", "B", "D", "C"]
}
```

## MVP User Flow

1. Click **Generate Reading Exercise**
2. Read passage and answer MCQs
3. Click **Check Answers** to see score + explanations
4. Type/select a word and click **Explain Word** for dictionary support
