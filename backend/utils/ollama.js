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
  // Match MBTI (case-insensitive, handles extra spaces)
  const mbtiMatch = responseText.match(/mbti\s*:\s*(.*?)(\n|$)/i);
  const mbti = mbtiMatch ? mbtiMatch[1].trim() : null;

  // Match Feedback (captures multi-line content)
  const feedbackMatch = responseText.match(/feedback\s*:\s*(.*?)(?=\n\s*Counselor\s*:|$)/is);
  const feedback = feedbackMatch ? feedbackMatch[1].trim() : null;

  // Match Counselor (True/False, case-insensitive)
  const counselorMatch = responseText.match(/counselor\s*:\s*(true|false)/i);
  const counselor = counselorMatch
    ? counselorMatch[1].toLowerCase() === "true"
    : null;

  console.log("FEEDBACK FROM OLLAMA:", mbti, feedback, counselor);

  return {
    mbti,
    feedback,
    counselor,
  };
}

module.exports = {psychometricOllama};