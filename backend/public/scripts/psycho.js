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
          displayFeedback(data);
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

function displayFeedback(feedbackData) {
    // If feedbackData is nested in result object, extract it
    const data = feedbackData.result || feedbackData;
    
    // Hide the test container
    document.getElementById("testContainer").style.display = "none";
    
    // Show the feedback container
    const feedbackContainer = document.getElementById("feedbackContainer");
    feedbackContainer.classList.remove("hidden");

    // Update MBTI result
    const mbtiElement = document.getElementById("mbtiResult");
    if (data.mbti) {
        mbtiElement.textContent = data.mbti;
        mbtiElement.classList.add("font-bold", "text-2xl", "text-purple-600");
    } else {
        mbtiElement.textContent = 'MBTI Type Not Available';
    }

    // Update Feedback text
    const feedbackElement = document.getElementById("feedbackResult");
    if (data.feedback) {
        // Clean up the feedback text by removing mbti and feedback labels
        let cleanFeedback = data.feedback
            .replace(/mbti:\s*[A-Z]{4}\s*/i, '')  // Remove MBTI label and value
            .replace(/feedback:\s*/i, '')         // Remove Feedback label
            .trim();
        
        feedbackElement.textContent = cleanFeedback;
    } else {
        feedbackElement.textContent = 'No feedback available';
    }

    // Update Counselor recommendation
    const counselorElement = document.getElementById("counselorResult");
    if (data.counselor) {
        counselorElement.innerHTML = `
            <div class="flex items-center p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
                <span>Counseling Recommended: Schedule an appointment with our counselor for further guidance.</span>
            </div>`;
    } else {
        counselorElement.innerHTML = `
            <div class="flex items-center p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                </svg>
                <span>No immediate counseling needed. Continue with your regular activities.</span>
            </div>`;
    }

    // Add redirect button handler
    const viewDashboardBtn = document.getElementById('viewDashboardBtn');
    if (viewDashboardBtn) {
        // Remove any existing event listeners
        viewDashboardBtn.replaceWith(viewDashboardBtn.cloneNode(true));
        
        // Get the fresh reference and add new listener
        const freshBtn = document.getElementById('viewDashboardBtn');
        freshBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update button state
            this.innerHTML = `
                <span class="flex items-center">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redirecting...
                </span>
            `;
            this.disabled = true;
            
            // Redirect with a slight delay for the animation
            setTimeout(() => {
                window.location.href = "/alltest";
            }, 500);
        });
    } else {
        console.error("Dashboard button not found in the DOM");
    }

    // Add loading animation class
    feedbackContainer.classList.add('animate-fade-in');
    
    // Scroll to feedback
    feedbackContainer.scrollIntoView({ behavior: 'smooth' });

    // Log the displayed data for debugging
    console.log("Displaying feedback:", {
        mbti: data.mbti,
        feedback: data.feedback,
        counselor: data.counselor
    });
}
