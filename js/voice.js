// Enhanced Voice Recognition for Bill Input

class VoiceRecognition {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
        this.isSupported = false;
        this.init();
    }

    init() {
        // Check browser support
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.isSupported = true;
            
            this.setupRecognition();
        } else {
            console.warn('Speech recognition not supported in this browser');
            this.isSupported = false;
        }
    }

    setupRecognition() {
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.onListeningStart();
        };

        this.recognition.onresult = (event) => {
            this.transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            this.onTranscriptUpdate(this.transcript);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.onListeningEnd();
            this.processTranscript(this.transcript);
        };

        this.recognition.onerror = (event) => {
            this.isListening = false;
            this.onError(event.error);
        };

        this.recognition.onsoundend = () => {
            console.log('Sound has stopped being received');
        };

        this.recognition.onspeechend = () => {
            console.log('Speech has stopped being detected');
        };
    }

    start() {
        if (!this.isSupported) {
            this.onError('not-supported');
            return;
        }

        if (this.isListening) {
            this.stop();
            return;
        }

        try {
            this.transcript = '';
            this.recognition.start();
        } catch (error) {
            console.error('Error starting voice recognition:', error);
            this.onError('start-failed');
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    onListeningStart() {
        this.updateUI(true);
        this.startVisualizer();
        console.log('Voice recognition started...');
    }

    onListeningEnd() {
        this.updateUI(false);
        this.stopVisualizer();
        console.log('Voice recognition ended');
    }

    onTranscriptUpdate(transcript) {
        const voiceStatus = document.getElementById('voiceStatus');
        if (voiceStatus) {
            voiceStatus.textContent = transcript || 'Speak now...';
            voiceStatus.classList.add('typing');
        }
    }

    onError(error) {
        console.error('Speech recognition error:', error);
        
        const errorMessages = {
            'not-supported': 'Voice recognition is not supported in your browser',
            'not-allowed': 'Microphone access was denied',
            'audio-capture': 'No microphone was found',
            'network': 'Network error occurred',
            'no-speech': 'No speech was detected',
            'start-failed': 'Failed to start voice recognition',
            'aborted': 'Voice recognition was aborted',
            'default': 'Voice recognition error occurred'
        };

        const message = errorMessages[error] || errorMessages.default;
        showNotification(message, 'error');
        
        this.updateUI(false);
        this.stopVisualizer();
    }

    updateUI(listening) {
        const voiceIcon = document.getElementById('voiceIcon');
        const voiceText = document.getElementById('voiceText');
        const voiceBtn = document.querySelector('.voice-btn');
        const voiceStatus = document.getElementById('voiceStatus');

        if (listening) {
            if (voiceIcon) voiceIcon.textContent = '🔴';
            if (voiceText) voiceText.textContent = 'Listening...';
            if (voiceBtn) voiceBtn.classList.add('listening');
            if (voiceStatus) voiceStatus.textContent = 'Speak now...';
        } else {
            if (voiceIcon) voiceIcon.textContent = '🎤';
            if (voiceText) voiceText.textContent = 'Start Speaking';
            if (voiceBtn) voiceBtn.classList.remove('listening');
            if (voiceStatus) {
                voiceStatus.textContent = 'Click the microphone and speak...';
                voiceStatus.classList.remove('typing');
            }
        }
    }

    startVisualizer() {
        const visualizer = document.getElementById('voiceVisualizer');
        if (!visualizer) return;

        visualizer.innerHTML = '';
        const barCount = 20;
        
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'voice-bar';
            bar.style.left = `${(i / barCount) * 100}%`;
            bar.style.animationDelay = `${i * 0.1}s`;
            visualizer.appendChild(bar);
        }
    }

    stopVisualizer() {
        const visualizer = document.getElementById('voiceVisualizer');
        if (visualizer) {
            visualizer.innerHTML = '';
        }
    }

    processTranscript(transcript) {
        if (!transcript.trim()) {
            showNotification('No speech detected. Please try again.', 'warning');
            return;
        }

        console.log('Processing transcript:', transcript);
        
        const parsedData = this.parseBillFromSpeech(transcript);
        
        if (parsedData) {
            this.createBillFromVoice(parsedData);
        } else {
            showNotification('Could not understand the bill details. Please try speaking more clearly.', 'warning');
            this.showVoiceExamples();
        }
    }

    parseBillFromSpeech(text) {
        const patterns = [
            // Pattern: "food bill 500 rupees for me and John"
            {
                regex: /(\d+(?:\.\d{1,2})?)\s*(?:rupees?|rs?|dollars?)\s*(?:for|with|between)\s*(.+)/i,
                handler: (match) => ({
                    amount: parseFloat(match[1]),
                    description: match[2].trim(),
                    participants: this.extractParticipants(match[2])
                })
            },
            // Pattern: "add 300 for dinner with everyone"
            {
                regex: /add\s+(\d+(?:\.\d{1,2})?)\s*(?:for|as)\s*(.+)/i,
                handler: (match) => ({
                    amount: parseFloat(match[1]),
                    description: match[2].trim(),
                    participants: this.extractParticipants(match[2])
                })
            },
            // Pattern: "bill amount 750 split between 3 people"
            {
                regex: /bill\s*(?:amount)?\s*(\d+(?:\.\d{1,2})?)\s*split\s*(?:between|among)\s*(.+)/i,
                handler: (match) => ({
                    amount: parseFloat(match[1]),
                    description: `Split bill for ${match[2].trim()}`,
                    participants: this.extractParticipants(match[2])
                })
            },
            // Pattern: "restaurant bill 1200 for me Alex and Mike"
            {
                regex: /(.+?)\s*(?:bill)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rupees?|rs?)?\s*(?:for|with)\s*(.+)/i,
                handler: (match) => ({
                    amount: parseFloat(match[2]),
                    description: `${match[1].trim()} bill`,
                    participants: this.extractParticipants(match[3])
                })
            }
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            if (match) {
                return pattern.handler(match);
            }
        }

        return null;
    }

    extractParticipants(text) {
        const participantKeywords = {
            'me': 'Z', // Default to first person
            'all': Object.keys(nameMap),
            'everyone': Object.keys(nameMap),
            'john': 'U',
            'mike': 'M',
            'alex': 'B',
            'david': 'A'
        };

        const words = text.toLowerCase().split(/\s+/);
        const foundParticipants = new Set();

        for (const word of words) {
            if (participantKeywords[word]) {
                const participants = Array.isArray(participantKeywords[word]) 
                    ? participantKeywords[word] 
                    : [participantKeywords[word]];
                
                participants.forEach(p => foundParticipants.add(p));
            }
        }

        // If no specific participants found, default to all
        if (foundParticipants.size === 0) {
            return Object.keys(nameMap);
        }

        return Array.from(foundParticipants);
    }

    createBillFromVoice(data) {
        const bill = {
            id: `voice_${Date.now()}`,
            name: `Voice: ${data.description}`,
            date: new Date().toISOString().split('T')[0],
            category: this.detectCategory(data.description),
            description: `Created via voice input: "${data.description}"`,
            createdAt: new Date().toISOString(),
            entries: [
                {
                    id: `entry_${Date.now()}`,
                    price: data.amount,
                    participants: data.participants.join(''),
                    description: data.description,
                    createdAt: new Date().toISOString()
                }
            ],
            totals: this.calculateTotals(data.amount, data.participants),
            totalAmount: data.amount,
            source: 'voice'
        };

        // Save the bill
        if (saveBill(bill)) {
            showNotification('Bill created from voice input!', 'success');
            
            // Close voice modal and redirect to bill detail
            setTimeout(() => {
                closeVoiceInput();
                navigateTo(`bill-detail.html?id=${bill.id}`);
            }, 1500);
        } else {
            showNotification('Failed to save voice bill', 'error');
        }
    }

    detectCategory(description) {
        const categories = {
            'food': ['food', 'restaurant', 'dinner', 'lunch', 'breakfast', 'meal', 'eat'],
            'groceries': ['grocery', 'supermarket', 'market', 'vegetables', 'fruits'],
            'utilities': ['electricity', 'water', 'internet', 'wifi', 'bill', 'utility'],
            'transport': ['taxi', 'bus', 'train', 'fuel', 'petrol', 'transport'],
            'entertainment': ['movie', 'cinema', 'game', 'entertainment', 'fun']
        };

        const desc = description.toLowerCase();
        
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => desc.includes(keyword))) {
                return category;
            }
        }

        return 'other';
    }

    calculateTotals(amount, participants) {
        const share = amount / participants.length;
        const totals = {};
        
        participants.forEach(code => {
            totals[code] = share;
        });
        
        return totals;
    }

    showVoiceExamples() {
        const examples = [
            "Food bill 500 rupees for me and John",
            "Add 300 for dinner with everyone",
            "Bill amount 750 split between 3 people",
            "Restaurant bill 1200 for me Alex and Mike"
        ];

        let message = "Try saying:\n";
        examples.forEach(example => {
            message += `• "${example}"\n`;
        });

        // Show examples in a more user-friendly way
        const voiceStatus = document.getElementById('voiceStatus');
        if (voiceStatus) {
            voiceStatus.innerHTML = `
                <div style="text-align: left;">
                    <p><strong>Try saying:</strong></p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        ${examples.map(ex => `<li>"${ex}"</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }
}

// Global voice recognition instance
let voiceRecognition = null;

function initVoiceRecognition() {
    if (!voiceRecognition) {
        voiceRecognition = new VoiceRecognition();
    }
    return voiceRecognition;
}

function startVoiceInput() {
    document.getElementById('voiceInputModal').style.display = 'block';
    initVoiceRecognition();
}

function closeVoiceInput() {
    document.getElementById('voiceInputModal').style.display = 'none';
    if (voiceRecognition && voiceRecognition.isListening) {
        voiceRecognition.stop();
    }
}

function toggleVoiceRecognition() {
    if (!voiceRecognition) {
        initVoiceRecognition();
    }

    if (voiceRecognition.isListening) {
        voiceRecognition.stop();
    } else {
        voiceRecognition.start();
    }
}

// Initialize voice recognition when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Pre-initialize voice recognition for faster response
    setTimeout(() => {
        initVoiceRecognition();
    }, 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VoiceRecognition,
        initVoiceRecognition,
        startVoiceInput,
        closeVoiceInput,
        toggleVoiceRecognition
    };
}
