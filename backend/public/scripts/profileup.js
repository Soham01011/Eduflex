document.getElementById('formAccountSettings').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Create a new FormData object
    const formData = new FormData(this);
    console.log("DATA TO BE UPLAODED : " , formData)

    try {
        // Send the form data to the backend
        const response = await fetch('/changeprofile', {
            method: 'POST',
            body: formData, // Form data automatically handles multipart/form-data
            headers: {
                'Accept': 'application/json' // Expecting JSON response
            }
        });

        const result = await response.json();

        if (response.ok) {
            // Handle successful profile update
            alert('Profile updated successfully.');
            console.log(result);
        } else {
            // Handle errors (e.g., invalid token, validation errors)
            alert(`Error: ${result.message}`);
            console.log(result);
        }
    } catch (error) {
        console.error('Error submitting the form:', error);
        alert('An error occurred while submitting the form.');
    }
});

console.log("upload profile data js is loaded ")
