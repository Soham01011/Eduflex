const { logMessage } = require('./logger');

async function certificatelevelcheck(filepath) {
    console.log("filepath here ", filepath);

    const checklevel = 'http://localhost:5000/checkcertlevel';
    const requestData = {
        filePath: filepath
    };

    try {
        const validateResponse = await fetch(checklevel, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!validateResponse.ok) {
            logMessage(`[*] Validation failed with status: ${validateResponse.status}`);
            return null; // Return null if the validation fails
        }

        const result = await validateResponse.json();

        // Return type and subtype along with lines for further processing
        return {
            type: result.type,
            subtype: result.sutype,
            lines: result.lines
        };
    } catch (error) {
        logMessage(`[*] Cert level check error: ${error}`);
        return null; // Return null if an error occurs
    }
}

module.exports = { certificatelevelcheck };
