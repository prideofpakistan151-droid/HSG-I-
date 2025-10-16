// Enhanced Analytics with Chart.js Integration

class AnalyticsManager {
    constructor() {
        this.charts = {};
        this.currentRange = 'all';
        this.analyticsData = {};
        this.init();
    }

    init() {
        this.loadAnalyticsData();
        this.initializeCharts();
        this.updateAnalytics();
    }

    loadAnalyticsData() {
        const bills = getBills();
        this.analyticsData = {
            bills: bills,
            totals: this.calculateTotals(bills),
            categories: this.calculateCategoryData(bills),
            participants: this.calculateParticipantData(bills),
            monthly: this.calculateMonthlyData(bills),
            settlements: this.calculateSettlementData(bills)
        };
    }

    calculateTotals(bills) {
        const totalSpent = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
        const totalBills = bills.length;
        const avgPerBill = totalBills > 0 ? totalSpent / totalBills : 0;
        
        // Calculate trends (simplified - in real app, compare with previous period)
        const previousPeriodBills = this.getBillsForPreviousPeriod(bills);
        const previousTotal = previousPeriodBills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
        
        const spendingTrend = previousTotal > 0 ? 
            ((totalSpent - previousTotal) / previousTotal * 100).toFixed(1) : 0;
        
        const billsTrend = previousPeriodBills.length > 0 ?
            ((totalBills - previousPeriodBills.length) / previousPeriodBills.length * 100).toFixed(1) : 0;
        
        const avgTrend = previousTotal > 0 && previousPeriodBills.length > 0 ?
            ((avgPerBill - (previousTotal / previousPeriodBills.length)) / (previousTotal / previousPeriodBills.length) * 100).toFixed(1) : 0;

        return {
            totalSpent,
            totalBills,
            avgPerBill,
            trends: {
                spending: spendingTrend,
                bills: billsTrend,
                average: avgTrend
            }
        };
    }

