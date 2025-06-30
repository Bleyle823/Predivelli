# Eliza - Multi-Agent AI Platform

A sophisticated multi-agent AI platform enabling intelligent conversations between AI agents with distinct personalities and capabilities.

## 🌟 Features

- **Multi-Agent Conversations**: Real-time communication between AI agents
- **Character-Based Agents**: JBP, MAIKITO, MODI, SBF with unique personalities
- **Plugin System**: Polymarket, Football, and GOAT plugins
- **Modern UI**: React-based frontend with real-time updates
- **RESTful API**: Comprehensive backend for agent management

## 🚀 Quick Start

### Prerequisites
- Node.js 23.3.0+
- pnpm 9.15.4+
- Git

### Installation

```bash
git clone <repository-url>
cd eliza-1-develop
pnpm install
```

### Environment Setup
Create `.env` in root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
SERVER_PORT=3001
```

### Running the Application

#### Windows (PowerShell)
```powershell
# Terminal 1: Backend
cd agent
$env:SERVER_PORT="3001"
pnpm run dev

# Terminal 2: Frontend
cd client
pnpm run dev
```

#### Linux/macOS/Git Bash
```bash
# From root directory
npm run dev
```

### Access URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 🧪 Testing

### Manual Testing

#### 1. Single Agent Chat
1. Go to http://localhost:5173
2. Select an agent from sidebar
3. Send messages and verify responses

#### 2. Multi-Agent Chat
1. Navigate to "Multi-Agent Chat"
2. Select 2-4 agents
3. Configure settings (max turns, initial message)
4. Click "Start" to begin conversation
5. Observe agents communicating
6. Use "Pause" and "Reset" controls

#### 3. Plugin Testing
- **Polymarket**: Ask about prediction markets
- **Football**: Request sports analysis
- **GOAT**: Test enhanced features

### Automated Testing

```bash
# All tests
pnpm test

# Specific test suites
pnpm --filter @elizaos/core test
cd agent && pnpm test
cd client && pnpm test

# Coverage
pnpm test:coverage
```

### API Testing

```bash
# Get agents
curl http://localhost:3001/agents

# Send message
curl -X POST http://localhost:3001/{agent-id}/message \
  -F "text=Hello" -F "user=testuser"
```

## 📁 Project Structure

```
eliza-1-develop/
├── agent/                 # Backend server
├── client/               # Frontend React app
├── packages/             # Shared packages & plugins
├── characters/           # Agent definitions
├── docs/                 # Documentation
└── scripts/              # Build scripts
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `SERVER_PORT` | Backend port | 3001 |
| `USE_OPENAI_EMBEDDING` | OpenAI embeddings | false |

### Agent Configuration
- `characters/jbp.character.json` - JBP agent
- `characters/maikito.character.json` - MAIKITO agent
- `characters/modi.character.json` - MODI agent
- `characters/sbf.character.json` - SBF agent

## 🐛 Troubleshooting

### Common Issues

1. **"node: not found" Error**
   - Use individual commands instead of dev script on Windows

2. **Agents Not Responding**
   - Ensure backend server is running on port 3001

3. **Proxy Errors**
   - Check backend accessibility at http://localhost:3001

4. **API Key Issues**
   - Verify OpenAI API key in environment variables

### Debug Mode
```bash
cd agent
$env:NODE_ENV="development"
$env:VERBOSE="true"
$env:DEBUG="eliza:*"
pnpm run dev
```

## 📚 API Documentation

### Core Endpoints
- `GET /agents` - Get all agents
- `GET /agents/{id}` - Get agent details
- `POST /{agent-id}/message` - Send message
- `POST /{agent-id}/tts` - Text-to-speech
- `POST /{agent-id}/whisper` - Speech-to-text

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Happy chatting with your AI agents! 🤖✨** 