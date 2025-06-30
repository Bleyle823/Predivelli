# Multi-Agent Chat Feature

This feature allows ElizaOS agents to chat with each other through the frontend client interface. Agents can have conversations, respond to each other's messages, and engage in meaningful discussions.

## Features

- **Multi-Agent Conversations**: Select from 4 different AI agents (JBP, MAIKITO, MODI, SBF)
- **Real-time Chat Interface**: Watch agents have conversations in real-time
- **Conversation Controls**: Start, pause, reset, and configure conversation parameters
- **Agent Selection**: Choose which agents participate in the conversation
- **Customizable Settings**: Set maximum turns, initial message, and conversation flow
- **Modern UI**: Clean, intuitive interface built with React and Tailwind CSS

## How to Use

### 1. Start the ElizaOS Server

First, start the ElizaOS server with multiple character files:

```bash
pnpm start --characters="characters/jbp.character.json,characters/maikito.character.json,characters/modi.character.json,characters/sbf.character.json"
```

### 2. Start the Client

In a new terminal, start the client:

```bash
cd client
npm run dev
```

### 3. Access Multi-Agent Chat

1. Open your browser and navigate to `http://localhost:5173`
2. Click on "Multi-Agent Chat" in the left sidebar
3. Select 2 or more agents from the available options
4. Configure the conversation settings:
   - **Max Turns**: Set the maximum number of conversation turns (1-20)
   - **Initial Message**: Customize the starting message for the conversation
5. Click "Start" to begin the agent-to-agent conversation
6. Watch as agents respond to each other in real-time
7. Use "Pause" to stop the conversation or "Reset" to clear and start over

## Available Agents

- **JBP**: Philosophical and intellectual commentator on culture and society
- **MAIKITO**: Casual football bettor who lives for value picks
- **MODI**: Laid-back but data-driven NBA parlay specialist
- **SBF**: Totally trustworthy assistant specialized in Solana transfers

## Technical Implementation

### Components

- **MultiAgentChat**: Main component that handles the multi-agent conversation logic
- **Agent Selection**: Checkbox interface for selecting participating agents
- **Conversation Controls**: UI for managing conversation flow and settings
- **Chat Display**: Real-time display of agent messages with avatars and timestamps

### State Management

The component uses React state to manage:
- Selected agents
- Conversation history
- Running status
- Turn counter
- Agent ID mapping

### API Integration

The feature integrates with the existing ElizaOS API:
- Fetches available agents
- Sends messages to individual agents
- Handles agent responses
- Manages conversation flow

## File Structure

```
client/src/
├── components/
│   └── multi-agent-chat.tsx          # Main multi-agent chat component
├── routes/
│   └── multi-agent-chat.tsx          # Route component
├── types/
│   └── index.ts                      # Type definitions
└── App.tsx                           # Updated with new route
```

## Testing

Run the test script to verify functionality:

```bash
node test-multi-agent-chat.js
```

This will test:
- Client accessibility
- Agent availability
- Multi-agent conversation simulation
- API endpoints

## Example Conversation Flow

1. **User starts conversation** with initial message
2. **Agent 1 responds** to the initial message
3. **Agent 2 responds** to Agent 1's message
4. **Agent 3 responds** to Agent 2's message
5. **Process continues** until max turns reached or manually stopped

## Customization

### Adding New Agents

To add new agents:

1. Create a character file in the `characters/` directory
2. Add the agent to the `availableAgents` array in `multi-agent-chat.tsx`
3. Update the server startup command to include the new character file

### Modifying Conversation Logic

The conversation flow can be customized by modifying the `runConversation` function in `multi-agent-chat.tsx`:

- Change the turn order
- Add conversation rules
- Implement different response patterns
- Add conversation topics or themes

## Troubleshooting

### Common Issues

1. **No agents available**: Ensure the ElizaOS server is running with character files
2. **Agents not responding**: Check server logs for errors
3. **Conversation not starting**: Verify at least 2 agents are selected
4. **UI not loading**: Check client console for JavaScript errors

### Debug Mode

Enable debug logging by adding console.log statements in the `runConversation` function to track conversation flow.

## Future Enhancements

Potential improvements for the multi-agent chat feature:

- **Conversation Topics**: Pre-defined conversation themes
- **Agent Personalities**: More diverse agent characteristics
- **Conversation History**: Save and load previous conversations
- **Real-time Collaboration**: Multiple users watching the same conversation
- **Advanced Controls**: More granular conversation management
- **Export Options**: Save conversations as text or markdown 