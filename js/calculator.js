// Enhanced Calculator for Bill Management

let currentBill = null;
let entries = [];
let currentSplitType = 'equal';
let editId = null;

// Initialize calculator
document.addEventListener('DOMContentLoaded', function() {
    loadCurrentBill();
    initParticipantBadges();
    updateDisplay();
    renderEntries();
    calculateQuickSplit();
    updateBillInfo();
});

function loadCurrentBill() {
    const billData = sessionStorage.getItem('currentBill');
    if (billData) {
        try {
            currentBill = JSON.parse(billData);
            entries = currentBill.entries || [];
            
            // Initialize totals if not present
            if (!currentBill.totals) {
                currentBill.totals = initializeTotals();
            }
            
            updateBillInfo();
        } catch (error) {
            console.error('Error loading current bill:', error);
            showNotification('Error loading bill data', 'error');
            navigateTo('new-bill.html');
        }
    } else {
        showNotification('No bill found. Please create a new bill first.', 'error');
        setTimeout(() => navigateTo('new-bill.html'), 1500);
    }
}

function initializeTotals() {
    const totals = {};
    Object.keys(nameMap).forEach(code => {
        totals[code] = 0;
    });
    return totals;
}

function initParticipantBadges() {
    const container = document.getElementById('participantBadges');
    container.innerHTML = '';
    
    Object.entries(nameMap).forEach(([code, data]) => {
        const badge = document.createElement('div');
        badge.className = 'participant-badge active';
        badge.innerHTML = `
            <span class="badge-avatar">${data.avatar}</span>
            <span class="badge-name">${data.name}</span>
        `;
        badge.dataset.code = code;
        badge.onclick = function() {
            this.classList.toggle('active');
            updateParticipantsInput();
            calculateQuickSplit();
            updateCustomSplitInputs();
        };
        container.appendChild(badge);
    });
    updateParticipantsInput();
}

function updateParticipantsInput() {
    const activeBadges = document.querySelectorAll('.participant-badge.active');
    const participants = Array.from(activeBadges).map(badge => badge.dataset.code).join('');
    document.getElementById('participants').value = participants;
}

function selectAllParticipants() {
    const badges = document.querySelectorAll('.participant-badge');
    badges.forEach(badge => badge.classList.add('active'));
    updateParticipantsInput();
    calculateQuickSplit();
    updateCustomSplitInputs();
}

function clearSelection() {
    const badges = document.querySelectorAll('.participant-badge');
    badges.forEach(badge => badge.classList.remove('active'));
    updateParticipantsInput();
    calculateQuickSplit();
    updateCustomSplitInputs();
}

