document.addEventListener("DOMContentLoaded", () => {
    let currentPage = 1; // Start with page 1
    const range = 5; // Number of posts per page
    const feedContainer = document.getElementById("feed-container");
    const loadMoreButton = document.getElementById("load-more");

    if (loadMoreButton && feedContainer) {
        console.log("Detected the container and button");

        // Function to fetch and append posts
        async function fetchMorePosts() {
            try {
                currentPage++;
                console.log("Loading more feed", currentPage);

                const response = await fetch(`/feed?page=${currentPage}&range=${range}`);
                const result = await response.json();

                if (response.ok) {
                    result.data.forEach(card => {
                        const cardHTML = `
                            <div class="card">
                                <div class="left">
                                    <h2>${card.firstname} ${card.lastname}</h2>
                                    <div class="username">@${card.username}</div>
                                    <p>${card.post_desc}</p>
                                </div>
                                <div class="right">
                                    <div class="pdf-container">
                                        <iframe src="${card.file}" width="100%" height="100%"></iframe>
                                    </div>
                                </div>
                            </div>
                            <br>
                        `;
                        feedContainer.insertAdjacentHTML('beforeend', cardHTML);
                    });

                    // Hide Load More button if no more pages exist
                    if (currentPage >= result.totalPages) {
                        loadMoreButton.style.display = 'none';
                    }
                } else {
                    console.error("Error fetching posts:", result.error);
                }
            } catch (error) {
                console.error("Error:", error);
            }
        }

        // Event listener for Load More button
        loadMoreButton.addEventListener("click", fetchMorePosts);
    } else {
        console.error("Load More button or Feed Container not found.");
    }
});
