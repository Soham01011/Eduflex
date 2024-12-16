const {logMessage} = require('./logger');

async function validatecert(username, filename) {
    const validateUrl = 'http://127.0.0.1:5000/validate-certificate-two'; // Flask endpoint for validation

    // Construct the request data
    const requestData = {
        username: username,
        filename: username+'-'+filename
    };

    try {
        // Validate the uploaded PDF
        const validateResponse = await fetch(validateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!validateResponse.ok) {
            logMessage(`[*] Validation failed with status: ${validateResponse.status}`);
        }

        const result = await validateResponse.json();
        console.log('Validation result:', result);

        // Process the result
        if (result.result === "Real") {
            return [result.result, null];
        } else if (result.result === "Fake") {
            return [result.result, result["Edited_By"]];
        } else {
            throw new Error('Unexpected result format');
        }

    } catch (error) {
        console.error('Error:', error);
        return [null, null]; // Return nulls or handle the error as needed
    }
};

module.exports = {validatecert}
