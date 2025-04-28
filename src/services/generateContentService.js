const axios = require("axios");
require("dotenv").config();

const generateContent = async (prompt) => {
    const apiKey = process.env.API_KEY;
    const url = `${process.env.GEMINI_API_URL}?key=${apiKey}`;

    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }],
        }, {
            headers: { "Content-Type": "application/json" }
        });

        const textContent = response.data.candidates[0].content.parts[0].text;
        return textContent;
    } catch (error) {
        console.error("Error generating content:", error.response ? error.response.data : error.message);
        throw new Error("Failed to generate content from Gemini API");
    }
};

module.exports = { generateContent };
