document.addEventListener("DOMContentLoaded", function () {
    console.log("Register for Event script loaded");

    const registerButtons = document.querySelectorAll('[data-event-id]');

    registerButtons.forEach(button => {
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
            const confirmRegister = confirm("Do you want to register for this event?");

            if (confirmRegister) {
                try {
                    const response = await fetch('/announcements/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            eventId: eventId,
                            interface: 'Webapp'
                        }),
                    });

                    const data = await response.json();

                    if (data.success) {
                        alert('Successfully registered for the event!');
                        // Update button state
                        button.disabled = true;
                        button.textContent = 'Registered';
                        button.classList.add('bg-gray-500');
                        button.classList.remove('hover:bg-purple-700');
                    } else {
                        alert(data.message || 'Failed to register for the event');
                    }
                } catch (error) {
                    console.error("Error registering for event:", error);
                    alert("Error registering for event");
                }
            }
        });
    });

    // Check initial registration status
    registerButtons.forEach(button => {
        const eventId = button.getAttribute("data-event-id");
        const announcement = announcements.find(a => a.id === eventId);
        
        if (announcement && announcement.registeredusers.includes(username)) {
            button.disabled = true;
            button.textContent = 'Registered';
            button.classList.add('bg-gray-500');
            button.classList.remove('hover:bg-purple-700');
        }
    });
});