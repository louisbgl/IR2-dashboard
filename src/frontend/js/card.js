/**
 * Creates a dashboard card with toggle functionality between table and chart views
 * @param {Object} options - Card configuration options
 * @param {string} options.id - Unique identifier for the card
 * @param {string} options.title - Card title
 * @param {string} options.description - Optional card description
 * @param {string} options.contentHtml - HTML content for the card body
 * @param {string} options.mode - Current view mode ('table' or 'graph')
 * @param {Function} options.onToggleMode - Callback function when mode is toggled
 * @returns {HTMLElement} Configured card element with event handlers
 */
export function createCard({ id, title, description, contentHtml, mode, onToggleMode }) {
	const card = document.createElement('div');
	card.className = 'card dashboard-card';
	card.id = id;
	
	// Header with title and toggle button
	const header = document.createElement('div');
	header.className = 'card-header';
	
	// Title
	const titleElem = document.createElement('h3');
	titleElem.className = 'card-title';
	titleElem.textContent = title;
	header.appendChild(titleElem);
	
	// Toggle button (top right)
	const toggleBtn = document.createElement('button');
	toggleBtn.className = `card-toggle-btn ${mode === 'table' ? 'btn-graph' : 'btn-table'}`;
	toggleBtn.innerHTML = mode === 'table' ? 
		'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Chart' : 
		'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg> Data';
	toggleBtn.title = mode === 'table' ? 'Switch to chart view' : 'Switch to data view';
	toggleBtn.onclick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (onToggleMode) {
			onToggleMode();
		}
	};
	header.appendChild(toggleBtn);
	
	card.appendChild(header);
	
	// Description
	if (description) {
		const descElem = document.createElement('div');
		descElem.className = 'card-description';
		descElem.textContent = description;
		card.appendChild(descElem);
	}
	
	// Content area
	const contentElem = document.createElement('div');
	contentElem.className = 'card-content';
	
	if (mode === 'graph') {
		contentElem.innerHTML = `
			<div class="graph-placeholder">
				<div class="graph-icon">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<line x1="18" y1="20" x2="18" y2="10"></line>
						<line x1="12" y1="20" x2="12" y2="4"></line>
						<line x1="6" y1="20" x2="6" y2="14"></line>
					</svg>
				</div>
				<p>Graph view coming soon</p>
				<small>This feature will display interactive charts and visualizations</small>
			</div>
		`;
	} else {
		contentElem.innerHTML = contentHtml;
	}
	
	card.appendChild(contentElem);
	
	return card;
}
