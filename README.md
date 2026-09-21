🎨 MiniFigma Clone

A browser-based Figma-inspired design editor built from scratch using HTML, CSS, and Vanilla JavaScript.

MiniFigma is a lightweight design editor that allows users to create, edit, arrange, and export basic design objects directly in the browser without using any external frontend framework or canvas library.

🚀 Live Demo

🔗 Live Demo: "https://github.com/AtulRathor75057/vhbuyio-web-development--internship-Atul-Rathor-Task2"

«Replace the URL above with your actual GitHub Pages link.»

---

✨ Features

🎯 Design & Drawing

- Rectangle tool
- Ellipse tool
- Line tool
- Text tool
- Drag-to-create objects
- Perfect circles using "Shift"
- 45° line snapping using "Shift"

🖱️ Object Editing

- Select objects
- Move objects
- Resize objects
- Rotate objects
- Multi-selection
- Delete objects
- Rename layers
- Object hit testing

📚 Layers & Organization

- Layers panel
- Bring to front
- Bring forward
- Send backward
- Send to back
- Group objects
- Ungroup objects
- Layer renaming

🎨 Properties

- Position (X/Y)
- Width & Height
- Rotation
- Opacity
- Fill color
- Stroke color
- Stroke width
- Text editing
- Font size
- Font family

↩️ Undo & Redo

- Undo with "Ctrl + Z"
- Redo with "Ctrl + Y"
- Redo with "Ctrl + Shift + Z"
- History tracking
- Up to 50 history states
- History support for object creation, deletion, movement, resizing, rotation, grouping, duplication and property changes

🔍 Zoom & Pan

- Zoom in
- Zoom out
- Zoom reset
- Mouse-wheel zoom
- Space + drag pan
- Middle-mouse pan
- Zoom range from 25% to 400%

🧲 Snapping

- Object-to-object snapping
- Edge snapping
- Center snapping
- Horizontal snapping
- Vertical snapping
- Visual snap guides
- Snapping toggle
- Adjustable snap distance

📋 Copy, Paste & Duplicate

- "Ctrl + C" — Copy
- "Ctrl + V" — Paste
- "Ctrl + D" — Duplicate
- "Ctrl + Shift + D" — Duplicate

💾 Save & Export

- Export design as PNG
- Save project as JSON
- Load project from JSON
- Project data preservation
- Canvas zoom and pan preservation

⌨️ Keyboard Shortcuts

Shortcut| Action
"V"| Select Tool
"R"| Rectangle Tool
"O"| Ellipse Tool
"L"| Line Tool
"T"| Text Tool
"Ctrl + Z"| Undo
"Ctrl + Y"| Redo
"Ctrl + Shift + Z"| Redo
"Ctrl + C"| Copy
"Ctrl + V"| Paste
"Ctrl + D"| Duplicate
"Ctrl + Shift + D"| Duplicate
"Ctrl + G"| Group
"Ctrl + Shift + G"| Ungroup
"Delete"| Delete selected object
"Backspace"| Delete selected object
"Ctrl + ]"| Bring Forward
"Ctrl + Shift + ]"| Bring to Front
"Ctrl + ["| Send Backward
"Ctrl + Shift + ["| Send to Back
"F2"| Rename selected layer
"S"| Toggle Snapping
"Home"| Reset Zoom & Pan
"Escape"| Clear selection / cancel action
"Arrow Keys"| Move selected object
"Shift + Arrow"| Move object by 10px

---

🛠️ Tech Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- HTML5 Canvas API
- Vanilla JavaScript
- Local JSON file handling

No React, Vue, Angular, or external canvas library is used.

---

📁 Project Structure

minifigma-clone/
│
├── index.html
├── style.css
├── script.js
└── README.md

If additional assets are used:

minifigma-clone/
│
├── index.html
├── style.css
├── script.js
├── assets/
│   └── ...
└── README.md

---

▶️ How to Run

Option 1 — Direct Browser

1. Download or clone this repository.
2. Open the project folder.
3. Open "index.html" in a modern web browser.

Option 2 — VS Code

1. Open the project folder in VS Code.
2. Open "index.html".
3. Run it using a local server such as Live Server.

No backend or database is required.

---

🧩 How It Works

MiniFigma uses the HTML5 Canvas API as the main drawing surface.

The application maintains an internal state containing:

- Design objects
- Selected objects
- Active tool
- Zoom level
- Canvas position
- Object properties
- History states

Each design object is represented as a JavaScript object containing properties such as:

{
    id: "object-id",
    type: "rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 120,
    rotation: 0,
    fill: "#ffffff",
    stroke: "#000000"
}

The edit
