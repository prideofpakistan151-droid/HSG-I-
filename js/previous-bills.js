// Enhanced Previous Bills Management

let allBills = [];
let filteredBills = [];
let selectedBills = new Set();
let currentFilters = {
    search: '',
    category: '',
    dateRange: 'all',
    sortBy: 'newest'
};

// Debounced search
const debouncedFilterBills = debounce(() => {
    currentFilters.search = document.getElementById('searchBills').value;
    filterBills();
}, 300);

document.addEventListener('DOMContentLoaded', function() {
    loadBills();
    setupEventListeners();
});

function loadBills() {
    showLoadingState();
    
    setTimeout(() => {
        allBills = getBills();
        filteredBills = [...allBills];
        
        if (allBills.length === 0) {
            showEmptyState();
        } else {
            renderBills();
            updateStats();
        }
        
        hideLoadingState();
    }, 500); // Simulate loading
}

function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + A to select all
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            selectAllBills();
        }
        
        // Escape to clear selection
        if (e.key === 'Escape') {
            clearSelection();
        }
        
        // Delete to remove selected bills
        if (e.key === 'Delete' && selectedBills.size > 0) {
            deleteSelectedBills();
        }
    });
    
    // Pull to refresh
    let touchStartY = 0;
    document.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchmove', function(e) {
        if (touchStartY && e.touches[0].clientY - touchStartY > 100) {
            loadBills();
            touchStartY = 0;
        }
    });
}

function filterBills() {
    const searchQuery = document.getElementById('searchBills').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    
    currentFilters = {
        search: searchQuery,
        category: categoryFilter,
        dateRange: dateFilter,
        sortBy: sortFilter
    };
    
    filteredBills = allBills.filter(bill => {
        // Search filter
        const matchesSearch = !searchQuery || 
            bill.name.toLowerCase().includes(searchQuery) ||
            (bill.description && bill.description.toLowerCase().includes(searchQuery)) ||
            bill.category.toLowerCase().includes(searchQuery) ||
            formatCurrency(bill.totalAmount).toLowerCase().includes(searchQuery);
        
        // Category filter
        const matchesCategory = !categoryFilter || bill.category === categoryFilter;
        
        // Date filter
        const matchesDate = filterByDate(bill, dateFilter);
        
        return matchesSearch && matchesCategory && matchesDate;
    });
    
    // Sort bills
    sortBills(filteredBills, sortFilter);
    
    renderBills();
    updateStats();
}

function filterByDate(bill, dateFilter) {
    if (dateFilter === 'all') return true;
    
    const billDate = new Date(bill.date);
    const today = new Date();
    
    switch (dateFilter) {
        case 'today':
            return billDate.toDateString() === today.toDateString();
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return billDate >= weekAgo;
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return billDate >= monthAgo;
        case 'last-month':
            const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            return billDate >= firstDayLastMonth && billDate <= lastDayLastMonth;
        case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            return billDate >= yearAgo;
        default:
            return true;
    }
}

