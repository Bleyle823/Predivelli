import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
    Play, 
    Pause, 
    RotateCcw, 
    Settings, 
    Users, 
    MessageSquare,
    Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
    id: string;
    name: string;
    clients: string[];
}

interface ConversationTurn {
    agentName: string;
    message: string;
    timestamp: Date;
}

interface MultiAgentChatState {
    selectedAgents: string[];
    conversation: ConversationTurn[];
    isRunning: boolean;
    turnCount: number;
    maxTurns: number;
    initialMessage: string;
    agentIds: Record<string, string>;
    isLoading: boolean;
}

const availableAgents: { name: string; description: string }[] = [
    {
        name: 'JBP',
        description: 'Philosophical and intellectual commentator on culture and society'
    },
    {
        name: 'MAIKITO',
        description: 'Casual football bettor who lives for value picks'
    },
    {
        name: 'MODI',
        description: 'Laid-back but data-driven NBA parlay specialist'
    },
    {
        name: 'SBF',
        description: 'Totally trustworthy assistant specialized in Solana transfers'
    }
];

export default function MultiAgentChat() {
    const { toast } = useToast();
    const conversationEndRef = useRef<HTMLDivElement>(null);
    
    const [state, setState] = useState<MultiAgentChatState>({
        selectedAgents: ['JBP', 'MAIKITO'],
        conversation: [],
        isRunning: false,
        turnCount: 0,
        maxTurns: 10,
        initialMessage: 'Hello! Let\'s have an interesting conversation about current events and ideas.',
        agentIds: {},
        isLoading: false
    });

    // Get available agents
    const { data: agentsData, isLoading: agentsLoading } = useQuery({
        queryKey: ['agents'],
        queryFn: () => apiClient.getAgents(),
        refetchInterval: 5000,
    });

    const agents = agentsData?.agents || [];

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [state.conversation]);

    // Map agent names to IDs when agents are loaded
    useEffect(() => {
        if (agents.length > 0) {
            console.log('Available agents from API:', agents);
            const newAgentIds: Record<string, string> = {};
            
            agents.forEach((agent: Agent) => {
                console.log(`Processing agent: ${agent.name} with ID: ${agent.id}`);
                // Try exact match first
                const exactMatch = availableAgents.find(a => a.name === agent.name);
                if (exactMatch) {
                    newAgentIds[agent.name] = agent.id;
                    console.log(`Exact match found for ${agent.name}`);
                } else {
                    // Try case-insensitive match
                    const caseInsensitiveMatch = availableAgents.find(a => 
                        a.name.toLowerCase() === agent.name.toLowerCase()
                    );
                    if (caseInsensitiveMatch) {
                        newAgentIds[caseInsensitiveMatch.name] = agent.id;
                        console.log(`Case-insensitive match found: ${agent.name} -> ${caseInsensitiveMatch.name}`);
                    } else {
                        console.log(`No match found for agent: ${agent.name}`);
                    }
                }
            });
            
            console.log('Final agent ID mapping:', newAgentIds);
            setState((prev: MultiAgentChatState) => ({ ...prev, agentIds: newAgentIds }));
        }
    }, [agents]);

    const handleAgentToggle = (agentName: string) => {
        setState((prev: MultiAgentChatState) => ({
            ...prev,
            selectedAgents: prev.selectedAgents.includes(agentName)
                ? prev.selectedAgents.filter((name: string) => name !== agentName)
                : [...prev.selectedAgents, agentName]
        }));
    };

    const runConversation = async () => {
        console.log('Starting conversation with state:', state);
        
        if (state.selectedAgents.length < 2) {
            toast({
                title: "Not enough agents",
                description: "Please select at least 2 agents to start a conversation.",
                variant: "destructive"
            });
            return;
        }

        setState((prev: MultiAgentChatState) => ({ 
            ...prev, 
            isRunning: true, 
            turnCount: 0, 
            conversation: [] 
        }));

        let currentMessage = state.initialMessage;
        let currentTurn = 0;
        let isRunning = true; // Local variable to track running state

        console.log('Starting conversation loop...');
        console.log('Selected agents:', state.selectedAgents);
        console.log('Agent IDs:', state.agentIds);

        try {
            while (currentTurn < state.maxTurns && isRunning) {
                console.log(`Starting turn ${currentTurn + 1}`);
                
                for (const agentName of state.selectedAgents) {
                    // Check if we should stop
                    if (!isRunning) {
                        console.log('Conversation stopped by user');
                        break;
                    }

                    const agentId = state.agentIds[agentName];
                    console.log(`Processing agent: ${agentName} with ID: ${agentId}`);
                    
                    if (!agentId) {
                        console.log(`No agent ID found for ${agentName}, skipping...`);
                        continue;
                    }

                    try {
                        console.log(`Sending message to ${agentName}: ${currentMessage}`);
                        
                        // Add user message (only for the first turn)
                        if (currentTurn === 0 && state.selectedAgents.indexOf(agentName) === 0) {
                            const userTurn: ConversationTurn = {
                                agentName: 'User',
                                message: currentMessage,
                                timestamp: new Date()
                            };
                            setState((prev: MultiAgentChatState) => ({ 
                                ...prev, 
                                conversation: [...prev.conversation, userTurn] 
                            }));
                        }

                        // Get agent response
                        const response = await apiClient.sendMessage(agentId, currentMessage);
                        console.log(`Response from ${agentName}:`, response);
                        
                        const agentResponse = response[0]?.text || 'No response received';
                        console.log(`Agent response text: ${agentResponse}`);

                        // Add agent response
                        const agentTurn: ConversationTurn = {
                            agentName,
                            message: agentResponse,
                            timestamp: new Date()
                        };
                        setState((prev: MultiAgentChatState) => ({ 
                            ...prev, 
                            conversation: [...prev.conversation, agentTurn],
                            turnCount: currentTurn + 1
                        }));

                        // Update current message for next agent
                        currentMessage = agentResponse;

                        // Wait a bit between messages
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.error(`Error getting response from ${agentName}:`, error);
                        toast({
                            title: "Error",
                            description: `Failed to get response from ${agentName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            variant: "destructive"
                        });
                        isRunning = false;
                        break;
                    }
                }
                currentTurn++;
            }
        } catch (error) {
            console.error('Conversation error:', error);
            toast({
                title: "Conversation Error",
                description: error instanceof Error ? error.message : 'Unknown error occurred',
                variant: "destructive"
            });
        }

        console.log('Conversation ended');
        setState((prev: MultiAgentChatState) => ({ ...prev, isRunning: false }));
    };

    const handleStart = () => {
        console.log('Start button clicked');
        runConversation();
    };

    const handlePause = () => {
        console.log('Pause button clicked');
        setState((prev: MultiAgentChatState) => ({ ...prev, isRunning: false }));
    };

    const handleReset = () => {
        setState((prev: MultiAgentChatState) => ({ 
            ...prev, 
            conversation: [], 
            turnCount: 0, 
            isRunning: false 
        }));
    };

    const getAgentAvatar = (agentName: string) => {
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
        const index = availableAgents.findIndex(a => a.name === agentName);
        return colors[index % colors.length];
    };

    return (
        <div className="flex h-full gap-6 p-6">
            {/* Left Sidebar - Agent Selection and Controls */}
            <div className="w-80 space-y-6">
                {/* Agent Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Select Agents
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {availableAgents.map((agent) => (
                            <div key={agent.name} className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={state.selectedAgents.includes(agent.name)}
                                    onChange={() => handleAgentToggle(agent.name)}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <div className="flex-1">
                                    <Label className="font-medium">{agent.name}</Label>
                                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                                    {state.agentIds[agent.name] && (
                                        <p className="text-xs text-green-600">✓ Connected</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Conversation Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Max Turns: {state.maxTurns}</Label>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={state.maxTurns}
                                onChange={(e) => setState((prev: MultiAgentChatState) => ({ ...prev, maxTurns: parseInt(e.target.value) }))}
                                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Initial Message</Label>
                            <Textarea
                                value={state.initialMessage}
                                onChange={(e) => setState((prev: MultiAgentChatState) => ({ ...prev, initialMessage: e.target.value }))}
                                placeholder="Enter the initial message to start the conversation..."
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleStart}
                                disabled={state.isRunning || state.selectedAgents.length < 2}
                                className="flex-1"
                            >
                                {state.isRunning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}
                                Start
                            </Button>
                            <Button
                                onClick={handlePause}
                                disabled={!state.isRunning}
                                variant="outline"
                            >
                                <Pause className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={handleReset}
                                variant="outline"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            Turn: {state.turnCount} / {state.maxTurns}
                        </div>
                    </CardContent>
                </Card>

                {/* Status */}
                {agentsLoading && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Loading agents...</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Debug Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Debug Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs space-y-1">
                            <p>Selected: {state.selectedAgents.join(', ')}</p>
                            <p>Connected: {Object.keys(state.agentIds).length} agents</p>
                            <p>Running: {state.isRunning ? 'Yes' : 'No'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Multi-Agent Conversation
                        </CardTitle>
                        <div className="flex gap-2">
                            {state.selectedAgents.map((agentName) => (
                                <Badge key={agentName} variant="secondary">
                                    {agentName}
                                </Badge>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0">
                        <div className="h-full p-6 overflow-auto">
                            <div className="space-y-4">
                                {state.conversation.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No conversation yet. Select agents and click Start to begin.</p>
                                    </div>
                                ) : (
                                    state.conversation.map((turn, index) => (
                                        <div key={index} className="flex gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className={getAgentAvatar(turn.agentName)}>
                                                    {turn.agentName.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium">
                                                        {turn.agentName}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {turn.timestamp.toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                
                                                <div className="bg-muted rounded-lg p-3">
                                                    <p className="text-sm leading-relaxed">
                                                        {turn.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={conversationEndRef} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 