"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
exports.handleError = handleError;
const core_1 = require("@elizaos/core");
async function generateResponse(runtime, state, actionName, result, successMessage) {
    const responseTemplate = `
{{recentMessages}}

Action: ${actionName}
Result: ${JSON.stringify(result, null, 2)}
Success: ${successMessage}

Generate a natural, conversational response about the Polymarket action results.
Be specific about the data returned and provide insights where relevant.
Keep the response engaging and informative.`;
    const context = (0, core_1.composeContext)({
        state,
        template: responseTemplate
    });
    return await (0, core_1.generateText)({
        runtime,
        context,
        modelClass: core_1.ModelClass.MEDIUM
    });
}
function handleError(error, actionName, callback) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ ${actionName} failed:`, error);
    const responseText = `❌ Failed to execute ${actionName}: ${errorMessage}`;
    callback?.({ text: responseText, content: { error: errorMessage } });
    return false;
}
