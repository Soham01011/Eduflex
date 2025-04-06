const axios = require('axios');

async function psychometricOllama(questionsAndAnswers, prompt, mbti) {
  console.log("questions ", questionsAndAnswers, " prompt : ", prompt, " mbti ", mbti);
  try {
    let llama_prompt = '';
    
    if (prompt === "NEW Regular test" && !mbti && (!questionsAndAnswers || questionsAndAnswers.length === 0)) {
      llama_prompt = "Can you make a question for mbti 16 personality psychometric test, frame a single question with options: Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree. The output should be Question: <the question> \n Options: <the list of options>";
    }
    else if (prompt === "CONTINUE Regular test" && questionsAndAnswers && questionsAndAnswers.length > 0) {
      const formattedQA = questionsAndAnswers.map((qa) => `Question: ${qa.question}\nAnswer: ${qa.answer}`).join("\n");
      llama_prompt = `Can you make the next question for mbti 16 personality psychometric test, frame a single question with options: Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree. The previous questions and answers were: ${formattedQA}. Output should be Question: <the question> \nOptions: <the list of options>`;
    }
    else if (prompt === "Feedback" && questionsAndAnswers && mbti) {
      const formattedQA = questionsAndAnswers.map((qa) => `Question: ${qa.question}\nAnswer: ${qa.answer}`).join("\n");
      llama_prompt = `Can you provide feedback for the student who appeared in the MBTI personality test with previous MBTI 16 personality dimensions as ${mbti}, the questions asked and answers given are: ${formattedQA}. The output should be in the format of:
        mbti : <mbti dimensions>
        Feedback: <feedback>
        Counselor: <true or false if it is an edge case>`;
    }
    else if (prompt === "Feedback" && questionsAndAnswers && !mbti) {
      const formattedQA = questionsAndAnswers.map((qa) => `Question: ${qa.question}\nAnswer: ${qa.answer}`).join("\n");
      llama_prompt = `Can you provide feedback for the student who appeared in the MBTI 16 personality personality test, the questions asked and answers given are: ${formattedQA}.Nothing extra is required ,the output should be in the format of:
        mbti : <mbti dimensions>
        Feedback: <feedback>
        Counselor: <true or false if it is an edge case>`;
    }

    if (!llama_prompt) {
      throw new Error('Invalid prompt or missing required parameters.');
    }

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.1:8b',
      prompt: llama_prompt,
    });

    let fullResponse = '';
    const dataArray = response.data.split("\n");

    // Loop through response to build full response
    dataArray.forEach(item => {
      try {
        const jsonResponse = JSON.parse(item);
        if (jsonResponse.response) {
          fullResponse += jsonResponse.response;
        }
      } catch (error) {
        console.error("Error parsing response:", error);
      }
    });

    console.log('Full Response:', fullResponse);

    // Determine the extraction method based on the prompt
    if ((prompt === "Feedback" && questionsAndAnswers) || mbti) {
      return extractDetailsFromResponse(fullResponse);
    } else {
      return extractQuestionOnly(fullResponse);
    }
  } catch (error) {
    console.error("Error:", error);
    return { error: "Failed to generate response" };
  }
}

// Update extractQuestionAndOptions to only return the question
function extractQuestionOnly(responseText) {
  const questionMatch = responseText.match(/Question:(.*?)Options:/s);
  const question = questionMatch ? questionMatch[1].trim() : null;

  return { question };
}

// Helper function to extract feedback and counselor requirement
function extractDetailsFromResponse(responseText) {
    // Clean the text first
    const cleanText = responseText
        .replace(/[`*]/g, '')
        .replace(/\n+/g, ' ')
        .trim();

    // Updated regex patterns
    const mbtiPatterns = [
        /\*\*mbti:\*\*\s*([A-Z]{3,4})/i,                   // Markdown format
        /mbti\s*:?\s*"?([A-Z]{3,4})"?/i,                   // Standard format
        /mbti\s+(?:type|result|is)?\s*:?\s*([A-Z]{3,4})/i, // Descriptive format
        /(?:personality\s+)?type\s*:?\s*([A-Z]{3,4})/i     // Alternative format
    ];

    const feedbackPattern = /feedback\s*:?\s*"?([^"]+?)(?=(?:\s*counselor:|$))/i;
    const counselorPattern = /counselor\s*:?\s*(true|false)/i;

    let mbti = null;
    let feedback = null;
    let counselor = null;

    try {
        // Try each MBTI pattern until we find a match
        for (const pattern of mbtiPatterns) {
            const mbtiMatch = cleanText.match(pattern);
            if (mbtiMatch && mbtiMatch[1]) {
                // Validate MBTI format
                const mbtiValue = mbtiMatch[1].toUpperCase();
                if (mbtiValue.length >= 3 && /^[IEFSNTJP]+$/.test(mbtiValue)) {
                    mbti = mbtiValue;
                    break;
                }
            }
        }

        // Extract Feedback
        const feedbackMatch = cleanText.match(feedbackPattern);
        if (feedbackMatch && feedbackMatch[1]) {
            feedback = feedbackMatch[1].trim();
        }

        // Extract Counselor status
        const counselorMatch = cleanText.match(counselorPattern);
        if (counselorMatch && counselorMatch[1]) {
            counselor = counselorMatch[1].toLowerCase() === 'true';
        }

        // Enhanced fallback for feedback
        if (!feedback && mbti) {
            const sections = cleanText.split(/(?:counselor|feedback)\s*:/i);
            const mbtiSection = sections[0];
            const textAfterMBTI = mbtiSection.substring(mbtiSection.indexOf(mbti) + mbti.length);
            if (textAfterMBTI) {
                feedback = textAfterMBTI.trim();
            }
        }

    } catch (error) {
        console.error("Error parsing response:", error);
    }

    // Validate and clean MBTI if needed
    if (mbti && mbti.length === 3) {
        // If only 3 letters are found, try to infer the 4th based on common patterns
        const missingDimension = {
            'IEJ': 'IEJF', // Example inference
            'IEP': 'IESP',
            // Add more mappings as needed
        }[mbti] || null;
        
        if (missingDimension) {
            mbti = missingDimension;
            console.log(`Inferred MBTI from ${mbti} to ${missingDimension}`);
        }
    }

    // Log the extracted data for debugging
    console.log("Parsed Response:", {
        mbti,
        feedback: feedback ? `${feedback.substring(0, 50)}...` : null,
        counselor,
        originalText: cleanText.substring(0, 100) + '...'
    });

    return { mbti, feedback, counselor };
}

module.exports = {psychometricOllama};