function sortBills(bills, sortBy) {
    switch (sortBy) {
        case 'newest':
            bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            bills.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'amount-high':
            bills.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
            break;
        case 'amount-low':
            bills.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
            break;
        case 'name':
            bills.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
}

function renderBills() {
    const billsList = document.getElementById('billsList');
    const emptyState = document.getElementById('emptyState');
    
    if (filteredBills.length === 0) {
        billsList.innerHTML = '';
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    
    billsList.innerHTML = filteredBills.map((bill, index) => {
        const participantCodes = getBillParticipants(bill);
        const isSelected = selectedBills.has(bill.id);
        
        return `
            <div class="bill-card ${bill.category} ${isSelected ? 'selected' : ''}" 
                 onclick="handleBillClick(event, '${bill.id}')"
                 style="animation-delay: ${index * 0.1}s">
                
                <div class="bill-checkbox ${isSelected ? 'checked' : ''}" 
                     onclick="toggleBillSelection('${bill.id}')"></div>
                
                <div class="bill-header">
                    <div class="bill-main">
                        <div class="bill-name">
                            <span>${getCategoryIcon(bill.category)}</span>
                            ${bill.name}
                            <span class="bill-category">${bill.category}</span>
                        </div>
                        <div class="bill-meta">
                            <span class="bill-date">
                                📅 ${formatDate(bill.date)}
                            </span>
                            <span class="bill-entries">
                                📝 ${bill.entries?.length || 0} entries
                            </span>
                        </div>
                        ${bill.description ? `
                            <div class="bill-description">${bill.description}</div>
                        ` : ''}
                    </div>
                    <div class="bill-total">
                        ₹${bill.totalAmount ? bill.totalAmount.toFixed(2) : '0.00'}
                    </div>
                </div>
                
                <div class="bill-details">
                    <div class="bill-participants">
                        ${participantCodes.map(code => `
                            <div class="participant-avatar" style="background: ${nameMap[code]?.color || '#6366F1'}">
                                ${nameMap[code]?.avatar || '👤'}
                            </div>
                        `).join('')}
                        <span style="font-size: 0.875rem; color: var(--text-secondary);">
                            ${participantCodes.length} people
                        </span>
                    </div>
                    
                    <div class="bill-actions">
                        <button class="action-btn" onclick="viewBill('${bill.id}')" title="View Bill">
                            👁️
                        </button>
                        <button class="action-btn" onclick="duplicateBill('${bill.id}')" title="Duplicate">
                            📋
                        </button>
                        <button class="action-btn" onclick="editBill('${bill.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="action-btn" onclick="deleteBill('${bill.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getBillParticipants(bill) {
    const participants = new Set();
    
    if (bill.entries) {
        bill.entries.forEach(entry => {
            if (entry.participants) {
                entry.participants.split('').forEach(code => participants.add(code));
            }
        });
    }
    
    return Array.from(participants);
}

function getCategoryIcon(category) {
    const icons = {
        'food': '🍕',
        'groceries': '🛒',
        'utilities': '⚡',
        'rent': '🏠',
        'transport': '🚗',
        'entertainment': '🎬',
        'other': '📦'
    };
    return icons[category] || '📁';
}

function updateStats() {
    const statsOverview = document.getElementById('statsOverview');
    const showingCount = document.getElementById('showingCount');
    const totalCount = document.getElementById('totalCount');
    const filteredTotal = document.getElementById('filteredTotal');
    
    if (filteredBills.length === 0) {
        statsOverview.style.display = 'none';
        return;
    }
    
    const totalAmount = filteredBills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    
    showingCount.textContent = filteredBills.length;
    totalCount.textContent = allBills.length;
    filteredTotal.textContent = `₹${totalAmount.toFixed(2)}`;
    
    statsOverview.style.display = 'flex';
}

function handleBillClick(event, billId) {
    // Don't trigger if clicking on action buttons or checkbox
    if (event.target.closest('.bill-actions') || 
        event.target.closest('.bill-checkbox')) {
        return;
    }
    
    viewBill(billId);
}

function viewBill(billId) {
    navigateTo(`bill-detail.html?id=${billId}`);
}

function editBill(billId) {
    const bill = getBillById(billId);
    if (bill) {
        sessionStorage.setItem('currentBill', JSON.stringify(bill));
        navigateTo('calculator.html');
    }
}

function duplicateBill(billId) {
    const bill = getBillById(billId);
    if (bill) {
        const duplicatedBill = {
            ...bill,
            id: Date.now().toString(),
            name: `${bill.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        delete duplicatedBill.finalTotals;
        delete duplicatedBill.settlements;
        
        if (saveBill(duplicatedBill)) {
            showNotification('Bill duplicated successfully', 'success');
            loadBills(); // Reload to show the new bill
        }
    }
}

function deleteBill(billId) {
    const bill = getBillById(billId);
    if (!bill) return;
    
    if (confirm(`Are you sure you want to delete "${bill.name}"? This action cannot be undone.`)) {
        if (deleteBillById(billId)) {
            showNotification('Bill deleted successfully', 'success');
            loadBills(); // Reload the list
        }
    }
}

// Selection Management
function toggleBillSelection(billId) {
    event.stopPropagation();
    
    if (selectedBills.has(billId)) {
        selectedBills.delete(billId);
    } else {
        selectedBills.add(billId);
    }
    
    updateSelectionUI();
}

function selectAllBills() {
    filteredBills.forEach(bill => {
        selectedBills.add(bill.id);
    });
    updateSelectionUI();
}

function clearSelection() {
    selectedBills.clear();
    updateSelectionUI();
}

function updateSelectionUI() {
    // Update checkboxes
    document.querySelectorAll('.bill-card').forEach(card => {
        const billId = card.onclick ? card.onclick.toString().match(/'([^']+)'/)[1] : '';
        if (selectedBills.has(billId)) {
            card.classList.add('selected');
            card.querySelector('.bill-checkbox').classList.add('checked');
        } else {
            card.classList.remove('selected');
            card.querySelector('.bill-checkbox').classList.remove('checked');
        }
    });
    
    // Update bulk actions
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedBills.size > 0) {
        selectedCount.textContent = selectedBills.size;
        bulkActions.style.display = 'flex';
    } else {
        bulkActions.style.display = 'none';
    }
}

function deleteSelectedBills() {
    const count = selectedBills.size;
    if (count === 0) return;
    
    if (confirm(`Are you sure you want to delete ${count} selected bill${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
        let successCount = 0;
        
        selectedBills.forEach(billId => {
            if (deleteBillById(billId)) {
                successCount++;
            }
        });
        
        selectedBills.clear();
        loadBills();
        
        showNotification(`Deleted ${successCount} of ${count} bill${count > 1 ? 's' : ''}`, 
                        successCount === count ? 'success' : 'warning');
    }
}

// Filter Panel
function toggleFilterPanel() {
    const filterPanel = document.getElementById('filterPanel');
    const isVisible = filterPanel.style.display === 'block';
    
    filterPanel.style.display = isVisible ? 'none' : 'block';
}

function resetFilters() {
    document.getElementById('searchBills').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('dateFilter').value = 'all';
    document.getElementById('sortFilter').value = 'newest';
    
    filterBills();
    showNotification('Filters reset', 'info');
}

function clearBillSearch() {
    document.getElementById('searchBills').value = '';
    filterBills();
}

// Export functionality
function showExportModal() {
    document.getElementById('exportModal').style.display = 'flex';
}

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

function performExport() {
    const exportScope = document.querySelector('input[name="exportScope"]:checked').value;
    const exportFormat = document.getElementById('exportFormat').value;
    
    let billsToExport = [];
    
    switch (exportScope) {
        case 'all':
            billsToExport = allBills;
            break;
        case 'filtered':
            billsToExport = filteredBills;
            break;
        case 'selected':
            billsToExport = allBills.filter(bill => selectedBills.has(bill.id));
            break;
    }
    
    if (billsToExport.length === 0) {
        showNotification('No bills to export', 'warning');
        return;
    }
    
    switch (exportFormat) {
        case 'json':
            exportAsJSON(billsToExport);
            break;
        case 'csv':
            exportAsCSV(billsToExport);
            break;
        case 'pdf':
            exportAsPDF(billsToExport);
            break;
    }
    
    closeExportModal();
}

function exportAsJSON(bills) {
    const data = {
        bills: bills,
        exportInfo: {
            date: new Date().toISOString(),
            count: bills.length,
            totalAmount: bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0)
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `bills-export-${new Date().toISOString().split('T')[0]}.json`);
    showNotification('Bills exported as JSON', 'success');
}

function exportAsCSV(bills) {
    const headers = ['Date', 'Name', 'Category', 'Amount', 'Participants', 'Description', 'Entries'];
    let csv = headers.join(',') + '\n';
    
    bills.forEach(bill => {
        const participants = getBillParticipants(bill).map(code => 
            nameMap[code]?.name || code
        ).join('; ');
        
        const row = [
            `"${bill.date}"`,
            `"${bill.name}"`,
            `"${bill.category}"`,
            `"${bill.totalAmount || 0}"`,
            `"${participants}"`,
            `"${bill.description || ''}"`,
            `"${bill.entries?.length || 0}"`
        ];
        
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `bills-export-${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('Bills exported as CSV', 'success');
}

function exportAsPDF(bills) {
    // Simple PDF generation using browser print
    const printWindow = window.open('', '_blank');
    const totalAmount = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bills Export</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                .bill { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
                .summary { background: #f5f5f5; padding: 15px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h1>📊 Bills Export</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Total Bills: ${bills.length}</p>
            
            ${bills.map(bill => `
                <div class="bill">
                    <h3>${bill.name}</h3>
                    <p><strong>Date:</strong> ${formatDate(bill.date)}</p>
                    <p><strong>Category:</strong> ${bill.category}</p>
                    <p><strong>Amount:</strong> ₹${bill.totalAmount?.toFixed(2) || '0.00'}</p>
                    ${bill.description ? `<p><strong>Description:</strong> ${bill.description}</p>` : ''}
                    <p><strong>Entries:</strong> ${bill.entries?.length || 0}</p>
                </div>
            `).join('')}
            
            <div class="summary">
                <h3>Summary</h3>
                <p><strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
                <p><strong>Average per Bill:</strong> ₹${(totalAmount / bills.length).toFixed(2)}</p>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
    showNotification('PDF generated for printing', 'success');
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// UI State Management
function showLoadingState() {
    document.getElementById('loadingState').classList.add('show');
    document.getElementById('billsList').style.opacity = '0.5';
}

function hideLoadingState() {
    document.getElementById('loadingState').classList.remove('show');
    document.getElementById('billsList').style.opacity = '1';
}

function showEmptyState() {
    document.getElementById('emptyState').classList.add('show');
    document.getElementById('billsList').style.display = 'none';
    document.getElementById('statsOverview').style.display = 'none';
}

function hideEmptyState() {
    document.getElementById('emptyState').classList.remove('show');
    document.getElementById('billsList').style.display = 'block';
}

// Refresh functionality
function refreshBills() {
    loadBills();
    showNotification('Bills refreshed', 'success');
}

// Add this to allow pull-to-refresh on mobile
document.addEventListener('DOMContentLoaded', function() {
    let refreshTimer;
    
    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0) {
            refreshTimer = setTimeout(() => {
                refreshBills();
            }, 1000);
        }
    });
    
    document.addEventListener('touchend', function() {
        clearTimeout(refreshTimer);
    });
});
