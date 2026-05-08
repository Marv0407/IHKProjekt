import pyodbc
import json
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__)

conn_str = (
    'DRIVER={ODBC Driver 18 for SQL Server};'
    'SERVER=pse-praktika;'
    'DATABASE=Webbaukasten;'
    'UID=mmueller;'
    'PWD=Prisma1.;'
    'TrustServerCertificate=yes;'
)


def get_db_connection():
    return pyodbc.connect(conn_str)


# Routing ---------

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def send_static(path):
    return send_from_directory(".", path)

@app.route('/api/layout', methods=['POST'])
def save_layout():
    data = request.json

    is_valid, message = is_valid_layout(data)
    if not is_valid:
        # 400 (Bad Request)
        return jsonify({"status": "error", "message": message}), 400

    module_name = data.get("moduleName", "Unbekanntes Modul")

    layout_json = json.dumps(data)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # SQL-Injection-Schutz durch Parameterized Queries
        cursor.execute(
            "INSERT INTO UI_Modules (Name, LayoutConfig) VALUES (?, ?)",
            (module_name, layout_json)
        )
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"status": "success", "message": "Gespeichert in MS-SQL"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/layouts', methods=['GET'])
def get_layouts():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # ID und Name für die Auswahl-Liste
        cursor.execute("SELECT ModuleID, Name, UpdatedAt FROM UI_Modules WHERE IsActive = 1")

        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))

        cursor.close()
        conn.close()
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/layout/<int:id>', methods=['GET'])
def get_layout_id(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Gezieltes Laden eines Layout-Strings via ID
        cursor.execute("SELECT LayoutConfig FROM UI_Modules WHERE ModuleID = ?", (id,))
        row = cursor.fetchone()

        cursor.close()
        conn.close()

        if row:
            # String aus DB wird in ein JSON-Objekt umgewandelt
            return jsonify(json.loads(row[0])), 200
        else:
            return jsonify({"status": "error", "message": "Layout nicht gefunden"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# JSON-Validierung---
def is_valid_layout(data):
    """Prüft, ob das empfangene JSON die Mindestanforderungen erfüllt."""
    # 1. Muss ein Dictionary (Objekt) sein
    if not isinstance(data, dict):
        return False, "Daten sind kein gültiges JSON-Objekt."

    # 2. Pflichtfelder auf oberster Ebene prüfen
    required_keys = ['version', 'moduleName', 'content']
    for key in required_keys:
        if key not in data:
            return False, f"Pflichtfeld '{key}' fehlt."

    # 3. Struktur des 'content'-Bereichs prüfen
    content = data.get('content')
    if 'type' not in content or 'children' not in content:
        return False, "Invalide Content-Struktur (type oder children fehlt)."

    # 4. Typ-Prüfung
    if not isinstance(content['children'], list):
        return False, "'children' muss ein Array sein."

    return True, "Validierung erfolgreich."


if __name__ == '__main__':
    app.run(debug=True)