function setSplitType(type) {
    currentSplitType = type;
    
    // Update UI
    document.querySelectorAll('.split-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide custom split sections
    document.getElementById('customSplitSection').style.display = 
        type === 'custom' ? 'block' : 'none';
    document.getElementById('percentageSplitSection').style.display = 
        type === 'percentage' ? 'block' : 'none';
    
    calculateQuickSplit();
    updateCustomSplitInputs();
}

function validateAmount() {
    const priceInput = document.getElementById('price');
    const price = parseFloat(priceInput.value);
    
    if (price < 0) {
        priceInput.style.borderColor = 'var(--danger)';
        return false;
    } else {
        priceInput.style.borderColor = 'var(--border-color)';
        return true;
    }
}

function calculateQuickSplit() {
    const price = parseFloat(document.getElementById('price').value) || 0;
    const participants = document.getElementById('participants').value;
    
    const quickResults = document.getElementById('quickResults');
    
    if (!participants || price <= 0) {
        quickResults.innerHTML = `
            <div class="empty-preview">
                <span>🔍</span>
                <p>Enter amount and select participants to see split preview</p>
            </div>
        `;
        return;
    }
    
    const participantCount = participants.length;
    let resultsHTML = '';
    
    switch (currentSplitType) {
        case 'equal':
            const share = price / participantCount;
            resultsHTML = participants.split('').map(code => {
                const person = nameMap[code];
                return `
                    <div class="result-item">
                        <div class="result-avatar">${person.avatar}</div>
                        <div class="result-info">
                            <div class="result-name">${person.name}</div>
                            <div class="result-share">Equal share</div>
                        </div>
                        <div class="result-amount">₹${share.toFixed(2)}</div>
                    </div>
                `;
            }).join('');
            break;
            
        case 'custom':
            resultsHTML = `
                <div class="custom-preview">
                    <p>Enter custom amounts for each participant</p>
                </div>
            `;
            break;
            
        case 'percentage':
            const percentageShare = (100 / participantCount).toFixed(1);
            resultsHTML = participants.split('').map(code => {
                const person = nameMap[code];
                const amount = (price * percentageShare / 100).toFixed(2);
                return `
                    <div class="result-item">
                        <div class="result-avatar">${person.avatar}</div>
                        <div class="result-info">
                            <div class="result-name">${person.name}</div>
                            <div class="result-share">${percentageShare}%</div>
                        </div>
                        <div class="result-amount">₹${amount}</div>
                    </div>
                `;
            }).join('');
            break;
    }
    
    quickResults.innerHTML = resultsHTML;
}

function updateCustomSplitInputs() {
    if (currentSplitType !== 'custom' && currentSplitType !== 'percentage') return;
    
    const participants = document.getElementById('participants').value;
    const price = parseFloat(document.getElementById('price').value) || 0;
    const container = currentSplitType === 'custom' 
        ? document.getElementById('customSplitInputs')
        : document.getElementById('percentageSplitInputs');
    
    if (!participants) {
        container.innerHTML = '<p>Select participants first</p>';
        return;
    }
    
    const inputsHTML = participants.split('').map(code => {
        const person = nameMap[code];
        const defaultValue = currentSplitType === 'custom' 
            ? (price / participants.length).toFixed(2)
            : (100 / participants.length).toFixed(1);
            
        return `
            <div class="split-input-item">
                <label>
                    <span class="input-avatar">${person.avatar}</span>
                    ${person.name}
                </label>
                <div class="input-wrapper">
                    ${currentSplitType === 'custom' ? '₹' : ''}
                    <input type="number" 
                           class="split-input" 
                           data-participant="${code}"
                           value="${defaultValue}"
                           step="${currentSplitType === 'custom' ? '0.01' : '1'}"
                           oninput="validateCustomSplit()"
                           ${currentSplitType === 'percentage' ? 'max="100"' : ''}>
                    ${currentSplitType === 'percentage' ? '%' : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = inputsHTML;
    validateCustomSplit();
}

function validateCustomSplit() {
    if (currentSplitType === 'custom') {
        validateCustomAmounts();
    } else if (currentSplitType === 'percentage') {
        validatePercentages();
    }
}

function validateCustomAmounts() {
    const price = parseFloat(document.getElementById('price').value) || 0;
    const inputs = document.querySelectorAll('.split-input');
    let total = 0;
    
    inputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    const difference = Math.abs(total - price);
    const isValid = difference < 0.01; // Allow small rounding differences
    
    updateSplitValidationUI(isValid, total, price);
}

function validatePercentages() {
    const inputs = document.querySelectorAll('.split-input');
    let total = 0;
    
    inputs.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    const isValid = Math.abs(total - 100) < 0.1; // Allow small rounding differences
    document.getElementById('percentageTotal').textContent = total.toFixed(1) + '%';
    document.getElementById('percentageTotal').className = isValid ? 'valid' : 'invalid';
    
    updateQuickPreviewForCustom();
}

function updateSplitValidationUI(isValid, actualTotal, expectedTotal) {
    const addButton = document.getElementById('addBtn');
    
    if (isValid) {
        addButton.disabled = false;
        addButton.innerHTML = '<span>➕</span> Add to Bill';
    } else {
        addButton.disabled = true;
        const difference = (actualTotal - expectedTotal).toFixed(2);
        addButton.innerHTML = `<span>⚠️</span> Difference: ₹${Math.abs(difference)}`;
    }
}

function updateQuickPreviewForCustom() {
    if (currentSplitType !== 'custom' && currentSplitType !== 'percentage') return;
    
    const price = parseFloat(document.getElementById('price').value) || 0;
    const quickResults = document.getElementById('quickResults');
    
    let resultsHTML = '';
    
    if (currentSplitType === 'custom') {
        const inputs = document.querySelectorAll('.split-input');
        resultsHTML = Array.from(inputs).map(input => {
            const code = input.dataset.participant;
            const person = nameMap[code];
            const amount = parseFloat(input.value) || 0;
            
            return `
                <div class="result-item">
                    <div class="result-avatar">${person.avatar}</div>
                    <div class="result-info">
                        <div class="result-name">${person.name}</div>
                        <div class="result-share">Custom amount</div>
                    </div>
                    <div class="result-amount">₹${amount.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    } else if (currentSplitType === 'percentage') {
        const inputs = document.querySelectorAll('.split-input');
        resultsHTML = Array.from(inputs).map(input => {
            const code = input.dataset.participant;
            const person = nameMap[code];
            const percentage = parseFloat(input.value) || 0;
            const amount = (price * percentage / 100).toFixed(2);
            
            return `
                <div class="result-item">
                    <div class="result-avatar">${person.avatar}</div>
                    <div class="result-info">
                        <div class="result-name">${person.name}</div>
                        <div class="result-share">${percentage.toFixed(1)}%</div>
                    </div>
                    <div class="result-amount">₹${amount}</div>
                </div>
            `;
        }).join('');
    }
    
    quickResults.innerHTML = resultsHTML;
}

function addEntry() {
    if (!validateInputs()) return;

    const price = parseFloat(document.getElementById('price').value);
    const participants = document.getElementById('participants').value;
    const description = document.getElementById('entryDescription').value;

    let shares = {};
    
    // Calculate shares based on split type
    switch (currentSplitType) {
        case 'equal':
            const share = price / participants.length;
            participants.split('').forEach(code => {
                shares[code] = share;
            });
            break;
            
        case 'custom':
            const customInputs = document.querySelectorAll('.split-input');
            customInputs.forEach(input => {
                const code = input.dataset.participant;
                shares[code] = parseFloat(input.value) || 0;
            });
            break;
            
        case 'percentage':
            const percentageInputs = document.querySelectorAll('.split-input');
            percentageInputs.forEach(input => {
                const code = input.dataset.participant;
                const percentage = parseFloat(input.value) || 0;
                shares[code] = (price * percentage / 100);
            });
            break;
    }

    // Editing existing entry
    if (editId) {
        const entry = entries.find(e => e.id === editId);
        if (entry) {
            // Remove old contribution
            Object.entries(entry.shares || {}).forEach(([code, oldShare]) => {
                currentBill.totals[code] -= oldShare;
            });

            // Update entry
            entry.price = price;
            entry.participants = participants;
            entry.description = description;
            entry.shares = shares;

            // Add new contribution
            Object.entries(shares).forEach(([code, share]) => {
                currentBill.totals[code] += share;
            });

            editId = null;
            document.getElementById('addBtn').innerHTML = '<span>➕</span> Add to Bill';
            showNotification('Entry updated successfully', 'success');
        }
    } else {
        // Add new entry
        Object.entries(shares).forEach(([code, share]) => {
            currentBill.totals[code] = (currentBill.totals[code] || 0) + share;
        });

        const id = Date.now().toString();
        entries.push({
            id, 
            price, 
            participants, 
            description,
            shares,
            createdAt: new Date().toISOString()
        });
        showNotification('Expense added successfully', 'success');
    }

    updateDisplay();
    renderEntries();
    clearForm();
    updateCurrentBill();
    calculateQuickSplit();
}

function validateInputs() {
    const price = parseFloat(document.getElementById('price').value);
    const participants = document.getElementById('participants').value;
    
    if (!price || price <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return false;
    }
    
    if (!participants) {
        showNotification('Please select at least one participant', 'error');
        return false;
    }
    
    // Validate custom amounts
    if (currentSplitType === 'custom') {
        const inputs = document.querySelectorAll('.split-input');
        let total = 0;
        inputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        
        if (Math.abs(total - price) > 0.01) {
            showNotification('Custom amounts must add up to the total', 'error');
            return false;
        }
    }
    
    // Validate percentages
    if (currentSplitType === 'percentage') {
        const inputs = document.querySelectorAll('.split-input');
        let total = 0;
        inputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        
        if (Math.abs(total - 100) > 0.1) {
            showNotification('Percentages must add up to 100%', 'error');
            return false;
        }
    }
    
    return true;
}

function renderEntries() {
    const entriesList = document.getElementById('entriesList');
    const totalEntries = document.getElementById('totalEntries');
    const entriesTotal = document.getElementById('entriesTotal');
    
    if (entries.length === 0) {
        entriesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💸</div>
                <h4>No expenses added yet</h4>
                <p>Start by adding your first expense above</p>
            </div>
        `;
        totalEntries.textContent = '0';
        entriesTotal.textContent = '₹0.00';
        return;
    }
    
    // Calculate totals
    const totalAmount = entries.reduce((sum, entry) => sum + entry.price, 0);
    totalEntries.textContent = entries.length;
    entriesTotal.textContent = `₹${totalAmount.toFixed(2)}`;
    
    entriesList.innerHTML = entries.map(entry => {
        const names = entry.participants.split('').map(code => 
            `<span class="participant-tag">${nameMap[code]?.avatar} ${nameMap[code]?.name}</span>`
        ).join('');
        
        return `
            <div class="entry-item" data-id="${entry.id}">
                <div class="entry-main">
                    <div class="entry-amount">₹${entry.price.toFixed(2)}</div>
                    <div class="entry-details">
                        <div class="entry-description">${entry.description || 'No description'}</div>
                        <div class="entry-participants">${names}</div>
                        <div class="entry-meta">
                            Added ${formatDate(entry.createdAt, 'relative')}
                        </div>
                    </div>
                </div>
                <div class="entry-actions">
                    <button class="action-btn edit-btn" onclick="editEntry('${entry.id}')" title="Edit">
                        ✏️
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteEntry('${entry.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function editEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (entry) {
        document.getElementById('price').value = entry.price;
        document.getElementById('entryDescription').value = entry.description || '';
        
        // Set participant badges
        const badges = document.querySelectorAll('.participant-badge');
        badges.forEach(badge => {
            badge.classList.remove('active');
            if (entry.participants.includes(badge.dataset.code)) {
                badge.classList.add('active');
            }
        });
        updateParticipantsInput();
        
        // Set split type and custom amounts if needed
        if (entry.shares) {
            const shares = Object.values(entry.shares);
            const isEqual = shares.every(share => Math.abs(share - shares[0]) < 0.01);
            
            if (!isEqual) {
                setSplitType('custom');
                // This would need additional logic to set custom amounts
            }
        }
        
        editId = id;
        document.getElementById('addBtn').innerHTML = '<span>💾</span> Save Changes';
        
        // Scroll to input section
        document.querySelector('.input-section').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        showNotification('Editing expense entry', 'info');
    }
}

function deleteEntry(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        const entry = entries.find(e => e.id === id);
        if (entry) {
            // Remove shares from totals
            if (entry.shares) {
                Object.entries(entry.shares).forEach(([code, share]) => {
                    currentBill.totals[code] -= share;
                });
            } else {
                // Fallback for old entries
                const share = entry.price / entry.participants.length;
                entry.participants.split('').forEach(code => {
                    currentBill.totals[code] -= share;
                });
            }
            
            entries = entries.filter(e => e.id !== id);
            updateDisplay();
            renderEntries();
            updateCurrentBill();
            showNotification('Expense deleted successfully', 'success');
        }
    }
}

function updateDisplay() {
    const totalsContent = document.getElementById('totalsContent');
    
    if (Object.keys(currentBill.totals).length === 0 || 
        Object.values(currentBill.totals).every(total => total === 0)) {
        totalsContent.innerHTML = `
            <div class="empty-totals">
                <p>No totals to display yet</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    let totalSum = 0;
    
    Object.entries(currentBill.totals).forEach(([code, total]) => {
        if (total !== 0) {
            const person = nameMap[code];
            totalSum += total;
            html += `
                <div class="total-item">
                    <div class="total-person">
                        <span class="person-avatar">${person.avatar}</span>
                        <span class="person-name">${person.name}</span>
                    </div>
                    <div class="total-amount ${total < 0 ? 'negative' : ''}">
                        ₹${Math.abs(total).toFixed(2)}
                        ${total < 0 ? '(owes)' : ''}
                    </div>
                </div>
            `;
        }
    });
    
    html += `
        <div class="total-summary">
            <div class="summary-item">
                <span>Total Bill Amount:</span>
                <span class="summary-amount">₹${totalSum.toFixed(2)}</span>
            </div>
        </div>
    `;
    
    totalsContent.innerHTML = html;
}

function showFinalSettlement() {
    const settlements = calculateOptimalSettlements(currentBill.totals);
    const finalContent = document.getElementById('finalContent');
    const finalTotals = document.getElementById('finalTotals');
    
    if (settlements.length === 0) {
        finalContent.innerHTML = `
            <div class="settlement-message">
                <div class="message-icon">✅</div>
                <h4>All Settled Up!</h4>
                <p>No money needs to change hands. Everything is balanced perfectly!</p>
            </div>
        `;
    } else {
        let html = '<div class="settlements-list">';
        
        settlements.forEach(settlement => {
            html += `
                <div class="settlement-item">
                    <div class="settlement-from">
                        <span class="avatar">${nameMap[settlement.from]?.avatar}</span>
                        ${nameMap[settlement.from]?.name}
                    </div>
                    <div class="settlement-arrow">→</div>
                    <div class="settlement-to">
                        <span class="avatar">${nameMap[settlement.to]?.avatar}</span>
                        ${nameMap[settlement.to]?.name}
                    </div>
                    <div class="settlement-amount">₹${settlement.amount.toFixed(2)}</div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Add summary
        const totalAmount = entries.reduce((sum, entry) => sum + entry.price, 0);
        html += `
            <div class="settlement-summary">
                <div class="summary-row">
                    <span>Total Bill Amount:</span>
                    <span>₹${totalAmount.toFixed(2)}</span>
                </div>
                <div class="summary-row highlight">
                    <span>Pay to Shah jee:</span>
                    <span>₹${totalAmount.toFixed(2)}</span>
                </div>
            </div>
        `;
        
        finalContent.innerHTML = html;
    }
    
    // Update current bill with final totals
    currentBill.finalTotals = {...currentBill.totals};
    currentBill.settlements = settlements;
    updateCurrentBill();
    
    // Show final totals section
    finalTotals.style.display = 'block';
    finalTotals.scrollIntoView({ behavior: 'smooth' });
}

function hideFinalTotals() {
    document.getElementById('finalTotals').style.display = 'none';
}

function clearForm() {
    document.getElementById('price').value = '';
    document.getElementById('entryDescription').value = '';
    editId = null;
    document.getElementById('addBtn').innerHTML = '<span>➕</span> Add to Bill';
    
    calculateQuickSplit();
}

function filterLog() {
    const query = document.getElementById('searchLog').value.toLowerCase();
    const items = document.querySelectorAll('.entry-item');
    let visibleCount = 0;
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const isVisible = text.includes(query);
        item.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) visibleCount++;
    });
    
    document.getElementById('searchCount').textContent = 
        query ? `${visibleCount} of ${items.length}` : '';
}

