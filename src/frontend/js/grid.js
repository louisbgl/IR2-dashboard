/**
 * DashboardGrid manages the drag-and-drop layout of dashboard cards
 * Supports responsive centering, row management, and visual feedback
 */
export class DashboardGrid {
	/**
	 * Initialize the dashboard grid
	 * @param {HTMLElement} container - Container element for the grid
	 * @param {Object} cards - Card elements indexed by ID
	 * @param {Array} layout - Initial layout configuration
	 * @param {Function} onLayoutChange - Callback when layout changes
	 * @param {number} maxCardsPerRow - Maximum cards per row (default: 2)
	 */
	constructor(container, cards, layout, onLayoutChange, maxCardsPerRow = 2) {
		this.container = container;
		this.cards = cards;
		this.onLayoutChange = onLayoutChange;
		this.maxCardsPerRow = maxCardsPerRow;
		this.draggedCard = null;
		this.dragPreview = null;
		this.currentHighlightedRow = null;
		
		// Fixed standard card dimensions - wider for better table display
		this.cardWidth = 680;   // Increased width for better table readability
		this.cardHeight = 340;  // Reduced height for dashboard-style compact view
		this.cardGap = 20;
		
		// Initialize or fix layout based on current maxCardsPerRow
		this.layout = layout ? this.fixLayoutForMaxCards(layout) : this.initLayout();
		this.render();
	}

