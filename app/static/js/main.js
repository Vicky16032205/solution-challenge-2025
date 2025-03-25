// Global JavaScript for all pages
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Add animation to feature cards
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__animated', 'animate__fadeInUp');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card').forEach((card) => {
        observer.observe(card);
    });

    document.getElementById('generateDsa')?.addEventListener('click', () => {
        window.location.href = '/dsa_questions';
    });

    document.getElementById('generateHr')?.addEventListener('click', () => {
        window.location.href = '/hr_questions';
    });

    // Modal Close Handler
    document.querySelector('.close-modal')?.addEventListener('click', () => {
        document.getElementById('questionsModal').style.display = 'none';
    });

});

async function handleResponse(response, title) {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const modal = document.getElementById('questionsModal');
    const content = document.getElementById('questionsContent');
    
    // Clear previous content
    content.innerHTML = '';
    
    if (title.includes('DSA')) {
        content.innerHTML = createDsaContent(data);
    } else {
        content.innerHTML = createHrContent(data);
    }
    
    document.getElementById('modalTitle').textContent = title;
    modal.style.display = 'block';
}

// Content Creators
function createDsaContent(data) {
    return `
    <div class="questions-grid">
        <div class="difficulty-column">
            <h3 class="difficulty easy">Easy</h3>
            <ul>${data.easy.map(q => `<li>${q}</li>`).join('')}</ul>
        </div>
        <div class="difficulty-column">
            <h3 class="difficulty medium">Medium</h3>
            <ul>${data.medium.map(q => `<li>${q}</li>`).join('')}</ul>
        </div>
        <div class="difficulty-column">
            <h3 class="difficulty hard">Hard</h3>
            <ul>${data.hard.map(q => `<li>${q}</li>`).join('')}</ul>
        </div>
    </div>`;
}

// function createHrContent(data) {
//     return `
//     <div class="questions-list">
//         <ul>${data.questions.map(q => `<li>${q}</li>`).join('')}</ul>
//     </div>`;
// }

function createHrContent(data) {
    return `
    <div class="questions-list">
        <ul>
            ${data.questions.map((item, index) => `
                <li>
                    <div class="question-header">
                        <span class="question-number">#${index + 1}</span>
                        ${item.question}
                    </div>
                    <div class="dropdown-content">
                        <strong>Sample Answer:</strong> ${item.answer}
                    </div>
                </li>
            `).join('')}
        </ul>
    </div>
    <style>
        .questions-list li {
            padding: 1rem;
            margin: 0.5rem 0;
            background: white;
            border-radius: 8px;
            cursor: pointer;
        }
        .dropdown-content {
            display: none;
            margin-top: 0.5rem;
            padding: 0.8rem;
            background: #f1f5f9;
            border-radius: 4px;
        }
        li:hover .dropdown-content {
            display: block;
        }
    </style>`;
}

// UI Helpers
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showError(error) {
    console.error('Error:', error);
    const modal = document.getElementById('questionsModal');
    modal.querySelector('#questionsContent').innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            Failed to load questions: ${error.message}
        </div>
    `;
    modal.style.display = 'block';
}