function updateCurrentBill() {
    if (currentBill) {
        currentBill.entries = [...entries];
        currentBill.totalAmount = entries.reduce((sum, entry) => sum + entry.price, 0);
        currentBill.updatedAt = new Date().toISOString();
        sessionStorage.setItem('currentBill', JSON.stringify(currentBill));
    }
}

function updateBillInfo() {
    if (currentBill) {
        document.getElementById('billTitle').textContent = currentBill.name;
        document.getElementById('billInfo').textContent = 
            `${formatDate(currentBill.date)} • ${currentBill.category}${currentBill.description ? ` • ${currentBill.description}` : ''}`;
    }
}

function saveBill() {
    if (!currentBill) {
        showNotification('No bill data to save', 'error');
        return;
    }
    
    if (entries.length === 0) {
        showNotification('Please add at least one expense before saving', 'error');
        return;
    }
    
    // Calculate final totals if not already done
    if (!currentBill.finalTotals) {
        currentBill.finalTotals = {...currentBill.totals};
    }
    
    // Save to local storage
    if (saveBill(currentBill)) {
        showNotification('Bill saved successfully!', 'success');
        
        // Clear session storage and redirect
        setTimeout(() => {
            sessionStorage.removeItem('currentBill');
            navigateTo('previous-bills.html');
        }, 1500);
    } else {
        showNotification('Failed to save bill', 'error');
    }
}

