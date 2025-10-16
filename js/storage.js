// Enhanced Storage Management for Hostel Bill Manager

// Bills Storage Operations
function getBills() {
    try {
        const bills = localStorage.getItem('hostelBills');
        if (!bills) return [];
        
        const parsedBills = JSON.parse(bills);
        
        // Validate and migrate old bill formats if needed
        return parsedBills.map(bill => migrateBillFormat(bill));
        
    } catch (error) {
        console.error('Error loading bills:', error);
        showNotification('Error loading bills data', 'error');
        return [];
    }
}

function saveBills(bills) {
    try {
        localStorage.setItem('hostelBills', JSON.stringify(bills));
        return true;
    } catch (error) {
        console.error('Error saving bills:', error);
        showNotification('Failed to save bills', 'error');
        return false;
    }
}

function saveBill(bill) {
    const bills = getBills();
    
    // Validate bill before saving
    if (!validateBill(bill)) {
        showNotification('Invalid bill data', 'error');
        return false;
    }
    
    // Check if bill already exists (for updating)
    const existingIndex = bills.findIndex(b => b.id === bill.id);
    
    if (existingIndex >= 0) {
        bills[existingIndex] = bill;
    } else {
        bills.push(bill);
    }
    
    const success = saveBills(bills);
    
    if (success) {
        // Trigger storage event for other tabs
        window.dispatchEvent(new Event('storage'));
    }
    
    return success;
}

function getBillById(id) {
    const bills = getBills();
    return bills.find(bill => bill.id === id);
}

function deleteBillById(id) {
    const bills = getBills();
    const updatedBills = bills.filter(bill => bill.id !== id);
    const success = saveBills(updatedBills);
    
    if (success) {
        showNotification('Bill deleted successfully', 'success');
        window.dispatchEvent(new Event('storage'));
    }
    
    return success;
}

// Bill Validation
function validateBill(bill) {
    const required = ['id', 'name', 'date', 'entries'];
    const missing = required.filter(field => !bill[field]);
    
    if (missing.length > 0) {
        console.error('Missing required fields:', missing);
        return false;
    }
    
    if (!Array.isArray(bill.entries)) {
        console.error('Entries must be an array');
        return false;
    }
    
    // Validate entries
    for (const entry of bill.entries) {
        if (!entry.id || !entry.price || !entry.participants) {
            console.error('Invalid entry format');
            return false;
        }
        
        if (entry.price <= 0) {
            console.error('Entry price must be positive');
            return false;
        }
    }
    
    return true;
}

// Data Migration for Backward Compatibility
function migrateBillFormat(bill) {
    // Ensure bill has all required fields with defaults
    const migratedBill = {
        id: bill.id || generateId(),
        name: bill.name || 'Unnamed Bill',
        date: bill.date || new Date().toISOString().split('T')[0],
        category: bill.category || 'other',
        description: bill.description || '',
        createdAt: bill.createdAt || new Date().toISOString(),
        updatedAt: bill.updatedAt || new Date().toISOString(),
        entries: bill.entries || [],
        totals: bill.totals || {},
        finalTotals: bill.finalTotals || null,
        totalAmount: bill.totalAmount || 0,
        participants: bill.participants || [],
        isRecurring: bill.isRecurring || false,
        recurrence: bill.recurrence || null
    };
    
    // Calculate total amount if not present
    if (!migratedBill.totalAmount && migratedBill.entries.length > 0) {
        migratedBill.totalAmount = migratedBill.entries.reduce((sum, entry) => sum + entry.price, 0);
    }
    
    return migratedBill;
}

function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Enhanced Bill Operations
function getBillsByCategory(category) {
    const bills = getBills();
    return bills.filter(bill => bill.category === category);
}

function getBillsByDateRange(startDate, endDate) {
    const bills = getBills();
    return bills.filter(bill => {
        const billDate = new Date(bill.date);
        return billDate >= new Date(startDate) && billDate <= new Date(endDate);
    });
}

function getBillsByParticipant(participantCode) {
    const bills = getBills();
    return bills.filter(bill => {
        return bill.entries.some(entry => 
            entry.participants && entry.participants.includes(participantCode)
        );
    });
}

function getRecentBills(days = 7, limit = 10) {
    const bills = getBills();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return bills
        .filter(bill => new Date(bill.createdAt) > cutoffDate)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
}

