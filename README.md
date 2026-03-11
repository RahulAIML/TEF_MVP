# TEF Canada B2 Reading Trainer

Full-stack trainer for TEF Canada Reading practice:

- AI-generated French passages
- 8 MCQ questions with explanations
- Text Helper Tool for word/phrase explanations (Gemini)
- Full Exam mode (3 parts) and Practice mode
- Timed sessions (60 minutes exam, 15 minutes practice)

## Tech Stack

- Frontend: Next.js 14, React, TypeScript, TailwindCSS
- Backend: FastAPI (Python)
- AI passage generation: Gemini API

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

Backend `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
FRONTEND_ORIGIN=http://localhost:3000
```

Frontend `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

1. `POST /generate-reading`

Request:

```json
{
  "mode": "exam",
  "part": 1
}
```

2. `POST /word-meaning`

```json
{
  "word": "auparavant il travaillait"
}
```

3. `POST /submit-reading`

```json
{
  "answers": ["B", "A", "D", "C", "A", "B", "D", "C"]
}
```

## UI Overview

- Mode selector at the top
- Full Exam: 3 parts, sequential, with `Part X / 3` and a 60-minute timer
- Practice: choose Part 1/2/3 with a 15-minute timer
- Text Helper Tool: select text in the passage, explain it with Gemini

## Run Locally

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```
