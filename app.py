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
    """
    Baut eine Verbindung zur MS-SQL-Datenbank auf.

    Nutzt den global definierten Connection-String und den ODBC Driver 18,
    um eine persistente Verbindung zum Datenbankserver herzustellen.

    :return: Ein pyodbc-Verbindungsobjekt (Connection).
    :rtype: pyodbc.Connection
    """
    return pyodbc.connect(conn_str)


# Routing ---------

@app.route("/")
def index():
    """
    Liefert die Startseite der Single-Page-Application aus.

    :return: Die statische HTML-Datei (index.html) aus dem Stammverzeichnis.
    :rtype: flask.Response
    """
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def send_static(path):
    """
    Dient dem Ausliefern weiterer statischer Ressourcen (CSS, JS, Bilder).

    :param path: Der relative Pfad zur angeforderten Datei.
    :type path: str
    :return: Die angeforderte Datei als HTTP-Response.
    :rtype: flask.Response
    """
    return send_from_directory(".", path)

@app.route('/api/layout', methods=['POST'])
def save_layout():
    """
    Speichert eine neue oder aktualisierte Layout-Konfiguration in der Datenbank.

    Nimmt ein JSON-Objekt via POST-Request entgegen, validiert dessen Struktur
    und speichert den Payload in der Tabelle 'UI_Modules'. Zur Vermeidung von
    SQL-Injection werden Parameterized Queries verwendet.

    :return: JSON-Antwort mit Erfolgs- oder Fehlermeldung sowie dem entsprechenden
             HTTP-Statuscode (201 Created, 400 Bad Request oder 500 Internal Server Error).
    :rtype: tuple
    """
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
    """
    Ruft eine Liste aller aktiven Layout-Module aus der Datenbank ab.

    Lädt ausschließlich Metadaten (ModuleID, Name, UpdatedAt) für Module,
    die als aktiv markiert sind (IsActive = 1). Diese Funktion wird vom
    Frontend genutzt, um das Lade-Menü zu befüllen.

    :return: JSON-Array mit Dictionaries der Modul-Metadaten oder eine
             Fehlermeldung bei Datenbankproblemen (HTTP 200 oder 500).
    :rtype: tuple
    """
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
    """
    Lädt die vollständige Layout-Konfiguration eines spezifischen Moduls.

    Liest den gespeicherten JSON-String aus der Spalte 'LayoutConfig'
    anhand der übergebenen Modul-ID aus und wandelt diesen zurück
    in ein natives JSON-Objekt zur Verarbeitung im Frontend.

    :param id: Die eindeutige Primärschlüssel-ID des Moduls.
    :type id: int
    :return: Das JSON-Konfigurationsobjekt (HTTP 200), eine Fehlermeldung
             falls nicht gefunden (HTTP 404), oder ein Serverfehler (HTTP 500).
    :rtype: tuple
    """
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


def is_valid_layout(data):
    """
    Prüft, ob das empfangene JSON die strukturellen Mindestanforderungen erfüllt.

    Führt eine serverseitige Validierung durch, um sicherzustellen, dass
    erforderliche Schlüssel ('version', 'moduleName', 'content') vorhanden
    sind und die Komponentenhierarchie den erwarteten Datentypen entspricht.

    :param data: Die zu überprüfenden JSON-Daten aus dem Request-Payload.
    :type data: dict
    :return: Ein Tupel bestehend aus einem Boolean-Wert (True bei Erfolg)
             und einer entsprechenden Statusmeldung.
    :rtype: tuple (bool, str)
    """
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