    getBillsForPreviousPeriod(bills) {
        const range = document.getElementById('analyticsRange')?.value || 'all';
        const now = new Date();
        let startDate, endDate;

        switch (range) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear() - 1, 0, 1);
                endDate = new Date(now.getFullYear() - 1, 11, 31);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
                break;
            default:
                return bills; // For 'all', return all bills as previous period
        }

        return bills.filter(bill => {
            const billDate = new Date(bill.date);
            return billDate >= startDate && billDate <= endDate;
        });
    }

    calculateCategoryData(bills) {
        const categorySpending = {};
        const categoryCount = {};

        bills.forEach(bill => {
            const category = bill.category || 'other';
            const amount = bill.totalAmount || 0;
            
            categorySpending[category] = (categorySpending[category] || 0) + amount;
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        // Convert to array and sort by amount
        return Object.entries(categorySpending)
            .map(([category, amount]) => ({
                category,
                amount,
                count: categoryCount[category],
                percentage: (amount / this.analyticsData.totals.totalSpent * 100) || 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }

    calculateParticipantData(bills) {
        const participantSpending = {};
        
        // Initialize with all participants
        Object.keys(nameMap).forEach(code => {
            participantSpending[code] = 0;
        });

        // Calculate spending for each participant
        bills.forEach(bill => {
            if (bill.finalTotals) {
                Object.entries(bill.finalTotals).forEach(([code, amount]) => {
                    participantSpending[code] = (participantSpending[code] || 0) + amount;
                });
            }
        });

        // Convert to array and sort by amount
        return Object.entries(participantSpending)
            .map(([code, amount]) => ({
                code,
                name: nameMap[code]?.name || code,
                avatar: nameMap[code]?.avatar || '👤',
                color: nameMap[code]?.color || '#6366F1',
                amount,
                percentage: (amount / this.analyticsData.totals.totalSpent * 100) || 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }

    calculateMonthlyData(bills) {
        const monthlyData = {};
        
        bills.forEach(bill => {
            const date = new Date(bill.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    name: monthName,
                    amount: 0,
                    count: 0,
                    date: date
                };
            }
            
            monthlyData[monthKey].amount += bill.totalAmount || 0;
            monthlyData[monthKey].count += 1;
        });

        // Convert to array and sort by date
        return Object.values(monthlyData)
            .sort((a, b) => a.date - b.date)
            .slice(-12); // Last 12 months
    }

    calculateSettlementData(bills) {
        const totals = calculateSettlements(bills);
        return calculateOptimalSettlements(totals);
    }

    initializeCharts() {
        this.initializeSpendingChart();
        this.initializeCategoryChart();
        this.initializeParticipantChart();
        this.initializeMonthlyChart();
    }

    initializeSpendingChart() {
        const ctx = document.getElementById('spendingChart').getContext('2d');
        
        this.charts.spendingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Spending',
                    data: [],
                    borderColor: '#6366F1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `₹${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    initializeCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        this.charts.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#EF4444', '#10B981', '#F59E0B', '#6366F1',
                        '#8B5CF6', '#EC4899', '#6B7280', '#84CC16',
                        '#06B6D4', '#F97316'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    initializeParticipantChart() {
        const ctx = document.getElementById('participantChart').getContext('2d');
        
        this.charts.participantChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Amount Spent',
                    data: [],
                    backgroundColor: [],
                    borderWidth: 0,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    initializeMonthlyChart() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        
        this.charts.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Monthly Spending',
                    data: [],
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: '#6366F1',
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    updateAnalytics() {
        this.currentRange = document.getElementById('analyticsRange').value;
        this.loadAnalyticsData();
        this.updateSummaryCards();
        this.updateCharts();
        this.updateSettlements();
        this.updateInsights();
    }

    updateSummaryCards() {
        const totals = this.analyticsData.totals;
        
        // Update summary values
        document.getElementById('totalSpent').textContent = `₹${totals.totalSpent.toFixed(2)}`;
        document.getElementById('totalBills').textContent = totals.totalBills;
        document.getElementById('avgPerBill').textContent = `₹${totals.avgPerBill.toFixed(2)}`;
        
        // Update trends
        this.updateTrendElement('spendingTrend', totals.trends.spending);
        this.updateTrendElement('billsTrend', totals.trends.bills);
        this.updateTrendElement('avgTrend', totals.trends.average);
        
        // Update budget progress
        this.updateBudgetProgress();
    }

    updateTrendElement(elementId, trendValue) {
        const element = document.getElementById(elementId);
        const trend = parseFloat(trendValue);
        
        if (trend > 0) {
            element.textContent = `↑ ${Math.abs(trend)}%`;
            element.className = 'summary-trend positive';
        } else if (trend < 0) {
            element.textContent = `↓ ${Math.abs(trend)}%`;
            element.className = 'summary-trend negative';
        } else {
            element.textContent = '→ 0%';
            element.className = 'summary-trend';
        }
    }

    updateBudgetProgress() {
        const budget = getMonthlyBudget();
        const progressElement = document.getElementById('budgetProgress');
        const usedElement = document.getElementById('budgetUsed');
        
        if (budget > 0) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const monthlyBills = this.analyticsData.bills.filter(bill => {
                const billDate = new Date(bill.date);
                return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
            });
            
            const used = monthlyBills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
            const percentage = Math.min((used / budget) * 100, 100);
            
            progressElement.style.width = `${percentage}%`;
            usedElement.textContent = `${percentage.toFixed(1)}%`;
            
            // Update progress bar color based on usage
            if (percentage > 80) {
                progressElement.style.background = 'var(--danger)';
            } else if (percentage > 60) {
                progressElement.style.background = 'var(--warning)';
            } else {
                progressElement.style.background = 'var(--success)';
            }
        } else {
            progressElement.style.width = '0%';
            usedElement.textContent = '0%';
        }
    }

    updateCharts() {
        this.updateSpendingChart();
        this.updateCategoryChart();
        this.updateParticipantChart();
        this.updateMonthlyChart();
    }

    updateSpendingChart() {
        // For demo purposes, generate some sample daily data
        // In a real app, you would aggregate bills by day
        const labels = [];
        const data = [];
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            // Simulate some random spending data
            data.push(Math.random() * 1000 + 500);
        }
        
        this.charts.spendingChart.data.labels = labels;
        this.charts.spendingChart.data.datasets[0].data = data;
        this.charts.spendingChart.update();
    }

    updateCategoryChart() {
        const categories = this.analyticsData.categories;
        
        this.charts.categoryChart.data.labels = categories.map(c => c.category);
        this.charts.categoryChart.data.datasets[0].data = categories.map(c => c.amount);
        this.charts.categoryChart.update();
        
        // Update category list
        this.updateCategoryList(categories);
    }

    updateCategoryList(categories) {
        const categoryList = document.getElementById('categoryList');
        
        if (categories.length === 0) {
            categoryList.innerHTML = '<div class="empty-analytics">No category data available</div>';
            return;
        }
        
        categoryList.innerHTML = categories.map(category => {
            const icon = getCategoryIcon(category.category);
            return `
                <div class="category-item">
                    <div class="category-icon" style="background: ${getCategoryColor(category.category)}">
                        ${icon}
                    </div>
                    <div class="category-info">
                        <div class="category-name">${category.category.charAt(0).toUpperCase() + category.category.slice(1)}</div>
                        <div class="category-stats">
                            ₹${category.amount.toFixed(2)} • ${category.count} bills • ${category.percentage.toFixed(1)}%
                        </div>
                    </div>
                    <div class="category-amount">₹${category.amount.toFixed(2)}</div>
                </div>
            `;
        }).join('');
    }

    updateParticipantChart() {
        const participants = this.analyticsData.participants;
        
        this.charts.participantChart.data.labels = participants.map(p => p.name);
        this.charts.participantChart.data.datasets[0].data = participants.map(p => p.amount);
        this.charts.participantChart.data.datasets[0].backgroundColor = participants.map(p => p.color);
        this.charts.participantChart.update();
        
        // Update participant list
        this.updateParticipantList(participants);
    }

    updateParticipantList(participants) {
        const participantList = document.getElementById('participantList');
        
        if (participants.length === 0) {
            participantList.innerHTML = '<div class="empty-analytics">No participant data available</div>';
            return;
        }
        
        participantList.innerHTML = participants.map(participant => `
            <div class="participant-item">
                <div class="participant-info">
                    <div class="participant-avatar" style="background: ${participant.color}">
                        ${participant.avatar}
                    </div>
                    <div class="participant-details">
                        <div class="participant-name">${participant.name}</div>
                        <div class="participant-stats">
                            ${participant.percentage.toFixed(1)}% of total spending
                        </div>
                    </div>
                </div>
                <div class="participant-amount">₹${participant.amount.toFixed(2)}</div>
            </div>
        `).join('');
    }

    updateMonthlyChart() {
        const monthlyData = this.analyticsData.monthly;
        
        this.charts.monthlyChart.data.labels = monthlyData.map(m => m.name);
        this.charts.monthlyChart.data.datasets[0].data = monthlyData.map(m => m.amount);
        this.charts.monthlyChart.update();
    }

    updateSettlements() {
        const settlements = this.analyticsData.settlements;
        const container = document.getElementById('settlementsList');
        
        if (settlements.length === 0) {
            container.innerHTML = `
                <div class="empty-analytics">
                    <div class="empty-icon">✅</div>
                    <h4>All Settled Up!</h4>
                    <p>No outstanding settlements between roommates</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = settlements.map(settlement => `
            <div class="settlement-item">
                <div class="settlement-parties">
                    <div class="settlement-from">
                        <div class="settlement-avatar" style="background: ${nameMap[settlement.from]?.color || '#6366F1'}">
                            ${nameMap[settlement.from]?.avatar || '👤'}
                        </div>
                        ${nameMap[settlement.from]?.name || settlement.from}
                    </div>
                    <div class="settlement-arrow">→</div>
                    <div class="settlement-to">
                        <div class="settlement-avatar" style="background: ${nameMap[settlement.to]?.color || '#6366F1'}">
                            ${nameMap[settlement.to]?.avatar || '👤'}
                        </div>
                        ${nameMap[settlement.to]?.name || settlement.to}
                    </div>
                </div>
                <div class="settlement-amount">₹${settlement.amount.toFixed(2)}</div>
            </div>
        `).join('');
    }

    updateInsights() {
        const insights = this.generateInsights();
        const container = document.getElementById('insightsList');
        
        container.innerHTML = insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <div class="insight-title">${insight.title}</div>
                    <div class="insight-description">${insight.description}</div>
                    <div class="insight-meta">${insight.meta}</div>
                </div>
            </div>
        `).join('');
    }

    generateInsights() {
        const insights = [];
        const totals = this.analyticsData.totals;
        const categories = this.analyticsData.categories;
        const participants = this.analyticsData.participants;
        
        // Spending pattern insight
        if (totals.totalBills > 0) {
            const avgDaily = totals.totalSpent / 30; // Rough estimate
            if (avgDaily > 1000) {
                insights.push({
                    type: 'warning',
                    icon: '💸',
                    title: 'High Daily Spending',
                    description: `Your average daily spending is ₹${avgDaily.toFixed(2)}. Consider tracking smaller expenses.`,
                    meta: 'Based on last 30 days'
                });
            }
        }
        
        // Category insights
        if (categories.length > 0) {
            const topCategory = categories[0];
            if (topCategory.percentage > 40) {
                insights.push({
                    type: 'info',
                    icon: '🏷️',
                    title: `Dominant Category: ${topCategory.category}`,
                    description: `${topCategory.percentage.toFixed(1)}% of your spending is on ${topCategory.category}. Consider diversifying expenses.`,
                    meta: `${topCategory.count} bills in this category`
                });
            }
        }
        
        // Participant insights
        if (participants.length > 0) {
            const highestSpender = participants[0];
            const lowestSpender = participants[participants.length - 1];
            
            if (highestSpender.percentage > (100 / participants.length) * 1.5) {
                insights.push({
                    type: 'info',
                    icon: '👤',
                    title: `${highestSpender.name} is the Highest Spender`,
                    description: `They account for ${highestSpender.percentage.toFixed(1)}% of total expenses.`,
                    meta: `₹${highestSpender.amount.toFixed(2)} total`
                });
            }
        }
        
        // Budget insight
        const budget = getMonthlyBudget();
        if (budget > 0) {
            const currentMonth = new Date().getMonth();
            const monthlyBills = this.analyticsData.bills.filter(bill => {
                const billDate = new Date(bill.date);
                return billDate.getMonth() === currentMonth;
            });
            
            const monthlySpent = monthlyBills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
            const daysLeft = new Date(new Date().getFullYear(), currentMonth + 1, 0).getDate() - new Date().getDate();
            const projectedSpend = (monthlySpent / (new Date().getDate())) * 30;
            
            if (projectedSpend > budget) {
                insights.push({
                    type: 'warning',
                    icon: '🎯',
                    title: 'Budget Alert',
                    description: `At current rate, you'll exceed your monthly budget by ₹${(projectedSpend - budget).toFixed(2)}.`,
                    meta: `${daysLeft} days left in month`
                });
            }
        }
        
        // Add a positive insight if no warnings
        if (insights.length === 0) {
            insights.push({
                type: 'positive',
                icon: '✅',
                title: 'Great Spending Habits!',
                description: 'Your expenses are well-balanced across categories and participants.',
                meta: 'Keep up the good work!'
            });
        }
        
        return insights;
    }

    toggleChartView(chartId) {
        const chart = this.charts[chartId];
        if (!chart) return;
        
        const currentType = chart.config.type;
        const newType = currentType === 'bar' ? 'line' : 
                       currentType === 'line' ? 'pie' : 
                       currentType === 'pie' ? 'doughnut' : 'bar';
        
        chart.config.type = newType;
        chart.update();
    }

    exportChart(chartId) {
        const chart = this.charts[chartId];
        if (!chart) return;
        
        const image = chart.toBase64Image();
        const link = document.createElement('a');
        link.href = image;
        link.download = `${chartId}-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
        
        showNotification('Chart exported as image', 'success');
    }

    refreshAnalytics() {
        showNotification('Refreshing analytics...', 'info');
        this.updateAnalytics();
        setTimeout(() => {
            showNotification('Analytics updated', 'success');
        }, 1000);
    }
}

// Global analytics instance
let analyticsManager;

// Initialize analytics when page loads
document.addEventListener('DOMContentLoaded', function() {
    analyticsManager = new AnalyticsManager();
});

// Global functions for HTML event handlers
function updateAnalytics() {
    if (analyticsManager) {
        analyticsManager.updateAnalytics();
    }
}

function refreshAnalytics() {
    if (analyticsManager) {
        analyticsManager.refreshAnalytics();
    }
}

function toggleChartView(chartId) {
    if (analyticsManager) {
        analyticsManager.toggleChartView(chartId);
    }
}

function exportChart(chartId) {
    if (analyticsManager) {
        analyticsManager.exportChart(chartId);
    }
}

function recalculateSettlements() {
    if (analyticsManager) {
        analyticsManager.updateSettlements();
        showNotification('Settlements recalculated', 'success');
    }
}

function refreshInsights() {
    if (analyticsManager) {
        analyticsManager.updateInsights();
        showNotification('Insights refreshed', 'success');
    }
}

function exportAnalyticsReport() {
    document.getElementById('exportModal').style.display = 'flex';
}

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

function performAnalyticsExport() {
    const exportType = document.querySelector('input[name="exportType"]:checked').value;
    const exportFormat = document.getElementById('exportFormat').value;
    
    // Simulate export process
    showNotification(`Exporting ${exportType} report as ${exportFormat}...`, 'info');
    
    setTimeout(() => {
        showNotification('Report exported successfully', 'success');
        closeExportModal();
    }, 2000);
}

function shareAnalytics() {
    const totals = analyticsManager?.analyticsData.totals;
    if (!totals) return;
    
    let shareText = `📊 Hostel Bill Analytics\n\n`;
    shareText += `Total Spent: ₹${totals.totalSpent.toFixed(2)}\n`;
    shareText += `Total Bills: ${totals.totalBills}\n`;
    shareText += `Average per Bill: ₹${totals.avgPerBill.toFixed(2)}\n\n`;
    shareText += `Shared via Hostel Bill Manager Pro`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Bill Analytics',
            text: shareText
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Analytics copied to clipboard!', 'success');
        });
    }
}

// Utility functions
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

function getCategoryColor(category) {
    const colors = {
        'food': '#EF4444',
        'groceries': '#10B981',
        'utilities': '#F59E0B',
        'rent': '#6366F1',
        'transport': '#8B5CF6',
        'entertainment': '#EC4899',
        'other': '#6B7280'
    };
    return colors[category] || '#6366F1';
}
