import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from .franceGeo import FranceGeo
from .queryINSEE import QueryINSEE
from .queryONISEP import QueryONISEP
from .queryFranceTravail import QueryFranceTravail

# Load environment variables safely
load_dotenv()

# Configuration
# Environment-aware CORS handling
if os.getenv('DEBUG', 'False').lower() == 'true':
    # Development: Allow common dev ports + production origins
    dev_ports = [5500, 5501, 5502, 5503, 8000, 8080, 3000, 3001]
    localhost_origins = [f'http://localhost:{port}' for port in dev_ports] + [f'http://127.0.0.1:{port}' for port in dev_ports]
    production_origins = os.getenv('CORS_ORIGINS', 'https://ir2.fr,https://ir2-dashboard-x.onrender.com').split(',')
    CORS_ORIGINS = localhost_origins + production_origins
else:
    # Production: Only allowed production origins
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'https://ir2.fr,https://ir2-dashboard-x.onrender.com').split(',')
API_TIMEOUT = int(os.getenv('API_TIMEOUT', '5'))

# Input validation
def validate_entity_code(code):
    """Validate entity code format and length"""
    if not code or len(code.strip()) == 0:
        raise ValueError("Entity code is required")
    
    code = code.strip()
    if len(code) > 10:
        raise ValueError("Entity code too long")
    
    # Allow alphanumeric characters and hyphens
    if not all(c.isalnum() or c in '-_' for c in code):
        raise ValueError("Invalid entity code format")
    
    return code

def validate_entity_type(entity_type):
    """Validate entity type"""
    if not entity_type:
        entity_type = 'commune'
    
    valid_types = ['commune', 'epci', 'departement', 'region']
    if entity_type not in valid_types:
        raise ValueError(f"Invalid entity type. Must be one of: {', '.join(valid_types)}")
    
    return entity_type

app = Flask(__name__)
CORS(app, origins=CORS_ORIGINS)

# Get the absolute path to the CSV file
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.getenv('CSV_DATA_PATH', os.path.join(script_dir, 'data', 'EPCI_2025.csv'))

# Create an instance of FranceGeo
france_geo = FranceGeo(csv_path)

# Create an instance of QueryINSEE
query_insee = QueryINSEE(france_geo)

# Create an instance of QueryONISEP
query_onisep = QueryONISEP(france_geo)

# Create an instance of QueryFranceTravail
query_francetravail = QueryFranceTravail(france_geo)

# Generic error handling
def handle_data_endpoint(query_func, request_args):
    """Generic handler for data endpoints with validation and error handling"""
    try:
        entity_code = validate_entity_code(request_args.get('entity_code'))
        entity_type = validate_entity_type(request_args.get('entity_type', 'commune'))
        
        result = query_func(entity_code, entity_type)
        return jsonify({
            'status': 'success',
            'data': result
        })
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400
    except Exception:
        return jsonify({
            'status': 'error', 
            'message': 'API unavailable'
        }), 200

def handle_francetravail_endpoint(query_func, request_args, default_type='epci'):
    """Special handler for FranceTravail endpoints with status handling"""
    try:
        entity_code = validate_entity_code(request_args.get('entity_code'))
        entity_type = validate_entity_type(request_args.get('entity_type', default_type))
        
        result = query_func(entity_code, entity_type)
        
        # Check if result is a status object or raw data
        if isinstance(result, dict) and 'status' in result:
            # Result is already a status object (not_available, error, etc.)
            return jsonify(result), 200
        else:
            # Result is raw data, wrap in success format
            return jsonify({
                'status': 'success',
                'data': result
            }), 200
            
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400
    except Exception:
        return jsonify({
            'status': 'error',
            'message': 'API unavailable'
        }), 200

@app.route('/')
def home():
    return jsonify({"message": "IR2 Dashboard API", "version": "1.1"})


@app.route('/dashboard/search', methods=['GET'])
def search():
    """
    Search endpoint that returns geographic entities matching the query
    
    Query parameters:
    - q: The search query (2-100 characters)
    
    Returns:
    - JSON with search results
    """
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify({
            'status': 'error',
            'message': 'Missing query parameter',
            'results': {
                'communes': [],
                'epcis': [],
                'departements': [],
                'regions': []
            }
        }), 400
    
    if len(query) < 2:
        return jsonify({
            'status': 'error',
            'message': 'Query must be at least 2 characters',
            'results': {
                'communes': [],
                'epcis': [],
                'departements': [],
                'regions': []
            }
        }), 400
        
    if len(query) > 100:
        return jsonify({
            'status': 'error', 
            'message': 'Query too long (max 100 characters)',
            'results': {
                'communes': [],
                'epcis': [],
                'departements': [],
                'regions': []
            }
        }), 400
    
    try:
        results = france_geo.searchName(query)
        return jsonify({
            'status': 'success',
            'results': results
        })
    except Exception:
        return jsonify({
            'status': 'error',
            'message': 'Search unavailable',
            'results': {
                'communes': [],
                'epcis': [],
                'departements': [],
                'regions': []
            }
        }), 200

    
