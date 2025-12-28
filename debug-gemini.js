require('dotenv').config();

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.log("No API Key found");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        console.log(`Fetching models from ${url}...`);
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("Error from API:", data.error);
            return;
        }

        console.log("Available Models:");
        if (data.models) {
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(` - ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log("No models found in response", data);
        }

    } catch (e) {
        console.error("Fetch error:", e);
    }
}

listModels();
