document.addEventListener('DOMContentLoaded', () => {
    // File input change listener
    document.getElementById('file').addEventListener('change', async function (event) {
        const fileInput = event.target;
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('file', file);

            // Disable the file input while uploading
            fileInput.disabled = true;

            try {
                // Send the file to the server for hashtag extraction
                const response = await fetch('/extract-hashtags', {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const extractedData = await response.json(); // Get the extracted data

                    // Populate name and institute/organization
                    populateExtractedData(extractedData);
                } else {
                    console.error('Error extracting hashtags');
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                fileInput.disabled = false; // Re-enable the file input after the request
            }
        }
    });

    // Function to populate name and institute/organization
    function populateExtractedData(data) {
        if (data.name) {
            document.getElementById('name').value = data.name;
        }
        if (data.institute) {
            document.getElementById('institute').value = data.institute;
        }
    }
});
