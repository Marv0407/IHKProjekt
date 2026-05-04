from flask import Flask, jsonify, request

app = Flask(__name__)

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

    #TODO: data mit pyodbc in der MS-SQL Datenbank speichern

    #201 = HTTP-Statuscode -> Created
    return jsonify({"status": "success", "message": "Layout gespeichert"}), 201

@app.route('/api/layout/<id>', methods=['GET'])
def get_layout_id(id):
    #TODO: Layout mit der entsprechenden <id> aus MS-SQL laden

    #200 = HTTP-Statuscode -> OK
    return jsonify({"status": "Ddebug", "message": f"Wprde Layout {id} laden"}), 200

@app.route('/api/layouts', methods=['GET'])
def get_layouts():
    # TODO: Alle verfügbaren Layouts aus MS-SQL laden

    return jsonify(mock_layouts), 200

if __name__ == '__main__':
    app.run(debug=True)
