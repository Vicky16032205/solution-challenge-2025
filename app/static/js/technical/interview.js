let mediaRecorder;
let audioChunks = [];
let isRecording = false;

let techSession = {
    id: null,
    questions: [],
    currentIndex: 0,
    timerInterval: null,
    startTime: null
};

document.getElementById('resumeUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('uploadPreview');
    
    // Show file preview
    if (file) {
        preview.innerHTML = `
            <div class="file-preview">
                <h4>📄 ${file.name}</h4>
                ${file.type === 'text/plain' ? 
                    '<p>Text file selected</p>' : 
                    '<p>PDF resume uploaded</p>'}
            </div>
        `;
        document.getElementById('startInterview').classList.remove('hidden');
    }
});

document.getElementById('startInterview').addEventListener('click', async () => {
    const file = document.getElementById('resumeUpload').files[0];
    const btn = document.getElementById('startInterview');
    if (!file) return;
    const answerInput = document.getElementById("answerInput");
    const formData = new FormData();
    formData.append('file', file);
    formData.append('interview_type', 'technical');

    

    try {
        btn.disabled = true;
        btn.innerHTML = `<div class="spinner small"></div> Processing...`;
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        techSession.id = data.session_id;
        techSession.questions = data.questions;
        
        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('interviewSection').classList.remove('hidden');
        initMicrophone();
        startTimer();
        loadQuestion();
        
    } 
    catch (error) {
        console.error('Upload failed:', error);
    }
    finally {
        btn.disabled = false;
        btn.innerHTML = 'Start Practice';
    }
});

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

    const voiceButton = document.getElementById('voiceButton');
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
    
    // Stop recording function
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            console.log('Recording stopped');
        }
    }

    async function sendAudioToBackend(audioBlob) {
        const answerInput = document.getElementById('answerInput');
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

function startTimer() {
    techSession.startTime = Date.now();
    techSession.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - techSession.startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        document.getElementById('timer').textContent = `${mins}:${secs}`;
    }, 1000);
}

function loadQuestion() {
    if (!techSession.questions || techSession.questions.length === 0) {
        console.error("No questions available.");
        return;
    }

    const question = techSession.questions[techSession.currentIndex];
    document.getElementById('questionText').textContent = question;
    updateProgress();
}

function updateProgress() {
    const progress = ((techSession.currentIndex + 1) / techSession.questions.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('questionCount').textContent = 
        `Question ${techSession.currentIndex + 1}/${techSession.questions.length}`;
}

document.getElementById('submitAnswer').addEventListener('click', async () => {
    const answer = document.getElementById('answerInput').value.trim();
    const btn = document.getElementById('submitAnswer');
    if (!answer) return;

    try {
        btn.disabled = true;
        btn.innerHTML = `<div class="spinner small"></div> Evaluating...`;
        const response = await fetch('/evaluate_answer', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({
                session_id: techSession.id,
                answer: answer,
                question_type: 'technical'
            })
        });

        const data = await response.json();
        showFeedback(data);

        const isFinalQuestion = techSession.currentIndex + 1 === techSession.questions.length;
        document.getElementById('nextQuestion').classList.toggle('hidden', isFinalQuestion);

        if (isFinalQuestion) { 
            await endInterview();
        }
        
    } 
    catch (error) {
        console.error('Evaluation failed:', error);
    }
    finally {
        btn.disabled = false;
        btn.innerHTML = 'Submit Answer';
    }
});

function showLoading(button) {
    button.disabled = true;
    button.innerHTML = `<div class="spinner small"></div> Processing...`;
}

function hideLoading(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
}

