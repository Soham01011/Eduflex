document.addEventListener("DOMContentLoaded", () => {
    console.log("Script loaded");
    
    const likeButtons = document.querySelectorAll(".like-post");
    console.log("Found like buttons:", likeButtons.length);

    likeButtons.forEach(button => {
        button.addEventListener("click", async (event) => {
            event.preventDefault();
            console.log("Button clicked");
            
            const postID = button.getAttribute("data-post-id");
            console.log("Post ID:", postID);
            
            const likesCountElement = button.parentElement.querySelector(".likes-count");
            console.log("Current likes:", likesCountElement.textContent);

            try {
                const response = await fetch("/likeapi/like", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ postID }),
                    credentials: 'include'
                });

                console.log("Response received:", response.status);
                const result = await response.json();
                console.log("Result:", result);

                if (response.ok) {
                    likesCountElement.textContent = `${result.likesCount} likes`;
                    button.setAttribute('data-is-liked', result.isLiked);
                    
                    if (result.isLiked) {
                        button.classList.remove('bg-purple-600', 'hover:bg-purple-700');
                        button.classList.add('bg-red-600', 'hover:bg-red-700');
                    } else {
                        button.classList.remove('bg-red-600', 'hover:bg-red-700');
                        button.classList.add('bg-purple-600', 'hover:bg-purple-700');
                    }
                    
                    console.log("Like updated successfully");
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error("Error:", error);
                alert(error.message || "An error occurred while processing your like");
            }
        });
    });
});
