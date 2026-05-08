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

const canvas = document.getElementById("drop-canvas")

document.querySelectorAll(".draggable-item").forEach(item => {
    item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("component-type", e.target.getAttribute("data-type"))
    })
})

canvas.addEventListener("dragover", (e) =>{
    e.preventDefault()
})

canvas.addEventListener('drop', (e) => {
    e.preventDefault()

    const type = e.dataTransfer.getData('component-type')
    const rect = canvas.getBoundingClientRect()

    // Relative Mausposition im Canvas berechnen
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Umrechnung in Grid-Koordinaten (12 Spalten / 50px Zeilenhöhe)
    const colWidth = rect.width / 12
    const gridX = Math.floor(x / colWidth) + 1
    const gridY = Math.floor(y / 50) + 1

    addComponent(type, gridX, gridY)
})

function addComponent(type, x, y) {
    const id = `${type}_${Date.now()}`

    const newComponent = {
        id: id,
        type: type,
        props: {
            label: `Neuer ${type}`,
            gridX: x,
            gridY: y,
            gridW: 2, //Standardbreite
            gridH: 1, //Standarthöhe
            theme: "primary"
        }
    }

    layoutState.content.children.push(newComponent)
    renderComponent(newComponent)
}

function renderComponent(comp) {
    const el = document.createElement("div")
    el.classList.add('component-wrapper')
    el.id = comp.id

    el.addEventListener('click', () => {
        document.querySelectorAll('.component-wrapper').forEach(item => item.classList.remove('selected')) 
        el.classList.add('selected')

        selectComponent(comp.id)
    })

    // CSS Grid-Positionierung
    el.style.gridColumn = `${comp.props.gridX} / span ${comp.props.gridW}`
    el.style.gridRow = `${comp.props.gridY} / span ${comp.props.gridH}`

    // textContent statt innerHTML gegen XSS
    const label = document.createElement('span')
    label.textContent = comp.props.label
    el.appendChild(label)

    canvas.appendChild(el)
}


let selectedComponentId = null


function selectComponent(id) {
    selectedComponentId = id;
    const component = layoutState.content.children.find(c => c.id === id);
    const propPanel = document.getElementById('property-fields');
    const deleteBtn = document.getElementById('delete-btn'); // Zugriff sicherstellen

    propPanel.innerHTML = '';

    if (!component) {
        deleteBtn.style.display = 'none';
        return;
    }

    // Button anzeigen
    deleteBtn.style.display = 'block';

    // Dynamische Felder erstellen (Label, Breite, Höhe)
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

// Hilfsfunktion zum Erstellen der Inputs
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

function updateVisuals(id) {
    const component = layoutState.content.children.find(c => c.id === id) 
    const el = document.getElementById(id) 

    if (el && component) {
        // Text aktualisieren (XSS-Schutz durch textContent)
        el.querySelector('span').textContent = component.props.label 

        // CSS Grid Positionierung und Größe anpassen
        el.style.gridColumn = `${component.props.gridX} / span ${component.props.gridW}` 
        el.style.gridRow = `${component.props.gridY} / span ${component.props.gridH}` 
    }
}


const saveBtn = document.getElementById('save-btn') 

saveBtn.addEventListener('click', () => {
    const newName = prompt("Bitte Modulnamen eingeben:", layoutState.moduleName) 
    if (newName) layoutState.moduleName = newName 

    // Visuelles Feedback
    saveBtn.disabled = true 
    saveBtn.textContent = 'Speichert...' 

    fetch('/api/layout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(layoutState), // "Single Source of Truth"
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

function fetchModuleList() {
    fetch('/api/layouts')
        .then(res => res.json())
        .then(modules => {
            const select = document.getElementById('module-select') 
            select.innerHTML = '<option value="">-- Modul wählen --</option>' 
            modules.forEach(m => {
                const opt = document.createElement('option') 
                opt.value = m.ModuleID 
                opt.textContent = m.Name  // IHK: Nutzt die Metadaten aus MS-SQL
                select.appendChild(opt) 
            }) 
        }) 
}
document.getElementById('load-btn').addEventListener('click', () => {
    const moduleId = document.getElementById('module-select').value 
    if (!moduleId) return alert("Bitte wähle ein Modul aus.") 

    fetch(`/api/layout/${moduleId}`)
        .then(res => res.json())
        .then(data => {
            // Aktuellen State überschreiben
            layoutState = data 

            // Canvas leeren
            canvas.innerHTML = '' 

            // Alle Komponenten aus dem geladenen JSON neu rendern
            layoutState.content.children.forEach(comp => {
                renderComponent(comp) 
            }) 

            alert(`Modul "${layoutState.moduleName}" wurde geladen.`) 
        })
        .catch(err => console.error("Fehler beim Laden:", err)) 
}) 

fetchModuleList()


const previewBtn = document.getElementById('preview-btn'); // Button in index.html ergänzen!

previewBtn.addEventListener('click', () => {
    // aktuellen, ungespeicherten Stand im Browser-Speicher ablegen
    localStorage.setItem('temp_layout_preview', JSON.stringify(layoutState))

    // 2. Vorschau öffnen. Wir hängen die ID nur an, WENN wir bereits geladen haben.
    // Falls nicht, weiß die preview.html: "Schau in den LocalStorage!"
    const currentId = document.getElementById('module-select').value
    const url = currentId ? `preview.html?id=${currentId}` : `preview.html`;

    window.open(url, '_blank')
})

// editor.js Ergänzung

const deleteBtn = document.getElementById('delete-btn');

// Die zentrale Lösch-Funktion
function deleteComponent(id) {
    if (!id) return;

    // 1. Aus dem layoutState entfernen (Single Source of Truth)
    const index = layoutState.content.children.findIndex(c => c.id === id);
    if (index !== -1) {
        layoutState.content.children.splice(index, 1);
    }

    // 2. Aus dem DOM (Canvas) entfernen
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }

    // 3. Sidebar zurücksetzen
    selectedComponentId = null;
    document.getElementById('property-fields').innerHTML = '<p>Wähle ein Element aus.</p>';
    deleteBtn.style.display = 'none';
}

// Event-Listener für den Button
deleteBtn.addEventListener('click', () => {
    if (confirm('Möchtest du dieses Element wirklich löschen?')) {
        deleteComponent(selectedComponentId);
    }
});

// Tastatur-Support (Usability-Feature)
window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        // Nur löschen, wenn gerade kein Input-Feld fokussiert ist
        if (selectedComponentId && document.activeElement.tagName !== 'INPUT') {
            deleteComponent(selectedComponentId);
        }
    }
});