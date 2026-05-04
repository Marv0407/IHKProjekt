import pyodbc
import json
from flask import Flask, jsonify, request

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

#mock_data
mock_layouts = [{
    "version": "1.0",
    "moduleName": "Kunden-Login-Formular",
    "content": {
        "id": "root",
        "type": "canvas",
        "props": { "gridCols": 12, "gridRows": 10 },
        "children": [
            {
                "id": "btn_1",
                "type": "button",
                "props": { "label": "Absenden", "theme": "primary", "gridX": 1, "gridY": 5 }
            }
        ]
    }
}]

@app.route('/api/layout', methods=['POST'])
def save_layout():
    data = request.json

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

if __name__ == '__main__':
    app.run(debug=True)
