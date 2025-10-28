async function submitForm() {
    try {
        // Express server request with FormData
        const expressResponse = await fetch('https://your-deployed-url.com/api/builder', {
            method: 'POST',
            body: formData
        });

        const expressText = await expressResponse.text();
        console.log('Express response:', expressText);
        if (!expressResponse.ok) {
            let err;
            try {
                err = JSON.parse(expressText);
            } catch {
                err = { error: `Non-JSON response: ${expressText}` };
            }
            throw new Error(`Express server error: ${err.error || 'Unknown error'}`);
        }

        const expressData = JSON.parse(expressText);
        console.log('Express submission successful:', expressData);

        alert('Configuration saved successfully!');
        updateSummary();
    } catch (error) {
        console.error('Submission error:', error.message);
        alert('Failed to save configuration: ' + error.message);
    }
}

