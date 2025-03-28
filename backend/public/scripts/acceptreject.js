document.addEventListener("DOMContentLoaded", () => {
    console.log("Post approval buttons initialized");

    document.querySelectorAll('.slider').forEach(slider => {
        const sliderId = slider.id;
        const sliderValue = document.getElementById(sliderId.replace('markSlider', 'sliderValue'));
        
        slider.addEventListener("input", () => {
            sliderValue.textContent = slider.value;
            let percentage = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
            slider.style.background = `linear-gradient(to right, #8F00FF ${percentage}%, #ddd ${percentage}%)`;
        });
    });


    document.querySelectorAll(".accept-btn, .reject-btn").forEach(button => {
        button.addEventListener("click", async () => {
            const postId = button.getAttribute("data-postid");
            if (!postId) {
                alert("Post ID is missing!");
                return;
            }

            const isApproved = button.classList.contains("accept-btn"); // true for accept, false for reject
            const confirmAction = confirm(`Are you sure you want to ${isApproved ? "approve" : "reject"} this post?`);

            if (!confirmAction) return;
            console.log("APPROVING ===", postId, isApproved)
            try {
                const response = await fetch('/postpermission-mentor', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ postID: postId, accept: isApproved })
                });

                if (response.ok) {
                    alert(`Post successfully ${isApproved ? "approved" : "rejected"}!`);

                    // Optional: Remove post from UI
                    const postContainer = button.closest('.post');
                    if (postContainer) {
                        postContainer.remove();
                    }
                } else {
                    alert(`Failed to ${isApproved ? "approve" : "reject"} post.`);
                }
            } catch (error) {
                console.error(`Error updating post approval:`, error);
                alert(`Error occurred while trying to update post.`);
            }
        });
    });
});
