document.addEventListener('DOMContentLoaded', function() {
    const saveButtons = document.querySelectorAll('.save-button');
    
    saveButtons.forEach(button => {
        button.addEventListener('click', async function() {
            // Find the closest modal to get batch context
            const modal = this.closest('[x-show="isModal19Open"]'); // Updated selector for Alpine.js modal
            if (!modal) {
                console.error('Modal not found');
                return;
            }

            const batchHeader = modal.querySelector('.text-lg');
            if (!batchHeader) {
                console.error('Batch header not found');
                return;
            }

            const batchId = batchHeader.textContent.split('-')[1]?.trim();
            if (!batchId) {
                console.error('Invalid batch ID');
                return;
            }
            
            // Get all sliders in this modal
            const sliders = modal.querySelectorAll('.slider');
            const skillScores = [];
            
            sliders.forEach(slider => {
                // Validate data attributes
                if (!slider.dataset.username || !slider.dataset.skillid) {
                    console.error('Missing data attributes for slider:', slider);
                    return;
                }

                skillScores.push({
                    batchId: batchId,
                    username: slider.dataset.username,
                    skillId: slider.dataset.skillid,
                    score: parseInt(slider.value, 10) // Ensure score is a number
                });
            });

            if (skillScores.length === 0) {
                alert('No skills to update');
                return;
            }

            try {
                const response = await fetch('/update-skill-scores-mentor', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content // If you're using CSRF protection
                    },
                    body: JSON.stringify({ skillScores })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Skills scores updated successfully!');
                    window.location.reload();
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to update scores');
                }
            } catch (error) {
                console.error('Error:', error);
                alert(error.message || 'Failed to update skill scores');
            }
        });
    });

    // Update slider background as value changes with debouncing
    const sliders = document.querySelectorAll('.slider');
    let timeoutId;

    sliders.forEach(slider => {
        slider.addEventListener('input', function() {
            clearTimeout(timeoutId);
            
            timeoutId = setTimeout(() => {
                const value = this.value;
                const span = document.getElementById(this.id.replace('markSlider', 'sliderValue'));
                
                if (span) {
                    span.textContent = value;
                    const percentage = ((value - this.min) / (this.max - this.min)) * 100;
                    this.style.background = `linear-gradient(to right, #8F00FF ${percentage}%, #ddd ${percentage}%)`;
                }
            }, 50); // Small delay for performance
        });
    });
});