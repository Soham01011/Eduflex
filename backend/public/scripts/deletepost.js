document.addEventListener("DOMContentLoaded", () => {
    console.log("DELETE POST SCRIPT LOADED");
    
    // Select all buttons with the `data-action="delete"` attribute
    const deleteButtons = document.querySelectorAll('[data-action="delete"]');

    deleteButtons.forEach(button => {
        button.addEventListener("click", async () => {
            // Fetch the post ID from the button's attribute
            const postId = button.getAttribute("data-post-id");

            // Debugging: Log the post ID to ensure it's being retrieved
            console.log("Post ID:", postId);

            if (!postId) {
                alert("Post ID is missing!");
                return; // Exit the function if no post ID is found
            }

            // Confirm deletion
            const confirmDelete = confirm("Are you sure you want to delete this post?");

            if (confirmDelete) {
                try {
                    const response = await fetch('/deletePost', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            postID: postId, 
                            interface: 'Webapp' // Default interface value
                        }),
                    });

                    if (response.ok) {
                        alert("Post deleted successfully!");
                        button.closest('.post').remove(); // Optionally remove the post from the UI
                    } else {
                        alert("Failed to delete post.");
                    }
                } catch (error) {
                    console.error("Error deleting post:", error);
                    alert("Error deleting post.");
                }
            }
        });
    });
});
