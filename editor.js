/**
 * Zentrales Zustandsobjekt (Single Source of Truth) für das aktuelle Layout.
 * @type {Object}
 */
let layoutState = {
    version: "1.0",
    moduleName: "Neues Modul",
    content: {
        id: "root",
        type: "canvas",
        props: { gridCols: 12, gridRows: 20 },
        children: []
    }
}

/** * Referenz auf das Haupt-Canvas-Element.
 * @type {HTMLElement}
 */
const canvas = document.getElementById("drop-canvas")

/**
 * Initialisiert die Drag-Operation für die UI-Komponenten in der Sidebar.
 * Übergibt den Data-Type der Komponente an das `dataTransfer`-Objekt für die spätere Verarbeitung.
 */
document.querySelectorAll(".draggable-item").forEach(item => {
    item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("component-type", e.target.getAttribute("data-type"))
    })
})

/**
 * Erlaubt das Drop-Event auf dem Canvas durch Unterdrückung des Standard-Browserverhaltens.
 */
canvas.addEventListener("dragover", (e) =>{
    e.preventDefault()
})

/**
 * Verarbeitet das Drop-Event und positioniert die neue Komponente im Grid-System.
 * Berechnet die genaue Spalten- und Zeilenposition basierend auf der Mausposition relativ zum Canvas.
 * @param {DragEvent} e - Das Drop-Ereignis.
 */
canvas.addEventListener('drop', (e) => {
    e.preventDefault()

    const type = e.dataTransfer.getData('component-type')
    const rect = canvas.getBoundingClientRect()

    // 1. Relative Mausposition innerhalb des Canvas ermitteln
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 2. Umrechnung der Pixel-Koordinaten in das 12-Spalten-Raster
    const colWidth = rect.width / 12
    const gridX = Math.floor(x / colWidth) + 1
    const gridY = Math.floor(y / 50) + 1 // Basis-Zeilenhöhe: 50px

    addComponent(type, gridX, gridY)
})

/**
 * Erstellt ein neues Komponenten-Objekt und fügt es dem globalen Zustand (`layoutState`) hinzu.
 * @param {string} type - Der Typ der Komponente (z. B. 'button', 'input').
 * @param {number} x - Die berechnete Startspalte im CSS-Grid.
 * @param {number} y - Die berechnete Startzeile im CSS-Grid.
 */
function addComponent(type, x, y) {
    const id = `${type}_${Date.now()}`

    const newComponent = {
        id: id,
        type: type,
        props: {
            label: `Neuer ${type}`,
            gridX: x,
            gridY: y,
            gridW: 2, // Standardbreite in Spalten
            gridH: 1, // Standardhöhe in Zeilen
            theme: "primary"
        }
    }

    layoutState.content.children.push(newComponent)
    renderComponent(newComponent)
}

/**
 * Rendering-Engine: Wandelt ein Komponenten-Objekt in ein DOM-Element um und platziert es auf dem Canvas.
 * @param {Object} comp - Das Datenobjekt der zu rendernden Komponente.
 */
function renderComponent(comp) {
    const el = document.createElement("div")
    el.classList.add('component-wrapper')
    el.id = comp.id

    // Klick-Listener zur Selektion und Aktivierung des Property-Editors
    el.addEventListener('click', () => {
        document.querySelectorAll('.component-wrapper').forEach(item => item.classList.remove('selected'))
        el.classList.add('selected')

        selectComponent(comp.id)
    })

    // Zuweisung der CSS-Grid-Eigenschaften zur physischen Positionierung
    el.style.gridColumn = `${comp.props.gridX} / span ${comp.props.gridW}`
    el.style.gridRow = `${comp.props.gridY} / span ${comp.props.gridH}`

    // XSS-Prävention durch textContent
    const label = document.createElement('span')
    label.textContent = comp.props.label
    el.appendChild(label)

    canvas.appendChild(el)
}

/**
 * Speichert die ID der aktuell im Canvas selektierten Komponente.
 * @type {string|null}
 */
let selectedComponentId = null


/**
 * Lädt die Metadaten einer selektierten Komponente in den Property-Editor (Sidebar).
 * @param {string} id - Die eindeutige ID der auszuwählenden Komponente.
 */
function selectComponent(id) {
    selectedComponentId = id;
    const component = layoutState.content.children.find(c => c.id === id);
    const propPanel = document.getElementById('property-fields');
    const deleteBtn = document.getElementById('delete-btn');

    propPanel.innerHTML = '';

    if (!component) {
        deleteBtn.style.display = 'none';
        return;
    }

    deleteBtn.style.display = 'block';

    // Generierung der reaktiven Eingabefelder für den Property-Editor
    createPropertyInput('Text', component.props.label, (val) => {
        component.props.label = val
        updateVisuals(id)
    })

    createPropertyInput('Breite (Grid-Spalten)', component.props.gridW, (val) => {
        component.props.gridW = parseInt(val) || 1
        updateVisuals(id)
    }, 'number')

    createPropertyInput('Höhe (Grid-Zeilen)', component.props.gridH, (val) => {
        component.props.gridH = parseInt(val) || 1
        updateVisuals(id)
    }, 'number')

    if(component.type === "button"){
        createPropertyInput('Theme (Farbschema)', component.props.theme, (val) => {
            component.props.theme = val || "primary"
        }, "search")
    }
}

