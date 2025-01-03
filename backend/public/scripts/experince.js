document.addEventListener("DOMContentLoaded", function () {
    console.log("Script loaded and ready.");
    
    const form = document.getElementById("experinceform");

    if (!form) {
        console.error("Form not found.");
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        console.log("Submit event triggered.");

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        console.log("Collected form data:", data);

        try {
            const response = await fetch("/experience/", { // Send the request to /experience/
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const result = await response.json();
                console.log("API response:", result);
                alert("Experience added successfully!");
            } else {
                console.error("API error:", response.status, response.statusText);
                alert("Failed to add experience. Please try again.");
            }
        } catch (error) {
            console.error("Error during API call:", error);
            alert("Unexpected error occurred.");
        }
    });
});
