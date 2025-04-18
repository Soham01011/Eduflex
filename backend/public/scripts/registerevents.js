document.addEventListener("DOMContentLoaded", function () {
  console.log("Register for Event script loaded");

  const registerButtons = document.querySelectorAll("[data-event-id]");

  registerButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled) return; // Skip if already registered

      const eventId = button.getAttribute("data-event-id");

      // Debugging: Log the event ID
      console.log("Event ID:", eventId);

      if (!eventId) {
        alert("Event ID is missing!");
        return;
      }

      // Confirm registration
      const confirmRegister = confirm(
        "Do you want to register for this event?"
      );

      if (confirmRegister) {
        try {
          const response = await fetch("/announcements/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventId: eventId,
              interface: "Webapp",
            }),
          });

          const data = await response.json();

          if (data.success) {
            alert("Successfully registered for the event!");
            // Update button state
            button.disabled = true;
            button.textContent = "Registered";
            button.classList.add("bg-gray-500");
            button.classList.remove("hover:bg-purple-700");
          } else {
            alert(data.message || "Failed to register for the event");
          }
        } catch (error) {
          console.error("Error registering for event:", error);
          alert("Error registering for event");
        }
      }
    });
  });

  console.log("Download button script loaded");

  const downloadButtons = document.querySelectorAll("[data-event-data-id]");

  console.log("Found download buttons:", downloadButtons.length);

  downloadButtons.forEach((button) => {
    button.addEventListener("click", async function () {
      const eventId = this.getAttribute("data-event-data-id");
      console.log("Download button clicked for Event ID:", eventId); // Check if this prints

      if (!eventId) {
        console.warn("No event ID found on button.");
        return;
      }

      try {
        // Make an API call to fetch the PDF file as a blob
        const response = await fetch(`/announcements/${eventId}/download`, {
          method: "GET",
        });

        // Check if the response is ok
        if (!response.ok) {
          throw new Error("Failed to fetch the PDF");
        }

        // Get the blob from the response
        const blob = await response.blob();

        // Create a hidden anchor to trigger the download
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `event_${eventId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Error downloading the PDF:", error);
        alert("There was an error downloading the PDF.");
      }
    });
  });

  // Check initial registration status
  registerButtons.forEach((button) => {
    const eventId = button.getAttribute("data-event-id");
    const announcement = announcements.find((a) => a.id === eventId);

    if (announcement && announcement.registeredusers.includes(username)) {
      button.disabled = true;
      button.textContent = "Registered";
      button.classList.add("bg-gray-500");
      button.classList.remove("hover:bg-purple-700");
    }
  });
});
