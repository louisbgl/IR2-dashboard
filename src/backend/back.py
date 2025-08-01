import os
from flask import Flask, jsonify, request
from flask_cors import CORS

from .franceGeo import FranceGeo
from .queryINSEE import QueryINSEE
from .queryONISEP import QueryONISEP

app = Flask(__name__)
CORS(app, origins=[
    "https://ir2.fr",
    "https://ir2-dashboard-x.onrender.com",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
])

# Get the absolute path to the script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
# Create the path to the CSV file
csv_path = os.path.join(script_dir, 'data', 'EPCI_2025.csv')

# Create an instance of FranceGeo
france_geo = FranceGeo(csv_path)

# Create an instance of QueryINSEE
query_insee = QueryINSEE(france_geo)

# Create an instance of QueryONISEP
query_onisep = QueryONISEP(france_geo)

@app.route('/')
def home():
    return "Welcome to my dashboard backend!"


@app.route('/dashboard/search', methods=['GET'])
def search():
    """
    Search endpoint that returns geographic entities matching the query
    
    Query parameters:
    - q: The search query
    
    Returns:
    - JSON with search results
    """
    query = request.args.get('q', '')
    
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
    
    try:
        results = france_geo.searchName(query)
        return jsonify({
            'status': 'success',
            'results': results
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'results': {
                'communes': [],
                'epcis': [],
                'departements': [],
                'regions': []
            }
        }), 500

    
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
    entity_code = request.args.get('entity_code')
    entity_type = request.args.get('entity_type', 'commune')

    print(f"Received request for entity_code: {entity_code}, entity_type: {entity_type}")

    if not entity_code:
        return jsonify({
            'status': 'error',
            'message': 'Missing entity_code parameter'
        }), 400
    
    try:
        result = query_insee.query_population(entity_code, entity_type)
        return jsonify({
            'status': 'success',
            'data': result
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    

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
    entity_code = request.args.get('entity_code')
    entity_type = request.args.get('entity_type', 'commune')

    print(f"Received request for entity_code: {entity_code}, entity_type: {entity_type}")

    if not entity_code:
        return jsonify({
            'status': 'error',
            'message': 'Missing entity_code parameter'
        }), 400
    
    try:
        result = query_insee.query_pcs(entity_code, entity_type)
        return jsonify({
            'status': 'success',
            'data': result
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    

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
    entity_code = request.args.get('entity_code')
    entity_type = request.args.get('entity_type', 'commune')

    print(f"Received request for entity_code: {entity_code}, entity_type: {entity_type}")

    if not entity_code:
        return jsonify({
            'status': 'error',
            'message': 'Missing entity_code parameter'
        }), 400
    
    try:
        result = query_insee.query_diplomas(entity_code, entity_type)
        return jsonify({
            'status': 'success',
            'data': result
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

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
    entity_code = request.args.get('entity_code')
    entity_type = request.args.get('entity_type', 'commune')

    print(f"Received request for entity_code: {entity_code}, entity_type: {entity_type}")

    if not entity_code:
        return jsonify({
            'status': 'error',
            'message': 'Missing entity_code parameter'
        }), 400
    
    try:
        result = query_insee.query_employment(entity_code, entity_type)
        return jsonify({
            'status': 'success',
            'data': result
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

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
    entity_code = request.args.get('entity_code')
    entity_type = request.args.get('entity_type', 'commune')

    print(f"Received request for higher education data for entity_code: {entity_code}, entity_type: {entity_type}")

    if not entity_code:
        return jsonify({
            'status': 'error',
            'message': 'Missing entity_code parameter'
        }), 400
    
    try:
        result = query_onisep.query_enseignement(entity_code, entity_type)
        return jsonify({
            'status': 'success',
            'data': result
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/dashboard/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
