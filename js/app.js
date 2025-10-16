// Enhanced Hostel Bill Manager Pro - Main Application Logic

// Global configuration
const CONFIG = {
    APP_NAME: 'Hostel Bill Manager Pro',
    VERSION: '3.0.0',
    DEFAULT_CURRENCY: '₹',
    SUPPORTED_CURRENCIES: ['₹', '$', '€', '£'],
    THEMES: ['light', 'dark', 'auto'],
    CATEGORIES: ['food', 'groceries', 'utilities', 'rent', 'transport', 'entertainment', 'other']
};

// Enhanced Name Mapping with Avatars and Colors
const nameMap = {
    'Z': { 
        name: 'Zeshan', 
        avatar: '👨‍💼', 
        color: '#6366F1',
        email: '',
        phone: ''
    },
    'U': { 
        name: 'Umam', 
        avatar: '👨‍🎓', 
        color: '#10B981',
        email: '',
        phone: ''
    },
    'M': { 
        name: 'Rasool', 
        avatar: '👨‍🔧', 
        color: '#F59E0B',
        email: '',
        phone: ''
    },
    'B': { 
        name: 'Abdullah', 
        avatar: '👨‍💻', 
        color: '#EF4444',
        email: '',
        phone: ''
    },
    'A': { 
        name: 'Aziz', 
        avatar: '👨‍🎨', 
        color: '#8B5CF6',
        email: '',
        phone: ''
    }
};

// Enhanced Navigation with Animation and History
let navigationHistory = [];

function navigateTo(page) {
    // Add current page to history
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navigationHistory.push(currentPage);
    
    // Limit history to 10 pages
    if (navigationHistory.length > 10) {
        navigationHistory.shift();
    }
    
    // Apply exit animation
    document.body.style.opacity = '0.8';
    document.body.style.transform = 'scale(0.98)';
    document.body.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    setTimeout(() => {
        window.location.href = page;
    }, 300);
}

function goBack() {
    if (navigationHistory.length > 0) {
        const previousPage = navigationHistory.pop();
        navigateTo(previousPage);
    } else {
        window.history.back();
    }
}

