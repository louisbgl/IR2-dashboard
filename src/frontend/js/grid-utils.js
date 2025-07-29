/**
 * Grid utilities and constants
 * Shared configuration and helper functions for the dashboard grid
 */

// Grid configuration constants
export const GRID_CONFIG = {
    CARD_WIDTH: 680,
    CARD_HEIGHT: 320,
    CARD_GAP: 20,
    DRAG_THRESHOLD: 5,
    DEFAULT_MAX_CARDS_PER_ROW: 2,
    ANIMATION_DURATION: 400,
    RESIZE_DEBOUNCE: 100
};

// Transition easing functions
export const EASING = {
    SMOOTH: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    CARD_TRANSITION: 'cubic-bezier(0.4, 0, 0.2, 1)',
    BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};

/**
 * Calculates the distance between two points
 * @param {number} x1 - First point x coordinate
 * @param {number} y1 - First point y coordinate
 * @param {number} x2 - Second point x coordinate
 * @param {number} y2 - Second point y coordinate
 * @returns {number} Distance between the points
 */
export function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Checks if a position has changed significantly
 * @param {Object} pos1 - First position {x, y}
 * @param {Object} pos2 - Second position {x, y}
 * @param {number} threshold - Minimum change threshold (default: 5)
 * @returns {boolean} True if position changed significantly
 */
export function hasPositionChanged(pos1, pos2, threshold = 5) {
    return Math.abs(pos1.x - pos2.x) > threshold || Math.abs(pos1.y - pos2.y) > threshold;
}

/**
 * Clamps a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Generates a unique ID for grid elements
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'grid') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}