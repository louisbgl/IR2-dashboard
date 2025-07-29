/**
 * GridDragDropHandler manages all drag and drop interactions
 * Handles mouse events, drag thresholds, and drag state management
 */

import { GRID_CONFIG, calculateDistance } from './grid-utils.js';

export class GridDragDropHandler {
    /**
     * Initialize the drag and drop handler
     * @param {HTMLElement} container - Grid container element
     * @param {GridVisualEffectsManager} visualEffects - Visual effects manager
     * @param {GridDropCalculator} dropCalculator - Drop position calculator
     */
    constructor(container, visualEffects, dropCalculator) {
        this.container = container;
        this.visualEffects = visualEffects;
        this.dropCalculator = dropCalculator;
        
        // Drag state
        this.draggedCard = null;
        this.dragPreview = null;
        this.isDragging = false;
        this.dragThreshold = GRID_CONFIG.DRAG_THRESHOLD;
        
        // Bind methods
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    /**
     * Initialize drag and drop for a card cell
     * @param {HTMLElement} cellDiv - Card cell element
     * @param {Function} onCardMove - Callback when card is moved
     */
    initializeDragDrop(cellDiv, onCardMove) {
        this.onCardMove = onCardMove;
        
        // Add drag event listeners
        cellDiv.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // Apply hover effects
        this.visualEffects.applyHoverEffect(cellDiv);
    }

    /**
     * Handle mouse down event to start potential drag
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        if (e.button !== 0) return; // Left mouse button only
        
        // Don't start drag if clicking on interactive elements
        const target = e.target;
        if (target.matches('button, .card-toggle-btn, .card-toggle-btn *, input, select, textarea, a, [contenteditable]')) {
            return; // Let the interactive element handle the click
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        const cell = e.currentTarget;
        const cardId = cell.getAttribute('data-card-id');
        
        this.draggedCard = {
            id: cardId,
            cell: cell,
            startX: e.clientX,
            startY: e.clientY,
            offsetX: e.clientX - cell.getBoundingClientRect().left,
            offsetY: e.clientY - cell.getBoundingClientRect().top
        };
        
        this.isDragging = false;
        
        // Add global event listeners
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        
        // Style the original cell
        this.visualEffects.applyDraggingStyles(cell);
    }

    /**
     * Handle mouse move event during drag
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (!this.draggedCard) return;
        
        // Prevent default to avoid page scrolling
        e.preventDefault();
        
        // Check if we've moved enough to start dragging
        const distance = calculateDistance(
            e.clientX, e.clientY,
            this.draggedCard.startX, this.draggedCard.startY
        );
        
        if (!this.isDragging && distance > this.dragThreshold) {
            this.isDragging = true;
            // Create drag preview only when we actually start dragging
            this.dragPreview = this.visualEffects.createDragPreview(
                this.draggedCard.cell,
                e.clientX,
                e.clientY,
                this.draggedCard.offsetX,
                this.draggedCard.offsetY,
                GRID_CONFIG.CARD_WIDTH,
                GRID_CONFIG.CARD_HEIGHT
            );
        }
        
        if (this.isDragging) {
            // Update drag preview position
            this.visualEffects.updateDragPreview(
                this.dragPreview,
                e.clientX,
                e.clientY,
                this.draggedCard.offsetX,
                this.draggedCard.offsetY
            );
            
            // Find and highlight drop position
            if (this.onDropPositionChange) {
                this.onDropPositionChange(e.clientX, e.clientY);
            }
        }
    }

    /**
     * Handle mouse up event to end drag
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        if (!this.draggedCard) return;
        
        // Prevent default to avoid page scroll jumping
        e.preventDefault();
        e.stopPropagation();
        
        // Only perform move if we actually dragged (not just clicked)
        if (this.isDragging && this.onCardMove) {
            this.onCardMove(e.clientX, e.clientY, this.draggedCard);
        }
        
        // Clean up
        this.cleanupDrag();
    }

    /**
     * Set callback for drop position changes
     * @param {Function} callback - Callback function
     */
    setDropPositionChangeCallback(callback) {
        this.onDropPositionChange = callback;
    }

    /**
     * Check if currently dragging
     * @returns {boolean} True if currently dragging
     */
    isDraggingCard() {
        return this.isDragging && this.draggedCard !== null;
    }

    /**
     * Get currently dragged card info
     * @returns {Object|null} Dragged card info or null
     */
    getDraggedCard() {
        return this.draggedCard;
    }

    /**
     * Clean up drag state and UI
     */
    cleanupDrag() {
        // Remove event listeners
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        // Remove drag preview
        if (this.dragPreview) {
            this.visualEffects.removeDragPreview(this.dragPreview);
            this.dragPreview = null;
        }
        
        // Clear row highlight
        this.visualEffects.clearRowHighlight();
        
        // Reset original cell style
        if (this.draggedCard && this.draggedCard.cell) {
            this.visualEffects.resetCellStyles(this.draggedCard.cell);
        }
        
        this.draggedCard = null;
        this.isDragging = false;
    }

    /**
     * Force cleanup (useful for external cleanup)
     */
    forceCleanup() {
        this.cleanupDrag();
    }

    /**
     * Update drag threshold
     * @param {number} threshold - New drag threshold in pixels
     */
    setDragThreshold(threshold) {
        this.dragThreshold = threshold;
    }

    /**
     * Destroy the drag drop handler
     */
    destroy() {
        this.forceCleanup();
        this.onCardMove = null;
        this.onDropPositionChange = null;
    }
}