/**
 * Fabrikfunktion zur Erstellung dynamischer Eingabefelder im Property-Editor.
 * Bündelt Label, Input-Element und Event-Listener.
 * @param {string} label - Beschriftung des Eingabefeldes.
 * @param {string|number} value - Aktueller Wert der Eigenschaft.
 * @param {function} onChange - Callback-Funktion, die bei Werteänderung ausgeführt wird.
 * @param {string} [type='text'] - HTML-Input-Typ.
 */
function createPropertyInput(label, value, onChange, type = 'text') {
    const div = document.createElement('div')
    div.classList.add('prop-group')

    const lbl = document.createElement('label')
    lbl.textContent = label

    const input = document.createElement('input')
    input.type = type
    input.value = value
    input.addEventListener('input', (e) => onChange(e.target.value))

    div.appendChild(lbl)
    div.appendChild(input)
    document.getElementById('property-fields').appendChild(div)
}

/**
 * Aktualisiert die visuelle Repräsentation einer Komponente im DOM basierend auf dem aktuellen `layoutState`.
 * @param {string} id - Die ID der zu aktualisierenden Komponente.
 */
function updateVisuals(id) {
    const component = layoutState.content.children.find(c => c.id === id)
    const el = document.getElementById(id)

    if (el && component) {
        el.querySelector('span').textContent = component.props.label

        el.style.gridColumn = `${component.props.gridX} / span ${component.props.gridW}`
        el.style.gridRow = `${component.props.gridY} / span ${component.props.gridH}`
    }
}

const saveBtn = document.getElementById('save-btn')

/**
 * Initiiert den Speichervorgang. Serialisiert den aktuellen `layoutState`
 * und sendet ihn via POST-Request an die REST-API.
 */
saveBtn.addEventListener('click', () => {
    const newName = prompt("Bitte Modulnamen eingeben:", layoutState.moduleName)
    if (newName) layoutState.moduleName = newName

    saveBtn.disabled = true
    saveBtn.textContent = 'Speichert...'

    fetch('/api/layout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(layoutState),
    })
        .then(response => {
            if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok')
            return response.json()
        })
        .then(data => {
            alert('Erfolg: Layout wurde in der MS-SQL Datenbank gespeichert!')
            console.log('Server-Antwort:', data)
        })
        .catch((error) => {
            console.error('Fehler beim Speichern:', error)
            alert('Fehler beim Speichern. Details in der Konsole.')
        })
        .finally(() => {
            saveBtn.disabled = false
            saveBtn.textContent = 'Layout speichern'
        })
})

/**
 * Ruft die Liste aller verfügbaren Module aus der Datenbank ab und befüllt das Dropdown-Menü.
 */
function fetchModuleList() {
    fetch('/api/layouts')
        .then(res => res.json())
        .then(modules => {
            const select = document.getElementById('module-select')
            select.innerHTML = '<option value="">-- Modul wählen --</option>'
            modules.forEach(m => {
                const opt = document.createElement('option')
                opt.value = m.ModuleID
                opt.textContent = m.Name
                select.appendChild(opt)
            })
        })
}

/**
 * Lädt ein spezifisches Modul über die API, überschreibt den lokalen `layoutState`
 * und stößt ein Re-Rendering des Canvas an.
 */
document.getElementById('load-btn').addEventListener('click', () => {
    const moduleId = document.getElementById('module-select').value
    if (!moduleId) return alert("Bitte wähle ein Modul aus.")

    fetch(`/api/layout/${moduleId}`)
        .then(res => res.json())
        .then(data => {
            layoutState = data
            canvas.innerHTML = ''

            layoutState.content.children.forEach(comp => {
                renderComponent(comp)
            })

            alert(`Modul "${layoutState.moduleName}" wurde geladen.`)
        })
        .catch(err => console.error("Fehler beim Laden:", err))
})

fetchModuleList()

const previewBtn = document.getElementById('preview-btn')

/**
 * Erstellt eine Live-Vorschau des aktuellen Layouts.
 * Nutzt den LocalStorage für den Datenaustausch mit der Vorschau-Instanz.
 */
previewBtn.addEventListener('click', () => {
    localStorage.setItem('temp_layout_preview', JSON.stringify(layoutState))

    const currentId = document.getElementById('module-select').value
    const url = currentId ? `preview.html?id=${currentId}` : `preview.html`;

    window.open(url, '_blank')
})

const deleteBtn = document.getElementById('delete-btn');

/**
 * Entfernt eine Komponente vollständig aus dem Datenmodell (`layoutState`) und dem DOM.
 * @param {string} id - Die ID der zu löschenden Komponente.
 */
function deleteComponent(id) {
    if (!id) return;

    // 1. Datenbereinigung
    const index = layoutState.content.children.findIndex(c => c.id === id);
    if (index !== -1) {
        layoutState.content.children.splice(index, 1);
    }

    // 2. DOM-Bereinigung
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }

    // 3. UI-Reset
    selectedComponentId = null;
    document.getElementById('property-fields').innerHTML = '<p>Wähle ein Element aus.</p>';
    deleteBtn.style.display = 'none';
}

/**
 * Klick-Event für die manuelle Löschung über den UI-Button.
 */
deleteBtn.addEventListener('click', () => {
    if (confirm('Möchtest du dieses Element wirklich löschen?')) {
        deleteComponent(selectedComponentId);
    }
});

/**
 * Globaler Tastatur-Listener zur Implementierung der Löschfunktion via Delete/Backspace.
 * Verhindert das versehentliche Löschen von Komponenten während Texteingaben.
 */
window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentId && document.activeElement.tagName !== 'INPUT') {
            deleteComponent(selectedComponentId);
        }
    }
});