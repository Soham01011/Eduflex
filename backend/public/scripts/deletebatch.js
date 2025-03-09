async function deleteBatch(event) {
    const button = event.currentTarget;
    const batchName = button.getAttribute('data-batch-name');
    const interfaceType = "Webapp";

    try {
        const response = await fetch('/delete-batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ batch_name: batchName, interface: interfaceType })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message); // Show success message
            closeModal9(); // Close the modal
            setTimeout(() => {
                button.closest('tr').remove(); // Optionally remove batch row after animation
            }, 300);
        } else {
            alert('Error: ' + data.message); // Show error message
        }
    } catch (error) {
        console.error('Error deleting batch:', error);
        alert('Something went wrong!');
    }
}