function saveQuickBill() {
    if (entries.length === 0) {
        const price = parseFloat(document.getElementById('price').value);
        if (price && price > 0) {
            addEntry();
        }
    }
    saveBill();
}

function resetCurrentBill() {
    if (confirm('Are you sure you want to reset all entries? This cannot be undone.')) {
        currentBill.totals = initializeTotals();
        entries = [];
        updateDisplay();
        renderEntries();
        updateCurrentBill();
        showNotification('All entries have been reset', 'success');
    }
}

function clearAllEntries() {
    if (entries.length === 0) return;
    
    if (confirm('Are you sure you want to clear all expenses?')) {
        currentBill.totals = initializeTotals();
        entries = [];
        updateDisplay();
        renderEntries();
        updateCurrentBill();
        showNotification('All expenses cleared', 'success');
    }
}

function shareBill() {
    if (entries.length === 0) {
        showNotification('No expenses to share', 'warning');
        return;
    }
    
    const billData = {
        title: currentBill.name,
        date: currentBill.date,
        total: currentBill.totalAmount,
        entries: entries,
        totals: currentBill.totals,
        settlements: calculateOptimalSettlements(currentBill.totals)
    };
    
    // Create shareable text
    let shareText = `💸 ${billData.title}\n`;
    shareText += `Date: ${formatDate(billData.date)}\n`;
    shareText += `Total: ₹${billData.total.toFixed(2)}\n\n`;
    
    shareText += "Expenses:\n";
    billData.entries.forEach(entry => {
        shareText += `• ₹${entry.price.toFixed(2)} - ${entry.description || 'No description'}\n`;
    });
    
    shareText += "\nSettlements:\n";
    if (billData.settlements.length === 0) {
        shareText += "✅ All settled up!\n";
    } else {
        billData.settlements.forEach(settlement => {
            shareText += `• ${nameMap[settlement.from]?.name} → ${nameMap[settlement.to]?.name}: ₹${settlement.amount.toFixed(2)}\n`;
        });
    }
    
    shareText += `\nShared via Hostel Bill Manager Pro`;
    
    // Use Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: billData.title,
            text: shareText
        }).catch(error => {
            console.log('Sharing failed:', error);
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Bill details copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Bill details copied to clipboard!', 'success');
    });
}

