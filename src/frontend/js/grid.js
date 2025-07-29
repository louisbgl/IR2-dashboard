/**
 * DashboardGrid - Main coordinator for drag-and-drop dashboard layout
 * Orchestrates layout management, drag & drop, visual effects, and rendering
 */

import { GRID_CONFIG, debounce } from './grid-utils.js';
import { GridLayoutManager } from './grid-layout.js';
import { GridVisualEffectsManager } from './grid-visual-effects.js';
import { GridDropCalculator } from './grid-drop-calculator.js';
import { GridDragDropHandler } from './grid-drag-drop.js';
import { GridRenderer } from './grid-renderer.js';

export class DashboardGrid {
    /**
     * Initialize the dashboard grid
     * @param {HTMLElement} container - Container element for the grid
     * @param {Object} cards - Card elements indexed by ID
     * @param {Array} layout - Initial layout configuration
     * @param {Function} onLayoutChange - Callback when layout changes
     * @param {number} maxCardsPerRow - Maximum cards per row (default: 2)
     */
    constructor(container, cards, layout, onLayoutChange, maxCardsPerRow = GRID_CONFIG.DEFAULT_MAX_CARDS_PER_ROW) {
        this.container = container;
        this.cards = cards;
        this.onLayoutChange = onLayoutChange;
        
        // Initialize managers
        this.layoutManager = new GridLayoutManager(maxCardsPerRow);
        this.visualEffects = new GridVisualEffectsManager(container);
        this.dropCalculator = new GridDropCalculator(container, maxCardsPerRow);
        this.renderer = new GridRenderer(container, this.visualEffects);
        this.dragDropHandler = new GridDragDropHandler(container, this.visualEffects, this.dropCalculator);
        
        // Initialize layout
        this.layout = layout ? this.layoutManager.fixLayoutForMaxCards(layout) : this.layoutManager.initLayout(cards);
        
        // Set up drag and drop callbacks
        this.dragDropHandler.setDropPositionChangeCallback((clientX, clientY) => {
            this.handleDropPositionChange(clientX, clientY);
        });
        
        // Add resize listener with debouncing
        this.handleResize = debounce(() => {
            this.render();
        }, GRID_CONFIG.RESIZE_DEBOUNCE);
        
        window.addEventListener('resize', this.handleResize);
        
        // Initial render
        this.render();
    }

    /**
     * Get current maximum cards per row
     * @returns {number} Maximum cards per row
     */
    get maxCardsPerRow() {
        return this.layoutManager.maxCardsPerRow;
    }

    /**
     * Update maxCardsPerRow and reorganize layout
     * @param {number} newMaxCards - New maximum cards per row
     */
    updateMaxCardsPerRow(newMaxCards) {
        const updatedLayout = this.layoutManager.updateMaxCardsPerRow(newMaxCards, this.layout);
        if (updatedLayout !== this.layout) {
            this.layout = updatedLayout;
            this.dropCalculator.updateMaxCardsPerRow(newMaxCards);
            this.render();
            if (this.onLayoutChange) {
                this.onLayoutChange(this.layout);
            }
        }
    }

    /**
     * Handle drop position changes during drag
     * @param {number} clientX - Mouse X position
     * @param {number} clientY - Mouse Y position
     */
    handleDropPositionChange(clientX, clientY) {
        const dropPos = this.dropCalculator.findDropPosition(
            clientX, 
            clientY, 
            this.layout, 
            this.dragDropHandler.getDraggedCard(),
            (layout) => this.layoutManager.getRowsFromLayout(layout)
        );
        
        if (dropPos) {
            if (dropPos.insertNewRow) {
                this.visualEffects.highlightNewRowInsertion(dropPos.row);
            } else {
                this.visualEffects.highlightTargetRow(dropPos.row);
            }
        } else {
            this.visualEffects.clearRowHighlight();
        }
    }

    /**
     * Handle card move completion
     * @param {number} clientX - Mouse X position
     * @param {number} clientY - Mouse Y position
     * @param {Object} draggedCard - Dragged card information
     */
    handleCardMove = (clientX, clientY, draggedCard) => {
        const dropPos = this.dropCalculator.findDropPosition(
            clientX, 
            clientY, 
            this.layout, 
            draggedCard,
            (layout) => this.layoutManager.getRowsFromLayout(layout)
        );
        
        if (dropPos && this.dropCalculator.isValidDropPosition(dropPos, this.layout, draggedCard)) {
            const newLayout = this.layoutManager.moveCard(
                this.layout,
                draggedCard.id,
                dropPos.row,
                dropPos.col,
                dropPos.isRowSeparator,
                dropPos.insertNewRow,
                dropPos.isReorder
            );
            
            if (newLayout !== this.layout) {
                this.layout = newLayout;
                this.render();
                if (this.onLayoutChange) {
                    this.onLayoutChange(this.layout);
                }
            }
        }
    }

    /**
     * Get rows from current layout for rendering
     * @returns {Array} Array of rows containing card IDs
     */
    getRowsFromLayout() {
        return this.layoutManager.getRowsFromLayout(this.layout);
    }

    /**
     * Render the complete grid
     */
    render() {
        const rows = this.getRowsFromLayout();
        const isDragging = this.dragDropHandler.isDraggingCard();
        
        this.renderer.render(
            rows, 
            this.cards, 
            this.dragDropHandler, 
            this.handleCardMove,
            isDragging
        );
    }

    /**
     * Clean up and destroy the grid
     */
    destroy() {
        window.removeEventListener('resize', this.handleResize);
        this.dragDropHandler.destroy();
        this.visualEffects.clearRowHighlight();
        this.renderer.clear();
    }

    /**
     * Add a new card to the grid
     * @param {string} cardId - ID of the new card
     * @param {HTMLElement} cardElement - Card element
     */
    addCard(cardId, cardElement) {
        this.cards[cardId] = cardElement;
        
        // Add to layout at the end
        const rows = this.getRowsFromLayout();
        let lastRow = rows.length > 0 ? rows.length - 1 : 0;
        let lastCol = rows.length > 0 ? rows[rows.length - 1].length : 0;
        
        if (lastCol >= this.maxCardsPerRow) {
            lastRow++;
            lastCol = 0;
        }
        
        this.layout.push({ id: cardId, row: lastRow, col: lastCol });
        this.render();
        
        if (this.onLayoutChange) {
            this.onLayoutChange(this.layout);
        }
    }

    /**
     * Remove a card from the grid
     * @param {string} cardId - ID of the card to remove
     */
    removeCard(cardId) {
        delete this.cards[cardId];
        this.layout = this.layout.filter(pos => pos.id !== cardId);
        this.layout = this.layoutManager.cleanupLayout(this.layout);
        this.render();
        
        if (this.onLayoutChange) {
            this.onLayoutChange(this.layout);
        }
    }

    /**
     * Get current layout
     * @returns {Array} Current layout configuration
     */
    getLayout() {
        return [...this.layout];
    }

    /**
     * Set new layout
     * @param {Array} newLayout - New layout configuration
     */
    setLayout(newLayout) {
        this.layout = this.layoutManager.fixLayoutForMaxCards(newLayout);
        this.render();
        
        if (this.onLayoutChange) {
            this.onLayoutChange(this.layout);
        }
    }
}