/**
 * GridLayoutManager handles layout organization and positioning logic
 * Manages card positions, rows, and layout transformations
 */

import { GRID_CONFIG } from './grid-utils.js';

export class GridLayoutManager {
    /**
     * Initialize the layout manager
     * @param {number} maxCardsPerRow - Maximum cards per row
     */
    constructor(maxCardsPerRow = GRID_CONFIG.DEFAULT_MAX_CARDS_PER_ROW) {
        this.maxCardsPerRow = maxCardsPerRow;
    }

    /**
     * Initialize layout: fill from top down, each row up to maxCardsPerRow
     * @param {Object} cards - Card elements indexed by ID
     * @returns {Array} Initial layout configuration
     */
    initLayout(cards) {
        const cardIds = Object.keys(cards);
        const layout = [];
        let row = 0, col = 0;
        
        for (const id of cardIds) {
            layout.push({ id, row, col });
            col++;
            if (col >= this.maxCardsPerRow) {
                row++;
                col = 0;
            }
        }
        return layout;
    }

    /**
     * Fix existing layout to respect current maxCardsPerRow
     * @param {Array} layout - Current layout
     * @returns {Array} Fixed layout
     */
    fixLayoutForMaxCards(layout) {
        const cardIds = layout.map(pos => pos.id);
        const newLayout = [];
        let row = 0, col = 0;
        
        for (const id of cardIds) {
            newLayout.push({ id, row, col });
            col++;
            if (col >= this.maxCardsPerRow) {
                row++;
                col = 0;
            }
        }
        return newLayout;
    }

    /**
     * Update maxCardsPerRow and reorganize layout
     * @param {number} newMaxCards - New maximum cards per row
     * @param {Array} currentLayout - Current layout
     * @returns {Array} Updated layout
     */
    updateMaxCardsPerRow(newMaxCards, currentLayout) {
        if (newMaxCards !== this.maxCardsPerRow) {
            this.maxCardsPerRow = newMaxCards;
            return this.fixLayoutForMaxCards(currentLayout);
        }
        return currentLayout;
    }

    /**
     * Clean up empty rows and reindex - preserve all cards
     * @param {Array} layout - Current layout
     * @returns {Array} Cleaned layout
     */
    cleanupLayout(layout) {
        // Get all unique card IDs from current layout
        const allCardIds = [...new Set(layout.map(pos => pos.id))];
        
        // Build rows from layout
        const rows = this.getRowsFromLayout(layout);
        const newLayout = [];
        
        // Add cards from organized rows
        rows.forEach((row, rowIndex) => {
            row.forEach((cardId, colIndex) => {
                if (cardId && allCardIds.includes(cardId)) {
                    newLayout.push({ id: cardId, row: rowIndex, col: colIndex });
                }
            });
        });
        
        // Check for any missing cards and add them at the end
        const processedIds = new Set(newLayout.map(pos => pos.id));
        const missingIds = allCardIds.filter(id => !processedIds.has(id));
        
        if (missingIds.length > 0) {
            let nextRow = rows.length;
            let nextCol = 0;
            
            missingIds.forEach(cardId => {
                newLayout.push({ id: cardId, row: nextRow, col: nextCol });
                nextCol++;
                if (nextCol >= this.maxCardsPerRow) {
                    nextRow++;
                    nextCol = 0;
                }
            });
        }
        
        return newLayout;
    }

    /**
     * Get rows from layout for rendering
     * @param {Array} layout - Current layout
     * @returns {Array} Array of rows, each containing card IDs
     */
    getRowsFromLayout(layout) {
        const rows = [];
        for (const pos of layout) {
            if (!rows[pos.row]) rows[pos.row] = [];
            rows[pos.row][pos.col] = pos.id;
        }
        return rows.map(row => row.filter(id => id)).filter(row => row.length > 0);
    }

    /**
     * Move card to a new position with proper layout management
     * @param {Array} layout - Current layout
     * @param {string} cardId - ID of card to move
     * @param {number} newRow - Target row
     * @param {number} newCol - Target column
     * @param {boolean} isRowSeparator - Is this a row separator move
     * @param {boolean} insertNewRow - Should insert a new row
     * @param {boolean} isReorder - Is this a reorder within same row
     * @returns {Array} Updated layout
     */
    moveCard(layout, cardId, newRow, newCol, isRowSeparator = false, insertNewRow = false, isReorder = false) {
        // Find and validate current position
        const currentPos = layout.find(pos => pos.id === cardId);
        if (!currentPos) {
            return layout;
        }
        
        // Create a safe copy of the layout for manipulation
        let newLayout = layout.filter(pos => pos.id !== cardId);
        
        // Validate target row capacity unless creating new row or reordering same row
        if (!insertNewRow && !isRowSeparator && !(isReorder && currentPos.row === newRow)) {
            const targetRowCards = newLayout.filter(pos => pos.row === newRow);
            if (targetRowCards.length >= this.maxCardsPerRow) {
                // Row is full, cannot add more cards
                return layout;
            }
        }
        
        // Handle different move types
        if (insertNewRow || isRowSeparator) {
            // Insert new row: shift all rows at/after newRow down by 1
            newLayout.forEach(pos => {
                if (pos.row >= newRow) {
                    pos.row++;
                }
            });
            // Insert card at the beginning of the new row
            newLayout.push({ id: cardId, row: newRow, col: 0 });
        } else if (isReorder && currentPos.row === newRow) {
            // Reordering within the same row - use simpler logic
            const rowCards = newLayout.filter(pos => pos.row === newRow).sort((a, b) => a.col - b.col);
            
            // Clamp newCol to valid range
            newCol = Math.max(0, Math.min(newCol, rowCards.length));
            
            // Rebuild the row with the card inserted at the new position
            const otherCards = rowCards.map(pos => pos.id);
            otherCards.splice(newCol, 0, cardId);
            
            // Remove old row positions
            newLayout = newLayout.filter(pos => pos.row !== newRow);
            
            // Add back with correct positions
            otherCards.forEach((id, index) => {
                newLayout.push({ id, row: newRow, col: index });
            });
        } else {
            // Normal insertion into a different row
            // Shift cards in target row to make space
            newLayout.forEach(pos => {
                if (pos.row === newRow && pos.col >= newCol) {
                    pos.col++;
                    // Handle overflow to next row
                    if (pos.col >= this.maxCardsPerRow) {
                        pos.row++;
                        pos.col = 0;
                    }
                }
            });
            // Insert the card
            newLayout.push({ id: cardId, row: newRow, col: newCol });
        }
        
        return this.cleanupLayout(newLayout);
    }
}