function exportEntries() {
    if (entries.length === 0) {
        showNotification('No expenses to export', 'warning');
        return;
    }
    
    const csv = convertEntriesToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentBill.name.replace(/\s+/g, '_')}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Expenses exported as CSV', 'success');
}

function convertEntriesToCSV() {
    let csv = 'Amount,Description,Participants,Date\n';
    
    entries.forEach(entry => {
        const participants = entry.participants.split('').map(code => 
            nameMap[code]?.name
        ).join('; ');
        
        csv += `"${entry.price}","${entry.description || ''}","${participants}","${entry.createdAt}"\n`;
    });
    
    return csv;
}

function showBillSettings() {
    if (!currentBill) return;
    
    document.getElementById('editBillName').value = currentBill.name;
    document.getElementById('editBillDescription').value = currentBill.description || '';
    document.getElementById('billSettingsModal').style.display = 'flex';
}

function closeBillSettings() {
    document.getElementById('billSettingsModal').style.display = 'none';
}

function updateBillInfo() {
    const name = document.getElementById('editBillName').value.trim();
    const description = document.getElementById('editBillDescription').value.trim();
    
    if (!name) {
        showNotification('Bill name is required', 'error');
        return;
    }
    
    currentBill.name = name;
    currentBill.description = description;
    updateCurrentBill();
    updateBillInfo();
    
    closeBillSettings();
    showNotification('Bill information updated', 'success');
}

function recalculateTotals() {
    // Reset totals and recalculate from entries
    currentBill.totals = initializeTotals();
    
    entries.forEach(entry => {
        if (entry.shares) {
            Object.entries(entry.shares).forEach(([code, share]) => {
                currentBill.totals[code] += share;
            });
        } else {
            // Fallback for old entries
            const share = entry.price / entry.participants.length;
            entry.participants.split('').forEach(code => {
                currentBill.totals[code] += share;
            });
        }
    });
    
    updateDisplay();
    showNotification('Totals recalculated', 'success');
}
