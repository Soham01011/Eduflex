const {logMessage} = require('./logger');
const path = require('path');
const fs = require('fs');

async function validatecert(username, filename, postid) {
    const validateUrl = 'http://127.0.0.1:5000/validate-certificate-two';

    const requestData = {
        username: username,
        filename: username+'-'+filename
    };

    try {
        const validateResponse = await fetch(validateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!validateResponse.ok) {
            logMessage(`[*] Validation failed with status: ${validateResponse.status}`);
            throw new Error('Validation request failed');
        }

        const result = await validateResponse.json();
        console.log('Validation result:', result.result, "Edited by", result["Edited_By"]);
        
        // Save detailed results to JSONL file
        if (result.detailed_results && Array.isArray(result.detailed_results.data)) {
            // Create RLHF directory in project root
            const rlhfPath = path.join(__dirname, '..', 'RLHF');
            if (!fs.existsSync(rlhfPath)) {
                fs.mkdirSync(rlhfPath, { recursive: true });
                console.log(`Created RLHF directory at: ${rlhfPath}`);
            }

            const jsonlPath = path.join(rlhfPath, 'predictions.jsonl');
            console.log(`JSONL file path: ${jsonlPath}`);

            // Create each line of JSONL data
            const jsonlEntries = result.detailed_results.data.map(entry => {
                const jsonlEntry = {
                    timestamp: new Date().toISOString(),
                    filename: result.detailed_results.filename,
                    postID: postid,
                    model_data: {
                        input_data: entry.input_data,
                        prediction: entry.prediction,
                        producer: entry.producer
                    },
                    trained: false
                };
                return JSON.stringify(jsonlEntry);
            });

            // Append each line to the JSONL file
            try {
                const jsonlContent = jsonlEntries.join('\n') + '\n';
                fs.appendFileSync(jsonlPath, jsonlContent, 'utf8');
                logMessage(`[+] Successfully saved validation data to JSONL for postID: ${postid}`);
                console.log(`Data saved to: ${jsonlPath}`);
            } catch (writeErr) {
                console.error('Error writing to JSONL file:', writeErr);
                logMessage(`[*] Error saving to JSONL: ${writeErr.message}`);
            }
        }

        // Process the validation result
        if (result.result === "Real") {
            return [result.result, null];
        } else if (result.result === "Fake") {
            return [result.result, result["Edited_By"]];
        } else {
            throw new Error('Unexpected result format');
        }

    } catch (error) {
        logMessage(`[*] Validation error: ${error.message}`);
        console.error('Error:', error);
        return [null, null];
    }
}

module.exports = {validatecert};
