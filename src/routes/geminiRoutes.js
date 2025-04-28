const express = require("express");
const { generateContent } = require("../utils/gemini.content");
const router = express.Router();

router.post("/generate", async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
    }

    try {
        const generatedText = await generateContent(prompt);
        res.status(200).json({ content: generatedText });
    } catch (error) {
        res.status(500).json({ message: "Failed to generate content", error: error.message });
    }
});

module.exports = router;
