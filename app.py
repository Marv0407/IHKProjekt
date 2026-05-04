from flask import Flask, jsonify, request

app = Flask(__name__)

#Test
layouts = [{
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
    return "DEBUG: save_layout()", 200

@app.route('/api/layout/<id>', methods=['GET'])
def get_layout_id(id):
    layout = request.json
    return "DEBUG: get_layout_id()", 200

@app.route('/api/layouts', methods=['GET'])
def get_layouts():
    layout = request.json
    return "DEBUG: get_layouts()", layout, 200

if __name__ == '__main__':
    app.run(debug=True)
