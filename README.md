# 🤖 AI Customer Support Platform

An AI-powered customer support platform (SiteGPT alternative) with embeddable chat widget, RAG-powered responses, and a customer dashboard.

## Architecture

```
Customer Website → Chat Widget → Backend API → RAG + Claude API → Response
                                      ↓
                                  RAG Pipeline
                                (Pinecone + OpenAI)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express |
| Frontend | React + Tailwind CSS |
| AI Engine | Claude API (Anthropic) + RAG |
| Database | PostgreSQL (Supabase) |
| Vector DB | Pinecone |
| Embeddings | OpenAI text-embedding-3-small |
| Chat Widget | Vanilla JavaScript |

## Project Structure

```
├── backend/                    # Node.js API server
│   ├── server.js              # Express app entry point
│   ├── config/
│   │   └── database.js        # Supabase connection
│   ├── routes/
│   │   ├── auth.js            # Signup, login, profile
│   │   ├── chat.js            # Chat message handling
│   │   ├── chatbots.js        # CRUD for chatbots
│   │   └── scrape.js          # Web scraping endpoints
│   ├── middleware/
│   │   └── auth.js            # JWT verification
│   ├── services/
│   │   ├── rag.js             # RAG pipeline (embed + search)
│   │   └── scraper.js         # Website scraper + chunker
│   └── database/
│       └── schema.sql         # PostgreSQL schema
│
├── frontend/                   # React dashboard
│   ├── src/
│   │   ├── App.jsx            # Router + app shell
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Auth login page
│   │   │   ├── Signup.jsx     # Auth signup page
│   │   │   ├── Dashboard.jsx  # Chatbot list
│   │   │   ├── CreateChatbot.jsx
│   │   │   └── ChatbotDetail.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx     # Sidebar + nav
│   │   └── services/
│   │       └── api.js         # API client
│   └── index.html
│
├── widget/                     # Embeddable chat widget
│   └── widget.js              # Self-contained vanilla JS
│
```

## Quick Start

### 1. Database Setup
Run the SQL schema in your Supabase project:
```sql
-- Copy contents of backend/database/schema.sql
-- Run in Supabase SQL Editor
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env        # Edit with your actual API keys
npm install
npm run dev                  # Starts on http://localhost:3000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev                  # Starts on http://localhost:5173
```

### 4. Widget Usage
Use the embed code below or load the script locally from `widget/widget.js` during development.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login & get JWT |
| GET | `/api/auth/me` | Get profile (auth) |
| PUT | `/api/auth/profile` | Update profile (auth) |

### Chatbots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chatbots` | List user's chatbots |
| POST | `/api/chatbots` | Create chatbot |
| GET | `/api/chatbots/:id` | Get chatbot details |
| PUT | `/api/chatbots/:id` | Update chatbot |
| DELETE | `/api/chatbots/:id` | Delete chatbot |
| GET | `/api/chatbots/:id/conversations` | Get conversations |

### Chat (Widget)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message, get AI response |
| GET | `/api/chat/history` | Get session history |

### Scraping
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scrape` | Start scraping a URL |
| GET | `/api/scrape/status/:id` | Check scraping status |

## Widget Embed Code

```html
<script>
  window.CHATBOT_CONFIG = {
    id: 'your-chatbot-uuid',
    primaryColor: '#007bff',
    welcomeMessage: 'Hi! How can I help?',
    position: 'bottom-right'
  };
</script>
<script src="https://your-backend.com/widget.js" defer></script>
```

## Environment Variables

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-key
JWT_SECRET=your-secret
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
PINECONE_API_KEY=xxx
PINECONE_INDEX=chatbot-content
FRONTEND_URL=http://localhost:5173
```

## Project Status
See [PENDING.md](PENDING.md) for known gaps and next steps.

## MVP Features
- [x] User authentication (signup/login/JWT)
- [x] Chatbot CRUD operations
- [x] Embeddable chat widget
- [x] Claude AI responses
- [x] RAG pipeline (Pinecone + OpenAI embeddings)
- [x] Website scraper with content chunking
- [x] Customer dashboard (React)
- [ ] Human live chat handoff (Phase 2)
- [ ] Analytics dashboard (Phase 2)
- [ ] Multi-language support (Phase 2)

## Deployment
- **Backend**: Railway
- **Frontend**: Vercel
- **Database**: Supabase (managed PostgreSQL)
- **Vector DB**: Pinecone (managed)
