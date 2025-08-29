import { getApiBaseUrl } from './getApiUrl.js';
import { SearchHandler } from './search-handler.js';
import { Dashboard } from './Dashboard.js';

/**
 * Main Application Class
 * Coordinates between search functionality and dashboard display
 */
export class App {
    constructor() {
        // DOM elements for quick access
        this.elements = {
            // Overview metrics
            totalPopulation: document.getElementById('total-population'),
            employmentRate: document.getElementById('employment-rate'),
            jobSeekersTotal: document.getElementById('job-seekers-total'),
            higherEducationCount: document.getElementById('higher-education-count'),
            
            // Content sections
            dashboardContent: document.getElementById('dashboard-content'),
            dashboardContainer: document.getElementById('dashboard-container'),
            dashboardLoadingOverlay: document.getElementById('dashboard-loading-overlay'),
            loadingTitle: document.getElementById('loading-title'),
            loadingBarFill: document.getElementById('loading-bar-fill'),
            loadingPercentage: document.getElementById('loading-percentage'),
            loadingStatus: document.getElementById('loading-status'),
            
            // Data warnings
            dataWarningsContainer: document.getElementById('data-warnings-container'),
            dataWarnings: document.getElementById('data-warnings'),
            
            // Search elements
            searchInput: document.getElementById('searchInput'),
            searchButton: document.getElementById('searchButton'),
            searchResults: document.getElementById('searchResults'),
            selectedEntity: document.getElementById('selectedEntity'),
            errorMessage: document.getElementById('errorMessage'),
            loadingIndicator: document.getElementById('loadingIndicator')
        };
        
        // Initialize components
        this.dashboard = new Dashboard(this.elements);
        
        // Initialize search handler after getting API URL
        this.initializeAsync();
    }
    
    async initializeAsync() {
        try {
            const apiUrl = await getApiBaseUrl();
            
            // Setup search handler with proper parameters
            this.searchHandler = new SearchHandler(apiUrl, this.elements, {
                onEntitySelected: this.onEntitySelected.bind(this),
                onClearSelection: this.onClearSelection.bind(this)
            });
            
            // Hide error message on initial load
            if (this.elements.errorMessage) {
                this.elements.errorMessage.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Erreur d\'initialisation');
        }
    }
    
    async onEntitySelected(entityId, entityName, entityType) {
        try {
            console.log(`Entity selected: ${entityName} (${entityType})`);
            
            // Show data availability warnings if any
            this.showDataAvailabilityWarnings(entityType);
            
            // Show the dashboard with loading bar (compact height)
            this.dashboard.showWithLoadingBar(entityName);
            
            // Entity information is now displayed in the selected entity box
            
            // Fetch all data with progress tracking
            const data = await this.fetchEntityDataWithProgress(entityId, entityType);
            
            // Update warnings with API failure messages
            this.updateWarningsWithApiFailures(data, entityType);
            
            // Reveal dashboard with curtain drop animation
            await this.dashboard.revealWithCurtainDrop(data, entityType, entityName, entityId);
            console.log('Entity data loaded successfully');
            
            
        } catch (error) {
            console.error('Error loading entity data:', error);
            this.showError('Erreur lors du chargement des données. Certaines données peuvent être indisponibles.');
            
            // Show dashboard anyway with empty data to allow partial functionality
            this.dashboard.show();
            this.dashboard.clearData();
        }
    }
    
    onClearSelection() {
        // Hide the dashboard content
        this.dashboard.hide();
        
        // Hide data warnings
        this.hideDataAvailabilityWarnings();
        
        // Clear dashboard data
        this.dashboard.clearData();
    }
    
    showDataAvailabilityWarnings(entityType) {
        const warnings = this.getDataAvailabilityWarnings(entityType);
        
        if (warnings.length === 0) {
            this.hideDataAvailabilityWarnings();
            return;
        }
        
        // Generate warning HTML
        const warningsHtml = warnings.map(warning => `
            <div class="data-warning-item">
                <span class="data-warning-icon blue">⚠</span>
                <span>${warning}</span>
            </div>
        `).join('');
        
        // Show warnings container
        this.elements.dataWarnings.innerHTML = warningsHtml;
        this.elements.dataWarningsContainer.classList.add('show');
        
        console.log(`Showing ${warnings.length} data availability warnings for ${entityType}`);
    }
    
    hideDataAvailabilityWarnings() {
        this.elements.dataWarningsContainer.classList.remove('show');
        this.elements.dataWarnings.innerHTML = '';
    }
    
    getDataAvailabilityWarnings(entityType) {
        // Based on the old code analysis, define data availability restrictions
        const restrictions = {
            'commune': [
                'Données demandeurs d\'emploi indisponibles au niveau communal',
                'Données perspectives employeurs indisponibles au niveau communal'
            ],
            'epci': [
                'Données perspectives employeurs indisponibles au niveau intercommunal'
            ],
            'departement': [],
            'region': []
        };
        
        return restrictions[entityType] || [];
    }
    
