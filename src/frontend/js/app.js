import { getApiBaseUrl } from './getApiUrl.js';
import { DashboardGrid } from './grid.js';
import { createCard } from './card.js';

/**
 * IR2 Dashboard Application
 * 
 * Main application for displaying French demographic data from INSEE MELODI API.
 * Features drag-and-drop card layout, search functionality, and data visualization.
 * 
 * @author Dashboard Team
 * @version 1.0.0
 */

let dashboardApp;
document.addEventListener('DOMContentLoaded', () => {
	dashboardApp = new DashboardApp();
	dashboardApp.initialize();
});


/**
 * Main Dashboard Application Class
 * Manages search functionality, data fetching, and card rendering
 */
class DashboardApp {
	#elements = {
		searchInput: null,
		searchButton: null,
		searchResults: null,
		selectedEntity: null,
		errorMessage: null,
		loadingIndicator: null,
		cardGrid: null
	};
	#apiBaseUrl = null;
	#dashboardGrid = null;
	#cardData = {};
	   #layout = [
		   { id: 'card1', row: 0, col: 0 },
		   { id: 'card2', row: 0, col: 1 },
		   { id: 'card3', row: 1, col: 0 },
		   { id: 'card4', row: 1, col: 1 }
	   ];
	   #persistKey = 'dashboardGridLayout';
	#cardModes = { card1: 'table', card2: 'table', card3: 'table', card4: 'table' };

	   async initialize() {
		   this.#apiBaseUrl = await getApiBaseUrl();
		   this.#elements.searchInput = document.getElementById('searchInput');
		   this.#elements.searchButton = document.getElementById('searchButton');
		   this.#elements.searchResults = document.getElementById('searchResults');
		   this.#elements.selectedEntity = document.getElementById('selectedEntity');
		   this.#elements.errorMessage = document.getElementById('errorMessage');
		   this.#elements.loadingIndicator = document.getElementById('loadingIndicator');
		   this.#elements.cardGrid = document.getElementById('dashboard-card-grid');
		   this.#loadLayout();
		   this.#setupEventListeners();
		   this.#renderGrid();
	   }

	   #loadLayout() {
		   const saved = sessionStorage.getItem(this.#persistKey);
		   if (saved) {
			   try {
				   const parsed = JSON.parse(saved);
				   if (Array.isArray(parsed) && parsed.length === this.#layout.length) {
					   this.#layout = parsed;
				   }
			   } catch {}
		   }
	   }

	   #saveLayout() {
		   sessionStorage.setItem(this.#persistKey, JSON.stringify(this.#layout));
	   }

	#setupEventListeners() {
		if (this.#elements.searchButton) {
			this.#elements.searchButton.addEventListener('click', () => this.handleSearch());
		}
		if (this.#elements.searchInput) {
			this.#elements.searchInput.addEventListener('keyup', (event) => {
				if (event.key === 'Enter') this.handleSearch();
			});
		}
		document.addEventListener('click', (event) => {
			if (event.target.classList.contains('select-button')) {
				const button = event.target;
				const entityId = button.getAttribute('data-id');
				const entityName = button.getAttribute('data-name');
				const entityType = button.getAttribute('data-type');
				this.selectEntity(entityId, entityName, entityType);
			}
			if (event.target.classList.contains('clear-selection-btn')) {
				this.clearSelection();
			}
		});
	}

	async handleSearch() {
		const query = this.#elements.searchInput.value.trim();
		if (!query) {
			this.#showError('Veuillez entrer un terme de recherche');
			return;
		}

		this.#showLoading(true);
		this.#hideError();

		try {
			const response = await fetch(`${this.#apiBaseUrl}/dashboard/search?q=${encodeURIComponent(query)}`);
			const data = await response.json();

			if (data.status === 'error') throw new Error(data.message || 'Erreur pendant la recherche');

			this.#displaySearchResults(data.results, query);
		} catch (error) {
			console.error('Search error:', error);
			this.#showError(`Erreur de recherche: ${error.message}`);
		} finally {
			this.#showLoading(false);
		}
	}

	#displaySearchResults(results, query) {
		const resultsElement = this.#elements.searchResults;

		const totalResults = results.communes.length + results.epcis.length + results.departements.length + results.regions.length;
		if (totalResults === 0) {
			resultsElement.innerHTML = `<p>Aucun résultat trouvé pour "${query}"</p>`;
			resultsElement.classList.add('expanded');
			return;
		}

		let html = `<h3>Résultats pour "${query}" (${totalResults} total)</h3>`;

		const buildSection = (title, items, type) => {
			if (items.length === 0) return '';
			let section = `<div class="result-section"><h4>${title} (${items.length})</h4><div class="result-list-container"><ul class="result-list">`;
			items.forEach(item => {
				section += `
					<li class="result-item result-${type}">
						<div class="result-info">
							<span class="result-name">${item.nom}</span>
							<span class="result-code">${item.code}</span>
						</div>
						<button class="select-button" 
							data-id="${item.code}" 
							data-name="${item.nom}" 
							data-type="${type}">
							Sélectionner
						</button>
					</li>`;
			});
			section += `</ul></div></div>`;
			return section;
		};

		html += buildSection('Régions', results.regions, 'region');
		html += buildSection('Départements', results.departements, 'departement');
		html += buildSection('Intercommunalités', results.epcis, 'epci');
		html += buildSection('Communes', results.communes, 'commune');

		resultsElement.innerHTML = html;
		resultsElement.classList.add('expanded');
	}

	#showError(message) {
		if (this.#elements.errorMessage) {
			this.#elements.errorMessage.textContent = message;
			this.#elements.errorMessage.style.display = 'block';
		}
	}

	#hideError() {
		if (this.#elements.errorMessage) {
			this.#elements.errorMessage.style.display = 'none';
		}
	}

	#showLoading(isLoading) {
		if (this.#elements.loadingIndicator) {
			this.#elements.loadingIndicator.style.display = isLoading ? 'block' : 'none';
		}
	}

	selectEntity(entityId, entityName, entityType) {
		// Hide search results
		if (this.#elements.searchResults) {
			this.#elements.searchResults.classList.remove('expanded');
		}
		
		// Show selected entity
		this.#showSelectedEntity(entityId, entityName, entityType);
		
		// Fetch data
		this.fetchEntityData(entityId, entityName, entityType);
	}

	#showSelectedEntity(entityId, entityName, entityType) {
		if (!this.#elements.selectedEntity) return;
		
		const typeDisplayNames = {
			'region': 'Région',
			'departement': 'Département', 
			'epci': 'Intercommunalité',
			'commune': 'Commune'
		};
		
		const html = `
			<div class="selected-entity-header">
				<div class="selected-entity-main">
					<h3 class="selected-entity-name">${entityName}</h3>
					<span class="selected-entity-code">(${entityId})</span>
					<span class="selected-entity-type">${typeDisplayNames[entityType] || entityType}</span>
				</div>
				<button class="clear-selection-btn">Effacer</button>
			</div>
			<div class="selected-entity-info">
				<div class="selected-entity-item selected-entity-source">
					<div class="selected-entity-label">Source des données</div>
					<div class="selected-entity-value">API MELODI, INSEE</div>
				</div>
			</div>
		`;
		
		this.#elements.selectedEntity.innerHTML = html;
		this.#elements.selectedEntity.style.display = 'block';
	}

	clearSelection() {
		// Hide selected entity
		if (this.#elements.selectedEntity) {
			this.#elements.selectedEntity.style.display = 'none';
		}
		
		// Clear search input
		if (this.#elements.searchInput) {
			this.#elements.searchInput.value = '';
		}
		
		// Clear data and re-render
		this.#cardData = {};
		this.#renderGrid();
	}

	async fetchEntityData(entityId, entityName, entityType) {
		if (!entityId || !entityType) {
			this.#showError('Données d\'entité manquantes');
			return;
		}
		this.#showLoading(true);
		this.#hideError();
		try {
			const [populationResponse, pcsResponse, diplomaResponse, employmentResponse] = await Promise.all([
				fetch(`${this.#apiBaseUrl}/dashboard/population?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
				fetch(`${this.#apiBaseUrl}/dashboard/pcs?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
				fetch(`${this.#apiBaseUrl}/dashboard/diploma?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`),
				fetch(`${this.#apiBaseUrl}/dashboard/employment?entity_code=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}`)
			]);
			const populationData = await populationResponse.json();
			const pcsData = await pcsResponse.json();
			const diplomaData = await diplomaResponse.json();
			const employmentData = await employmentResponse.json();
			if (populationData.status === 'error') throw new Error(populationData.message || 'Erreur récupération population');
			if (pcsData.status === 'error') throw new Error(pcsData.message || 'Erreur récupération PCS');
			if (diplomaData.status === 'error') throw new Error(diplomaData.message || 'Erreur récupération diplôme');
			if (employmentData.status === 'error') throw new Error(employmentData.message || 'Erreur récupération emploi');
			this.#cardData = {
				card1: { entityName, entityType, data: populationData.data },
				card2: { entityName, entityType, data: pcsData.data },
				card3: { entityName, entityType, data: diplomaData.data },
				card4: { entityName, entityType, data: employmentData.data }
			};
			this.#renderGrid();
		} catch (error) {
			this.#cardData = {};
			this.#renderGrid();
			this.#showError(`Erreur: ${error.message}`);
		} finally {
			this.#showLoading(false);
		}
	}


	   #renderGrid() {
		   const cardGrid = this.#elements.cardGrid;
		   if (!cardGrid) return;
		   
		   cardGrid.innerHTML = '';
		   
		   if (!this.#cardData.card1 && !this.#cardData.card2 && !this.#cardData.card3 && !this.#cardData.card4) {
			   return;
		   }
		   
		   const cards = {};
		   for (const cardId of ['card1', 'card2', 'card3', 'card4']) {
			   const cardInfo = this.#cardData[cardId];
			   const mode = this.#cardModes[cardId] || 'table';
			   let title = '', description = '', contentHtml = '';
			   if (cardId === 'card1') {
				   title = "Populations par tranches d'âge";
				   description = '';
				   contentHtml = this.#renderPopulationTable(cardInfo);
			   } else if (cardId === 'card2') {
				   title = 'Populations par catégorie socio-professionnelle';
				   description = '';
				   contentHtml = this.#renderPCSTable(cardInfo);
			   } else if (cardId === 'card3') {
				   title = "Populations par niveau d'éducation";
				   description = 'Données disponibles uniquement pour l\'année 2022.';
				   contentHtml = this.#renderDiplomaTable(cardInfo);
			   } else if (cardId === 'card4') {
				   title = "Données d'emploi";
				   description = '';
				   contentHtml = this.#renderEmploymentTable(cardInfo);
			   }
			   if (mode === 'graph') {
				   contentHtml = `
					   <div class="graph-placeholder">
						   <div class="graph-icon">
							   <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								   <line x1="18" y1="20" x2="18" y2="10"></line>
								   <line x1="12" y1="20" x2="12" y2="4"></line>
								   <line x1="6" y1="20" x2="6" y2="14"></line>
							   </svg>
						   </div>
						   <p>Chart view coming soon</p>
						   <small>This feature will display interactive charts and visualizations</small>
					   </div>
				   `;
			   }
			   cards[cardId] = createCard({
				   id: cardId,
				   title,
				   description,
				   contentHtml,
				   mode,
				   onToggleMode: () => {
					   // Add fade animation
					   const cardElement = document.getElementById(cardId);
					   if (cardElement) {
						   cardElement.classList.add('changing-mode');
						   setTimeout(() => {
							   cardElement.classList.remove('changing-mode');
						   }, 400);
					   }
					   
					   // Toggle mode
					   this.#cardModes[cardId] = this.#cardModes[cardId] === 'table' ? 'graph' : 'table';
					   
					   // Re-render at the fade midpoint to sync with animation
					   setTimeout(() => {
						   this.#renderGrid();
					   }, 200);
				   }
			   });
		   }
		   this.#dashboardGrid = new DashboardGrid(cardGrid, cards, this.#layout, layout => {
			   this.#layout = layout;
			   this.#saveLayout();
		   });
	   }

	#renderPopulationTable(cardInfo) {
		if (!cardInfo || !cardInfo.data || Object.keys(cardInfo.data).length === 0) {
			return `<div class="no-data-message"><p>Aucune donnée disponible.</p></div>`;
		}
		const { entityName, entityType, data } = cardInfo;
		const years = Object.keys(data).sort((a, b) => b - a);
		const ageGroupOrder = ['Y_LT15', 'Y15T24', 'Y25T39', '_T'];
		const ageGroups = ageGroupOrder.filter(age => years.some(year => data[year][age] !== undefined));
		const ageGroupMeanings = {
			'Y_LT15': 'Moins de 15 ans',
			'Y15T24': '15-24 ans',
			'Y25T39': '25-39 ans',
			'_T': 'Population totale'
		};
		return `<div class="table-responsive"><table class="data-table"><thead><tr><th>Année</th>${ageGroups.map(age => `<th>${ageGroupMeanings[age] || age}</th>`).join('')}</tr></thead><tbody>${years.map(year => `<tr><td>${year}</td>${ageGroups.map(age => {const value = data[year][age] ?? '—';return `<td>${value}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
	}

	#renderPCSTable(cardInfo) {
		if (!cardInfo || !cardInfo.data || Object.keys(cardInfo.data).length === 0) {
			return `<div class="no-data-message"><p>Aucune donnée PCS disponible.</p></div>`;
		}
		const { entityName, entityType, data } = cardInfo;
		const years = Object.keys(data).sort((a, b) => b - a);
		const pcsOrder = ['1', '2', '3', '4', '5', '6', '7', '8', '_T'];
		const pcsGroups = pcsOrder.filter(pcs => years.some(year => data[year]["Y_GE15"][pcs] !== undefined));
		const pcsGroupMeanings = {
			'1': 'Agriculteurs',
			'2': 'Artisans',
			'3': 'Cadres',
			'4': 'Employés',
			'5': 'Ouvriers',
			'6': 'Retraités',
			'7': 'Sans activité',
			'8': 'Autres',
			'_T': 'Total'
		};
		return `
			<div class="table-responsive">
				<table class="data-table">
					<thead>
						<tr>
							<th>Année</th>
							${pcsGroups.map(pcs => `<th>${pcsGroupMeanings[pcs] || pcs}</th>`).join('')}
						</tr>
					</thead>
					<tbody>
						${years.map(year => `
							<tr>
								<td>${year}</td>
								${pcsGroups.map(pcs => {
									const value = data[year]["Y_GE15"][pcs] ?? '—';
									return `<td>${value}</td>`;
								}).join('')}
							</tr>
						`).join('')}
					</tbody>
				</table>
			</div>
		`;
	}

	#renderDiplomaTable(cardInfo) {
		if (!cardInfo || !cardInfo.data || !cardInfo.data['2022']) {
			return `<div class="no-data-message"><p>Aucune donnée disponible pour l'année 2022.</p></div>`;
		}
		const { entityName, entityType, data } = cardInfo;
		const year = '2022';
		const diplomaGroupOrder = [
			'001T100_RP', '200_RP', '300_RP', '350T351_RP', '500_RP', '600_RP', '700_RP'
		];
		const diplomaGroupMeanings = {
			'001T100_RP': 'Aucun diplôme',
			'200_RP': 'BEPC/Brevet',
			'300_RP': 'CAP/BEP',
			'350T351_RP': 'Baccalauréat',
			'500_RP': 'BAC+2',
			'600_RP': 'BAC+3/4',
			'700_RP': 'BAC+5 et plus'
		};
		const diplomaGroups = diplomaGroupOrder.filter(diploma => data[year][diploma] !== undefined);
		return `<div class="table-responsive"><table class="data-table"><thead><tr><th>Année</th>${diplomaGroups.map(diploma => `<th>${diplomaGroupMeanings[diploma] || diploma}</th>`).join('')}</tr></thead><tbody><tr><td>${year}</td>${diplomaGroups.map(diploma => {const value = data[year][diploma];return `<td>${value !== undefined ? value : '—'}</td>`;}).join('')}</tr></tbody></table></div>`;
	}

	#renderEmploymentTable(cardInfo) {
		if (!cardInfo || !cardInfo.data || Object.keys(cardInfo.data).length === 0) {
			return `<div class="no-data-message"><p>Aucune donnée d'emploi disponible.</p></div>`;
		}
		const { entityName, entityType, data } = cardInfo;
		const years = Object.keys(data).sort((a, b) => b - a);
		const employmentFields = [
			'population_15_64', 'nombre_actifs', 'nombre_actifs_ayant_emploi', 'nombre_chomeurs', 'taux_emploi', 'taux_chomage'
		];
		const fieldMeanings = {
			'population_15_64': 'Population 15-64 ans',
			'nombre_actifs': 'Nombre d\'actifs',
			'nombre_actifs_ayant_emploi': 'Actifs ayant un emploi',
			'nombre_chomeurs': 'Nombre de chômeurs',
			'taux_emploi': 'Taux d\'emploi (%)',
			'taux_chomage': 'Taux de chômage (%)'
		};
		return `<div class="table-responsive"><table class="data-table"><thead><tr><th>Année</th>${employmentFields.map(field => `<th>${fieldMeanings[field] || field}</th>`).join('')}</tr></thead><tbody>${years.map(year => `<tr><td>${year}</td>${employmentFields.map(field => {const value = data[year][field];return `<td>${value !== undefined ? value : '—'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
	}
}
