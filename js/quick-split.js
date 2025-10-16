// Quick Split Functionality

class QuickSplitManager {
    constructor() {
        this.currentSplitType = null;
        this.selectedParticipants = new Set();
        this.splitResults = {};
        this.init();
    }

    init() {
        this.loadParticipants();
        this.loadRecentSplits();
        this.setupEventListeners();
    }

    loadParticipants() {
        const checkboxesContainer = document.getElementById('participantCheckboxes');
        checkboxesContainer.innerHTML = '';
        
        Object.entries(nameMap).forEach(([code, participant]) => {
            const checkbox = document.createElement('div');
            checkbox.className = 'participant-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" id="participant-${code}" value="${code}" 
                       onchange="toggleParticipant('${code}', this.checked)">
                <label for="participant-${code}">
                    <div class="participant-avatar" style="background: ${participant.color}">
                        ${participant.avatar}
                    </div>
                    ${participant.name}
                </label>
            `;
            checkboxesContainer.appendChild(checkbox);
        });
    }

    loadRecentSplits() {
        const recentSplits = JSON.parse(localStorage.getItem('recentQuickSplits') || '[]');
        const recentList = document.getElementById('recentList');
        
        if (recentSplits.length === 0) {
            recentList.innerHTML = `
                <div class="empty-recent">
                    <div class="empty-icon">⚡</div>
                    <h4>No Recent Splits</h4>
                    <p>Your quick splits will appear here</p>
                </div>
            `;
            return;
        }
        
        recentList.innerHTML = recentSplits.slice(0, 5).map(split => `
            <div class="recent-item" onclick="loadRecentSplit('${split.id}')">
                <div class="recent-info">
                    <div class="recent-icon" style="background: ${getCategoryColor(split.category)}">
                        ${getCategoryIcon(split.category)}
                    </div>
                    <div class="recent-details">
                        <div class="recent-description">${split.description}</div>
                        <div class="recent-meta">
                            ${split.participantCount} people • ${new Date(split.date).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div class="recent-amount">₹${split.totalAmount.toFixed(2)}</div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Add input validation
        document.getElementById('quickAmount').addEventListener('input', this.validateAmount.bind(this));
    }

    validateAmount() {
        const amount = parseFloat(document.getElementById('quickAmount').value);
        const saveBtn = document.getElementById('saveQuickSplitBtn');
        
        if (amount > 0 && this.selectedParticipants.size > 0) {
            saveBtn.disabled = false;
        } else {
            saveBtn.disabled = true;
        }
    }

    startQuickSplit(type) {
        this.currentSplitType = type;
        document.getElementById('quickSplitForm').style.display = 'block';
        this.renderSplitTypeSection(type);
        this.scrollToForm();
    }

    renderSplitTypeSection(type) {
        const container = document.getElementById('splitTypeSection');
        
        switch (type) {
            case 'equal':
                container.innerHTML = this.renderEqualSplit();
                break;
            case 'custom':
                container.innerHTML = this.renderCustomSplit();
                break;
            case 'percentage':
                container.innerHTML = this.renderPercentageSplit();
                break;
        }
        
        this.calculateQuickSplit();
    }

    renderEqualSplit() {
        return `
            <h3>⚖️ Equal Split</h3>
            <p class="split-description">Divide the total amount equally among all selected participants</p>
            <div class="split-preview" id="equalSplitPreview">
                <!-- Preview will be updated dynamically -->
            </div>
        `;
    }

    renderCustomSplit() {
        return `
            <h3>🔢 Custom Split</h3>
            <p class="split-description">Specify custom amounts for each participant</p>
            <div class="custom-split-inputs" id="customSplitInputs">
                <!-- Inputs will be populated dynamically -->
            </div>
        `;
    }

    renderPercentageSplit() {
        return `
            <h3>📊 Percentage Split</h3>
            <p class="split-description">Split by percentages (must total 100%)</p>
            <div class="percentage-inputs" id="percentageInputs">
                <!-- Inputs will be populated dynamically -->
            </div>
            <div class="percentage-total" id="percentageTotal" style="text-align: center; margin-top: var(--space-md);">
                Total: <span id="totalPercentage">0</span>%
            </div>
        `;
    }

    calculateQuickSplit() {
        const amount = parseFloat(document.getElementById('quickAmount').value) || 0;
        
        if (amount <= 0 || this.selectedParticipants.size === 0) {
            this.hideResults();
            return;
        }

        switch (this.currentSplitType) {
            case 'equal':
                this.calculateEqualSplit(amount);
                break;
            case 'custom':
                this.calculateCustomSplit(amount);
                break;
            case 'percentage':
                this.calculatePercentageSplit(amount);
                break;
        }
        
        this.showResults();
    }

    calculateEqualSplit(totalAmount) {
        const participantCount = this.selectedParticipants.size;
        const equalAmount = totalAmount / participantCount;
        
        this.splitResults = {};
        this.selectedParticipants.forEach(code => {
            this.splitResults[code] = equalAmount;
        });
        
        this.renderEqualSplitPreview(totalAmount, equalAmount);
        this.renderResults();
    }

    renderEqualSplitPreview(totalAmount, equalAmount) {
        const preview = document.getElementById('equalSplitPreview');
        const participantCount = this.selectedParticipants.size;
        
        preview.innerHTML = `
            <div class="split-preview-card">
                <div class="preview-item">
                    <span>Total Amount:</span>
                    <span class="preview-value">₹${totalAmount.toFixed(2)}</span>
                </div>
                <div class="preview-item">
                    <span>Participants:</span>
                    <span class="preview-value">${participantCount}</span>
                </div>
                <div class="preview-item">
                    <span>Each Pays:</span>
                    <span class="preview-value highlight">₹${equalAmount.toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    calculateCustomSplit(totalAmount) {
        // This will be calculated based on user inputs
        // For now, we'll initialize with equal split
        const participantCount = this.selectedParticipants.size;
        const equalAmount = totalAmount / participantCount;
        
        this.splitResults = {};
        this.selectedParticipants.forEach(code => {
            this.splitResults[code] = equalAmount;
        });
        
        this.renderCustomSplitInputs(totalAmount);
        this.renderResults();
    }

    renderCustomSplitInputs(totalAmount) {
        const container = document.getElementById('customSplitInputs');
        const participants = Array.from(this.selectedParticipants);
        
        container.innerHTML = participants.map(code => {
            const participant = nameMap[code];
            const amount = this.splitResults[code] || 0;
            
            return `
                <div class="custom-split-item">
                    <div class="participant-avatar" style="background: ${participant.color}">
                        ${participant.avatar}
                    </div>
                    <div class="participant-name">${participant.name}</div>
                    <div class="amount-input">
                        <span class="currency">₹</span>
                        <input type="number" value="${amount.toFixed(2)}" step="0.01" min="0" 
                               oninput="updateCustomAmount('${code}', this.value)" 
                               onchange="validateCustomSplit()">
                    </div>
                </div>
            `;
        }).join('');
    }

    calculatePercentageSplit(totalAmount) {
        // This will be calculated based on user inputs
        // For now, we'll initialize with equal percentages
        const participantCount = this.selectedParticipants.size;
        const equalPercentage = 100 / participantCount;
        
        this.splitResults = {};
        this.selectedParticipants.forEach(code => {
            this.splitResults[code] = (totalAmount * equalPercentage) / 100;
        });
        
        this.renderPercentageInputs(totalAmount);
        this.renderResults();
    }

    renderPercentageInputs(totalAmount) {
        const container = document.getElementById('percentageInputs');
        const participants = Array.from(this.selectedParticipants);
        
        container.innerHTML = participants.map(code => {
            const participant = nameMap[code];
            const percentage = 100 / participants.length;
            const amount = this.splitResults[code] || 0;
            
            return `
                <div class="percentage-item">
                    <div class="participant-avatar" style="background: ${participant.color}">
                        ${participant.avatar}
                    </div>
                    <div class="participant-name">${participant.name}</div>
                    <div class="percentage-input">
                        <input type="number" value="${percentage.toFixed(1)}" step="0.1" min="0" max="100"
                               oninput="updatePercentage('${code}', this.value)" 
                               onchange="validatePercentageSplit()">
                        <span class="percent">%</span>
                    </div>
                    <div class="percentage-amount">₹${amount.toFixed(2)}</div>
                </div>
            `;
        }).join('');
        
        this.updatePercentageTotal();
    }

    updatePercentageTotal() {
        const participants = Array.from(this.selectedParticipants);
        const totalPercentage = participants.reduce((sum, code) => {
            const input = document.querySelector(`input[oninput="updatePercentage('${code}']`);
            return sum + (parseFloat(input?.value) || 0);
        }, 0);
        
        document.getElementById('totalPercentage').textContent = totalPercentage.toFixed(1);
        
        // Update color based on total
        const totalElement = document.getElementById('percentageTotal');
        if (Math.abs(totalPercentage - 100) < 0.1) {
            totalElement.style.color = 'var(--success)';
            totalElement.style.fontWeight = '600';
        } else {
            totalElement.style.color = 'var(--danger)';
            totalElement.style.fontWeight = '600';
        }
    }

    renderResults() {
        const resultsGrid = document.getElementById('resultsGrid');
        const totalAmount = parseFloat(document.getElementById('quickAmount').value) || 0;
        const participantCount = this.selectedParticipants.size;
        
        resultsGrid.innerHTML = Array.from(this.selectedParticipants).map(code => {
            const participant = nameMap[code];
            const amount = this.splitResults[code] || 0;
            
            return `
                <div class="result-item">
                    <div class="result-avatar" style="background: ${participant.color}">
                        ${participant.avatar}
                    </div>
                    <div class="result-info">
                        <div class="result-name">${participant.name}</div>
                    </div>
                    <div class="result-amount">₹${amount.toFixed(2)}</div>
                </div>
            `;
        }).join('');
        
        document.getElementById('resultsSummary').innerHTML = `
            <div class="summary-total">Total: ₹${totalAmount.toFixed(2)}</div>
            <div class="summary-participants">Split between ${participantCount} participants</div>
        `;
    }

    showResults() {
        document.getElementById('quickResults').style.display = 'block';
    }

    hideResults() {
        document.getElementById('quickResults').style.display = 'none';
    }

    saveQuickSplit() {
        const totalAmount = parseFloat(document.getElementById('quickAmount').value);
        const description = document.getElementById('quickDescription').value || 'Quick Split';
        const category = document.getElementById('quickCategory').value;
        
        if (totalAmount <= 0 || this.selectedParticipants.size === 0) {
            showNotification('Please enter valid amount and select participants', 'error');
            return;
        }

        // Validate split amounts
        const calculatedTotal = Object.values(this.splitResults).reduce((sum, amount) => sum + amount, 0);
        if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
            showNotification('Split amounts do not match total amount', 'error');
            return;
        }

        // Create bill object
        const bill = {
            id: generateId(),
            description: description,
            totalAmount: totalAmount,
            category: category,
            date: new Date().toISOString(),
            participants: Array.from(this.selectedParticipants),
            finalTotals: this.splitResults,
            splitType: this.currentSplitType,
            isQuickSplit: true
        };

        // Save bill
        saveBill(bill);
        
        // Add to recent splits
        this.addToRecentSplits(bill);
        
        // Show success modal
        this.showSuccessModal(bill);
        
        // Reset form
        this.resetQuickSplit();
    }

    addToRecentSplits(bill) {
        const recentSplits = JSON.parse(localStorage.getItem('recentQuickSplits') || '[]');
        
        const recentSplit = {
            id: bill.id,
            description: bill.description,
            totalAmount: bill.totalAmount,
            category: bill.category,
            date: bill.date,
            participantCount: bill.participants.length,
            splitType: bill.splitType
        };
        
        // Add to beginning and keep only last 10
        recentSplits.unshift(recentSplit);
        localStorage.setItem('recentQuickSplits', JSON.stringify(recentSplits.slice(0, 10)));
        
        // Update recent list
        this.loadRecentSplits();
    }

    showSuccessModal(bill) {
        document.getElementById('modalMessage').textContent = 
            `"${bill.description}" has been saved successfully! ₹${bill.totalAmount.toFixed(2)} split between ${bill.participants.length} people.`;
        document.getElementById('quickSplitModal').style.display = 'flex';
    }

    resetQuickSplit() {
        document.getElementById('quickSplitForm').style.display = 'none';
        document.getElementById('quickAmount').value = '';
        document.getElementById('quickDescription').value = '';
        document.getElementById('quickCategory').value = 'food';
        this.selectedParticipants.clear();
        this.splitResults = {};
        this.currentSplitType = null;
        
        // Reset all checkboxes
        document.querySelectorAll('.participant-checkbox input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        document.getElementById('saveQuickSplitBtn').disabled = true;
    }

    scrollToForm() {
        document.getElementById('quickSplitForm').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// Global quick split instance
let quickSplitManager;

// Initialize quick split when page loads
document.addEventListener('DOMContentLoaded', function() {
    quickSplitManager = new QuickSplitManager();
});

// Global functions for HTML event handlers
function toggleParticipant(code, selected) {
    if (selected) {
        quickSplitManager.selectedParticipants.add(code);
    } else {
        quickSplitManager.selectedParticipants.delete(code);
    }
    
    // Update checkbox visual state
    const checkbox = document.querySelector(`.participant-checkbox input[value="${code}"]`).parentElement;
    if (selected) {
        checkbox.classList.add('selected');
    } else {
        checkbox.classList.remove('selected');
    }
    
    quickSplitManager.validateAmount();
    quickSplitManager.calculateQuickSplit();
}

function updateQuickSplit() {
    quickSplitManager.calculateQuickSplit();
}

function calculateQuickSplit() {
    quickSplitManager.calculateQuickSplit();
}

function updateCustomAmount(code, value) {
    const amount = parseFloat(value) || 0;
    quickSplitManager.splitResults[code] = amount;
    quickSplitManager.renderResults();
}

function validateCustomSplit() {
    const totalAmount = parseFloat(document.getElementById('quickAmount').value) || 0;
    const calculatedTotal = Object.values(quickSplitManager.splitResults).reduce((sum, amount) => sum + amount, 0);
    
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
        showNotification(`Amounts total ₹${calculatedTotal.toFixed(2)} but should be ₹${totalAmount.toFixed(2)}`, 'warning');
    }
}

function updatePercentage(code, value) {
    const percentage = parseFloat(value) || 0;
    const totalAmount = parseFloat(document.getElementById('quickAmount').value) || 0;
    const amount = (totalAmount * percentage) / 100;
    
    quickSplitManager.splitResults[code] = amount;
    quickSplitManager.renderResults();
    quickSplitManager.updatePercentageTotal();
}

function validatePercentageSplit() {
    const participants = Array.from(quickSplitManager.selectedParticipants);
    const totalPercentage = participants.reduce((sum, code) => {
        const input = document.querySelector(`input[oninput="updatePercentage('${code}']`);
        return sum + (parseFloat(input?.value) || 0);
    }, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.1) {
        showNotification(`Percentages total ${totalPercentage.toFixed(1)}% but should be 100%`, 'warning');
    }
}

function saveQuickSplit() {
    quickSplitManager.saveQuickSplit();
}

function resetQuickSplit() {
    quickSplitManager.resetQuickSplit();
}

function closeQuickSplitModal() {
    document.getElementById('quickSplitModal').style.display = 'none';
}

function createAnotherSplit() {
    document.getElementById('quickSplitModal').style.display = 'none';
    quickSplitManager.resetQuickSplit();
}

function clearRecentSplits() {
    localStorage.removeItem('recentQuickSplits');
    quickSplitManager.loadRecentSplits();
    showNotification('Recent splits cleared', 'success');
}

function loadRecentSplit(splitId) {
    // Navigate to bills page and focus on this bill
    window.location.href = 'index.html';
    // Note: In a real app, you might want to implement bill viewing/editing
}

// Utility function to generate unique IDs
function generateId() {
    return 'bill_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
