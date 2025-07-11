const { InferenceClient } = require('@huggingface/inference');

// Initialize Hugging Face client
let hf;
let hfInitialized = false;
try {
  // Get API key from environment variables
  const HF_API_KEY = process.env.HF_API_KEY;
  if (!HF_API_KEY) {
    console.warn('Warning: HF_API_KEY is not set in environment variables');
  } else {
    hf = new InferenceClient( HF_API_KEY);
    hfInitialized = true;
    console.log('Hugging Face client initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Hugging Face client:', error);
}

/**
 * Analyzes a job description against a resume using a language model
 * @param {string} resumeContent - The content of the user's resume
 * @param {string} jobDescription - The job description to analyze
 * @returns {Object} Analysis results including improvements and match score
 */
const analyzeLLM = async (resumeContent, jobDescription) => {
  try {
    if (!hfInitialized || !hf) {
      throw new Error('Hugging Face client not initialized. Check if API key is set.');
    }

    // Prepare prompt for the LLM
    console.log("Preparing resume analysis prompt...");
    const prompt = `
You are an expert resume analyst and career coach. Analyze the resume and job description below:

RESUME:
${resumeContent || "No resume content provided"}

JOB DESCRIPTION:
${jobDescription || "No job description provided"}

Provide analysis in this exact JSON format:
{
  "improvements": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "matchingSkills": ["skill 1", "skill 2"],
  "missingSkills": ["skill 1", "skill 2"],
  "matchScore": 75,
  "recommendation": "Your overall recommendation"
}
`;

    // Define a list of models to try in order of preference
    const models = [
    "meta-llama/Llama-3.1-8B-Instruct"
    ];
    
    // Try each model until one works
    let response;
    let success = false;
    let lastError;
    
    for (const currentModel of models) {
      try {
        console.log(`Attempting to use model: ${currentModel}`);
        
        // Adjust parameters based on model
        const parameters = {
          temperature: 0.7,
          top_p: 0.95
        };
        
        // Some models have different parameter requirements
        if (currentModel.includes('t5') || currentModel === 'gpt2') {
          parameters.max_length = 512; // For T5 and GPT2
        } else {
          parameters.max_new_tokens = 1024; // For other models
        }
        
        // Generate analysis using InferenceClient
        response = await hf.chatCompletion({
          provider:"novita",
          model: currentModel,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                }
              ]
            }
          ],
          parameters
        });
        console.log("This is the response", response);

        success = true;
        console.log(`Successfully generated response using model: ${currentModel}`);
        break;
      } catch (modelError) {
        console.error(`Error with model ${currentModel}:`, modelError);
        lastError = modelError;
        // Continue to the next model
      }
    }
    
    if (!success) {
      console.warn('All models failed. Using fallback analysis.');
      // Provide a fallback response
      return {
        improvements: [
          "Due to technical limitations, we're providing general resume tips:",
          "1. Tailor your resume keywords to match the job description",
          "2. Highlight relevant experience and quantifiable achievements",
          "3. Ensure your resume has a clean, professional format"
        ],
        matchingSkills: ["Unable to analyze - service unavailable"],
        missingSkills: ["Unable to analyze - service unavailable"],
        matchScore: 0,
        recommendation: "The resume analysis service is currently experiencing technical difficulties. Please try again later."
      };
    }

    // Extract JSON from the response
    let jsonResponse;
    try {
      // Try to extract JSON from the response
      const jsonText = response.choices[0]?.message?.content || '';
      console.log("This is the json text", jsonText);
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        jsonResponse = JSON.parse(jsonMatch[0]);
        console.log("Successfully parsed JSON response");
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      // Fallback with a structured error response
      jsonResponse = {
        improvements: ['Unable to analyze resume properly. Please check format and try again.'],
        matchingSkills: [],
        missingSkills: [],
        matchScore: 0,
        recommendation: 'Unable to generate recommendation due to processing error.'
      };
    }

    return jsonResponse;
  } catch (error) {
    console.error('Error in LLM analysis:', error);
    
    // Provide a meaningful response even when the API fails
    return {
      improvements: [
        "The LLM service is currently unavailable. Here are general tips:",
        "1. Tailor your resume keywords to match the job description",
        "2. Highlight relevant experience and quantifiable achievements",
        "3. Ensure your resume has a clean, professional format"
      ],
      matchingSkills: ["Unable to analyze - service unavailable"],
      missingSkills: ["Unable to analyze - service unavailable"],
      matchScore: 0,
      recommendation: "The resume analysis service is currently experiencing technical difficulties. Please try again later."
    };
  }
};

module.exports = {
  analyzeLLM
};