function showFeedback(data) {
    const feedbackBox = document.getElementById('feedbackBox');
    
    // Sanitize first then transform markup
    const sanitized = DOMPurify.sanitize(data.feedback, {
        ALLOWED_TAGS: ['div', 'h2', 'h3', 'ul', 'li', 'p', 'br'],
        ALLOWED_ATTR: ['class', 'style']
    });

    // Transform HTML with regex replacements
    const transformed = sanitized
        // Score header transformation
        .replace(/<h2>Score<\/h2>\s*<p>(.*?)<\/p>/gi, (match, score) => `
            <div class="ff-score-header">
                <span class="ff-score-label">Score:</span>
                <span class="ff-score-value">${score}</span>
            </div>
        `)
        // Section headings
        .replace(/<h2>(.*?)<\/h2>/gi, '<h3 class="ff-section-heading">$1</h3>')
        // Subheadings
        .replace(/<h3>(.*?)<\/h3>/gi, '<div class="ff-subheading">$1</div>')
        // Recommendation lists
        .replace(/<ul>(.*?)<\/ul>/gis, (match, content) => `
            <ul class="ff-recommendations">${content
                .replace(/<li>/g, '<li class="ff-recommendation-item">')
            }</ul>
        `)
        // Paragraphs
        .replace(/<p>(.*?)<\/p>/gi, '<p class="ff-paragraph">$1</p>');

    feedbackBox.innerHTML = `
        <div class="forced-formatting" style="all:initial">
            ${transformed}
        </div>
    `;
}

document.getElementById('nextQuestion').addEventListener('click', () => {
    techSession.currentIndex++;
    if (techSession.currentIndex >= techSession.questions.length) {
        endInterview();
    } else {
        resetQuestion();
    }
});

function resetQuestion() {
    document.getElementById('answerInput').value = '';
    document.getElementById('feedbackBox').innerHTML = '';
    document.getElementById('nextQuestion').classList.add('hidden');
    loadQuestion();
}

async function endInterview() {
    const interviewSection = document.getElementById('interviewSection');
    
    try {
        // Show loading state
        interviewSection.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                Generating final report...
            </div>
        `;

        // Clear timer safely
        if (techSession.timerInterval) {
            clearInterval(techSession.timerInterval);
            techSession.timerInterval = null;
        }

        const response = await fetch(`/session_results/${techSession.id}`);
        if (!response.ok) throw new Error('Results unavailable');
        const results = await response.json();

        // Sanitize all dynamic content
        interviewSection.innerHTML = `
            <div class="results">
                <h2>Interview Completed! 🎉</h2>
                
                <div class="stats-box">
                    <div class="stat-item">
                        <h3>${(results.average_score?.toFixed(1) || '0.0')}/10</h3>
                        <p>Average Score</p>
                    </div>
                    <div class="stat-item">
                        <h3>${results.answered?.toString() || '0'}/10</h3>
                        <p>Questions Answered</p>
                    </div>
                </div>

                <div class="detailed-feedback">
                    <h3>Detailed Feedback</h3>
                    ${results.feedback_report ? 
                        DOMPurify.sanitize(results.feedback_report) : 
                        '<p>No feedback available</p>'}
                </div>
            </div>
        `;

        // Reset session
        techSession = {
            id: null,
            questions: [],
            currentIndex: 0,
            timerInterval: null,
            startTime: null
        };

    } catch (error) {
        console.error('Results failed:', error);
        interviewSection.innerHTML = `
            <div class="error-screen">
                <h3>📊 Results Unavailable</h3>
                <p>${DOMPurify.sanitize(error.message)}</p>
                <button class="btn primary" onclick="location.reload()">Try Again</button>
            </div>
        `;
    }
}

async function loadHRQuestions() {
    try {
        const response = await fetch(`/generate_hr_questions?session_id=${techSession.id}`);
        const data = await response.json();
        techSession.hrQuestions = data.hr_questions;
    } catch (error) {
        console.error('Failed to load HR questions:', error);
    }
}

async function showAnalysis() {
    try {
        const response = await fetch(`/analyze_resume?session_id=${techSession.id}`);
        const data = await response.json();
        const analysis = data.analysis.join('\n');
        document.getElementById('analysisText').textContent = analysis;
    } catch (error) {
        console.error('Analysis failed:', error);
    }
}