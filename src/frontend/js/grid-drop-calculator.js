/**
 * GridDropCalculator handles complex drop position detection logic
 * Determines where cards should be placed during drag and drop operations
 */

export class GridDropCalculator {
    /**
     * Initialize the drop calculator
     * @param {HTMLElement} container - Grid container element
     * @param {number} maxCardsPerRow - Maximum cards per row
     */
    constructor(container, maxCardsPerRow) {
        this.container = container;
        this.maxCardsPerRow = maxCardsPerRow;
    }

    /**
     * Update maxCardsPerRow setting
     * @param {number} newMaxCards - New maximum cards per row
     */
    updateMaxCardsPerRow(newMaxCards) {
        this.maxCardsPerRow = newMaxCards;
    }

    /**
     * Get card positions within a row for drag and drop calculations
     * @param {HTMLElement} rowElement - The row element
     * @returns {Array<Object>} Array of position objects with left, right, center
     */
    getCardPositionsInRow(rowElement) {
        const cells = rowElement.querySelectorAll('.dashboard-cell');
        const positions = [];
        
        cells.forEach(cell => {
            const rect = cell.getBoundingClientRect();
            positions.push({
                left: rect.left,
                right: rect.right,
                center: rect.left + rect.width / 2,
                width: rect.width
            });
        });
        
        return positions;
    }

    /**
     * Enhanced drop position detection with visual feedback
     * @param {number} clientX - Mouse X position
     * @param {number} clientY - Mouse Y position
     * @param {Array} layout - Current layout
     * @param {Object} draggedCard - Currently dragged card info
     * @param {Function} getRowsFromLayout - Function to get rows from layout
     * @returns {Object|null} Drop position information or null
     */
    findDropPosition(clientX, clientY, layout, draggedCard, getRowsFromLayout) {
        const rows = this.container.querySelectorAll('.dashboard-row');
        
        // Check for row insertion between existing rows
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const rowRect = row.getBoundingClientRect();
            
            // Check for insertion above this row (row separator)
            if (rowIndex === 0 && clientY < rowRect.top && clientY > rowRect.top - 40) {
                return { 
                    row: 0, 
                    col: 0, 
                    isRowSeparator: true,
                    insertNewRow: true
                };
            }
            
            // Check for insertion between rows
            if (rowIndex > 0) {
                const prevRow = rows[rowIndex - 1];
                const prevRowRect = prevRow.getBoundingClientRect();
                const midPoint = (prevRowRect.bottom + rowRect.top) / 2;
                
                if (clientY > prevRowRect.bottom && clientY < rowRect.top && 
                    Math.abs(clientY - midPoint) < 25) {
                    return { 
                        row: rowIndex, 
                        col: 0, 
                        isRowSeparator: true,
                        insertNewRow: true
                    };
                }
            }
            
            // Check for insertion within this row
            if (clientY >= rowRect.top - 20 && clientY <= rowRect.bottom + 20) {
                const currentRowCards = getRowsFromLayout(layout)[rowIndex] || [];
                
                if (currentRowCards.length === 0) {
                    // Empty row
                    return { 
                        row: rowIndex, 
                        col: 0,
                        isNewRow: false
                    };
                } else if (currentRowCards.length < this.maxCardsPerRow) {
                    // Row has space - check if dragged card is from a different row
                    const draggedCardRow = layout.find(pos => pos.id === draggedCard?.id)?.row;
                    const hasSpaceForNewCard = draggedCardRow !== rowIndex || currentRowCards.length < this.maxCardsPerRow - 1;
                    
                    if (hasSpaceForNewCard) {
                        // Get actual card positions in this row
                        const positions = this.getCardPositionsInRow(row);
                        
                        // Find best insertion point
                        for (let i = 0; i <= currentRowCards.length; i++) {
                            let shouldInsert = false;
                            
                            if (i === 0) {
                                // Before first card
                                shouldInsert = positions.length === 0 || clientX < positions[0].center;
                            } else if (i === currentRowCards.length) {
                                // After last card
                                shouldInsert = positions.length === 0 || clientX > positions[positions.length - 1].center;
                            } else {
                                // Between cards
                                const leftCenter = positions[i - 1].center;
                                const rightCenter = positions[i].center;
                                const midpoint = (leftCenter + rightCenter) / 2;
                                shouldInsert = clientX >= leftCenter && clientX <= rightCenter && clientX > midpoint;
                            }
                            
                            if (shouldInsert) {
                                return { 
                                    row: rowIndex, 
                                    col: i,
                                    isNewRow: false
                                };
                            }
                        }
                    }
                } else {
                    // Row is full - allow reordering
                    const positions = this.getCardPositionsInRow(row);
                    
                    for (let i = 0; i < positions.length; i++) {
                        const pos = positions[i];
                        
                        if (clientX >= pos.left && clientX <= pos.right) {
                            // Determine if we're closer to left or right side
                            const isLeftHalf = clientX < pos.center;
                            const insertCol = isLeftHalf ? i : Math.min(i + 1, this.maxCardsPerRow);
                            
                            return { 
                                row: rowIndex, 
                                col: insertCol,
                                isReorder: true
                            };
                        }
                    }
                    
                    // Fallback: insert at end if past all cards
                    if (positions.length > 0 && clientX > positions[positions.length - 1].right) {
                        return { 
                            row: rowIndex, 
                            col: this.maxCardsPerRow,
                            isReorder: true
                        };
                    }
                }
            }
        }
        
        // Check for new row at the end
        if (rows.length > 0) {
            const lastRow = rows[rows.length - 1];
            const lastRowRect = lastRow.getBoundingClientRect();
            if (clientY > lastRowRect.bottom + 10) {
                return { 
                    row: rows.length, 
                    col: 0,
                    isNewRow: true,
                    insertNewRow: true
                };
            }
        } else {
            // First card in empty container
            return { 
                row: 0, 
                col: 0,
                isNewRow: true 
            };
        }
        
        return null;
    }

    /**
     * Validate if a drop position is valid
     * @param {Object} dropPos - Drop position information
     * @param {Array} layout - Current layout
     * @param {Object} draggedCard - Currently dragged card info
     * @returns {boolean} True if drop position is valid
     */
    isValidDropPosition(dropPos, layout, draggedCard) {
        if (!dropPos || !draggedCard) {
            return false;
        }

        // Always allow new row creation
        if (dropPos.insertNewRow || dropPos.isNewRow) {
            return true;
        }

        // Check if target row has space
        const targetRowCards = layout.filter(pos => pos.row === dropPos.row);
        const draggedCardCurrentRow = layout.find(pos => pos.id === draggedCard.id)?.row;
        
        // If moving within same row, always allow
        if (draggedCardCurrentRow === dropPos.row) {
            return true;
        }

        // Check if target row has space for a new card
        return targetRowCards.length < this.maxCardsPerRow;
    }
}