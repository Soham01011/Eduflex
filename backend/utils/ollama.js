const axios = require('axios');

async function psychometricOllama(questionsAndAnswers, prompt, mbit) {
  try {
    let llama_prompt = '';
    
    if (prompt === "NEW Regular test" && !mbit && !questionsAndAnswers) {
      llama_prompt = "Can you make a question for MBIT psychometric test, frame a single question with options: Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree. The output should be Question: <the question> \n Options: <the list of options>";
    }
    else if (prompt === "CONTINUE Regular test" && questionsAndAnswers) {
      const formattedQA = questionsAndAnswers.map((qa) => `Question: ${qa.question}\nAnswer: ${qa.answer}`).join("\n");
      llama_prompt = `Can you make the next question for MBIT psychometric test, frame a single question with options: Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree. The previous questions and answers were: ${formattedQA}. Output should be Question: <the question> \nOptions: <the list of options>`;
    }
    else if (prompt === "Feedback" && questionsAndAnswers && mbit) {
        const formattedQA = questionsAndAnswers.map((qa) => `Question: ${qa.question}\nAnswer: ${qa.answer}`).join("\n");
        llama_prompt = `Can you provide feedback for the student who appeared in the MBTI personality test with previous MBTI dimensions as ${mbit}, the questions asked and answers given are: ${formattedQA}. The output should be in the format of:
        Feedback: <feedback>
        Counselor: <true or false if it is an edge case>`;
    }
    else if (prompt === "Feedback" && questionsAndAnswers && !mbit) {
        const formattedQA = questionsAndAnswers.map((qa) => `Question: ${qa.question}\nAnswer: ${qa.answer}`).join("\n");
        llama_prompt = `Can you provide feedback for the student who appeared in the MBTI personality test, the questions asked and answers given are: ${formattedQA}. The output should be in the format of:
        Feedback: <feedback>
        Counselor: <true or false if it is an edge case>`;
    }

    if (llama_prompt === '') {
      throw new Error('Invalid prompt or missing required parameters.');
    }

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
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
        console.error('Error parsing JSON item:', item);
      }
    });

    console.log('Full Response:', fullResponse);

    // Determine the extraction method based on the prompt
    if (prompt === "Feedback" && questionsAndAnswers && mbit) {
      return extractFeedbackAndCounselor(fullResponse);
    } else {
      return extractQuestionAndOptions(fullResponse);
    }
  } catch (error) {
    console.error("Error:", error);
    return { error: "Failed to generate response" };
  }
}

// Helper function to extract feedback and counselor requirement
function extractFeedbackAndCounselor(responseText) {
  const feedbackMatch = responseText.match(/Feedback:(.*?)Counselor:/s);
  const counselorMatch = responseText.match(/Counselor:(.*)/s);

  const feedback = feedbackMatch ? feedbackMatch[1].trim() : null;
  const counselor = counselorMatch ? counselorMatch[1].trim() : null;

  return {
    feedback,
    counselor: counselor === 'True' || counselor === 'False' ? JSON.parse(counselor) : null,
  };
}

// Helper function to extract question and options
function extractQuestionAndOptions(responseText) {
  const questionMatch = responseText.match(/Question:(.*?)Options:/s);
  const optionsMatch = responseText.match(/Options:(.*)/s);

  const question = questionMatch ? questionMatch[1].trim() : null;
  const options = optionsMatch ? optionsMatch[1].trim().split("\n").map(option => option.trim()).filter(Boolean) : [];

  return {
    question,
    options,
  };
}

module.exports = {psychometricOllama};