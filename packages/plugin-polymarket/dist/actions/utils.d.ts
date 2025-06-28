import { type IAgentRuntime, type State, type HandlerCallback } from "@elizaos/core";
export declare function generateResponse(runtime: IAgentRuntime, state: State, actionName: string, result: unknown, successMessage: string): Promise<string>;
export declare function handleError(error: unknown, actionName: string, callback?: HandlerCallback): boolean;
