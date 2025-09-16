document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('certificate');
    const submitBtn = document.getElementById('submitBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const uploadLabel = document.querySelector('.file-upload-label');
    const uploadText = document.querySelector('.upload-text');
    const fileInfo = document.querySelector('.file-info');

    // File drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadLabel.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadLabel.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadLabel.addEventListener(eventName, unhighlight, false);
    });

    uploadLabel.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        uploadLabel.classList.add('drag-over');
        uploadLabel.style.borderColor = '#667eea';
        uploadLabel.style.backgroundColor = '#f0f4ff';
    }

    function unhighlight(e) {
        uploadLabel.classList.remove('drag-over');
        uploadLabel.style.borderColor = '#e2e8f0';
        uploadLabel.style.backgroundColor = 'white';
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            fileInput.files = files;
            updateFileDisplay(files[0]);
        }
    }

    // File input change handler
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            updateFileDisplay(this.files[0]);
        }
    });

    function updateFileDisplay(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

        if (file.size > maxSize) {
            showError('File size must be less than 10MB');
            fileInput.value = '';
            return;
        }

        if (!allowedTypes.includes(file.type)) {
            showError('Only JPEG, PNG, and PDF files are allowed');
            fileInput.value = '';
            return;
        }

        uploadText.textContent = file.name;
        fileInfo.textContent = `${formatFileSize(file.size)} • ${file.type.split('/')[1].toUpperCase()}`;
        
        uploadLabel.style.borderColor = '#48bb78';
        uploadLabel.style.backgroundColor = '#f0fff4';
        
        // Enable submit button
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fed7d7;
            color: #742a2a;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 300px;
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Form submission with loading states
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!fileInput.files || !fileInput.files[0]) {
            showError('Please select a file to upload');
            return;
        }

        // Show loading overlay
        showLoadingOverlay();

        // Create FormData and submit
        const formData = new FormData(this);
        
        fetch('/verify', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            // Replace current page with result
            document.open();
            document.write(html);
            document.close();
        })
        .catch(error => {
            console.error('Error:', error);
            hideLoadingOverlay();
            showError('An error occurred during verification. Please try again.');
        });
    });

    function showLoadingOverlay() {
        loadingOverlay.style.display = 'flex';
        
        // Simulate progress through steps
        const steps = ['ocrStep', 'dbStep', 'blockchainStep'];
        let currentStep = 0;
        
        const progressInterval = setInterval(() => {
            if (currentStep < steps.length) {
                document.getElementById(steps[currentStep]).classList.add('active');
                currentStep++;
            } else {
                clearInterval(progressInterval);
            }
        }, 2000);

        // Store interval ID to clear if needed
        loadingOverlay.progressInterval = progressInterval;
    }

    function hideLoadingOverlay() {
        loadingOverlay.style.display = 'none';
        if (loadingOverlay.progressInterval) {
            clearInterval(loadingOverlay.progressInterval);
        }
    }

    // Initialize file input state
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';

    // Sample certificate click handlers
    document.querySelectorAll('.sample-item').forEach(item => {
        item.addEventListener('click', function() {
            const certId = this.textContent.split(' - ')[0];
            document.getElementById('cert_id').value = certId;
            
            // Highlight the selected sample
            document.querySelectorAll('.sample-item').forEach(s => s.style.backgroundColor = 'white');
            this.style.backgroundColor = '#e6fffa';
        });
    });

    // Add some visual feedback for interactive elements
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });

    // Add smooth scrolling for any anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add keyboard support for file upload
    uploadLabel.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });

    // Make the upload area focusable for accessibility
    uploadLabel.setAttribute('tabindex', '0');
    uploadLabel.setAttribute('role', 'button');
    uploadLabel.setAttribute('aria-label', 'Upload certificate file');
});

// Global utility functions
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(function() {
        showNotification('Copied to clipboard!', 'success');
    }).catch(function() {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Copied to clipboard!', 'success');
    });
};

window.showNotification = function(message, type = 'info') {
    const colors = {
        success: { bg: '#c6f6d5', text: '#22543d' },
        error: { bg: '#fed7d7', text: '#742a2a' },
        warning: { bg: '#faf089', text: '#744210' },
        info: { bg: '#bee3f8', text: '#2a4365' }
    };

    const notification = document.createElement('div');
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type].bg};
        color: ${colors[type].text};
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 250px;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 3000);
};

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .sample-item {
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .sample-item:hover {
        transform: translateX(5px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .error-notification button {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        opacity: 0.7;
        margin-left: auto;
    }

    .error-notification button:hover {
        opacity: 1;
    }
`;
document.head.appendChild(style);