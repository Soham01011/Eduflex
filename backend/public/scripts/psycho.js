let testId = ""; // Global variable to store the test_id
const answeredQuestions = []; // Array to store questions and answers

window.onload = () => {
  fetch("/psychometrictest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      testId = data.test_id; // Save the test_id
      displayQuestion(data.result.question);
    })
    .catch((error) => console.error("Error occurred:", error));
};

document.getElementById("answerForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedAnswer = document.querySelector('input[name="answer"]:checked').value;
  const currentQuestion = document.getElementById("currentQuestionText").textContent;

  // Store the current question and selected answer
  answeredQuestions.push({ question: currentQuestion, answer: selectedAnswer });

  fetch("/psychometrictest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      test_id: testId,
      question: currentQuestion,
      answer: selectedAnswer,
    }),
  })  
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
      if (data.result) {
        if (data.result.feedback) {
          // If feedback is received, display it
          displayFeedback(data.result.feedback);
        } else {
          // Render the next question
          displayQuestion(data.result.question);
        }
      }
    })
    .catch((error) => console.error("Error occurred while submitting the answer:", error));
});

function displayQuestion(question) {
  // Append previous question and answer to the UI
  if (answeredQuestions.length > 0) {
    const lastAnswer = answeredQuestions[answeredQuestions.length - 1];
    const questionDiv = document.createElement("div");
    questionDiv.innerHTML = `
      <p><strong>${lastAnswer.question}</strong></p>
      <p>Answer: ${lastAnswer.answer}</p>
      <br>
      <hr>
      <br>
    `;
    document.getElementById("questionsContainer").appendChild(questionDiv);
  }

  // Update current question
  document.getElementById("currentQuestionText").textContent = question;
  document.getElementById("testContainer").style.display = "block";

  // Clear radio selection for the next question
  const radios = document.querySelectorAll('input[name="answer"]');
  radios.forEach((radio) => (radio.checked = false));
}

function displayFeedback(feedback) {
  // Hide the test container
  document.getElementById("testContainer").style.display = "none";

  // Display the feedback in the UI
  const feedbackDiv = document.createElement("div");
  feedbackDiv.className = "feedback";
  feedbackDiv.innerHTML = `
    <h3>Test Completed</h3>
    <p>${feedback}</p>
  `;
  document.getElementById("questionsContainer").appendChild(feedbackDiv);
}
