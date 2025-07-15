const { InferenceClient } = require('@huggingface/inference');

let hf;
let hfInitialized = false;
try {
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

const analyzeLLM = async (resumeContent, jobDescription) => {
  try {
    if (!hfInitialized || !hf) {
      throw new Error('Hugging Face client not initialized. Check if API key is set.');
    }

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

    const models = [
    "deepseek-ai/DeepSeek-R1-0528"
    ];

    let response;
    let success = false;
    let lastError;
    
    for (const currentModel of models) {
      try {
        console.log(`Attempting to use model: ${currentModel}`);
        
        const parameters = {
          temperature: 0.7,
          top_p: 0.95
        };
        
        if (currentModel.includes('t5') || currentModel === 'gpt2') {
          parameters.max_length = 512; 
        } else {
          parameters.max_new_tokens = 1024;
        }
        
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
      }
    }
    
    if (!success) {
      console.warn('All models failed. Using fallback analysis.');
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

    let jsonResponse;
    try {
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
