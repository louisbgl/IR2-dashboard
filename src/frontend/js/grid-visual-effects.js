/**
 * GridVisualEffectsManager handles visual feedback and animations
 * Manages row highlighting, new row indicators, and visual cues
 */

export class GridVisualEffectsManager {
    /**
     * Initialize the visual effects manager
     * @param {HTMLElement} container - Grid container element
     */
    constructor(container) {
        this.container = container;
        this.currentHighlightedRow = null;
    }

    /**
     * Highlight target row for visual feedback
     * @param {number} rowIndex - Row index to highlight
     */
    highlightTargetRow(rowIndex) {
        // Remove previous highlight
        this.clearRowHighlight();
        
        if (rowIndex >= 0) {
            const rows = this.container.querySelectorAll('.dashboard-row');
            if (rows[rowIndex]) {
                rows[rowIndex].classList.add('drop-target-row');
                this.currentHighlightedRow = rowIndex;
            }
        }
    }

    /**
     * Highlight new row insertion zone
     * @param {number} rowIndex - Row index where new row will be inserted
     */
    highlightNewRowInsertion(rowIndex) {
        // Clear all previous highlights
        this.clearRowHighlight();
        
        // Create or update the new row indicator
        let newRowDiv = this.container.querySelector('.insert-new-row');
        if (!newRowDiv) {
            newRowDiv = document.createElement('div');
            newRowDiv.className = 'dashboard-row insert-new-row';
        }
        
        // Position the indicator
        const rows = this.container.querySelectorAll('.dashboard-row:not(.insert-new-row)');
        if (rowIndex === 0) {
            // Insert at the beginning
            if (rows[0]) {
                this.container.insertBefore(newRowDiv, rows[0]);
            } else {
                this.container.appendChild(newRowDiv);
            }
        } else if (rowIndex < rows.length) {
            // Insert between rows
            rows[rowIndex - 1].insertAdjacentElement('afterend', newRowDiv);
        } else {
            // Insert at the end
            this.container.appendChild(newRowDiv);
        }
    }

    /**
     * Clear all row highlights and indicators
     */
    clearRowHighlight() {
        if (this.currentHighlightedRow !== null) {
            const rows = this.container.querySelectorAll('.dashboard-row');
            if (rows[this.currentHighlightedRow]) {
                rows[this.currentHighlightedRow].classList.remove('drop-target-row');
            }
            this.currentHighlightedRow = null;
        }
        
        // Clear all highlights just in case
        const highlightedRows = this.container.querySelectorAll('.drop-target-row');
        highlightedRows.forEach(row => row.classList.remove('drop-target-row'));
        
        // Remove new row insertion indicators
        const newRowIndicators = this.container.querySelectorAll('.insert-new-row');
        newRowIndicators.forEach(indicator => indicator.remove());
    }

    /**
     * Apply hover effect to a card cell
     * @param {HTMLElement} cellDiv - Card cell element
     */
    applyHoverEffect(cellDiv) {
        cellDiv.addEventListener('mouseenter', () => {
            if (!this.isDraggingCard(cellDiv)) {
                cellDiv.style.transform = 'translateY(-4px) scale(1.02)';
                cellDiv.style.boxShadow = '0 8px 25px rgba(33, 159, 172, 0.15)';
                cellDiv.style.zIndex = '10';
            }
        });

        cellDiv.addEventListener('mouseleave', () => {
            if (!this.isDraggingCard(cellDiv)) {
                cellDiv.style.transform = '';
                cellDiv.style.boxShadow = '';
                cellDiv.style.zIndex = '';
            }
        });
    }

    /**
     * Check if a card is currently being dragged
     * @param {HTMLElement} cellDiv - Card cell element
     * @returns {boolean} True if card is being dragged
     */
    isDraggingCard(cellDiv) {
        return cellDiv.classList.contains('dragging') || cellDiv.style.opacity === '0.4';
    }

    /**
     * Apply smooth transition animation to a card
     * @param {HTMLElement} cellDiv - Card cell element
     * @param {Object} previousPos - Previous position {x, y}
     * @param {Object} newPos - New position {x, y}
     * @param {number} duration - Animation duration in ms
     */
    animateCardTransition(cellDiv, previousPos, newPos, duration = 400) {
        const deltaX = previousPos.x - newPos.x;
        const deltaY = previousPos.y - newPos.y;
        
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            cellDiv.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            cellDiv.classList.add('moving-card');
            
            // Animate to final position
            requestAnimationFrame(() => {
                cellDiv.style.transform = 'translate(0, 0)';
                setTimeout(() => {
                    cellDiv.classList.remove('moving-card');
                    cellDiv.style.transform = ''; // Clean up
                }, duration);
            });
        }
    }

    /**
     * Create drag preview element
     * @param {HTMLElement} cell - Original cell element
     * @param {number} clientX - Mouse X position
     * @param {number} clientY - Mouse Y position
     * @param {number} offsetX - Mouse offset X
     * @param {number} offsetY - Mouse offset Y
     * @param {number} cardWidth - Card width
     * @param {number} cardHeight - Card height
     * @returns {HTMLElement} Drag preview element
     */
    createDragPreview(cell, clientX, clientY, offsetX, offsetY, cardWidth, cardHeight) {
        const preview = cell.cloneNode(true);
        preview.className = 'drag-preview';
        preview.style.cssText = `
            position: fixed;
            width: ${cardWidth}px;
            height: ${cardHeight}px;
            pointer-events: none;
            z-index: 1000;
            transform: scale(1.05);
            box-shadow: 0 15px 35px rgba(33, 159, 172, 0.3);
            border: 3px solid #219fac;
            border-radius: 12px;
            opacity: 0.9;
            top: ${clientY - offsetY}px;
            left: ${clientX - offsetX}px;
        `;
        
        document.body.appendChild(preview);
        return preview;
    }

    /**
     * Update drag preview position
     * @param {HTMLElement} dragPreview - Drag preview element
     * @param {number} clientX - Mouse X position
     * @param {number} clientY - Mouse Y position
     * @param {number} offsetX - Mouse offset X
     * @param {number} offsetY - Mouse offset Y
     */
    updateDragPreview(dragPreview, clientX, clientY, offsetX, offsetY) {
        if (dragPreview) {
            dragPreview.style.left = `${clientX - offsetX}px`;
            dragPreview.style.top = `${clientY - offsetY}px`;
        }
    }

    /**
     * Remove drag preview from DOM
     * @param {HTMLElement} dragPreview - Drag preview element to remove
     */
    removeDragPreview(dragPreview) {
        if (dragPreview && dragPreview.parentNode) {
            dragPreview.remove();
        }
    }

    /**
     * Apply dragging styles to original cell
     * @param {HTMLElement} cell - Cell element being dragged
     */
    applyDraggingStyles(cell) {
        cell.style.opacity = '0.4';
        cell.style.cursor = 'grabbing';
        cell.style.transform = 'scale(0.95)';
    }

    /**
     * Reset cell styles after dragging
     * @param {HTMLElement} cell - Cell element to reset
     */
    resetCellStyles(cell) {
        if (cell) {
            cell.style.opacity = '';
            cell.style.cursor = '';
            cell.style.transform = '';
        }
    }
}