import { PopulationRenderer } from './renderers/PopulationRenderer.js';
import { PCSRenderer } from './renderers/PCSRenderer.js';
import { DiplomaRenderer } from './renderers/DiplomaRenderer.js';
import { EmploymentRenderer } from './renderers/EmploymentRenderer.js';
import { JobSeekersRenderer } from './renderers/JobSeekersRenderer.js';
import { PerspectivesRenderer } from './renderers/PerspectivesRenderer.js';
import { HigherEducationRenderer } from './renderers/HigherEducationRenderer.js';
import { FormationsRenderer } from './renderers/FormationsRenderer.js';
import { MapRenderer } from './renderers/MapRenderer.js';

/**
 * Dashboard Management Class
 * Handles the main dashboard body, sections, and data rendering
 */
export class Dashboard {
    constructor(elements) {
        this.elements = elements;
        this.currentData = null;
        
        // Loading elements (passed from App)
        this.elements.dashboardContainer = elements.dashboardContainer;
        this.elements.dashboardLoadingOverlay = elements.dashboardLoadingOverlay;
        this.elements.loadingTitle = elements.loadingTitle;
        this.elements.loadingBarFill = elements.loadingBarFill;
        this.elements.loadingPercentage = elements.loadingPercentage;
        this.elements.loadingStatus = elements.loadingStatus;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Setup section collapse buttons
        document.querySelectorAll('.section-collapse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMainSection(btn);
            });
        });

        // Setup subsection toggle buttons
        document.querySelectorAll('.subsection-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSubsection(btn);
            });
        });
        
        // Keyboard navigation for accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close all collapsed sections and subsections
                document.querySelectorAll('.section-collapse-btn.collapsed').forEach(btn => {
                    this.toggleMainSection(btn, false);
                });
                document.querySelectorAll('.subsection-toggle-btn.collapsed').forEach(btn => {
                    this.toggleSubsection(btn, false);
                });
            }
        });
    }
    
    toggleMainSection(btn, forceState = null) {
        const targetId = btn.dataset.target;
        const container = document.getElementById(targetId);
        const isCollapsed = forceState !== null ? forceState : btn.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand - show the subsections
            btn.classList.remove('collapsed');
            container.classList.remove('collapsed');
            container.style.maxHeight = 'none';
        } else {
            // Collapse - hide the subsections
            btn.classList.add('collapsed');
            container.classList.add('collapsed');
            container.style.maxHeight = '0';
        }
    }
    
    toggleSubsection(btn, forceState = null) {
        const targetId = btn.dataset.target;
        const content = document.getElementById(targetId);
        const isCollapsed = forceState !== null ? forceState : btn.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand - show the content
            btn.classList.remove('collapsed');
            content.classList.remove('collapsed');
            content.style.maxHeight = 'none';
        } else {
            // Collapse - hide the content
            btn.classList.add('collapsed');
            content.classList.add('collapsed');
            content.style.maxHeight = '0';
        }
    }
    
    show() {
        this.elements.dashboardContent.style.display = 'block';
    }
    
    hide() {
        this.elements.dashboardContainer.style.display = 'none';
        this.elements.dashboardContent.style.display = 'none';
    }
    
    showWithLoadingBar(entityName) {
        // Show dashboard container with loading state
        this.elements.dashboardContainer.style.display = 'block';
        this.elements.dashboardContainer.classList.add('loading');
        this.elements.dashboardContainer.classList.remove('loaded');
        
        // Show loading overlay
        this.elements.dashboardLoadingOverlay.style.display = 'flex';
        this.elements.dashboardContent.style.display = 'block';
        
        // Update loading title with entity name
        this.elements.loadingTitle.textContent = `Chargement des données pour ${entityName}...`;
        
        // Reset progress
        this.updateProgress(0, 0, 8);
        
        console.log('Dashboard loading started');
    }
    
    updateProgress(percentage, completed, total) {
        // Update progress bar
        this.elements.loadingBarFill.style.width = `${percentage}%`;
        this.elements.loadingPercentage.textContent = `${percentage}%`;
        this.elements.loadingStatus.textContent = `${completed}/${total} endpoints completed`;
        
        console.log(`Loading progress: ${percentage}% (${completed}/${total})`);
    }
    
    async revealWithCurtainDrop(data, entityType, entityName = null, entityCode = null) {
        return new Promise((resolve) => {
            // Start curtain drop animation
            this.elements.dashboardLoadingOverlay.classList.add('curtain-drop');
            
            // Load data into dashboard (hidden initially)
            this.elements.dashboardContent.classList.add('revealing');
            this.loadData(data, entityType, entityName, entityCode);
            
            // Container expands to accommodate content
            this.elements.dashboardContainer.classList.remove('loading');
            this.elements.dashboardContainer.classList.add('loaded');
            
            // After curtain animation, reveal content
            setTimeout(() => {
                // Hide loading overlay completely
                this.elements.dashboardLoadingOverlay.style.display = 'none';
                this.elements.dashboardLoadingOverlay.classList.remove('curtain-drop');
                
                // Reveal dashboard content
                this.elements.dashboardContent.classList.remove('revealing');
                this.elements.dashboardContent.classList.add('revealed');
                
                console.log('Dashboard revealed with curtain drop');
                resolve();
            }, 800); // Match CSS animation duration
        });
    }
    
    loadData(data, entityType = null, entityName = null, entityCode = null) {
        this.currentData = data;
        this.currentEntityType = entityType;
        this.currentEntityName = entityName;
        this.currentEntityCode = entityCode;
        this.currentEntityInfo = {
            entityName,
            entityType, 
            entityCode
        };
        
        // Update overview metrics with animation
        this.updateOverviewMetrics(data, entityType);
        
        // Load data for all visible subsections
        this.loadDataForAllSubsections();
    }
    
    clearData() {
        // Clear current data
        this.currentData = null;
        this.currentEntityType = null;
        this.currentEntityName = null;
        this.currentEntityCode = null;
        this.currentEntityInfo = null;
        
        // Reset all metric values
        this.elements.totalPopulation.textContent = '-';
        this.elements.employmentRate.textContent = '-';
        this.elements.jobSeekersTotal.textContent = '-';
        this.elements.higherEducationCount.textContent = '-';
        
        // Reset all subsection content to no-data state
        document.querySelectorAll('.subsection-content').forEach(content => {
            content.innerHTML = '<div class="no-data-message"><p>Aucune donnée disponible</p></div>';
            content.classList.remove('has-data');
        });
        
        // Clear map if it exists
        if (MapRenderer.mapInstance) {
            MapRenderer.mapInstance.remove();
            MapRenderer.mapInstance = null;
        }
    }
    
    updateOverviewMetrics(data, entityType = null) {
        // Extract key metrics from the data
        const metrics = this.extractKeyMetrics(data, entityType);
        
        // Animate metric updates
        this.animateMetric(this.elements.totalPopulation, metrics.totalPopulation);
        this.animateMetric(this.elements.employmentRate, metrics.employmentRate === '-' ? '-' : metrics.employmentRate + '%');
        this.animateMetric(this.elements.jobSeekersTotal, metrics.jobSeekersTotal);
        this.animateMetric(this.elements.higherEducationCount, metrics.higherEducationCount);
    }
    
    extractKeyMetrics(data, entityType = null) {
        console.log('Extracting overview metrics');
        
        const metrics = {
            totalPopulation: '-',
            employmentRate: '-',
            jobSeekersTotal: '-',
            higherEducationCount: '-'
        };
        
        // Extract total population from most recent year
        if (data.population && data.population.status === 'success' && data.population.data) {
            try {
                const popData = data.population.data;
                const years = Object.keys(popData).sort((a, b) => b - a); // Most recent first
                
                if (years.length > 0) {
                    const latestYear = years[0];
                    const yearData = popData[latestYear];
                    
                    if (yearData && yearData._T) {
                        const totalPop = parseInt(yearData._T);
                        if (!isNaN(totalPop)) {
                            metrics.totalPopulation = totalPop.toLocaleString('fr-FR');
                        }
                    }
                }
            } catch (error) {
                console.warn('Error extracting population:', error);
                metrics.totalPopulation = '<span style="color: #e74c3c;">-</span>';
            }
        } else if (data.population && data.population.status === 'error') {
            metrics.totalPopulation = '<span style="color: #e74c3c;">-</span>';
        }
        
        // Extract employment rate from most recent year
        if (data.employment && data.employment.status === 'success' && data.employment.data) {
            try {
                const empData = data.employment.data;
                const years = Object.keys(empData).sort((a, b) => b - a);
                
                if (years.length > 0) {
                    const latestYear = years[0];
                    const yearData = empData[latestYear];
                    
                    if (yearData && yearData.taux_emploi) {
                        metrics.employmentRate = parseFloat(yearData.taux_emploi).toFixed(1);
                    }
                }
            } catch (error) {
                console.warn('Error extracting employment rate:', error);
                metrics.employmentRate = '<span style="color: #e74c3c;">-</span>';
            }
        } else if (data.employment && data.employment.status === 'error') {
            metrics.employmentRate = '<span style="color: #e74c3c;">-</span>';
        }
        
        // Extract job seekers total (only available for region, departement, epci)
        if (entityType === 'commune') {
            metrics.jobSeekersTotal = '<span style="color: var(--primary-color);">-</span>'; // Blue dash for known restriction
        } else if (data.job_seekers && data.job_seekers.status === 'success' && data.job_seekers.data) {
            try {
                const jobData = data.job_seekers.data;
                // Job seekers data is now a yearly structure, get latest year's total
                const years = Object.keys(jobData).sort((a, b) => b - a);
                
                if (years.length > 0) {
                    const latestYear = years[0];
                    const yearData = jobData[latestYear];
                    
                    if (yearData && yearData.valeurPrincipaleNombre) {
                        const total = parseInt(yearData.valeurPrincipaleNombre);
                        if (!isNaN(total)) {
                            metrics.jobSeekersTotal = total.toLocaleString('fr-FR');
                        }
                    }
                }
            } catch (error) {
                console.warn('Error extracting job seekers:', error);
                metrics.jobSeekersTotal = '<span style="color: #e74c3c;">-</span>';
            }
        } else if (data.job_seekers && data.job_seekers.status === 'error') {
            metrics.jobSeekersTotal = '<span style="color: #e74c3c;">-</span>';
        }
        
        // Extract higher education establishments count
        if (data.higher_education && data.higher_education.status === 'success' && data.higher_education.data) {
            try {
                const eduData = data.higher_education.data;
                if (eduData.total_etablissements) {
                    metrics.higherEducationCount = eduData.total_etablissements.toString();
                }
            } catch (error) {
                console.warn('Error extracting higher education count:', error);
                metrics.higherEducationCount = '<span style="color: #e74c3c;">-</span>';
            }
        } else if (data.higher_education && data.higher_education.status === 'error') {
            metrics.higherEducationCount = '<span style="color: #e74c3c;">-</span>';
        }
        
        console.log('Extracted metrics:', metrics);
        return metrics;
    }
    
    animateMetric(element, newValue) {
        // Add updating class for CSS animation
        element.classList.add('updating');
        
        // Update the value (use innerHTML if it contains HTML tags, otherwise textContent)
        if (newValue.includes('<span')) {
            element.innerHTML = newValue;
        } else {
            element.textContent = newValue;
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            element.classList.remove('updating');
        }, 300);
    }
    
    loadDataForAllSubsections() {
        if (!this.currentData) return;
        
        // Map content IDs to data and renderer methods
        const subsectionMap = {
            'population-content': { data: this.currentData.population, renderer: 'PopulationRenderer' },
            'pcs-content': { data: this.currentData.pcs, renderer: 'PCSRenderer' },
            'diploma-content': { data: this.currentData.diploma, renderer: 'DiplomaRenderer' },
            'employment-content': { data: this.currentData.employment, renderer: 'EmploymentRenderer', jobSeekersData: this.currentData.job_seekers },
            'job-seekers-content': { data: this.currentData.job_seekers, renderer: 'JobSeekersRenderer' },
            'perspectives-content': { data: this.currentData.perspectives, renderer: 'PerspectivesRenderer' },
            'higher-education-content': { data: this.currentData.higher_education, renderer: 'HigherEducationRenderer' },
            'formations-content': { data: this.currentData.formations, renderer: 'FormationsRenderer' },
            'map-content': { data: this.currentData, renderer: 'MapRenderer' }
        };
        
        // Load data for each subsection
        Object.keys(subsectionMap).forEach(contentId => {
            this.renderSubsectionData(contentId, subsectionMap[contentId]);
        });
    }
    
    renderSubsectionData(contentId, { data, renderer, jobSeekersData }) {
        const content = document.getElementById(contentId);
        if (!content) return;
        
        let html;
        
        // Use specialized renderers for each data type
        try {
            switch (renderer) {
                case 'PopulationRenderer':
                    html = PopulationRenderer.render(data);
                    break;
                case 'PCSRenderer':
                    html = PCSRenderer.render(data);
                    break;
                case 'DiplomaRenderer':
                    html = DiplomaRenderer.render(data);
                    break;
                case 'EmploymentRenderer':
                    html = EmploymentRenderer.render(data, { jobSeekersData });
                    break;
                case 'JobSeekersRenderer':
                    html = JobSeekersRenderer.render(data);
                    break;
                case 'PerspectivesRenderer':
                    html = PerspectivesRenderer.render(data);
                    break;
                case 'HigherEducationRenderer':
                    html = HigherEducationRenderer.render(data);
                    break;
                case 'FormationsRenderer':
                    html = FormationsRenderer.render(data);
                    break;
                case 'MapRenderer':
                    // Map renderer needs all data and entity info
                    const entityInfo = {
                        entityName: this.currentEntityName,
                        entityType: this.currentEntityType,
                        entityCode: this.currentEntityCode
                    };
                    html = MapRenderer.render(data, entityInfo);
                    break;
                default:
                    // Fallback to JSON display
                    html = this.renderJsonData(data, contentId);
                    break;
            }
        } catch (error) {
            console.error(`Error rendering ${renderer}:`, error);
            html = `<div class="no-data-message"><p>Erreur lors du rendu des données</p></div>`;
        }
        
        content.innerHTML = html;
        content.classList.add('has-data');
        
        // Initialize map if this is the map section
        if (contentId === 'map-content' && document.getElementById('leaflet-map')) {
            setTimeout(() => {
                try {
                    const coordinates = MapRenderer.aggregateAllCoordinates(data);
                    if (coordinates.length > 0) {
                        MapRenderer.initializeMap(coordinates, this.currentEntityInfo);
                    }
                } catch (error) {
                    console.error('Error initializing map:', error);
                }
            }, 100); // Small delay to ensure DOM is ready
        }
    }
    
    addCopyButtons(container) {
        const tables = container.querySelectorAll('table');
        tables.forEach(table => {
            const button = document.createElement('button');
            button.textContent = '📋 Copier les données';
            button.className = 'copy-btn';
            
            button.addEventListener('click', () => {
                this.copyTableData(table);
            });
            
            table.parentNode.insertBefore(button, table.nextSibling);
        });
    }
    
    copyTableData(table) {
        const rows = Array.from(table.querySelectorAll('tr'));
        const csvData = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            return cells.map(cell => cell.textContent.trim()).join('\t');
        }).join('\n');
        
        navigator.clipboard.writeText(csvData).then(() => {
            // Show success feedback
            const button = table.nextSibling;
            const originalText = button.textContent;
            button.textContent = '✅ Copié !';
            button.style.background = 'var(--success)';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
        }).catch(err => {
            console.error('Copy failed:', err);
        });
    }
    
    renderJsonData(data, contentId) {
        const sectionName = contentId.replace('-content', '').replace('-', ' ');
        return `
            <div class="json-display">
                <h4>Données ${sectionName} (format JSON temporaire)</h4>
                <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 12px; line-height: 1.4; max-height: 400px; overflow-y: auto;">
${JSON.stringify(data, null, 2)}
                </pre>
            </div>
        `;
    }
    
}