document.addEventListener("DOMContentLoaded", () => {
    // Attach event listener to all like buttons
    const likeButtons = document.querySelectorAll(".like-post");

    likeButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const postID = button.getAttribute("data-post-id");

            if (!postID) {
                console.error("Post ID is missing.");
                return;
            }

            try {
                // Send POST request to like the post
                const response = await fetch("/likeapi/like", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ postID }),
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message); // Show success message
                    // Optionally, update the UI (e.g., increment/decrement likes)
                    const likesCountElement = button.previousSibling; // Assuming likes count is just before the button
                    if (likesCountElement && likesCountElement.textContent.startsWith("LIKES")) {
                        const likes = parseInt(likesCountElement.textContent.split(" ")[1], 10);
                        likesCountElement.textContent = `LIKES ${likes + (result.message.includes("unliked") ? -1 : 1)}`;
                    }
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                console.error("Error liking the post:", error);
                alert("An error occurred. Please try again.");
            }
        });
    });
});
