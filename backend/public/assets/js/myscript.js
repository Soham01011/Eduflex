 //selecting all required elements
 const dropArea = document.querySelector(".drag-area"),
 dragText = dropArea.querySelector("header"),
 button = dropArea.querySelector("button"),
 input = dropArea.querySelector("input");
 let file; //this is a global variable and we'll use it inside multiple functions
 
 
 
 
 button.onclick = ()=>{
   input.click(); //if user click on the button then the input also clicked
 }
 
 
 
 
 input.addEventListener("change", function(){
   //getting user select file and [0] this means if user select multiple files then we'll select only the first one
   file = this.files[0];
   dropArea.classList.add("active");
   showFile(); //calling function
 });
 //If user Drag File Over DropArea
 dropArea.addEventListener("dragover", (event)=>{
   event.preventDefault(); //preventing from default behaviour
   dropArea.classList.add("active");
   dragText.textContent = "Release to Upload File";
 });
 
 
 
 
 //If user leave dragged File from DropArea
 dropArea.addEventListener("dragleave", ()=>{
   dropArea.classList.remove("active");
   dragText.textContent = "Drag & Drop to Upload File";
 });
 
 
 
 
 //If user drop File on DropArea
 dropArea.addEventListener("drop", (event)=>{
   event.preventDefault(); //preventing from default behaviour
   //getting user select file and [0] this means if user select multiple files then we'll select only the first one
   file = event.dataTransfer.files[0];
   showFile(); //calling function
 });
 
 
 
 
 function showFile(){
   let fileType = file.type; //getting selected file type
   let validExtensions = ["image/jpeg", "image/jpg", "image/png"]; //adding some valid image extensions in array
   if(validExtensions.includes(fileType)){ //if user selected file is an image file
     let fileReader = new FileReader(); //creating new FileReader object
     fileReader.onload = ()=>{
       let fileURL = fileReader.result; //passing user file source in fileURL variable
       let imgTag = `<img src="${fileURL}" alt="image">`; //creating an img tag and passing user selected file source inside src 
 attribute
       dropArea.innerHTML = imgTag; //adding that created img tag inside dropArea container
     }
     fileReader.readAsDataURL(file);
   }else{
     alert("This is not an Image File!");
     dropArea.classList.remove("active");
     dragText.textContent = "Drag & Drop to Upload File";
   }
 }

 function displayPDF(input) {
  const file = input.files[0];
  const pdfBox = document.getElementById('pdfBox');
  if (file && file.type === 'application/pdf') {
    const fileURL = URL.createObjectURL(file);
    pdfBox.innerHTML = `<embed src="${fileURL}" width="100%" height="400px" type="application/pdf">`;
  } else {
    pdfBox.innerHTML = '<p class="text-sm text-red-500">Invalid file type. Please upload a PDF.</p>';
  }
}


const chatInput = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-btn");
const chatContainer = document.querySelector(".chat-container");
const themeButton = document.querySelector("#theme-btn");
const deleteButton = document.querySelector("#delete-btn");

let userText = null;
const API_KEY = "PASTE-YOUR-API-KEY-HERE"; // Paste your API key here

const loadDataFromLocalstorage = () => {
    // Load saved chats and theme from local storage and apply/add on the page
    const themeColor = localStorage.getItem("themeColor");

    document.body.classList.toggle("light-mode", themeColor === "light_mode");
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";

    const defaultText = `<div class="default-text">
                            <h1>ChatGPT Clone</h1>
                            <p>Start a conversation and explore the power of AI.<br> Your chat history will be displayed here.</p>
                        </div>`

    chatContainer.innerHTML = localStorage.getItem("all-chats") || defaultText;
    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to bottom of the chat container
}

const createChatElement = (content, className) => {
    // Create new div and apply chat, specified class and set html content of div
    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat", className);
    chatDiv.innerHTML = content;
    return chatDiv; // Return the created chat div
}

