export interface AIRequest {
    prompt: string;
    taskType?: string;
    temperature?: number;
    maxTokens?: number;
    provider?: string;
}

export interface AIResponse {
    text: string;
    model: string;
    provider: string;
    usage?: any;
}

export const callGemini = async (prompt: string, apiKey: string, preferredModel: string = 'gemini-1.5-flash'): Promise<AIResponse> => {

    // Define candidates with specific API versions
    const candidates = [
        { model: preferredModel, version: 'v1beta' },
        { model: 'gemini-1.5-flash', version: 'v1beta' },
        { model: 'gemini-1.5-flash-latest', version: 'v1beta' },
        { model: 'gemini-1.5-flash-001', version: 'v1beta' },
        { model: 'gemini-1.5-pro', version: 'v1beta' },
        { model: 'gemini-1.0-pro', version: 'v1beta' },
        { model: 'gemini-pro', version: 'v1' }, // Fallback to stable v1
    ];

    // Deduplicate by model+version key
    const uniqueCandidates = candidates.filter((c, index, self) =>
        index === self.findIndex((t) => (
            t.model === c.model && t.version === c.version
        ))
    );

    let lastError = null;

    for (const { model, version } of uniqueCandidates) {
        try {
            console.log(`Attempting Gemini: ${model} (${version})`);
            const response = await fetch(
                `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7 }
                    })
                }
            );

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Model ${model} (${version}) failed: ${response.status} - ${text}`);
            }

            const data = await response.json();
            return {
                text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
                model,
                provider: 'gemini'
            };
        } catch (error) {
            console.error(error);
            lastError = error;
            // Continue to next candidate
        }
    }

    throw lastError || new Error('All Gemini models/versions failed.');
};

export const callOpenRouter = async (prompt: string, apiKey: string, model: string): Promise<AIResponse> => {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://cotizaciones-v2.vercel.app",
            "X-Title": "Cotizaciones AI Hub"
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) throw new Error(`OpenRouter Error: ${await response.text()}`);
    const data = await response.json();
    return {
        text: data.choices?.[0]?.message?.content || '',
        model: data.model,
        provider: 'openrouter'
    };
};

export const callZai = async (prompt: string, apiKey: string, model: string = 'glm-4'): Promise<AIResponse> => {
    // Basic OpenAI-compatible structure for Z.ai (GLM)
    const response = await fetch("https://api.zhinao.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) throw new Error(`Z.ai Error: ${await response.text()}`);
    const data = await response.json();
    return {
        text: data.choices?.[0]?.message?.content || '',
        model,
        provider: 'zai'
    };
};

export const callQwen = async (prompt: string, apiKey: string, model: string = 'qwen-max'): Promise<AIResponse> => {
    // DashScope (Alibaba) OpenAI-compatible format
    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) throw new Error(`Qwen Error: ${await response.text()}`);
    const data = await response.json();
    return {
        text: data.choices?.[0]?.message?.content || '',
        model,
        provider: 'qwen'
    };
};
