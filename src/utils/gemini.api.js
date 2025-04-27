const axios = require("axios");
require("dotenv").config();

// New function to handle generate content
const generateContent = async (prompt) => {
  const apiKey = process.env.API_KEY;
  const url = `${process.env.GEMINI_API_URL}?key=${apiKey}`;
  const headers = {
    "Content-Type": "application/json",
  };
  const data = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  try {
    const response = await axios.post(url, data, { headers });
    const textContent = response.data.candidates[0].content.parts[0].text;
    return textContent;
  } catch (error) {
    console.error(
      "Error generating content:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

// New function to handle translation
const translateContent = async (prompt) => {
  const apiKey = process.env.API_KEY;
  const url = `${process.env.GEMINI_API_URL}?key=${apiKey}`;
  const headers = {
    "Content-Type": "application/json",
  };
  const data = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  try {
    const response = await axios.post(url, data, { headers });
    const translatedText = response.data.candidates[0].content.parts[0].text;
    return translatedText;
  } catch (error) {
    console.error(
      "Error translating content:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

module.exports = { generateContent, translateContent };
