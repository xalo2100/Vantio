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

export const callGemini = async (prompt: string, apiKey: string, model: string = 'gemini-2.0-flash-lite'): Promise<AIResponse> => {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 }
            })
        }
    );

    if (!response.ok) throw new Error(`Gemini Error: ${await response.text()}`);
    const data = await response.json();
    return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        model,
        provider: 'gemini'
    };
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
