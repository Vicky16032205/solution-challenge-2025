let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const elements = {
    resumeUpload: document.getElementById('resumeUpload'),
    submitHrAnswer: document.getElementById('submitHrAnswer'),
    nextHrAnswer: document.getElementById('nextHrAnswer'),
    startPractice: document.getElementById('startPractice'),
    interviewSection: document.getElementById('interviewSection'),
    hrAnswerInput: document.getElementById('hrAnswerInput'),
    hrFeedbackBox: document.getElementById('hrFeedbackBox'),
    hrQuestionText: document.getElementById('hrQuestionText'),
    hrProgressFill: document.getElementById('hrProgressFill'),
    hrQuestionCount: document.getElementById('hrQuestionCount'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    uploadSection: document.getElementById('uploadSection'),
    voiceButton: document.getElementById('voiceButton'),
    showResults: document.getElementById('showResults')
};

document.addEventListener('DOMContentLoaded', () => {
    let hrSession = {
        id: null,
        questions: [],
        currentIndex: 0,
        analysis: null
    };
    elements.resumeUpload?.addEventListener('change', handleFileUpload);
    elements.startPractice?.addEventListener('click', startPractice);
    elements.showResults?.addEventListener('click', showFinalResults);
    elements.submitHrAnswer?.addEventListener('click', submitAnswer);
    elements.nextHrAnswer?.addEventListener('click', nextQuestion);
    document.getElementById('showResults')?.addEventListener('click', showFinalResults);
    document.getElementById('submitHrAnswer')?.addEventListener('click', submitAnswer);
    document.getElementById('nextHrAnswer')?.addEventListener('click', nextQuestion);
    const btn = document.getElementById('startPractice');

    function initMicrophone() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    sendAudioToBackend(audioBlob);
                    audioChunks = [];
                };
            })
            .catch(error => {
                console.error('Microphone access denied:', error);
                alert('Please allow microphone access to use voice input.');
            });
    }

    voiceButton.addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
            voiceButton.textContent = 'Start Voice Input';
        } else {
            startRecording();
            voiceButton.textContent = 'Stop Voice Input';
        }
        isRecording = !isRecording;
    });

    function startRecording() {
        if (mediaRecorder && mediaRecorder.state === 'inactive') {
            audioChunks = []; // Clear previous chunks
            mediaRecorder.start();
            console.log('Recording started');
        }
    }
    
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            console.log('Recording stopped');
        }
    }
    
    async function sendAudioToBackend(audioBlob) {
        const answerInput = document.getElementById('hrAnswerInput');
        answerInput.value = 'Transcribing...';
    
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
    
        try {
            const response = await fetch('/transcribe', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.transcription) {
                answerInput.value = data.transcription;
            } else {
                answerInput.value = '';
                alert('Transcription failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            answerInput.value = '';
            alert('An error occurred while transcribing your voice input.');
            console.error('Transcription error:', error);
        }
    }

    function handleFileUpload(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('uploadPreview');
        
        // Show file preview
        if (file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                    <div class="file-preview">
                        <h4>${file.name}</h4>
                        <pre>${e.target.result.substring(0, 300)}...</pre>
                    </div>
                `;
            };
            reader.readAsText(file);
        } else {
            preview.innerHTML = `
                <div class="file-preview">
                    <h4>${file.name}</h4>
                    <p>PDF resume uploaded successfully</p>
                </div>
            `;
        }
        elements.startPractice?.classList.remove('hidden');
    }

    async function startPractice() {
        const file = elements.resumeUpload?.files[0];
        
        if (!file) return;
    
        try {
            // Show loading state
            elements.loadingOverlay.classList.remove('hidden');
            elements.startPractice.disabled = true;
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('interview_type', 'hr');
            btn.disabled = true;
            btn.innerHTML = `<div class="spinner small"></div> Processing...`;
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Upload failed');
            }
    
            const data = await response.json();
            hrSession.id = data.session_id;
            hrSession.questions = data.questions;
            initMicrophone()
    
            elements.uploadSection.classList.add('hidden');
            elements.interviewSection.classList.remove('hidden');
            
            await showAnalysis();
    
        } catch (error) {
            console.error('Upload failed:', error);
            showErrorUI(error.message);
        } finally {
            elements.loadingOverlay.classList.add('hidden');
            elements.startPractice.disabled = false;
        }
    }

    

    // Add new results function
    async function showFinalResults() {
        try {
            elements.loadingOverlay.classList.remove('hidden');
            await endInterview();
        } catch (error) {
            console.error('Results failed:', error);
            showErrorUI('Could not load results');
        } finally {
            elements.loadingOverlay.classList.add('hidden');
        }
    }

    async function showAnalysis() {
        try {
            if (elements.loadingOverlay) {
                elements.loadingOverlay.classList.remove('hidden');
            }

            const summaryGrid = document.getElementById('resumeSummary');
            if (!summaryGrid) throw new Error('Analysis container not found');
            summaryGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Analyzing resume...</div>';

            const analysisRes = await fetch(`/analyze_resume?session_id=${hrSession.id}`);
            if (!analysisRes.ok) throw new Error(`Analysis failed: ${analysisRes.status}`);

            const analysis = await analysisRes.json();

            if (!Array.isArray(analysis.roles) || 
                !Array.isArray(analysis.skills) || 
                !Array.isArray(analysis.soft_skills)) {
                    throw new Error('Invalid analysis data format');
            }

            summaryGrid.innerHTML = `
            <div class="analysis-section">
                ${createAnalysisCard('Suggested Roles', analysis.roles)}
                ${createAnalysisCard('Technical Skills', analysis.skills)}
                ${createAnalysisCard('Soft Skills', analysis.soft_skills)}
            </div>
        `;

        if (typeof animateElements === 'function') {
            try {
                await animateElements(['#resumeSummary', '#questionContainer']);
            } 
            catch (animateError) {
                console.warn('Animation error:', animateError);
            }
        }

            loadNextQuestion();

        } catch (error) {
            console.error('Analysis Error:', error);
            if (elements.hrFeedbackBox) {
                elements.hrFeedbackBox.innerHTML = `
                    <div class="error-message">
                        ${DOMPurify.sanitize(error.message)}
                    </div>
                `;
            }
        } 
        finally {
            elements.loadingOverlay.classList.add('hidden');
        }
    }
    

    function createAnalysisCard(title, items) {
        if (!items.length) return '';
        return `
            <div class="analysis-card">
                <h4>${DOMPurify.sanitize(title)}</h4>
                <ul>${items.map(item => 
                    `<li>${DOMPurify.sanitize(item)}</li>`
                ).join('')}</ul>
            </div>
        `;
    }

    function loadNextQuestion() {
        if (hrSession.currentIndex >= hrSession.questions.length) {
            endPractice();
            return;
        }
        try {
            if (!hrSession.questions || hrSession.currentIndex >= hrSession.questions.length) {
                throw new Error('Question index out of bounds');
            }
            
            elements.hrQuestionText.textContent = hrSession.questions[hrSession.currentIndex];
            updateProgress();
        } catch (error) {
            console.error('Question loading failed:', error);
            endPractice();
        }
    }

    function updateProgress() {
        const currentQuestionNumber = hrSession.currentIndex + 1;
        const progress = (currentQuestionNumber / hrSession.questions.length) * 100;
        elements.hrProgressFill.style.width = `${Math.min(progress, 100)}%`;
        elements.hrQuestionCount.textContent = 
            `Question ${currentQuestionNumber}/${hrSession.questions.length}`;
    }

    async function submitAnswer() {
        const answer = elements.hrAnswerInput?.value.trim() || '';
        if (answer.length < 20) {
            showErrorUI('Answer must be at least 20 characters');
            return;
        }
    
        try {
            elements.submitHrAnswer.disabled = true;
            elements.hrFeedbackBox.innerHTML = '<div class="loading-spinner small"></div>';

            const response = await fetch('/evaluate_answer', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({
                    session_id: hrSession.id,
                    answer: answer,
                    question_type: 'hr'
                })
            });
    
            const data = await response.json();
            showHrFeedback(data);
    
            const isFinalQuestion = hrSession.currentIndex + 1 >= hrSession.questions.length;
            elements.nextHrAnswer?.classList?.toggle('hidden', isFinalQuestion);
            elements.showResults?.classList?.toggle('hidden', !isFinalQuestion);
    
        } 
        catch (error) {
            console.error('Evaluation failed:', error);
            showErrorUI(error.message || 'Evaluation failed. Please try again.');
        } 
        finally {
            elements.submitHrAnswer.disabled = false;
        }
    }

    function showHrFeedback(data) {
        elements.hrFeedbackBox.innerHTML = `
            <div class="forced-formatting">
                <h3>Feedback (Score: <span class="score">${data.score}/10</span>)</h3>
                <div>${DOMPurify.sanitize(data.feedback)}</div>
            </div>
        `;
        elements.nextHrAnswer?.classList?.remove('hidden');
    }

    function nextQuestion() {
        hrSession.currentIndex++;
        hrSession.currentIndex >= hrSession.questions.length ? endPractice() : resetHrQuestion();
    }

    function resetHrQuestion() {
        elements.hrAnswerInput.value = '';
        elements.hrFeedbackBox.innerHTML = '';
        document.getElementById('nextHrAnswer')?.classList.add('hidden');
        loadNextQuestion();
    }

    async function endInterview() { // <-- Now inside main scope
        try {
            if (!elements.interviewSection) {
                throw new Error('UI elements not loaded');
            }

            const response = await fetch(`/session_results/${hrSession.id}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to get results');
            }

            const results = await response.json();
            
            elements.interviewSection.innerHTML = `
                <div class="results">
                    <h2>Interview Completed! 🎉</h2>
                    <div class="stats">
                        <div class="stat">
                            <h3>${results.average_score?.toFixed(1) || '0.0'}/10</h3>
                            <p>Average Score</p>
                        </div>
                        <div class="stat">
                            <h3>${hrSession.questions.length} Questions</h3>
                            <p>Completed</p>
                        </div>
                    </div>
                    <div class="feedback">
                        ${results.feedback_report || '<p>Detailed analysis unavailable</p>'}
                    </div>
                    <button onclick="location.reload()" class="btn primary">
                        Restart Practice
                    </button>
                </div>
            `;

        } catch (error) {
            console.error('Results failed:', error);
            showErrorUI(error.message);
        }
    }


    function endPractice() {
        showFinalResults();
    }

    function showErrorUI(message = 'Something went wrong') {
        elements.interviewSection.innerHTML = `
            <div class="error-screen">
                <h3>😟 ${message}</h3>
                <button class="btn primary" onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
});


function buildResultsContent(results) {
    return `
        <div class="stats-box">
            <div class="stat-item">
                <h3>${results.average_score.toFixed(1)}/10</h3>
                <p>Average Score</p>
            </div>
            <div class="stat-item">
                <h3>${results.answered}/${results.total_questions}</h3>
                <p>Questions Answered</p>
            </div>
        </div>
        <div class="detailed-feedback">
            ${results.feedback_report || '<p>No detailed feedback available</p>'}
        </div>
    `;
}

// Generic Utility Functions
function animateElements(selectors) {
    return new Promise(resolve => {
        selectors.forEach((selector, index) => {
            const el = document.querySelector(selector);
            if (!el) return;
            
            // Reset animation state
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                el.style.transition = 'all 0.3s ease-out';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 100);
        });
        setTimeout(resolve, selectors.length * 150);
    });
}

function getFallbackQuestions() {
    return [
        "Tell me about a time you resolved a team conflict",
        "Describe your ideal work environment",
        "How do you handle tight deadlines?",
        "What motivates you professionally?"
    ];
}

function showLoading(button) {
    button.disabled = true;
    button.innerHTML = `<div class="spinner small"></div> Processing...`;
}

function hideLoading(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
}