// Enhanced Notification System
function showNotification(message, type = 'success', duration = 4000) {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.warn('Notification element not found');
        return;
    }
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const icon = icons[type] || icons.info;
    
    notification.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-text">${message}</span>
    `;
    
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    // Add ripple effect
    createRippleEffect(notification);
    
    // Auto hide
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
    
    // Click to dismiss
    notification.onclick = () => {
        notification.classList.remove('show');
    };
}

// Ripple Effect for Interactive Elements
function createRippleEffect(element) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event ? event.clientX - rect.left : rect.width / 2;
    const y = event ? event.clientY - rect.top : rect.height / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x - size / 2 + 'px';
    ripple.style.top = y - size / 2 + 'px';
    
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Enhanced Settings Management
function getSettings() {
    try {
        const settings = localStorage.getItem('hostelBillSettings');
        return settings ? JSON.parse(settings) : {
            theme: 'light',
            currency: '₹',
            categories: CONFIG.CATEGORIES,
            defaultParticipants: ['Z', 'U', 'M', 'B', 'A'],
            notifications: true,
            autoBackup: false,
            budget: {
                monthly: 0,
                enabled: false,
                categories: {}
            },
            appearance: {
                animations: true,
                reducedMotion: false,
                highContrast: false
            },
            data: {
                autoSave: true,
                backupInterval: 7, // days
                lastBackup: null
            }
        };
    } catch (error) {
        console.error('Error loading settings:', error);
        return getDefaultSettings();
    }
}

function saveSettings(settings) {
    try {
        localStorage.setItem('hostelBillSettings', JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Failed to save settings', 'error');
        return false;
    }
}

function getDefaultSettings() {
    return {
        theme: 'light',
        currency: '₹',
        categories: CONFIG.CATEGORIES,
        defaultParticipants: Object.keys(nameMap),
        notifications: true,
        autoBackup: false
    };
}

// Enhanced Data Export with Compression and Validation
function exportAllData() {
    try {
        const data = {
            bills: getBills(),
            settings: getSettings(),
            participants: nameMap,
            exportInfo: {
                date: new Date().toISOString(),
                version: CONFIG.VERSION,
                app: CONFIG.APP_NAME,
                recordCount: {
                    bills: getBills().length,
                    settings: 1
                }
            }
        };
        
        // Validate data before export
        if (!validateExportData(data)) {
            throw new Error('Data validation failed');
        }
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { 
            type: 'application/json;charset=utf-8' 
        });
        
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `hostel-bills-backup-${timestamp}.json`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Update last backup time
        const settings = getSettings();
        settings.data.lastBackup = new Date().toISOString();
        saveSettings(settings);
        
        showNotification('Data exported successfully!', 'success');
        
    } catch (error) {
        console.error('Export failed:', error);
        showNotification('Export failed: ' + error.message, 'error');
    }
}

function validateExportData(data) {
    if (!data.bills || !Array.isArray(data.bills)) {
        return false;
    }
    
    if (!data.settings || typeof data.settings !== 'object') {
        return false;
    }
    
    // Basic validation for bills
    for (const bill of data.bills) {
        if (!bill.id || !bill.name || !bill.date) {
            return false;
        }
    }
    
    return true;
}

// Enhanced Data Import with Validation and Backup
function importData() {
    document.getElementById('importFile').click();
}

function handleFileImport(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate imported data
            if (!validateImportData(data)) {
                throw new Error('Invalid data format or corrupted file');
            }
            
            // Create backup before import
            const backup = createBackup();
            
            // Import data
            localStorage.setItem('hostelBills', JSON.stringify(data.bills));
            if (data.settings) {
                localStorage.setItem('hostelBillSettings', JSON.stringify(data.settings));
            }
            
            // Update participants if provided
            if (data.participants) {
                Object.assign(nameMap, data.participants);
            }
            
            showNotification('Data imported successfully!', 'success');
            
            // Reload the application
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            console.error('Import failed:', error);
            showNotification('Import failed: ' + error.message, 'error');
            
            // Offer to restore backup
            if (confirm('Import failed. Would you like to restore from backup?')) {
                restoreBackup();
            }
        }
    };
    
    reader.onerror = function() {
        showNotification('Error reading file', 'error');
    };
    
    reader.readAsText(file);
}

function validateImportData(data) {
    if (!data.bills || !Array.isArray(data.bills)) {
        return false;
    }
    
    // Check for required fields in bills
    for (const bill of data.bills) {
        if (!bill.id || !bill.name || !bill.date) {
            return false;
        }
    }
    
    return true;
}

// Backup and Restore System
function createBackup() {
    const backup = {
        bills: getBills(),
        settings: getSettings(),
        timestamp: new Date().toISOString(),
        version: CONFIG.VERSION
    };
    
    localStorage.setItem('hostelBillBackup', JSON.stringify(backup));
    return backup;
}

function restoreBackup() {
    try {
        const backup = localStorage.getItem('hostelBillBackup');
        if (!backup) {
            throw new Error('No backup found');
        }
        
        const data = JSON.parse(backup);
        
        localStorage.setItem('hostelBills', JSON.stringify(data.bills));
        if (data.settings) {
            localStorage.setItem('hostelBillSettings', JSON.stringify(data.settings));
        }
        
        showNotification('Backup restored successfully!', 'success');
        setTimeout(() => window.location.reload(), 1000);
        
    } catch (error) {
        showNotification('Restore failed: ' + error.message, 'error');
    }
}

// Enhanced Utility Functions
function formatCurrency(amount, currency = null) {
    const settings = getSettings();
    const curr = currency || settings.currency;
    return `${curr}${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString, format = 'standard') {
    const date = new Date(dateString);
    
    if (format === 'short') {
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
    }
    
    if (format === 'relative') {
        return getRelativeTime(date);
    }
    
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function getRelativeTime(date) {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return formatDate(date);
}

function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Enhanced Error Handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showNotification('Something went wrong. Please refresh the app.', 'error');
    
    // Log error for debugging
    if (navigator.onLine) {
        logError(e.error);
    }
});

function logError(error) {
    const errorLog = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
    };
    
    // Store errors in localStorage (limited to last 10)
    const errors = JSON.parse(localStorage.getItem('appErrors') || '[]');
    errors.push(errorLog);
    if (errors.length > 10) errors.shift();
    localStorage.setItem('appErrors', JSON.stringify(errors));
}

// Performance Monitoring
function measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`${name} took ${(end - start).toFixed(2)}ms`);
    return result;
}

// Service Worker Registration with Enhanced Update Handling
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/hostel-bill-manager/service-worker.js')
            .then(registration => {
                console.log('SW registered: ', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('New service worker found...');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showNotification('New version available! Refresh to update.', 'info', 10000);
                        }
                    });
                });
            })
            .catch(error => {
                console.log('SW registration failed: ', error);
            });
        
        // Listen for controller changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service worker controller changed');
            window.location.reload();
        });
    }
}

