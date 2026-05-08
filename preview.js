
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const layoutId = urlParams.get('id');
/*  !!!Nicht sicher ob das hier überhaupt notwendig ist, die vorschau soll immer das aktuelle sein
    if (layoutId) {
        // FALL A: Aus der Datenbank laden (REST API)
        fetch(`/api/layout/${layoutId}`)
            .then(res => res.json())
            .then(data => startRendering(data))
            .catch(err => console.error("DB-Ladefehler:", err));
    } else {*/
        // FALL B: Aus dem LocalStorage laden (Live-Vorschau ohne Speichern)
        const rawData = localStorage.getItem('temp_layout_preview');
        if (rawData) {
            const data = JSON.parse(rawData);
            startRendering(data);
        } else {
            document.body.innerHTML = "<h1>Kein Layout zum Anzeigen gefunden.</h1>";
        }
//!    }
});

function startRendering(data) {
    const target = document.getElementById('render-target');
    target.innerHTML = ''; // Sicherstellen, dass der Container leer ist
    renderNode(data.content, target);
    console.log(`Vorschau für Modul "${data.moduleName}" generiert.`);
}

function renderNode(node, parentElement) {
    let element;

    // Mapping von JSON-Typen auf HTML-Tags
    switch (node.type) {
        case 'canvas':
            element = document.createElement('div');
            element.className = 'final-layout-container';
            break;
        case 'button':
            element = document.createElement('button');
            element.textContent = node.props.label; // Sicherheit: textContent gegen XSS
            element.className = `btn-${node.props.theme || 'default'}`;
            break;
        case 'input':
            element = document.createElement('input');
            element.placeholder = node.props.label;
            break;
        case 'label':
            element = document.createElement('label');
            element.textContent = node.props.label;
            break;
        default:
            element = document.createElement('div');
    }

    // Grid-Positionierung zuweisen (ohne sichtbare Linien)
    if (node.props) {
        element.style.gridColumn = `${node.props.gridX} / span ${node.props.gridW || 1}`;
        element.style.gridRow = `${node.props.gridY} / span ${node.props.gridH || 1}`;
    }

    parentElement.appendChild(element);

    // Rekursion: Kinder rendern
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => renderNode(child, element));
    }
}