@app.route('/dashboard/population', methods=['GET'])
def population():
    """
    Endpoint to get population data for a specific entity
    
    Query parameters:
    - entity_code: The code of the entity (commune, EPCI, departement, region)
    - entity_type: Type of entity ("commune", "epci", "departement", "region")
    
    Returns:
    - JSON with population data
    """
    return handle_data_endpoint(query_insee.query_population, request.args)
    

@app.route('/dashboard/pcs', methods=['GET'])
def pcs():
    """
    Endpoint to get PCS data for a specific entity
    
    Query parameters:
    - entity_code: The code of the entity (commune, EPCI, departement, region)
    - entity_type: Type of entity ("commune", "epci", "departement", "region")
    
    Returns:
    - JSON with PCS data
    """
    return handle_data_endpoint(query_insee.query_pcs, request.args)
    

@app.route('/dashboard/diploma', methods=['GET'])
def diploma():
    """
    Endpoint to get diplomas data for a specific entity
    
    Query parameters:
    - entity_code: The code of the entity (commune, EPCI, departement, region)
    - entity_type: Type of entity ("commune", "epci", "departement", "region")
    
    Returns:
    - JSON with diplomas data
    """
    return handle_data_endpoint(query_insee.query_diplomas, request.args)


@app.route('/dashboard/employment', methods=['GET'])
def employment():
    """
    Endpoint to get employment data for a specific entity
    
    Query parameters:
    - entity_code: The code of the entity (commune, EPCI, departement, region)
    - entity_type: Type of entity ("commune", "epci", "departement", "region")
    
    Returns:
    - JSON with employment data including:
      - nombre_actifs: Total active population
      - nombre_actifs_ayant_emploi: Employed population
      - taux_emploi: Employment rate
      - nombre_chomeurs: Unemployed population
      - taux_chomage: Unemployment rate
    """
    return handle_data_endpoint(query_insee.query_employment, request.args)


@app.route('/dashboard/higher_education', methods=['GET'])
def higher_education():
    """
    Endpoint to query higher education establishments in a specific entity
    
    Query parameters:
    - entity_code: The code of the entity (commune, EPCI, departement, region)
    - entity_type: Type of entity ("commune", "epci", "departement", "region")
    
    Returns:
    - JSON with higher education data including:
      - total_etablissements: Total number of establishments
      - status_counts: Counts of establishments by status
      - type_counts: Counts of establishments by type
      - coordinates: List of coordinates for each establishment
    """
    return handle_data_endpoint(query_onisep.query_enseignement, request.args)


@app.route('/dashboard/formations', methods=['GET'])
def formations():
    """
    Endpoint to query training courses in a specific entity
    
    Query parameters:
    - entity_code: The code of the entity (commune, EPCI, departement, region)
    - entity_type: Type of entity ("commune", "epci", "departement", "region")
    
    Returns:
    - JSON with training courses data including:
      - total_formations: Total number of training courses
      - status_counts: Counts of courses by status
      - type_counts: Counts of courses by type
      - coordinates: List of coordinates for each course
    """
    return handle_data_endpoint(query_onisep.query_formations, request.args)


@app.route('/dashboard/job_seekers', methods=['GET'])
def job_seekers():
    """
    Endpoint to get job seekers (demandeurs d'emploi) data for a specific entity
    
    Query parameters:
    - entity_code: The code of the entity (EPCI, departement, region)
    - entity_type: Type of entity ("epci", "departement", "region")
    
    Returns:
    - JSON with yearly averaged job seekers data or appropriate error/not available message
    """
    return handle_francetravail_endpoint(query_francetravail.query_demandeurs_emploi, request.args, 'epci')

@app.route('/dashboard/perspectives', methods=['GET'])
def perspectives():
    """
    Endpoint to get employer perspectives data for a specific entity
    
    Query parameters:
    - entity_code: The code of the entity (departement, region)
    - entity_type: Type of entity ("departement", "region")
    
    Returns:
    - JSON with employer perspectives data organized by year or appropriate error/not available message
    """
    return handle_francetravail_endpoint(query_francetravail.query_perspectives_employeur, request.args, 'departement')

@app.route('/dashboard/health', methods=['GET'])
def health_check():
    """Health check endpoint with system status"""
    return jsonify({
        'status': 'ok',
        'version': '1.1',
        'france_geo_loaded': len(france_geo.communes) > 0,
        'total_communes': len(france_geo.communes)
    })

if __name__ == '__main__':
    debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)