// Enhanced Offline Support
function checkOfflineStatus() {
    if (!navigator.onLine) {
        showNotification('You are currently offline', 'warning');
        document.body.classList.add('offline');
    }
    
    window.addEventListener('online', () => {
        showNotification('Connection restored', 'success');
        document.body.classList.remove('offline');
        // Sync any pending operations
        syncPendingOperations();
    });
    
    window.addEventListener('offline', () => {
        showNotification('You are offline', 'warning');
        document.body.classList.add('offline');
    });
}

function syncPendingOperations() {
    // Implement sync logic for offline operations
    const pendingOps = JSON.parse(localStorage.getItem('pendingOperations') || '[]');
    if (pendingOps.length > 0) {
        showNotification(`Syncing ${pendingOps.length} pending operations...`, 'info');
        // Process pending operations
    }
}

// Enhanced Search Functionality
function searchBills(query) {
    if (!query.trim()) return getBills();
    
    const bills = getBills();
    const searchTerm = query.toLowerCase();
    
    return bills.filter(bill => {
        return (
            bill.name.toLowerCase().includes(searchTerm) ||
            (bill.description && bill.description.toLowerCase().includes(searchTerm)) ||
            bill.category.toLowerCase().includes(searchTerm) ||
            formatCurrency(bill.totalAmount).toLowerCase().includes(searchTerm) ||
            // Search in participants
            Object.keys(bill.totals || {}).some(code => 
                nameMap[code]?.name.toLowerCase().includes(searchTerm)
            )
        );
    });
}

// Budget Management
function getMonthlyBudget() {
    const settings = getSettings();
    return settings.budget?.monthly || 0;
}

function setMonthlyBudget(amount) {
    const settings = getSettings();
    settings.budget = settings.budget || {};
    settings.budget.monthly = parseFloat(amount);
    settings.budget.enabled = amount > 0;
    saveSettings(settings);
}

function getBudgetProgress() {
    const budget = getMonthlyBudget();
    if (!budget) return { used: 0, remaining: 0, percentage: 0 };
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyBills = getBills().filter(bill => {
        const billDate = new Date(bill.date);
        return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
    });
    
    const used = monthlyBills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    const remaining = Math.max(budget - used, 0);
    const percentage = Math.min((used / budget) * 100, 100);
    
    return { used, remaining, percentage };
}

// Keyboard Shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + / for search
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            const searchContainer = document.getElementById('searchContainer');
            if (searchContainer) {
                searchContainer.style.display = searchContainer.style.display === 'none' ? 'block' : 'none';
                if (searchContainer.style.display === 'block') {
                    document.getElementById('globalSearch')?.focus();
                }
            }
        }
        
        // Ctrl/Cmd + K for search (alternative)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchContainer = document.getElementById('searchContainer');
            if (searchContainer) {
                searchContainer.style.display = searchContainer.style.display === 'none' ? 'block' : 'none';
                if (searchContainer.style.display === 'block') {
                    document.getElementById('globalSearch')?.focus();
                }
            }
        }
        
        // Escape to close modals and search
        if (e.key === 'Escape') {
            // Close voice input modal
            const voiceModal = document.getElementById('voiceInputModal');
            if (voiceModal && voiceModal.style.display !== 'none') {
                closeVoiceInput();
            }
            
            // Close search
            const searchContainer = document.getElementById('searchContainer');
            if (searchContainer && searchContainer.style.display === 'block') {
                searchContainer.style.display = 'none';
            }
            
            // Close any other modals
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (modal.style.display !== 'none') {
                    modal.style.display = 'none';
                }
            });
        }
        
        // Quick navigation shortcuts (number keys 1-9)
        if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const index = parseInt(e.key) - 1;
            const menuCards = document.querySelectorAll('.menu-card');
            if (menuCards[index]) {
                menuCards[index].click();
            }
        }
    });
}

// Enhanced Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize with fade-in animation
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // Initialize service worker
    initServiceWorker();
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();
    
    // Check offline status
    checkOfflineStatus();
    
    // Initialize performance monitoring
    if (localStorage.getItem('debugMode') === 'true') {
        window.enableDebugMode = true;
        console.log('Debug mode enabled');
    }
    
    // Add ripple effects to buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('.btn-primary, .btn-secondary, .menu-card, .icon-btn')) {
            createRippleEffect(e.target);
        }
    });
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        navigateTo,
        goBack,
        showNotification,
        getSettings,
        saveSettings,
        formatCurrency,
        formatDate,
        debounce,
        throttle
    };
}