const getChatResponse = async (incomingChatDiv) => {
    const API_URL = "https://api.openai.com/v1/completions";
    const pElement = document.createElement("p");

    // Define the properties and data for the API request
    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "text-davinci-003",
            prompt: userText,
            max_tokens: 2048,
            temperature: 0.2,
            n: 1,
            stop: null
        })
    }

    // Send POST request to API, get response and set the reponse as paragraph element text
    try {
        const response = await (await fetch(API_URL, requestOptions)).json();
        pElement.textContent = response.choices[0].text.trim();
    } catch (error) { // Add error class to the paragraph element and set error text
        pElement.classList.add("error");
        pElement.textContent = "Oops! Something went wrong while retrieving the response. Please try again.";
    }

    // Remove the typing animation, append the paragraph element and save the chats to local storage
    incomingChatDiv.querySelector(".typing-animation").remove();
    incomingChatDiv.querySelector(".chat-details").appendChild(pElement);
    localStorage.setItem("all-chats", chatContainer.innerHTML);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
}

const copyResponse = (copyBtn) => {
    // Copy the text content of the response to the clipboard
    const reponseTextElement = copyBtn.parentElement.querySelector("p");
    navigator.clipboard.writeText(reponseTextElement.textContent);
    copyBtn.textContent = "done";
    setTimeout(() => copyBtn.textContent = "content_copy", 1000);
}

const showTypingAnimation = () => {
    // Display the typing animation and call the getChatResponse function
    const html = `<div class="chat-content">
                    <div class="chat-details">
                        <img src="images/chatbot.jpg" alt="chatbot-img">
                        <div class="typing-animation">
                            <div class="typing-dot" style="--delay: 0.2s"></div>
                            <div class="typing-dot" style="--delay: 0.3s"></div>
                            <div class="typing-dot" style="--delay: 0.4s"></div>
                        </div>
                    </div>
                    <span onclick="copyResponse(this)" class="material-symbols-rounded">content_copy</span>
                </div>`;
    // Create an incoming chat div with typing animation and append it to chat container
    const incomingChatDiv = createChatElement(html, "incoming");
    chatContainer.appendChild(incomingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    getChatResponse(incomingChatDiv);
}

const handleOutgoingChat = () => {
    userText = chatInput.value.trim(); // Get chatInput value and remove extra spaces
    if(!userText) return; // If chatInput is empty return from here

    // Clear the input field and reset its height
    chatInput.value = "";
    chatInput.style.height = `${initialInputHeight}px`;

    const html = `<div class="chat-content">
                    <div class="chat-details">
                        <img src="images/user.jpg" alt="user-img">
                        <p>${userText}</p>
                    </div>
                </div>`;

    // Create an outgoing chat div with user's message and append it to chat container
    const outgoingChatDiv = createChatElement(html, "outgoing");
    chatContainer.querySelector(".default-text")?.remove();
    chatContainer.appendChild(outgoingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    setTimeout(showTypingAnimation, 500);
}

deleteButton.addEventListener("click", () => {
    // Remove the chats from local storage and call loadDataFromLocalstorage function
    if(confirm("Are you sure you want to delete all the chats?")) {
        localStorage.removeItem("all-chats");
        loadDataFromLocalstorage();
    }
});

themeButton.addEventListener("click", () => {
    // Toggle body's class for the theme mode and save the updated theme to the local storage 
    document.body.classList.toggle("light-mode");
    localStorage.setItem("themeColor", themeButton.innerText);
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";
});

const initialInputHeight = chatInput.scrollHeight;

chatInput.addEventListener("input", () => {   
    // Adjust the height of the input field dynamically based on its content
    chatInput.style.height =  `${initialInputHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    // If the Enter key is pressed without Shift and the window width is larger 
    // than 800 pixels, handle the outgoing chat
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleOutgoingChat();
    }
});

loadDataFromLocalstorage();
sendButton.addEventListener("click", handleOutgoingChat);