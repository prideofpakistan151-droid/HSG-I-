// Enhanced Theme Management with System Preference Detection

class ThemeManager {
    constructor() {
        this.settings = getSettings();
        this.currentTheme = this.settings.theme || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeListeners();
        this.updateThemeIcon();
    }

    applyTheme(theme) {
        let actualTheme = theme;
        
        // Handle auto theme
        if (theme === 'auto') {
            actualTheme = this.getSystemTheme();
        }

        // Remove all theme classes
        document.body.classList.remove('light-theme', 'dark-theme');
        
        // Add current theme class
        document.body.classList.add(`${actualTheme}-theme`);
        
        // Update meta theme-color
        this.updateMetaThemeColor(actualTheme);
        
        // Update current theme
        this.currentTheme = theme;
        
        // Save to settings
        this.settings.theme = theme;
        saveSettings(this.settings);
        
        // Dispatch theme change event
        this.dispatchThemeChange(actualTheme);
    }

    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    setupThemeListeners() {
        // Listen for system theme changes
        if (window.matchMedia) {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.mediaQuery.addEventListener('change', (e) => {
                if (this.currentTheme === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }

        // Listen for storage changes (other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'hostelBillSettings') {
                try {
                    const newSettings = JSON.parse(e.newValue);
                    if (newSettings.theme !== this.currentTheme) {
                        this.applyTheme(newSettings.theme);
                    }
                } catch (error) {
                    console.error('Error parsing settings from storage:', error);
                }
            }
        });
    }

    updateMetaThemeColor(theme) {
        let themeColor = '#6366F1'; // Default primary color
        
        if (theme === 'dark') {
            themeColor = '#1E293B'; // Dark background
        }

        // Update or create meta theme-color tag
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.content = themeColor;

        // Update Apple mobile web app status bar
        let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (!appleMeta) {
            appleMeta = document.createElement('meta');
            appleMeta.name = 'apple-mobile-web-app-status-bar-style';
            document.head.appendChild(appleMeta);
        }
        appleMeta.content = theme === 'dark' ? 'black-translucent' : 'default';
    }

    updateThemeIcon() {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            const actualTheme = this.currentTheme === 'auto' ? this.getSystemTheme() : this.currentTheme;
            themeIcon.textContent = actualTheme === 'light' ? '🌙' : '☀️';
        }

        // Update theme selector if it exists
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = this.currentTheme;
        }
    }

    toggleTheme() {
        const themes = ['light', 'dark', 'auto'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        this.applyTheme(nextTheme);
        this.updateThemeIcon();
        
        // Show theme change notification
        const themeNames = {
            'light': 'Light',
            'dark': 'Dark',
            'auto': 'Auto (System)'
        };
        
        showNotification(`${themeNames[nextTheme]} theme enabled`, 'success');
    }

    dispatchThemeChange(theme) {
        const event = new CustomEvent('themechange', {
            detail: { theme }
        });
        window.dispatchEvent(event);
    }

    // Method to check if reduced motion is preferred
    isReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
               this.settings.appearance?.reducedMotion === true;
    }

    // Method to check if high contrast is preferred
    isHighContrast() {
        return window.matchMedia('(prefers-contrast: high)').matches ||
               this.settings.appearance?.highContrast === true;
    }

    // Apply accessibility features based on preferences
    applyAccessibilityFeatures() {
        if (this.isReducedMotion()) {
            document.documentElement.style.setProperty('--transition', 'none');
            document.documentElement.style.setProperty('--transition-slow', 'none');
            document.documentElement.style.setProperty('--transition-bounce', 'none');
        }

        if (this.isHighContrast()) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    }
}

// Initialize theme manager
let themeManager;

function initTheme() {
    themeManager = new ThemeManager();
    return themeManager;
}

function toggleTheme() {
    if (themeManager) {
        themeManager.toggleTheme();
    } else {
        initTheme().toggleTheme();
    }
}

function changeTheme(theme) {
    if (themeManager) {
        themeManager.applyTheme(theme);
        themeManager.updateThemeIcon();
    } else {
        initTheme().applyTheme(theme);
    }
}

// Listen for reduced motion preferences
if (window.matchMedia) {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', () => {
        if (themeManager) {
            themeManager.applyAccessibilityFeatures();
        }
    });

    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastQuery.addEventListener('change', () => {
        if (themeManager) {
            themeManager.applyAccessibilityFeatures();
        }
    });
}

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ThemeManager,
        initTheme,
        toggleTheme,
        changeTheme
    };
}
