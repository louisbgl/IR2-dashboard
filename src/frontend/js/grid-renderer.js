/**
 * GridRenderer handles DOM manipulation and card rendering
 * Manages the visual presentation and smooth transitions of the grid
 */

import { GRID_CONFIG, hasPositionChanged, EASING } from './grid-utils.js';

export class GridRenderer {
    /**
     * Initialize the renderer
     * @param {HTMLElement} container - Grid container element
     * @param {GridVisualEffectsManager} visualEffects - Visual effects manager
     */
    constructor(container, visualEffects) {
        this.container = container;
        this.visualEffects = visualEffects;
    }

    /**
     * Store current positions before re-rendering for smooth transitions
     * @returns {Map<string, Object>} Map of card IDs to positions
     */
    storeCurrentPositions() {
        const previousPositions = new Map();
        const existingCells = this.container.querySelectorAll('.dashboard-cell');
        
        existingCells.forEach(cell => {
            const cardId = cell.getAttribute('data-card-id');
            const rect = cell.getBoundingClientRect();
            const containerRect = this.container.getBoundingClientRect();
            previousPositions.set(cardId, {
                x: rect.left - containerRect.left,
                y: rect.top - containerRect.top
            });
        });
        
        return previousPositions;
    }

    /**
     * Render the complete grid
     * @param {Array} rows - Array of rows containing card IDs
     * @param {Object} cards - Card elements indexed by ID
     * @param {GridDragDropHandler} dragDropHandler - Drag drop handler
     * @param {Function} onCardMove - Callback when card is moved
     * @param {boolean} isDragging - Whether currently dragging
     */
    render(rows, cards, dragDropHandler, onCardMove, isDragging = false) {
        // Store current positions before re-rendering for smooth transitions
        const previousPositions = this.storeCurrentPositions();
        
        // Clear container
        this.container.innerHTML = '';
        
        // Render each row
        rows.forEach((cardsInRow, rowIndex) => {
            const rowDiv = this.createRow(rowIndex);
            
            cardsInRow.forEach((cardId, colIndex) => {
                const card = cards[cardId];
                if (!card) return;
                
                const cellDiv = this.createCardCell(cardId, rowIndex, colIndex, card);
                rowDiv.appendChild(cellDiv);
                
                // Initialize drag and drop for this cell
                dragDropHandler.initializeDragDrop(cellDiv, onCardMove);
                
                // Apply smooth transition if card moved
                this.applyTransitionIfMoved(cellDiv, cardId, previousPositions, isDragging);
            });
            
            this.container.appendChild(rowDiv);
        });
    }

    /**
     * Create a row element
     * @param {number} rowIndex - Row index
     * @returns {HTMLElement} Row element
     */
    createRow(rowIndex) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'dashboard-row';
        
        rowDiv.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            gap: ${GRID_CONFIG.CARD_GAP}px;
            margin-bottom: 40px;
            min-height: ${GRID_CONFIG.CARD_HEIGHT}px;
            width: 100%;
            transition: all 0.3s ${EASING.CARD_TRANSITION};
        `;
        
        return rowDiv;
    }

    /**
     * Create a card cell element
     * @param {string} cardId - Card ID
     * @param {number} rowIndex - Row index
     * @param {number} colIndex - Column index
     * @param {HTMLElement|string} card - Card element or HTML string
     * @returns {HTMLElement} Card cell element
     */
    createCardCell(cardId, rowIndex, colIndex, card) {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'dashboard-cell';
        cellDiv.style.cssText = `
            width: ${GRID_CONFIG.CARD_WIDTH}px;
            height: ${GRID_CONFIG.CARD_HEIGHT}px;
            cursor: grab;
            transition: all ${GRID_CONFIG.ANIMATION_DURATION}ms ${EASING.SMOOTH};
            transform-origin: center;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
        `;
        
        cellDiv.setAttribute('data-card-id', cardId);
        cellDiv.setAttribute('data-row', rowIndex);
        cellDiv.setAttribute('data-col', colIndex);
        
        // Add card content to cell
        this.addCardToCell(cellDiv, card);
        
        return cellDiv;
    }

    /**
     * Add card content to a cell
     * @param {HTMLElement} cellDiv - Cell element
     * @param {HTMLElement|string} card - Card element or HTML string
     */
    addCardToCell(cellDiv, card) {
        if (card instanceof HTMLElement) {
            cellDiv.appendChild(card);
        } else if (typeof card === 'string') {
            const cardElem = document.createElement('div');
            cardElem.innerHTML = card;
            cellDiv.appendChild(cardElem);
        }
    }

    /**
     * Apply smooth transition animation if card position changed
     * @param {HTMLElement} cellDiv - Card cell element
     * @param {string} cardId - Card ID
     * @param {Map} previousPositions - Map of previous positions
     * @param {boolean} isDragging - Whether currently dragging
     */
    applyTransitionIfMoved(cellDiv, cardId, previousPositions, isDragging) {
        const previousPos = previousPositions.get(cardId);
        if (previousPos && !isDragging) {
            // Wait for the next frame to get accurate positioning
            requestAnimationFrame(() => {
                const newRect = cellDiv.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();
                const newPos = {
                    x: newRect.left - containerRect.left,
                    y: newRect.top - containerRect.top
                };
                
                // Apply transition animation if position changed significantly
                if (hasPositionChanged(previousPos, newPos)) {
                    this.visualEffects.animateCardTransition(
                        cellDiv, 
                        previousPos, 
                        newPos, 
                        GRID_CONFIG.ANIMATION_DURATION
                    );
                }
            });
        }
    }

    /**
     * Update a single card's position without full re-render
     * @param {string} cardId - Card ID to update
     * @param {number} newRow - New row index
     * @param {number} newCol - New column index
     */
    updateCardPosition(cardId, newRow, newCol) {
        const cellDiv = this.container.querySelector(`[data-card-id="${cardId}"]`);
        if (cellDiv) {
            cellDiv.setAttribute('data-row', newRow);
            cellDiv.setAttribute('data-col', newCol);
        }
    }

    /**
     * Get current card positions for external use
     * @returns {Map<string, Object>} Map of card IDs to position info
     */
    getCurrentCardPositions() {
        const positions = new Map();
        const cells = this.container.querySelectorAll('.dashboard-cell');
        
        cells.forEach(cell => {
            const cardId = cell.getAttribute('data-card-id');
            const row = parseInt(cell.getAttribute('data-row'));
            const col = parseInt(cell.getAttribute('data-col'));
            const rect = cell.getBoundingClientRect();
            
            positions.set(cardId, {
                row,
                col,
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            });
        });
        
        return positions;
    }

    /**
     * Clear the grid container
     */
    clear() {
        this.container.innerHTML = '';
    }

    /**
     * Add a CSS class to all card cells
     * @param {string} className - CSS class to add
     */
    addClassToAllCells(className) {
        const cells = this.container.querySelectorAll('.dashboard-cell');
        cells.forEach(cell => cell.classList.add(className));
    }

    /**
     * Remove a CSS class from all card cells
     * @param {string} className - CSS class to remove
     */
    removeClassFromAllCells(className) {
        const cells = this.container.querySelectorAll('.dashboard-cell');
        cells.forEach(cell => cell.classList.remove(className));
    }
}