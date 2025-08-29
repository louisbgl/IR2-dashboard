# IR2 Dashboard

French demographic and economic data visualization dashboard using INSEE MELODI, ONISEP, and France Travail APIs.

**Live Demo:**
- https://ir2-dashboard-x.onrender.com
- https://ir2.fr/dashboard

## Features

- **Geographic Search**: Search for French communes, EPCIs, departments, and regions
- **Comprehensive Data Visualization**: Population demographics, employment statistics, education levels, socio-professional categories
- **Document-Style Interface**: Clean, readable layout with expandable sections and progressive disclosure
- **Interactive Charts**: Age demographics with SVG line charts, donut charts, horizontal bars
- **Mobile Responsive**: Works seamlessly on all devices with touch-friendly design
- **Data Export**: Copy table data as tab-separated values for Excel/Sheets
- **Geographic Map**: Interactive Leaflet map showing all data points
- **Multiple Data Sources**: INSEE MELODI, ONISEP, and France Travail APIs

## Quick Start

### Prerequisites
- Python 3.8+
- Modern web browser

### Backend Setup
```bash
# One-command startup (recommended)
./start_backend.sh

# Or manual setup:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python tests/run_tests.py
python -m src.backend.back
```

### Frontend
```bash
cd src/frontend
python -m http.server 5500
# Visit http://localhost:5500
```

## Data Sections

### ✅ Available Visualizations
- **👥 Population Demographics**: Age group analysis with interactive evolution charts
- **👔 Socio-Professional Categories**: Donut chart with trend analysis showing all categories
- **🎓 Education Levels**: Horizontal bar charts with evolution tracking
- **📈 Employment Statistics**: Key metrics with horizontal layout and trend visualization
- **🔍 Job Seekers Data**: Demographic breakdowns and statistics
- **💡 Employer Perspectives**: Market tension indicators with user-friendly explanations
- **🏢 Higher Education**: Institution analysis with status and geographic distribution
- **📚 Training Programs**: Course listings with sector analysis
- **🗺️ Unified Map**: Interactive geographic visualization with coordinate aggregation

## API Endpoints

- `GET /dashboard/health` - Health check
- `GET /dashboard/search?q=<query>` - Search geographic entities  
- `GET /dashboard/population?entity_code=<code>&entity_type=<type>` - Population data
- `GET /dashboard/employment?entity_code=<code>&entity_type=<type>` - Employment statistics
- `GET /dashboard/pcs?entity_code=<code>&entity_type=<type>` - Socio-professional categories
- `GET /dashboard/diploma?entity_code=<code>&entity_type=<type>` - Education levels
- `GET /dashboard/higher_education?entity_code=<code>&entity_type=<type>` - Higher education establishments
- `GET /dashboard/formations?entity_code=<code>&entity_type=<type>` - Training courses
- `GET /dashboard/job_seekers?entity_code=<code>&entity_type=<type>` - Job seekers data
- `GET /dashboard/perspectives?entity_code=<code>&entity_type=<type>` - Employer perspectives

**Entity Types**: `commune`, `epci`, `departement`, `region`

## Project Structure

```
src/
├── backend/             # Flask API server
│   ├── back.py          # Main application with CORS & validation
│   ├── franceGeo.py     # Geographic data management
│   ├── queryINSEE.py    # INSEE API client
│   ├── queryONISEP.py   # ONISEP API client
│   ├── queryFranceTravail.py # France Travail API client
│   └── data/            # Reference data (EPCI_2025.csv)
└── frontend/            # Document-style interface
    ├── index.html       # Modern semantic HTML
    ├── js/              # Modular JavaScript
    │   ├── App.js       # Main application controller
    │   ├── Dashboard.js # Document dashboard manager
    │   ├── search-handler.js # Enhanced search functionality
    │   └── renderers/   # Specialized data renderers (9 modules)
    └── css/             # Modular stylesheets with unique scoping

tests/                   # Test suite
docs/                    # Documentation
archive/                 # Previous versions
```

## Technology Stack

**Backend:**
- Flask with CORS support and input validation
- Requests HTTP client
- python-dotenv configuration

**Frontend:**
- Vanilla JavaScript ES6 modules
- Responsive CSS Grid & Flexbox
- SVG interactive charts
- Leaflet.js for maps
- Progressive disclosure UX pattern

**Data Sources:**
- INSEE MELODI API (demographics)
- ONISEP API (education)
- France Travail API (employment)

## Architecture

### Specialized Data Renderers
Each data type has its own renderer with:
- Standardized `{status: "success", data: {...}}` backend responses
- Unique CSS scoping to prevent conflicts
- French number formatting with `toLocaleString('fr-FR')`
- Error handling and graceful degradation
- Mobile-first responsive design

### Key Features
- **Mathematical reliability**: Year sorting using operations, not trusting backend order
- **Accessibility**: Semantic HTML structure with proper heading hierarchy
- **Maintenance**: Modular architecture allows easy addition of new data types
- **Performance**: On-demand data loading with progress tracking

## Testing

```bash
# Simple tests
python tests/run_tests.py

# Full test suite (requires pytest)
pip install -r tests/requirements.txt
pytest tests/ -v
```

## Configuration

Copy `.env.example` to `.env` and adjust settings:
```bash
DEBUG=False
CSV_DATA_PATH=src/backend/data/EPCI_2025.csv
API_TIMEOUT=5
CORS_ORIGINS=https://ir2.fr,http://localhost:5500
```

## Documentation

- `docs/GETTING_STARTED.md` - Setup and usage guide
- `docs/TESTING.md` - Testing documentation
- `CLAUDE.md` - Development reference and architecture notes