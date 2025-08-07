/**
 * Responsive Detection Utility
 * Detects mobile devices and screen orientations
 */

/**
 * Detects if the current device should be treated as mobile
 * Based on viewport width and orientation
 * @returns {boolean} True if device should show mobile message
 */
export function isMobileDevice() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Mobile if width <= 768px OR portrait orientation on small screens
    return width <= 768 || 
           (window.matchMedia("(orientation: portrait)").matches && width <= 1024);
}

/**
 * Detects if the screen is in portrait orientation
 * @returns {boolean} True if in portrait mode
 */
export function isPortraitOrientation() {
    return window.matchMedia("(orientation: portrait)").matches;
}

/**
 * Gets the current viewport dimensions
 * @returns {Object} Object with width and height properties
 */
export function getViewportDimensions() {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}

/**
 * Adds a listener for orientation and resize changes
 * @param {Function} callback - Function to call when orientation/size changes
 * @returns {Function} Cleanup function to remove listeners
 */
export function addResponsiveListener(callback) {
    const handleChange = () => {
        callback({
            isMobile: isMobileDevice(),
            isPortrait: isPortraitOrientation(),
            viewport: getViewportDimensions()
        });
    };
    
    window.addEventListener('resize', handleChange);
    window.addEventListener('orientationchange', handleChange);
    
    // Return cleanup function
    return () => {
        window.removeEventListener('resize', handleChange);
        window.removeEventListener('orientationchange', handleChange);
    };
}