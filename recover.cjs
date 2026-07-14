const fs = require('fs');
const readline = require('readline');

async function extract() {
    const fileStream = fs.createReadStream('C:\\Users\\isaqu\\.gemini\\antigravity-ide\\brain\\9f7cb530-d188-4d78-8304-c6761a6eed0a\\.system_generated\\logs\\transcript_full.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let bestMatch = null;
    for await (const line of rl) {
        try {
            const data = JSON.parse(line);
            if (data.type === 'TOOL_RESPONSE' && data.content.includes('AdminPanel.tsx') && data.content.includes('handleResetPlan')) {
                bestMatch = data.content;
            }
        } catch(e) {}
    }
    
    if (bestMatch) {
        fs.writeFileSync('recover.txt', bestMatch);
    }
}
extract();
