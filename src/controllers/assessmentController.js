const { generateAssessmentPrompt } = require("../utils/generateAssessmentPrompt");
const { generateContent } = require("../services/generateContentService");

const generateAssessment = async (req, res) => {
    try {
        const {
            taskType,
            courseName,
            clos,
            questionTypes,
            numberOfQuestions,
            difficultyDistribution
        } = req.body;

        const prompt = generateAssessmentPrompt({
            taskType,
            courseName,
            clos,
            questionTypes,
            numberOfQuestions,
            difficultyDistribution
        });

        const generatedAssessment = await generateContent(prompt);

        res.status(200).json({ success: true, assessment: generatedAssessment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { generateAssessment };
