export interface IAttachment {
    url: string;
    contentType: string;
    title: string;
}

export interface Agent {
    id: string;
    name: string;
    clients: string[];
}

export interface ConversationTurn {
    agentName: string;
    message: string;
    timestamp: Date;
}

export interface AgentConfig {
    name: string;
    characterPath: string;
    description: string;
}

export interface MultiAgentChatState {
    selectedAgents: string[];
    conversation: ConversationTurn[];
    isRunning: boolean;
    turnCount: number;
    maxTurns: number;
    initialMessage: string;
    agentIds: Record<string, string>;
    isLoading: boolean;
}