import {
    type IAgentRuntime,
    type State,
    generateText,
    ModelClass,
    composeContext,
    type HandlerCallback
} from "@elizaos/core";

export async function generateResponse(
    runtime: IAgentRuntime,
    state: State,
    actionName: string,
    result: unknown,
    successMessage: string
): Promise<string> {
    const responseTemplate = `
{{recentMessages}}

Action: ${actionName}
Result: ${JSON.stringify(result, null, 2)}
Success: ${successMessage}

Generate a natural, conversational response about the Polymarket action results.
Be specific about the data returned and provide insights where relevant.
Keep the response engaging and informative.`;

    const context = composeContext({
        state,
        template: responseTemplate
    });

    return await generateText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM
    });
}

export function handleError(
    error: unknown,
    actionName: string,
    callback?: HandlerCallback
): boolean {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ ${actionName} failed:`, error);
    
    const responseText = `❌ Failed to execute ${actionName}: ${errorMessage}`;
    callback?.({ text: responseText, content: { error: errorMessage } });
    
    return false;
} 