	// Initialize layout: fill from top down, each row up to maxCardsPerRow
	initLayout() {
		const cardIds = Object.keys(this.cards);
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

	// Fix existing layout to respect current maxCardsPerRow
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

	// Update maxCardsPerRow and reorganize layout
	updateMaxCardsPerRow(newMaxCards) {
		if (newMaxCards !== this.maxCardsPerRow) {
			this.maxCardsPerRow = newMaxCards;
			this.layout = this.fixLayoutForMaxCards(this.layout);
			this.render();
			if (this.onLayoutChange) {
				this.onLayoutChange(this.layout);
			}
		}
	}

	// Clean up empty rows and reindex - preserve all cards
	cleanupLayout() {
		// Get all unique card IDs from current layout
		const allCardIds = [...new Set(this.layout.map(pos => pos.id))];
		
		// Build rows from layout
		const rows = this.getRowsFromLayout();
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
		
		this.layout = newLayout;
		if (this.onLayoutChange) {
			this.onLayoutChange(this.layout);
		}
	}

	// Get rows from layout for rendering
	getRowsFromLayout() {
		const rows = [];
		for (const pos of this.layout) {
			if (!rows[pos.row]) rows[pos.row] = [];
			rows[pos.row][pos.col] = pos.id;
		}
		return rows.map(row => row.filter(id => id)).filter(row => row.length > 0);
	}

	/**
	 * Calculate centered positions for cards in a row based on viewport width
	 * @param {number} cardCount - Number of cards in the row
	 * @returns {Array<number>} Array of x-positions for cards
	 */
	getCenteredPositions(cardCount) {
		if (cardCount === 0) return [];
		
		const positions = [];
		const totalRowWidth = cardCount * this.cardWidth + (cardCount - 1) * this.cardGap;
		const viewportWidth = window.innerWidth;
		const viewportMidpoint = viewportWidth / 2;
		const firstCardOffset = viewportMidpoint - (totalRowWidth / 2);
		
		for (let i = 0; i < cardCount; i++) {
			positions.push(firstCardOffset + i * (this.cardWidth + this.cardGap));
		}
		
		return positions;
	}

	// Highlight target row for visual feedback
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

	// Highlight new row insertion zone
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

	// Clear row highlight
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

	// Enhanced drop position detection with simplified visual feedback
	findDropPosition(clientX, clientY) {
		const rows = this.container.querySelectorAll('.dashboard-row');
		
		// Check for row insertion between existing rows
		for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			const row = rows[rowIndex];
			const rowRect = row.getBoundingClientRect();
			
			// Check for insertion above this row (row separator)
			if (rowIndex === 0 && clientY < rowRect.top && clientY > rowRect.top - 40) {
				this.highlightNewRowInsertion(0);
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
					this.highlightNewRowInsertion(rowIndex);
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
				const currentRowCards = this.getRowsFromLayout()[rowIndex] || [];
				
				// Highlight this row
				this.highlightTargetRow(rowIndex);
				
				// Always try to determine insertion position
				const positions = this.getCenteredPositions(Math.max(currentRowCards.length, 1));
				
				if (currentRowCards.length === 0) {
					// Empty row
					return { 
						row: rowIndex, 
						col: 0,
						isNewRow: false
					};
				} else if (currentRowCards.length < this.maxCardsPerRow) {
					// Row has space - use positions for row with one more card
					const expandedPositions = this.getCenteredPositions(currentRowCards.length + 1);
					
					// Find best insertion point
					for (let i = 0; i <= currentRowCards.length; i++) {
						let shouldInsert = false;
						
						if (i === 0) {
							// Before first card
							shouldInsert = clientX < expandedPositions[0] + this.cardWidth / 2;
						} else if (i === currentRowCards.length) {
							// After last card
							shouldInsert = clientX > expandedPositions[i - 1] + this.cardWidth / 2;
						} else {
							// Between cards
							const leftBoundary = expandedPositions[i - 1] + this.cardWidth / 2;
							const rightBoundary = expandedPositions[i] + this.cardWidth / 2;
							shouldInsert = clientX >= leftBoundary && clientX <= rightBoundary;
						}
						
						if (shouldInsert) {
							return { 
								row: rowIndex, 
								col: i,
								isNewRow: false
							};
						}
					}
				} else {
					// Row is full - allow reordering
					for (let i = 0; i < positions.length; i++) {
						const cardLeft = positions[i];
						const cardRight = cardLeft + this.cardWidth;
						
						if (clientX >= cardLeft && clientX <= cardRight) {
							// Determine if we're closer to left or right side
							const isLeftHalf = clientX < cardLeft + this.cardWidth / 2;
							const insertCol = isLeftHalf ? i : Math.min(i + 1, this.maxCardsPerRow);
							
							return { 
								row: rowIndex, 
								col: insertCol,
								isReorder: true
							};
						}
					}
					
					// Fallback: insert at end if past all cards
					if (clientX > positions[positions.length - 1] + this.cardWidth) {
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
				// Don't highlight any existing row for new row creation
				this.clearRowHighlight();
				return { 
					row: rows.length, 
					col: 0,
					isNewRow: true 
				};
			}
		} else {
			// First card in empty container
			this.clearRowHighlight();
			return { 
				row: 0, 
				col: 0,
				isNewRow: true 
			};
		}
		
		// Clear highlight if no valid drop position
		this.clearRowHighlight();
		return null;
	}

	// Move card to new position with proper layout management
	moveCard(cardId, newRow, newCol, isRowSeparator = false, insertNewRow = false, isReorder = false) {
		// Find and validate current position
		const currentPos = this.layout.find(pos => pos.id === cardId);
		if (!currentPos) {
			return;
		}
		
		// Create a safe copy of the layout for manipulation
		let newLayout = this.layout.filter(pos => pos.id !== cardId);
		
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
		
		// Update layout and clean up
		this.layout = newLayout;
		this.cleanupLayout();
		this.render();
	}

	render() {
		this.container.innerHTML = '';
		const rows = this.getRowsFromLayout();
		
		rows.forEach((cardsInRow, rowIndex) => {
			const rowDiv = document.createElement('div');
			rowDiv.className = 'dashboard-row';
			
			// Calculate centered positions for this row
			const positions = this.getCenteredPositions(cardsInRow.length);
			
			rowDiv.style.cssText = `
				display: block;
				position: relative;
				margin-bottom: 40px;
				min-height: ${this.cardHeight}px;
				width: 100vw;
				transition: all 0.3s ease;
			`;
			
			cardsInRow.forEach((cardId, colIndex) => {
				const card = this.cards[cardId];
				if (!card) return;
				
				const cellDiv = document.createElement('div');
				cellDiv.className = 'dashboard-cell';
				cellDiv.style.cssText = `
					position: absolute;
					left: ${positions[colIndex]}px;
					top: 0;
					width: ${this.cardWidth}px;
					height: ${this.cardHeight}px;
					cursor: grab;
					transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
					transform-origin: center;
				`;
				cellDiv.setAttribute('data-card-id', cardId);
				cellDiv.setAttribute('data-row', rowIndex);
				cellDiv.setAttribute('data-col', colIndex);
				
				// Add drag event listeners
				cellDiv.addEventListener('mousedown', this.handleMouseDown.bind(this));
				cellDiv.addEventListener('mouseenter', () => {
					if (!this.draggedCard) {
						cellDiv.style.transform = 'translateY(-4px) scale(1.02)';
						cellDiv.style.boxShadow = '0 8px 25px rgba(33, 159, 172, 0.15)';
						cellDiv.style.zIndex = '10';
					}
				});
				cellDiv.addEventListener('mouseleave', () => {
					if (!this.draggedCard) {
						cellDiv.style.transform = '';
						cellDiv.style.boxShadow = '';
						cellDiv.style.zIndex = '';
					}
				});
				
				// Create card element - use the original card to preserve event handlers
				if (card instanceof HTMLElement) {
					cellDiv.appendChild(card);
				} else if (typeof card === 'string') {
					const cardElem = document.createElement('div');
					cardElem.innerHTML = card;
					cellDiv.appendChild(cardElem);
				} else {
					return;
				}
				rowDiv.appendChild(cellDiv);
			});
			
			this.container.appendChild(rowDiv);
		});
	}

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
		
		// Create drag preview
		this.createDragPreview(cell, e.clientX, e.clientY);
		
		// Add global event listeners
		document.addEventListener('mousemove', this.handleMouseMove.bind(this));
		document.addEventListener('mouseup', this.handleMouseUp.bind(this));
		
		// Style the original cell
		cell.style.opacity = '0.4';
		cell.style.cursor = 'grabbing';
		cell.style.transform = 'scale(0.95)';
	}

	createDragPreview(cell, clientX, clientY) {
		const preview = cell.cloneNode(true);
		preview.className = 'drag-preview';
		preview.style.cssText = `
			position: fixed;
			width: ${this.cardWidth}px;
			height: ${this.cardHeight}px;
			pointer-events: none;
			z-index: 1000;
			transform: rotate(3deg) scale(1.05);
			box-shadow: 0 15px 35px rgba(33, 159, 172, 0.3);
			border: 3px solid #219fac;
			border-radius: 12px;
			opacity: 0.9;
			top: ${clientY - this.draggedCard.offsetY}px;
			left: ${clientX - this.draggedCard.offsetX}px;
		`;
		
		this.dragPreview = preview;
		document.body.appendChild(preview);
	}

	handleMouseMove(e) {
		if (!this.draggedCard) return;
		
		// Prevent default to avoid page scrolling
		e.preventDefault();
		
		// Update drag preview position
		if (this.dragPreview) {
			this.dragPreview.style.left = `${e.clientX - this.draggedCard.offsetX}px`;
			this.dragPreview.style.top = `${e.clientY - this.draggedCard.offsetY}px`;
		}
		
		// Find drop position (this will handle row highlighting)
		this.findDropPosition(e.clientX, e.clientY);
	}

	handleMouseUp(e) {
		if (!this.draggedCard) return;
		
		// Prevent default to avoid page scroll jumping
		e.preventDefault();
		e.stopPropagation();
		
		// Find drop position
		const dropPos = this.findDropPosition(e.clientX, e.clientY);
		
		if (dropPos) {
			this.moveCard(
				this.draggedCard.id, 
				dropPos.row, 
				dropPos.col,
				dropPos.isRowSeparator,
				dropPos.insertNewRow,
				dropPos.isReorder
			);
		}
		
		// Clean up
		this.cleanupDrag();
	}

	cleanupDrag() {
		// Remove event listeners
		document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
		document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
		
		// Remove drag preview
		if (this.dragPreview) {
			this.dragPreview.remove();
			this.dragPreview = null;
		}
		
		// Clear row highlight
		this.clearRowHighlight();
		
		// Reset original cell style
		if (this.draggedCard && this.draggedCard.cell) {
			this.draggedCard.cell.style.opacity = '';
			this.draggedCard.cell.style.cursor = '';
			this.draggedCard.cell.style.transform = '';
		}
		
		this.draggedCard = null;
	}
}