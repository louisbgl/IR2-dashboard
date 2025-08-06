import csv
import unicodedata
from collections import defaultdict

class FranceGeo:
    @staticmethod
    def normalize_text(text):
        """
        Normalize text by converting to lowercase and removing accents.
        Used only for comparison during searches, not for storing data.
        
        Args:
            text (str): The text to normalize
            
        Returns:
            str: The normalized text (lowercase, no accents)
        """
        if not text:
            return ""
        # Convert to lowercase
        text = text.lower()
        # Normalize unicode characters and remove accents
        text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
        return text
    
    # Hardcoded region lookup table
    REGIONS = {
        "84": "Auvergne-Rhône-Alpes",
        "27": "Bourgogne-Franche-Comté",
        "53": "Bretagne",
        "24": "Centre-Val de Loire",
        "94": "Corse",
        "44": "Grand Est",
        "32": "Hauts-de-France",
        "11": "Île-de-France",
        "28": "Normandie",
        "75": "Nouvelle-Aquitaine",
        "76": "Occitanie",
        "52": "Pays de la Loire",
        "93": "Provence-Alpes-Côte d'Azur"
    }
    
    # Hardcoded department lookup table
    DEPARTEMENTS = {
        "01": "Ain",
        "02": "Aisne",
        "03": "Allier",
        "04": "Alpes-de-Haute-Provence",
        "05": "Hautes-Alpes",
        "06": "Alpes-Maritimes",
        "07": "Ardèche",
        "08": "Ardennes",
        "09": "Ariège",
        "10": "Aube",
        "11": "Aude",
        "12": "Aveyron",
        "13": "Bouches-du-Rhône",
        "14": "Calvados",
        "15": "Cantal",
        "16": "Charente",
        "17": "Charente-Maritime",
        "18": "Cher",
        "19": "Corrèze",
        "2A": "Corse-du-Sud",
        "2B": "Haute-Corse",
        "21": "Côte-d'Or",
        "22": "Côtes-d'Armor",
        "23": "Creuse",
        "24": "Dordogne",
        "25": "Doubs",
        "26": "Drôme",
        "27": "Eure",
        "28": "Eure-et-Loir",
        "29": "Finistère",
        "30": "Gard",
        "31": "Haute-Garonne",
        "32": "Gers",
        "33": "Gironde",
        "34": "Hérault",
        "35": "Ille-et-Vilaine",
        "36": "Indre",
        "37": "Indre-et-Loire",
        "38": "Isère",
        "39": "Jura",
        "40": "Landes",
        "41": "Loir-et-Cher",
        "42": "Loire",
        "43": "Haute-Loire",
        "44": "Loire-Atlantique",
        "45": "Loiret",
        "46": "Lot",
        "47": "Lot-et-Garonne",
        "48": "Lozère",
        "49": "Maine-et-Loire",
        "50": "Manche",
        "51": "Marne",
        "52": "Haute-Marne",
        "53": "Mayenne",
        "54": "Meurthe-et-Moselle",
        "55": "Meuse",
        "56": "Morbihan",
        "57": "Moselle",
        "58": "Nièvre",
        "59": "Nord",
        "60": "Oise",
        "61": "Orne",
        "62": "Pas-de-Calais",
        "63": "Puy-de-Dôme",
        "64": "Pyrénées-Atlantiques",
        "65": "Hautes-Pyrénées",
        "66": "Pyrénées-Orientales",
        "67": "Bas-Rhin",
        "68": "Haut-Rhin",
        "69": "Rhône",
        "70": "Haute-Saône",
        "71": "Saône-et-Loire",
        "72": "Sarthe",
        "73": "Savoie",
        "74": "Haute-Savoie",
        "75": "Paris",
        "76": "Seine-Maritime",
        "77": "Seine-et-Marne",
        "78": "Yvelines",
        "79": "Deux-Sèvres",
        "80": "Somme",
        "81": "Tarn",
        "82": "Tarn-et-Garonne",
        "83": "Var",
        "84": "Vaucluse",
        "85": "Vendée",
        "86": "Vienne",
        "87": "Haute-Vienne",
        "88": "Vosges",
        "89": "Yonne",
        "90": "Territoire de Belfort",
        "91": "Essonne",
        "92": "Hauts-de-Seine",
        "93": "Seine-Saint-Denis",
        "94": "Val-de-Marne",
        "95": "Val-d'Oise",
        "971": "Guadeloupe",
        "972": "Martinique",
        "973": "Guyane",
        "974": "La Réunion",
        "976": "Mayotte"
    }
    
    def __init__(self, csv_path):
        """
        Initialize the FranceGeo class with geographic data from a CSV file.
        
        Args:
            csv_path (str): Path to the CSV file containing geographic data.
                            Expected format: semicolon-separated with columns for
                            commune code, commune name, EPCI code, EPCI name,
                            department code, and region code.
        """
        self.communes = {}                    # code_commune -> {...}
        self.epcis = defaultdict(set)         # code_epci -> set of code_commune
        self.departements = defaultdict(set)  # code_departement -> set of code_commune
        self.regions = defaultdict(set)       # code_region -> set of code_commune

        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            # Use semicolon as delimiter for EPCI_2025.csv format
            reader = csv.reader(csvfile, delimiter=';')
            # Skip header if exists (uncomment if your file has headers)
            # header = next(reader, None)

            for row in reader:
                if len(row) < 6:
                    continue  # Skip invalid rows
                    
                # Map CSV columns to appropriate variables
                code_commune = row[0]
                nom_commune = row[1]
                code_epci = row[2]
                nom_epci = row[3]
                code_departement = row[4]
                code_region = row[5]
                
                # Use lookup tables for department and region names
                nom_departement = self.DEPARTEMENTS.get(code_departement, f"Département {code_departement}")
                nom_region = self.REGIONS.get(code_region, f"Région {code_region}")
                
                self.communes[code_commune] = {
                    "nom": nom_commune,
                    "code": code_commune,
                    "code_epci": code_epci,
                    "code_departement": code_departement,
                    "code_region": code_region,
                    "nom_epci": nom_epci,
                    "nom_departement": nom_departement,
                    "nom_region": nom_region
                }

                # Add commune to the appropriate collections
                self.epcis[code_epci].add(code_commune)
                self.departements[code_departement].add(code_commune)
                self.regions[code_region].add(code_commune)

    def get_communes_in_epci(self, code_epci):
        """
        Get all communes that belong to a specific EPCI.
        
        Args:
            code_epci (str): The EPCI code to look up.
            
        Returns:
            list: A list of commune information dictionaries.
        """
        commune_codes = self.epcis.get(code_epci, [])
        result = []
        for commune_code in commune_codes:
            commune_info = self.communes.get(commune_code)
            if commune_info:
                result.append(commune_info)
        return result

    def get_communes_in_departement(self, code_departement):
        """
        Get all communes that belong to a specific department.
        
        Args:
            code_departement (str): The department code to look up.
            
        Returns:
            list: A list of commune information dictionaries.
        """
        commune_codes = self.departements.get(code_departement, [])
        result = []
        for commune_code in commune_codes:
            commune_info = self.communes.get(commune_code)
            if commune_info:
                result.append(commune_info)
        return result

    def get_communes_in_region(self, code_region):
        """
        Get all communes that belong to a specific region.
        
        Args:
            code_region (str): The region code to look up.
            
        Returns:
            list: A list of commune information dictionaries.
        """
        commune_codes = self.regions.get(code_region, [])
        result = []
        for commune_code in commune_codes:
            commune_info = self.communes.get(commune_code)
            if commune_info:
                result.append(commune_info)
        return result

    def get_commune_info(self, code_commune):
        """
        Get information about a specific commune.
        
        Args:
            code_commune (str): The commune code to look up.
            
        Returns:
            dict: Information about the commune or None if not found.
        """
        return self.communes.get(code_commune)

    def search_communes_by_name(self, query):
        """
        Search for communes by name.
        
        Args:
            query (str): The search query string.
            
        Returns:
            list: A list of commune information dictionaries that match the query.
        """
        normalized_query = self.normalize_text(query)
        result = []
        for commune in self.communes.values():
            normalized_name = self.normalize_text(commune['nom'])
            if normalized_query in normalized_name:
                result.append(commune)
        return result

    def search_epci_by_name(self, query):
        """
        Search for EPCIs by name.
        
        Args:
            query (str): The search query string.
            
        Returns:
            list: A list of (EPCI code, EPCI name) tuples that match the query.
        """
        normalized_query = self.normalize_text(query)
        epci_dict = {}
        for commune in self.communes.values():
            epci_name = commune["nom_epci"]
            normalized_name = self.normalize_text(epci_name)
            if normalized_query in normalized_name:
                epci_dict[commune["code_epci"]] = epci_name
        
        # Convert dictionary to list of tuples
        result = list(epci_dict.items())
        return result

    def search_departements_by_name(self, query):
        """
        Search for departments by name.
        
        Args:
            query (str): The search query string.
            
        Returns:
            list: A list of (department code, department name) tuples that match the query.
        """
        normalized_query = self.normalize_text(query)
        dept_dict = {}
        
        # First search in the lookup table
        for code, name in self.DEPARTEMENTS.items():
            normalized_name = self.normalize_text(name)
            if normalized_query in normalized_name:
                dept_dict[code] = name
        
        # Also search in commune data (for departments not in lookup)
        for commune in self.communes.values():
            dept_code = commune["code_departement"]
            if dept_code in dept_dict:  # Skip if already found
                continue
                
            dept_name = commune["nom_departement"]
            normalized_name = self.normalize_text(dept_name)
            if normalized_query in normalized_name:
                dept_dict[dept_code] = dept_name
        
        # Convert dictionary to list of tuples
        result = list(dept_dict.items())
        return result

    def search_regions_by_name(self, query):
        """
        Search for regions by name.
        
        Args:
            query (str): The search query string.
            
        Returns:
            list: A list of (region code, region name) tuples that match the query.
        """
        normalized_query = self.normalize_text(query)
        region_dict = {}
        
        # First search in the lookup table
        for code, name in self.REGIONS.items():
            normalized_name = self.normalize_text(name)
            if normalized_query in normalized_name:
                region_dict[code] = name
        
        # Also search in commune data (for regions not in lookup)
        for commune in self.communes.values():
            region_code = commune["code_region"]
            if region_code in region_dict:  # Skip if already found
                continue
                
            region_name = commune["nom_region"]
            normalized_name = self.normalize_text(region_name)
            if normalized_query in normalized_name:
                region_dict[region_code] = region_name
        
        # Convert dictionary to list of tuples
        result = list(region_dict.items())
        return result

    def get_commune_codes_in_epci(self, code_epci):
        """
        Get the list of commune codes in a specific EPCI.
        
        Args:
            code_epci (str): The EPCI code to look up.
            
        Returns:
            list: A list of commune codes.
        """
        return list(self.epcis.get(code_epci, []))

    def get_commune_codes_in_departement(self, code_departement):
        """
        Get the list of commune codes in a specific department.
        
        Args:
            code_departement (str): The department code to look up.
            
        Returns:
            list: A list of commune codes.
        """
        return list(self.departements.get(code_departement, []))

    def get_commune_codes_in_region(self, code_region):
        """
        Get the list of commune codes in a specific region.
        
        Args:
            code_region (str): The region code to look up.
            
        Returns:
            list: A list of commune codes.
        """
        return list(self.regions.get(code_region, []))
    
    def does_commune_code_exist(self, code_commune):
        """
        Check if a commune code exists in the data.
        
        Args:
            code_commune (str): The commune code to check.
            
        Returns:
            bool: True if the commune code exists, False otherwise.
        """
        return code_commune in self.communes
    
    def does_epci_code_exist(self, code_epci):
        """
        Check if an EPCI code exists in the data.
        
        Args:
            code_epci (str): The EPCI code to check.
            
        Returns:
            bool: True if the EPCI code exists, False otherwise.
        """
        return code_epci in self.epcis
    
    def does_departement_code_exist(self, code_departement):
        """
        Check if a department code exists in the data.
        
        Args:
            code_departement (str): The department code to check.
            
        Returns:
            bool: True if the department code exists, False otherwise.
        """
        return code_departement in self.departements
    
    def does_region_code_exist(self, code_region):
        """
        Check if a region code exists in the data.
        
        Args:
            code_region (str): The region code to check.
            
        Returns:
            bool: True if the region code exists, False otherwise.
        """
        return code_region in self.regions
        
    def searchName(self, query):
        """
        Search for any geographic entity (commune, EPCI, department, region) containing the query string.
        The search is accent-insensitive (e.g., "reunion" will match "réunion").
        
        Args:
            query (str): The search query string.
            
        Returns:
            dict: A dictionary with four keys ('communes', 'epcis', 'departements', 'regions'),
                  each containing a list of matching entities with their relevant information.
        """
        normalized_query = self.normalize_text(query)
        
        # Initialize results
        results = {
            'communes': [],
            'epcis': [],
            'departements': [],
            'regions': []
        }
        
        # Search for communes
        for commune in self.communes.values():
            normalized_name = self.normalize_text(commune['nom'])
            if normalized_query in normalized_name:
                results['communes'].append({
                    'code': commune['code'],
                    'nom': commune['nom']
                })
                
        # Search for EPCIs
        epci_dict = {}
        for commune in self.communes.values():
            epci_name = commune["nom_epci"]
            epci_code = commune["code_epci"]
            normalized_epci = self.normalize_text(epci_name)
            if normalized_query in normalized_epci and epci_code not in epci_dict:
                epci_dict[epci_code] = True
                results['epcis'].append({
                    'code': epci_code,
                    'nom': epci_name
                })
                
        # Search for departments (using both our lookup table and stored names)
        dept_dict = {}
        
        # First search in the lookup table
        for code, name in self.DEPARTEMENTS.items():
            normalized_name = self.normalize_text(name)
            if normalized_query in normalized_name and code not in dept_dict:
                dept_dict[code] = True
                results['departements'].append({
                    'code': code,
                    'nom': name
                })
        
        # Then search in the commune data
        for commune in self.communes.values():
            dept_code = commune["code_departement"]
            dept_name = commune["nom_departement"]
            normalized_dept = self.normalize_text(dept_name)
            if normalized_query in normalized_dept and dept_code not in dept_dict:
                dept_dict[dept_code] = True
                results['departements'].append({
                    'code': dept_code,
                    'nom': dept_name
                })
                
        # Search for regions (using both our lookup table and stored names)
        region_dict = {}
        
        # First search in the lookup table
        for code, name in self.REGIONS.items():
            normalized_name = self.normalize_text(name)
            if normalized_query in normalized_name and code not in region_dict:
                region_dict[code] = True
                results['regions'].append({
                    'code': code,
                    'nom': name
                })
        
        # Then search in the commune data
        for commune in self.communes.values():
            region_code = commune["code_region"]
            region_name = commune["nom_region"]
            normalized_region = self.normalize_text(region_name)
            if normalized_query in normalized_region and region_code not in region_dict:
                region_dict[region_code] = True
                results['regions'].append({
                    'code': region_code,
                    'nom': region_name
                })
        
        return results

    def get_region_name_from_code(self, code_region):
        return self.REGIONS.get(code_region, "ERROR: Unknown region code")
    
    def get_region_name_from_epci_code(self, code_epci):
        for commune in self.communes.values():
            if commune["code_epci"] == code_epci:
                return commune["nom_region"]
        return "ERROR: Unknown EPCI code"
    
    def get_departement_name_from_code(self, code_departement):
        return self.DEPARTEMENTS.get(code_departement, "ERROR: Unknown department code")
    
    def get_departement_name_from_commune_code(self, code_commune):
        commune_info = self.communes.get(code_commune)
        if commune_info:
            return commune_info["nom_departement"]
        return "ERROR: Unknown commune code"
    
    def get_departement_code_from_commune_code(self, code_commune):
        commune_info = self.communes.get(code_commune)
        if commune_info:
            return commune_info["code_departement"]
        return "ERROR: Unknown commune code"
    
    def get_commune_codes_in_epci(self, code_epci):
        return list(self.epcis.get(code_epci, []))
    
    def get_commune_name_from_code(self, code_commune):
        commune_info = self.communes.get(code_commune)
        if commune_info:
            return commune_info["nom"]
        return "ERROR: Unknown commune code"