    updateWarningsWithApiFailures(data, entityType) {
        // Get existing warnings (known restrictions)
        const existingWarnings = this.getDataAvailabilityWarnings(entityType);
        
        // Check for API failures and add comprehensive error messages
        const apiFailureMessages = this.getApiFailureMessages(data, entityType);
        
        const allWarnings = [...existingWarnings, ...apiFailureMessages];
        
        if (allWarnings.length === 0) {
            this.hideDataAvailabilityWarnings();
            return;
        }
        
        // Generate warning HTML with mixed icons (blue for restrictions, red for failures)
        const existingWarningsHtml = existingWarnings.map(warning => `
            <div class="data-warning-item">
                <span class="data-warning-icon blue">⚠</span>
                <span>${warning}</span>
            </div>
        `).join('');
        
        const failureWarningsHtml = apiFailureMessages.map(warning => `
            <div class="data-warning-item">
                <span class="data-warning-icon red">⚠</span>
                <span>${warning}</span>
            </div>
        `).join('');
        
        const combinedHtml = existingWarningsHtml + failureWarningsHtml;
        
        // Show warnings container
        this.elements.dataWarnings.innerHTML = combinedHtml;
        this.elements.dataWarningsContainer.classList.add('show');
        
        console.log(`Showing ${allWarnings.length} total warnings (${existingWarnings.length} restrictions + ${apiFailureMessages.length} failures)`);
    }
    
    getApiFailureMessages(data, entityType) {
        const failures = [];
        
        // Map API endpoints to user-friendly subsection names
        const endpointMessages = {
            'population': 'Données de population par tranches d\'âge indisponibles temporairement',
            'pcs': 'Données catégories socio-professionnelles indisponibles temporairement',
            'diploma': 'Données niveaux de formation indisponibles temporairement',
            'employment': 'Données statistiques d\'emploi indisponibles temporairement',
            'higher_education': 'Données établissements d\'enseignement supérieur indisponibles temporairement',
            'formations': 'Données formations disponibles indisponibles temporairement',
            'job_seekers': 'Données demandeurs d\'emploi indisponibles temporairement',
            'perspectives': 'Données perspectives employeurs indisponibles temporairement'
        };
        
        // Define which endpoints are expected to fail for each entity type
        const expectedFailures = {
            'commune': ['job_seekers', 'perspectives'],
            'epci': ['perspectives'],
            'departement': [],
            'region': []
        };
        
        const expectedToFail = expectedFailures[entityType] || [];
        
        // Check each endpoint for failures, but skip those we expect to fail
        Object.keys(endpointMessages).forEach(endpoint => {
            if (data[endpoint] && data[endpoint].status === 'error') {
                // Only add to failures if this endpoint is NOT expected to fail for this entity type
                if (!expectedToFail.includes(endpoint)) {
                    failures.push(endpointMessages[endpoint]);
                }
            }
        });
        
        return failures;
    }
    
    async fetchEntityDataWithProgress(entityCode, entityType) {
        const apiUrl = await getApiBaseUrl();
        
        // Define all API endpoints with names
        const endpoints = [
            { name: 'population', url: `${apiUrl}/dashboard/population?entity_code=${entityCode}&entity_type=${entityType}` },
            { name: 'pcs', url: `${apiUrl}/dashboard/pcs?entity_code=${entityCode}&entity_type=${entityType}` },
            { name: 'diploma', url: `${apiUrl}/dashboard/diploma?entity_code=${entityCode}&entity_type=${entityType}` },
            { name: 'employment', url: `${apiUrl}/dashboard/employment?entity_code=${entityCode}&entity_type=${entityType}` },
            { name: 'higher_education', url: `${apiUrl}/dashboard/higher_education?entity_code=${entityCode}&entity_type=${entityType}` },
            { name: 'formations', url: `${apiUrl}/dashboard/formations?entity_code=${entityCode}&entity_type=${entityType}` },
            { name: 'job_seekers', url: `${apiUrl}/dashboard/job_seekers?entity_code=${entityCode}&entity_type=${entityType}` },
            { name: 'perspectives', url: `${apiUrl}/dashboard/perspectives?entity_code=${entityCode}&entity_type=${entityType}` }
        ];
        
        const results = {};
        let completed = 0;
        const total = endpoints.length;
        
        // Fetch all endpoints in parallel but track progress individually
        const promises = endpoints.map(async (endpoint) => {
            try {
                const response = await fetch(endpoint.url);
                if (!response.ok) {
                    console.warn(`API endpoint failed: ${endpoint.url} (${response.status})`);
                    results[endpoint.name] = { status: 'error', message: `HTTP ${response.status}` };
                } else {
                    results[endpoint.name] = await response.json();
                }
            } catch (error) {
                console.warn(`API endpoint error: ${endpoint.url}`, error.message);
                results[endpoint.name] = { status: 'error', message: error.message };
            }
            
            // Update progress
            completed++;
            const percentage = Math.round((completed / total) * 100);
            this.dashboard.updateProgress(percentage, completed, total);
        });
        
        // Wait for all to complete
        await Promise.all(promises);
        
        return results;
    }
    
    showError(message) {
        // You could add a toast notification system here
        console.error(message);
        
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.style.display = 'block';
        }
    }
}