function getUpcomingBills() {
    const bills = getBills();
    const today = new Date();
    
    return bills
        .filter(bill => {
            const billDate = new Date(bill.date);
            return billDate >= today && bill.isRecurring;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Analytics Data Helpers
function getCategorySpending() {
    const bills = getBills();
    const spending = {};
    
    bills.forEach(bill => {
        const category = bill.category || 'other';
        spending[category] = (spending[category] || 0) + (bill.totalAmount || 0);
    });
    
    return spending;
}

function getMonthlySpending() {
    const bills = getBills();
    const monthly = {};
    
    bills.forEach(bill => {
        const date = new Date(bill.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        monthly[monthName] = (monthly[monthName] || 0) + (bill.totalAmount || 0);
    });
    
    return monthly;
}

function getParticipantSpending() {
    const bills = getBills();
    const spending = {};
    
    // Initialize with all participants
    Object.keys(nameMap).forEach(code => {
        spending[code] = 0;
    });
    
    bills.forEach(bill => {
        if (bill.finalTotals) {
            Object.entries(bill.finalTotals).forEach(([person, amount]) => {
                spending[person] = (spending[person] || 0) + amount;
            });
        }
    });
    
    return spending;
}

function getSpendingTrend() {
    const bills = getBills();
    const monthlyData = {};
    
    // Group by month
    bills.forEach(bill => {
        const date = new Date(bill.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                total: 0,
                count: 0,
                date: date
            };
        }
        
        monthlyData[monthKey].total += bill.totalAmount || 0;
        monthlyData[monthKey].count += 1;
    });
    
    // Convert to array and sort
    return Object.entries(monthlyData)
        .map(([key, data]) => ({
            month: key,
            total: data.total,
            count: data.count,
            date: data.date
        }))
        .sort((a, b) => a.date - b.date);
}

// Settlement Calculations
function calculateSettlements(bills = null) {
    const billList = bills || getBills();
    const totals = {};
    
    // Initialize with all participants
    Object.keys(nameMap).forEach(code => {
        totals[code] = 0;
    });
    
    // Calculate totals for each person
    billList.forEach(bill => {
        if (bill.finalTotals) {
            Object.entries(bill.finalTotals).forEach(([person, amount]) => {
                totals[person] = (totals[person] || 0) + amount;
            });
        }
    });
    
    return totals;
}

function calculateOptimalSettlements(totals) {
    const people = Object.entries(totals)
        .map(([person, balance]) => ({
            code: person,
            name: nameMap[person]?.name || person,
            balance: balance
        }))
        .sort((a, b) => a.balance - b.balance);
    
    let settlements = [];
    let i = 0, j = people.length - 1;
    
    while (i < j) {
        const debtor = people[i];
        const creditor = people[j];
        const amount = Math.min(-debtor.balance, creditor.balance);
        
        if (amount > 0.01) { // Avoid tiny amounts
            settlements.push({
                from: debtor.code,
                fromName: debtor.name,
                to: creditor.code,
                toName: creditor.name,
                amount: parseFloat(amount.toFixed(2))
            });
            
            debtor.balance += amount;
            creditor.balance -= amount;
        }
        
        if (Math.abs(debtor.balance) < 0.01) i++;
        if (Math.abs(creditor.balance) < 0.01) j--;
    }
    
    return settlements;
}

// Data Export and Import Helpers
function exportBillsToCSV() {
    const bills = getBills();
    const headers = ['Date', 'Name', 'Category', 'Amount', 'Participants', 'Description'];
    
    let csv = headers.join(',') + '\n';
    
    bills.forEach(bill => {
        const participants = bill.participants 
            ? bill.participants.map(code => nameMap[code]?.name || code).join('; ')
            : '';
            
        const row = [
            `"${bill.date}"`,
            `"${bill.name}"`,
            `"${bill.category}"`,
            `"${bill.totalAmount}"`,
            `"${participants}"`,
            `"${bill.description || ''}"`
        ];
        
        csv += row.join(',') + '\n';
    });
    
    return csv;
}

function getStorageStats() {
    const bills = getBills();
    const settings = getSettings();
    
    let totalSize = 0;
    
    // Calculate approximate storage size
    try {
        totalSize += JSON.stringify(bills).length;
        totalSize += JSON.stringify(settings).length;
        totalSize += JSON.stringify(nameMap).length;
    } catch (error) {
        console.error('Error calculating storage size:', error);
    }
    
    return {
        billCount: bills.length,
        totalAmount: bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0),
        storageSize: totalSize,
        lastModified: bills.length > 0 
            ? new Date(Math.max(...bills.map(b => new Date(b.updatedAt || b.createdAt))))
            : null
    };
}

// Data Cleanup and Maintenance
function cleanupOrphanedData() {
    const bills = getBills();
    let cleanedCount = 0;
    
    const cleanedBills = bills.filter(bill => {
        if (!validateBill(bill)) {
            cleanedCount++;
            return false;
        }
        
        // Remove entries with invalid participants
        bill.entries = bill.entries.filter(entry => {
            if (!entry.participants || entry.participants.length === 0) {
                cleanedCount++;
                return false;
            }
            return true;
        });
        
        return true;
    });
    
    if (cleanedCount > 0) {
        saveBills(cleanedBills);
        console.log(`Cleaned ${cleanedCount} invalid records`);
    }
    
    return cleanedCount;
}

function compressOldBills(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const bills = getBills();
    let compressedCount = 0;
    
    const compressedBills = bills.map(bill => {
        const billDate = new Date(bill.date);
        if (billDate < cutoffDate && bill.entries && bill.entries.length > 10) {
            // Keep only essential data for old bills
            compressedCount++;
            return {
                id: bill.id,
                name: bill.name,
                date: bill.date,
                category: bill.category,
                totalAmount: bill.totalAmount,
                finalTotals: bill.finalTotals,
                compressed: true,
                compressedAt: new Date().toISOString()
            };
        }
        return bill;
    });
    
    if (compressedCount > 0) {
        saveBills(compressedBills);
        console.log(`Compressed ${compressedCount} old bills`);
    }
    
    return compressedCount;
}

// Storage Event Handling for Multi-tab Sync
window.addEventListener('storage', function(e) {
    if (e.key === 'hostelBills' || e.key === 'hostelBillSettings') {
        // Data changed in another tab, update UI if needed
        if (typeof onStorageUpdate === 'function') {
            onStorageUpdate(e.key, e.newValue);
        }
    }
});

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getBills,
        saveBills,
        saveBill,
        getBillById,
        deleteBillById,
        getBillsByCategory,
        getBillsByDateRange,
        getRecentBills,
        getCategorySpending,
        getMonthlySpending,
        getParticipantSpending,
        calculateSettlements,
        calculateOptimalSettlements,
        getStorageStats
    };
}
