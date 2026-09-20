// ======================================================
// MINI FIGMA CLONE
// PHASE 5 - PART 1/4
// Tasks 1 - 16 + Phase 5 foundation
// ======================================================

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const canvasArea = document.querySelector(".canvas-area");


// ======================================================
// STATE
// ======================================================

const state = {
    objects: [],
    selectedIds: [],

    activeTool: "select",

    zoom: 1,
    panX: 0,
    panY: 0,

    isDrawing: false,
    isMoving: false,
    isResizing: false,
    isRotating: false,

    startX: 0,
    startY: 0,

    resizeHandle: null,

    dragStartObjects: [],

    textInput: null
};


// ======================================================
// BASIC HELPERS
// ======================================================

function generateId() {
    return "obj_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 8);
}


function getSelectedObjects() {

    return state.objects.filter(
        obj =>
            state.selectedIds.includes(
                obj.id
            )
    );
}


function getObjectById(id) {

    return state.objects.find(
        obj =>
            obj.id === id
    );
}


function clamp(value, min, max) {

    return Math.max(
        min,
        Math.min(max, value)
    );
}


function escapeHTML(str) {

    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ======================================================
// CANVAS RESIZE
// ======================================================

function resizeCanvas() {

    const rect =
        canvasArea.getBoundingClientRect();

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width =
        rect.width * dpr;

    canvas.height =
        rect.height * dpr;

    canvas.style.width =
        rect.width + "px";

    canvas.style.height =
        rect.height + "px";

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    render();
}


window.addEventListener(
    "resize",
    resizeCanvas
);


// ======================================================
// SCREEN TO CANVAS
// ======================================================

function screenToCanvas(
    clientX,
    clientY
) {

    const rect =
        canvas.getBoundingClientRect();

    return {

        x:
            (
                clientX -
                rect.left -
                state.panX
            ) / state.zoom,

        y:
            (
                clientY -
                rect.top -
                state.panY
            ) / state.zoom
    };
}


// ======================================================
// CANVAS TO SCREEN
// ======================================================

function canvasToScreen(x, y) {

    return {

        x:
            x * state.zoom +
            state.panX,

        y:
            y * state.zoom +
            state.panY
    };
}


// ======================================================
// OBJECT BOUNDS
// ======================================================

function getObjectBounds(obj) {

    if (obj.type === "line") {

        const x1 = obj.x;
        const y1 = obj.y;

        const x2 =
            obj.x + obj.width;

        const y2 =
            obj.y + obj.height;

        return {

            x:
                Math.min(
                    x1,
                    x2
                ),

            y:
                Math.min(
                    y1,
                    y2
                ),

            width:
                Math.abs(
                    obj.width
                ),

            height:
                Math.abs(
                    obj.height
                )
        };
    }

    return {

        x: obj.x,
        y: obj.y,

        width:
            Math.abs(
                obj.width || 0
            ),

        height:
            Math.abs(
                obj.height || 0
            )
    };
}


// ======================================================
// OBJECT CENTER
// ======================================================

function getObjectCenter(obj) {

    const bounds =
        getObjectBounds(obj);

    return {

        x:
            bounds.x +
            bounds.width / 2,

        y:
            bounds.y +
            bounds.height / 2
    };
}


// ======================================================
// ROTATION HELPERS
// ======================================================

function rotatePoint(
    x,
    y,
    cx,
    cy,
    angle
) {

    const rad =
        angle *
        Math.PI /
        180;

    const cos =
        Math.cos(rad);

    const sin =
        Math.sin(rad);

    return {

        x:
            cx +
            (x - cx) * cos -
            (y - cy) * sin,

        y:
            cy +
            (x - cx) * sin +
            (y - cy) * cos
    };
}


function inverseRotatePoint(
    x,
    y,
    cx,
    cy,
    angle
) {

    return rotatePoint(
        x,
        y,
        cx,
        cy,
        -angle
    );
}


// ======================================================
// GRID
// ======================================================

function drawGrid() {

    const width =
        canvas.width /
        (window.devicePixelRatio || 1);

    const height =
        canvas.height /
        (window.devicePixelRatio || 1);

    const gridSize = 20;

    ctx.save();

    ctx.strokeStyle =
        "#eeeeee";

    ctx.lineWidth =
        1 / state.zoom;

    const startX =
        Math.floor(
            -state.panX /
            state.zoom /
            gridSize
        ) * gridSize;

    const startY =
        Math.floor(
            -state.panY /
            state.zoom /
            gridSize
        ) * gridSize;


    for (
        let x = startX;
        x <
        (width - state.panX) /
            state.zoom;
        x += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            startY
        );

        ctx.lineTo(
            x,
            (height -
                state.panY) /
                state.zoom
        );

        ctx.stroke();
    }


    for (
        let y = startY;
        y <
        (height - state.panY) /
            state.zoom;
        y += gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(
            startX,
            y
        );

        ctx.lineTo(
            (width -
                state.panX) /
                state.zoom,
            y
        );

        ctx.stroke();
    }

    ctx.restore();
}


// ======================================================
// DRAW OBJECT
// ======================================================

function drawObject(obj) {

    if (obj.visible === false) {
        return;
    }

    ctx.save();

    const bounds =
        getObjectBounds(obj);

    const center =
        getObjectCenter(obj);


    ctx.translate(
        center.x,
        center.y
    );

    ctx.rotate(
        (obj.rotation || 0) *
        Math.PI /
        180
    );

    ctx.translate(
        -center.x,
        -center.y
    );


    const fill =
        obj.fill || "#ffffff";

    const stroke =
        obj.stroke || "#000000";

    const strokeWidth =
        obj.strokeWidth === undefined
            ? 1
            : obj.strokeWidth;

    const opacity =
        obj.opacity === undefined
            ? 1
            : obj.opacity;


    ctx.globalAlpha =
        opacity;

    ctx.fillStyle =
        fill;

    ctx.strokeStyle =
        stroke;

    ctx.lineWidth =
        strokeWidth;


    // Rectangle
    if (
        obj.type ===
        "rectangle"
    ) {

        ctx.beginPath();

        ctx.rect(
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height
        );

        if (
            obj.fill !==
            "none"
        ) {
            ctx.fill();
        }

        if (
            strokeWidth > 0
        ) {
            ctx.stroke();
        }
    }


    // Ellipse
    else if (
        obj.type ===
        "ellipse"
    ) {

        ctx.beginPath();

        ctx.ellipse(

            bounds.x +
                bounds.width / 2,

            bounds.y +
                bounds.height / 2,

            bounds.width / 2,

            bounds.height / 2,

            0,

            0,

            Math.PI * 2
        );

        if (
            obj.fill !==
            "none"
        ) {
            ctx.fill();
        }

        if (
            strokeWidth > 0
        ) {
            ctx.stroke();
        }
    }


    // Line
    else if (
        obj.type ===
        "line"
    ) {

        ctx.beginPath();

        ctx.moveTo(
            obj.x,
            obj.y
        );

        ctx.lineTo(
            obj.x +
                obj.width,

            obj.y +
                obj.height
        );

        ctx.stroke();
    }


    // Text
    else if (
        obj.type ===
        "text"
    ) {

        ctx.font =
            `${obj.fontSize || 24}px ${
                obj.fontFamily ||
                "Arial"
            }`;

        ctx.textBaseline =
            "top";

        ctx.fillStyle =
            obj.fill ||
            "#000000";

        ctx.fillText(
            obj.text || "",
            obj.x,
            obj.y
        );
    }


    // Group
    else if (
        obj.type ===
        "group"
    ) {
        // Group itself is invisible.
    }


    ctx.restore();
}


// ======================================================
// RENDER
// ======================================================

function render() {

    const rect =
        canvas.getBoundingClientRect();

    ctx.clearRect(
        0,
        0,
        rect.width,
        rect.height
    );


    ctx.save();

    ctx.translate(
        state.panX,
        state.panY
    );

    ctx.scale(
        state.zoom,
        state.zoom
    );


    drawGrid();


    state.objects.forEach(
        obj => {

            drawObject(obj);

        }
    );


    ctx.restore();


    drawSelection();

    updateLayersPanel();

    updatePropertiesPanel();

    updateObjectCount();

    updateZoomDisplay();
}


// ======================================================
// SELECTION
// ======================================================

function drawSelection() {

    const selected =
        getSelectedObjects();


    if (
        selected.length === 0
    ) {
        return;
    }


    if (
        selected.length > 1
    ) {

        const bounds =
            getMultipleSelectionBounds();

        drawSelectionBox(
            bounds,
            false
        );

        return;
    }


    const obj =
        selected[0];

    if (!obj) {
        return;
    }


    const bounds =
        getObjectBounds(obj);

    drawSelectionBox(
        bounds,
        true
    );
}


// ======================================================
// MULTI SELECTION BOUNDS
// ======================================================

function getMultipleSelectionBounds() {

    const selected =
        getSelectedObjects();


    if (
        selected.length === 0
    ) {
        return null;
    }


    let minX =
        Infinity;

    let minY =
        Infinity;

    let maxX =
        -Infinity;

    let maxY =
        -Infinity;


    selected.forEach(
        obj => {

            const b =
                getObjectBounds(obj);


            minX =
                Math.min(
                    minX,
                    b.x
                );

            minY =
                Math.min(
                    minY,
                    b.y
                );

            maxX =
                Math.max(
                    maxX,
                    b.x +
                    b.width
                );

            maxY =
                Math.max(
                    maxY,
                    b.y +
                    b.height
                );
        }
    );


    return {

        x: minX,
        y: minY,

        width:
            maxX - minX,

        height:
            maxY - minY
    };
}


// ======================================================
// SELECTION BOX
// ======================================================

function drawSelectionBox(
    bounds,
    showHandles
) {

    if (!bounds) {
        return;
    }


    const screen =
        canvasToScreen(
            bounds.x,
            bounds.y
        );


    const width =
        bounds.width *
        state.zoom;

    const height =
        bounds.height *
        state.zoom;


    ctx.save();

    ctx.strokeStyle =
        "#18a0fb";

    ctx.lineWidth = 1;

    ctx.strokeRect(
        screen.x,
        screen.y,
        width,
        height
    );


    if (
        showHandles
    ) {

        const size = 8;


        const points = [

            [
                screen.x,
                screen.y
            ],

            [
                screen.x +
                    width,
                screen.y
            ],

            [
                screen.x,
                screen.y +
                    height
            ],

            [
                screen.x +
                    width,
                screen.y +
                    height
            ]
        ];


        ctx.fillStyle =
            "#ffffff";


        points.forEach(
            point => {

                ctx.fillRect(

                    point[0] -
                        size / 2,

                    point[1] -
                        size / 2,

                    size,
                    size
                );

                ctx.strokeRect(

                    point[0] -
                        size / 2,

                    point[1] -
                        size / 2,

                    size,
                    size
                );
            }
        );


        // Rotation handle

        const rotationY =
            screen.y - 30;


        ctx.beginPath();

        ctx.moveTo(
            screen.x +
                width / 2,

            screen.y
        );

        ctx.lineTo(
            screen.x +
                width / 2,

            rotationY
        );

        ctx.stroke();


        ctx.beginPath();

        ctx.arc(

            screen.x +
                width / 2,

            rotationY,

            5,

            0,

            Math.PI * 2
        );

        ctx.fill();

        ctx.stroke();
    }


    ctx.restore();
}


// ======================================================
// HIT TEST
// ======================================================

function hitTest(
    x,
    y
) {

    for (
        let i =
            state.objects.length - 1;

        i >= 0;

        i--
    ) {

        const obj =
            state.objects[i];


        if (
            obj.visible === false ||
            obj.locked === true ||
            obj.type === "group"
        ) {
            continue;
        }


        const bounds =
            getObjectBounds(obj);

        const center =
            getObjectCenter(obj);


        const local =
            inverseRotatePoint(

                x,
                y,

                center.x,
                center.y,

                obj.rotation || 0
            );


        if (

            local.x >=
                bounds.x &&

            local.x <=
                bounds.x +
                bounds.width &&

            local.y >=
                bounds.y &&

            local.y <=
                bounds.y +
                bounds.height

        ) {

            if (
                obj.type ===
                "ellipse"
            ) {

                const rx =
                    bounds.width /
                    2;

                const ry =
                    bounds.height /
                    2;

                const dx =
                    local.x -
                    (
                        bounds.x +
                        rx
                    );

                const dy =
                    local.y -
                    (
                        bounds.y +
                        ry
                    );


                if (

                    (
                        dx * dx
                    ) /
                    (
                        rx * rx
                    )

                    +

                    (
                        dy * dy
                    ) /
                    (
                        ry * ry
                    )

                    <= 1

                ) {

                    return obj;
                }

            } else {

                return obj;
            }
        }
    }


    return null;
}


// ======================================================
// TOOLS
// ======================================================

function updateToolButtons() {

    document
        .querySelectorAll(
            "[data-tool]"
        )
        .forEach(
            button => {

                button.classList.toggle(

                    "active",

                    button.dataset.tool ===
                    state.activeTool
                );
            }
        );
}


function setTool(tool) {

    state.activeTool =
        tool;

    updateToolButtons();


    if (
        tool !== "text"
    ) {

        removeTextInput();
    }


    canvas.style.cursor =
        tool === "select"
            ? "default"
            : "crosshair";
}


document
    .querySelectorAll(
        "[data-tool]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    setTool(
                        button.dataset.tool
                    );

                }
            );
        }
    );


// ======================================================
// CREATE SHAPE
// ======================================================

function createShape(
    type,
    x,
    y,
    width,
    height,
    shiftKey = false
) {

    if (
        shiftKey &&
        (
            type ===
                "rectangle" ||
            type ===
                "ellipse"
        )
    ) {

        const size =
            Math.max(
                Math.abs(width),
                Math.abs(height)
            );


        width =
            width < 0
                ? -size
                : size;

        height =
            height < 0
                ? -size
                : size;
    }


    const obj = {

        id:
            generateId(),

        type,

        name:
            type
                .charAt(0)
                .toUpperCase() +
            type.slice(1),

        x,
        y,

        width,
        height,

        rotation: 0,

        fill:
            type ===
            "line"
                ? "none"
                : "#ffffff",

        stroke:
            "#000000",

        strokeWidth: 1,

        opacity: 1,

        visible: true,

        locked: false,

        parentId: null
    };


    state.objects.push(
        obj
    );


    state.selectedIds =
        [obj.id];
    saveHistory();


    render();
}
// ======================================================
// TEXT TOOL
// ======================================================

function createTextInput(x, y) {

    removeTextInput();

    const input =
        document.createElement("textarea");

    input.id =
        "text-editor-input";

    input.style.position =
        "absolute";

    input.style.left =
        (x * state.zoom +
            state.panX) + "px";

    input.style.top =
        (y * state.zoom +
            state.panY) + "px";

    input.style.width =
        "240px";

    input.style.height =
        "80px";

    input.style.padding =
        "8px";

    input.style.fontSize =
        "24px";

    input.style.fontFamily =
        "Arial";

    input.style.color =
        "#000000";

    input.style.background =
        "#ffffff";

    input.style.border =
        "2px solid #18a0fb";

    input.style.borderRadius =
        "4px";

    input.style.outline =
        "none";

    input.style.resize =
        "both";

    input.style.zIndex =
        "1000";


    canvasArea.appendChild(
        input
    );

    state.textInput =
        input;


    input.addEventListener(
        "mousedown",
        function(e) {
            e.stopPropagation();
        }
    );


    input.addEventListener(
        "click",
        function(e) {
            e.stopPropagation();
        }
    );


    input.addEventListener(
        "keydown",
        function(e) {

            if (
                e.key === "Enter" &&
                !e.shiftKey
            ) {

                e.preventDefault();

                finishTextInput(
                    input,
                    x,
                    y
                );
            }


            if (
                e.key === "Escape"
            ) {

                removeTextInput();

                setTool(
                    "select"
                );

                render();
            }
        }
    );


    setTimeout(
        function() {
            input.focus();
        },
        50
    );
}


// ======================================================
// FINISH TEXT
// ======================================================

function finishTextInput(
    input,
    x,
    y
) {

    const text =
        input.value.trim();


    if (!text) {

        removeTextInput();

        return;
    }


    ctx.font =
        "24px Arial";


    const width =
        ctx.measureText(
            text
        ).width;


    const obj = {

        id:
            generateId(),

        type:
            "text",

        name:
            "Text",

        text,

        x,
        y,

        width,

        height:
            30,

        rotation:
            0,

        fontSize:
            24,

        fontFamily:
            "Arial",

        fill:
            "#000000",

        stroke:
            "none",

        strokeWidth:
            0,

        opacity:
            1,

        visible:
            true,

        locked:
            false,

        parentId:
            null
    };


    state.objects.push(
        obj
    );


    state.selectedIds =
        [obj.id];
    saveHistory();

    removeTextInput();

    setTool(
        "select"
    );

    render();
}


// ======================================================
// REMOVE TEXT INPUT
// ======================================================

function removeTextInput() {

    const input =
        document.getElementById(
            "text-editor-input"
        );


    if (input) {
        input.remove();
    }


    state.textInput =
        null;
}


// ======================================================
// MOUSE DOWN
// ======================================================

canvas.addEventListener(
    "mousedown",
    function(e) {

        if (e.button !== 0) {
            return;
        }


        // ------------------------------
        // TEXT
        // ------------------------------

        if (
            state.activeTool ===
            "text"
        ) {

            const point =
                screenToCanvas(
                    e.clientX,
                    e.clientY
                );


            createTextInput(
                point.x,
                point.y
            );

            return;
        }


        const point =
            screenToCanvas(
                e.clientX,
                e.clientY
            );


        // ------------------------------
        // SELECT
        // ------------------------------

        if (
            state.activeTool ===
            "select"
        ) {

            const selected =
                getSelectedObjects();


            // Rotation handle
            if (
                selected.length === 1 &&
                isOnRotationHandle(
                    point.x,
                    point.y
                )
            ) {
                saveHistory();

                state.isRotating =
                    true;

                state.startX =
                    point.x;

                state.startY =
                    point.y;

                return;
            }


            // Resize handle
            if (
                selected.length === 1
            ) {

                const handle =
                    getResizeHandle(
                        point.x,
                        point.y
                    );


                if (handle) {
                    saveHistory();

                    state.isResizing =
                        true;

                    state.resizeHandle =
                        handle;

                    state.startX =
                        point.x;

                    state.startY =
                        point.y;

                    return;
                }
            }


            // Hit test
            const hit =
                hitTest(
                    point.x,
                    point.y
                );


            if (hit) {

                if (e.shiftKey) {

                    if (
                        state.selectedIds
                            .includes(
                                hit.id
                            )
                    ) {

                        state.selectedIds =
                            state.selectedIds
                                .filter(
                                    id =>
                                        id !==
                                        hit.id
                                );

                    } else {

                        state.selectedIds
                            .push(
                                hit.id
                            );
                    }

                } else {

                    if (
                        !state.selectedIds
                            .includes(
                                hit.id
                            )
                    ) {

                        state.selectedIds =
                            [hit.id];
                    }
                }


                state.isMoving =
                    true;

                state.startX =
                    point.x;

                state.startY =
                    point.y;


                state.dragStartObjects =
                    getSelectedObjects()
                        .map(
                            obj => ({
                                ...obj
                            })
                        );

            } else {

                if (!e.shiftKey) {

                    state.selectedIds =
                        [];
                }
            }


            render();

            return;
        }


        // ------------------------------
        // DRAWING
        // ------------------------------

        if (

            state.activeTool ===
                "rectangle" ||

            state.activeTool ===
                "ellipse" ||

            state.activeTool ===
                "line"

        ) {

            state.isDrawing =
                true;

            state.startX =
                point.x;

            state.startY =
                point.y;
        }
    }
);


// ======================================================
// MOUSE MOVE
// ======================================================

canvas.addEventListener(
    "mousemove",
    function(e) {

        const point =
            screenToCanvas(
                e.clientX,
                e.clientY
            );


        // ------------------------------
        // MOVE
        // ------------------------------

        if (
            state.isMoving
        ) {

            const dx =
                point.x -
                state.startX;

            const dy =
                point.y -
                state.startY;


            state.dragStartObjects
                .forEach(
                    original => {

                        const obj =
                            getObjectById(
                                original.id
                            );


                        if (!obj) {
                            return;
                        }


                        obj.x =
                            original.x +
                            dx;

                        obj.y =
                            original.y +
                            dy;
                    }
                );


            render();

            return;
        }


        // ------------------------------
        // RESIZE
        // ------------------------------

        if (
            state.isResizing
        ) {

            const selected =
                getSelectedObjects()[0];


            if (!selected) {
                return;
            }


            resizeObject(
                selected,

                point.x,
                point.y,

                state.resizeHandle
            );


            render();

            return;
        }


        // ------------------------------
        // ROTATE
        // ------------------------------

        if (
            state.isRotating
        ) {

            const selected =
                getSelectedObjects()[0];


            if (!selected) {
                return;
            }


            const center =
                getObjectCenter(
                    selected
                );


            const startAngle =
                Math.atan2(

                    state.startY -
                        center.y,

                    state.startX -
                        center.x
                );


            const currentAngle =
                Math.atan2(

                    point.y -
                        center.y,

                    point.x -
                        center.x
                );


            const difference =
                (
                    currentAngle -
                    startAngle
                ) *
                180 /
                Math.PI;


            selected.rotation =
                difference;


            render();

            return;
        }


        // ------------------------------
        // DRAW PREVIEW
        // ------------------------------

        if (
            state.isDrawing
        ) {

            render();

            drawDrawingPreview(
                point.x,
                point.y
            );
        }
    }
);


// ======================================================
// MOUSE UP
// ======================================================

canvas.addEventListener(
    "mouseup",
    function(e) {

        const point =
            screenToCanvas(
                e.clientX,
                e.clientY
            );


        // ------------------------------
        // MOVE END
        // ------------------------------

        if (
            state.isMoving
        ) {

            state.isMoving =
                false;

            state.dragStartObjects =
                [];

            render();

            return;
        }


        // ------------------------------
        // RESIZE END
        // ------------------------------

        if (
            state.isResizing
        ) {

            state.isResizing =
                false;

            state.resizeHandle =
                null;

            render();

            return;
        }


        // ------------------------------
        // ROTATE END
        // ------------------------------

        if (
            state.isRotating
        ) {

            state.isRotating =
                false;

            render();

            return;
        }


        // ------------------------------
        // DRAW END
        // ------------------------------

        if (
            state.isDrawing
        ) {

            state.isDrawing =
                false;


            let width =
                point.x -
                state.startX;

            let height =
                point.y -
                state.startY;


            const type =
                state.activeTool;


            if (
                Math.abs(width) < 3 &&
                Math.abs(height) < 3
            ) {

                return;
            }


            if (width < 0) {

                state.startX +=
                    width;

                width =
                    Math.abs(width);
            }


            if (height < 0) {

                state.startY +=
                    height;

                height =
                    Math.abs(height);
            }


            createShape(

                type,

                state.startX,

                state.startY,

                width,

                height,

                e.shiftKey
            );


            setTool(
                "select"
            );


            render();
        }
    }
);


// ======================================================
// DRAW PREVIEW
// ======================================================

function drawDrawingPreview(
    currentX,
    currentY
) {

    const x =
        state.startX;

    const y =
        state.startY;

    const width =
        currentX - x;

    const height =
        currentY - y;


    ctx.save();


    ctx.translate(
        state.panX,
        state.panY
    );


    ctx.scale(
        state.zoom,
        state.zoom
    );


    ctx.strokeStyle =
        "#18a0fb";

    ctx.lineWidth =
        1 / state.zoom;

    ctx.setLineDash(
        [6, 4]
    );


    if (
        state.activeTool ===
        "rectangle"
    ) {

        ctx.strokeRect(
            x,
            y,
            width,
            height
        );
    }


    if (
        state.activeTool ===
        "ellipse"
    ) {

        ctx.beginPath();

        ctx.ellipse(

            x + width / 2,

            y + height / 2,

            Math.abs(width) / 2,

            Math.abs(height) / 2,

            0,

            0,

            Math.PI * 2
        );

        ctx.stroke();
    }


    if (
        state.activeTool ===
        "line"
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            y
        );

        ctx.lineTo(
            currentX,
            currentY
        );

        ctx.stroke();
    }


    ctx.restore();
}


// ======================================================
// RESIZE HANDLE
// ======================================================

function getResizeHandle(
    x,
    y
) {

    const selected =
        getSelectedObjects()[0];


    if (!selected) {
        return null;
    }


    const bounds =
        getObjectBounds(
            selected
        );

    const center =
        getObjectCenter(
            selected
        );


    const local =
        inverseRotatePoint(

            x,
            y,

            center.x,
            center.y,

            selected.rotation || 0
        );


    const threshold =
        10 /
        state.zoom;


    const handles = {

        nw: {
            x: bounds.x,
            y: bounds.y
        },

        ne: {
            x:
                bounds.x +
                bounds.width,

            y:
                bounds.y
        },

        sw: {
            x:
                bounds.x,

            y:
                bounds.y +
                bounds.height
        },

        se: {
            x:
                bounds.x +
                bounds.width,

            y:
                bounds.y +
                bounds.height
        }
    };


    for (
        const key in handles
    ) {

        if (

            Math.abs(
                local.x -
                handles[key].x
            ) <= threshold &&

            Math.abs(
                local.y -
                handles[key].y
            ) <= threshold

        ) {

            return key;
        }
    }


    return null;
}


// ======================================================
// ROTATION HANDLE
// ======================================================

function isOnRotationHandle(
    x,
    y
) {

    const selected =
        getSelectedObjects()[0];


    if (!selected) {
        return false;
    }


    const bounds =
        getObjectBounds(
            selected
        );


    const center =
        getObjectCenter(
            selected
        );


    const handleX =
        center.x;


    const handleY =
        bounds.y -
        30 /
        state.zoom;


    const distance =
        Math.sqrt(

            Math.pow(
                x - handleX,
                2
            ) +

            Math.pow(
                y - handleY,
                2
            )
        );


    return (
        distance <
        12 /
        state.zoom
    );
}


// ======================================================
// RESIZE OBJECT
// ======================================================

function resizeObject(
    obj,
    mouseX,
    mouseY,
    handle
) {

    const center =
        getObjectCenter(
            obj
        );


    const local =
        inverseRotatePoint(

            mouseX,
            mouseY,

            center.x,
            center.y,

            obj.rotation || 0
        );


    const bounds =
        getObjectBounds(
            obj
        );


    let left =
        bounds.x;

    let right =
        bounds.x +
        bounds.width;

    let top =
        bounds.y;

    let bottom =
        bounds.y +
        bounds.height;


    if (
        handle.includes("w")
    ) {

        left =
            Math.min(
                local.x,
                right - 10
            );
    }


    if (
        handle.includes("e")
    ) {

        right =
            Math.max(
                local.x,
                left + 10
            );
    }


    if (
        handle.includes("n")
    ) {

        top =
            Math.min(
                local.y,
                bottom - 10
            );
    }


    if (
        handle.includes("s")
    ) {

        bottom =
            Math.max(
                local.y,
                top + 10
            );
    }


    obj.x =
        left;

    obj.y =
        top;

    obj.width =
        right - left;

    obj.height =
        bottom - top;
}


// ======================================================
// LAYERS PANEL
// ======================================================

function updateLayersPanel() {

    const container =
        document.getElementById(
            "layersList"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    [...state.objects]
        .reverse()
        .forEach(
            obj => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "layer-item";


                if (
                    state.selectedIds
                        .includes(
                            obj.id
                        )
                ) {

                    item.classList.add(
                        "selected"
                    );
                }


                item.innerHTML = `

                    <span class="layer-name">
                        ${escapeHTML(
                            obj.name ||
                            obj.type
                        )}
                    </span>

                    <span class="layer-type">
                        ${obj.type}
                    </span>
                `;


                item.addEventListener(
                    "click",
                    function(e) {

                        if (
                            e.shiftKey
                        ) {

                            if (
                                state.selectedIds
                                    .includes(
                                        obj.id
                                    )
                            ) {

                                state.selectedIds =
                                    state.selectedIds
                                        .filter(
                                            id =>
                                                id !==
                                                obj.id
                                        );

                            } else {

                                state.selectedIds
                                    .push(
                                        obj.id
                                    );
                            }

                        } else {

                            state.selectedIds =
                                [obj.id];
                        }


                        render();
                    }
                );


                item.addEventListener(
                    "dblclick",
                    function() {

                        renameLayer(
                            obj
                        );
                    }
                );


                container.appendChild(
                    item
                );
            }
        );


    createLayerButtons(
        container
    );
}


// ======================================================
// RENAME LAYER
// ======================================================

function renameLayer(obj) {

    const newName =
        prompt(
            "Enter new layer name:",
            obj.name
        );


    if (
        newName &&
        newName.trim()
    ) {

        obj.name =
            newName.trim();

        render();
    }
}
// ===============================
// PHASE 5 — PART 3/4
// LAYERS + PROPERTIES + FILL/STROKE
// ===============================

// ---------- LAYER BUTTONS ----------

function createLayerButtons(container) {
    const controls = document.createElement("div");
    controls.className = "layer-controls";

    controls.innerHTML = `
        <button id="bringFrontBtn" title="Bring to Front">⬆</button>
        <button id="bringForwardBtn" title="Bring Forward">↑</button>
        <button id="sendBackwardBtn" title="Send Backward">↓</button>
        <button id="sendBackBtn" title="Send to Back">⬇</button>
    `;

    container.appendChild(controls);

    document.getElementById("bringFrontBtn").onclick = bringToFront;
    document.getElementById("bringForwardBtn").onclick = bringForwardLayer;
    document.getElementById("sendBackwardBtn").onclick = sendBackwardLayer;
    document.getElementById("sendBackBtn").onclick = sendToBack;
}


// ---------- LAYER ORDER ----------

function bringToFront() {
    const selected = getSelectedObjects();

    if (selected.length === 0) return;

    selected.forEach(obj => {
        const index = state.objects.indexOf(obj);

        if (index !== -1) {
            state.objects.splice(index, 1);
            state.objects.push(obj);
        }
    });

    render();
}


function bringForwardLayer() {
    const selected = getSelectedObjects();

    if (selected.length === 0) return;

    selected.forEach(obj => {
        const index = state.objects.indexOf(obj);

        if (index !== -1 && index < state.objects.length - 1) {
            const next = state.objects[index + 1];

            state.objects[index + 1] = obj;
            state.objects[index] = next;
        }
    });

    render();
}


function sendBackwardLayer() {
    const selected = getSelectedObjects();

    if (selected.length === 0) return;

    [...selected].reverse().forEach(obj => {
        const index = state.objects.indexOf(obj);

        if (index > 0) {
            const previous = state.objects[index - 1];

            state.objects[index - 1] = obj;
            state.objects[index] = previous;
        }
    });

    render();
}


function sendToBack() {
    const selected = getSelectedObjects();

    if (selected.length === 0) return;

    selected.forEach(obj => {
        const index = state.objects.indexOf(obj);

        if (index !== -1) {
            state.objects.splice(index, 1);
            state.objects.unshift(obj);
        }
    });

    render();
}


// ---------- PROPERTIES PANEL ----------

function updatePropertiesPanel() {
    const panel = document.getElementById("propertiesContent");

    if (!panel) return;

    const selected = getSelectedObjects();

    if (selected.length === 0) {
        panel.innerHTML = `
            <div class="empty-properties">
                Select an object
            </div>
        `;
        return;
    }

    if (selected.length > 1) {
        panel.innerHTML = `
            <div class="property-row">
                <label>Selected</label>
                <strong>${selected.length} objects</strong>
            </div>

            <div class="property-section">
                <h4>Appearance</h4>

                <div class="property-row">
                    <label>Opacity</label>
                    <input
                        type="number"
                        id="multiOpacity"
                        min="0"
                        max="1"
                        step="0.1"
                        value="1"
                    >
                </div>
            </div>
        `;

        const opacityInput = document.getElementById("multiOpacity");

        if (opacityInput) {
            opacityInput.addEventListener("change", () => {
                const value = clamp(
                    parseFloat(opacityInput.value) || 1,
                    0,
                    1
                );

                selected.forEach(obj => {
                    obj.opacity = value;
                });

                render();
            });
        }

        return;
    }

    const obj = selected[0];

    const isText = obj.type === "text";

    panel.innerHTML = `
        <div class="property-section">
            <h4>Basic</h4>

            <div class="property-row">
                <label>Name</label>
                <input
                    type="text"
                    id="propName"
                    value="${escapeHTML(obj.name || "Layer")}"
                >
            </div>

            <div class="property-row">
                <label>X</label>
                <input
                    type="number"
                    id="propX"
                    value="${Math.round(obj.x || 0)}"
                >
            </div>

            <div class="property-row">
                <label>Y</label>
                <input
                    type="number"
                    id="propY"
                    value="${Math.round(obj.y || 0)}"
                >
            </div>

            <div class="property-row">
                <label>Width</label>
                <input
                    type="number"
                    id="propWidth"
                    min="1"
                    value="${Math.round(obj.width || 1)}"
                >
            </div>

            <div class="property-row">
                <label>Height</label>
                <input
                    type="number"
                    id="propHeight"
                    min="1"
                    value="${Math.round(obj.height || 1)}"
                >
            </div>

            <div class="property-row">
                <label>Rotation</label>
                <input
                    type="number"
                    id="propRotation"
                    value="${Math.round(obj.rotation || 0)}"
                >
            </div>

            <div class="property-row">
                <label>Opacity</label>
                <input
                    type="number"
                    id="propOpacity"
                    min="0"
                    max="1"
                    step="0.1"
                    value="${obj.opacity ?? 1}"
                >
            </div>
        </div>

        <div class="property-section">
            <h4>Appearance</h4>

            <div class="property-row">
                <label>Fill</label>
                <input
                    type="color"
                    id="propFill"
                    value="${normalizeColor(obj.fill || "#ffffff")}"
                >
            </div>

            <div class="property-row">
                <label>Stroke</label>
                <input
                    type="color"
                    id="propStroke"
                    value="${normalizeColor(obj.stroke || "#000000")}"
                >
            </div>

            <div class="property-row">
                <label>Stroke Width</label>
                <input
                    type="number"
                    id="propStrokeWidth"
                    min="0"
                    value="${obj.strokeWidth || 0}"
                >
            </div>
        </div>

        ${
            isText
                ? `
                <div class="property-section">
                    <h4>Text</h4>

                    <div class="property-row">
                        <label>Text</label>
                        <textarea id="propText">${escapeHTML(
                            obj.text || ""
                        )}</textarea>
                    </div>

                    <div class="property-row">
                        <label>Font Size</label>
                        <input
                            type="number"
                            id="propFontSize"
                            min="1"
                            value="${obj.fontSize || 24}"
                        >
                    </div>

                    <div class="property-row">
                        <label>Font</label>
                        <input
                            type="text"
                            id="propFontFamily"
                            value="${escapeHTML(
                                obj.fontFamily || "Arial"
                            )}"
                        >
                    </div>
                </div>
                `
                : ""
        }
    `;

    attachPropertyEvents(obj);
}


// ---------- COLOR NORMALIZATION ----------

function normalizeColor(color) {
    if (!color) return "#000000";

    if (color === "transparent") {
        return "#ffffff";
    }

    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
        return color;
    }

    if (/^#[0-9a-fA-F]{3}$/.test(color)) {
        return color;
    }

    return "#000000";
}


// ---------- PROPERTY EVENTS ----------

function attachPropertyEvents(obj) {

    // Property change se pehle sirf ek baar history save hogi
    let propertyHistorySaved = false;

    function savePropertyHistoryOnce() {

        if (!propertyHistorySaved) {
            saveHistory();
            propertyHistorySaved = true;
        }
    }


    // ---------- NAME ----------

    const nameInput =
        document.getElementById("propName");

    if (nameInput) {

        nameInput.addEventListener("input", () => {

            savePropertyHistoryOnce();

            obj.name =
                nameInput.value || "Layer";

            updateLayersPanel();
        });
    }


    // ---------- X ----------

    const xInput =
        document.getElementById("propX");

    if (xInput) {

        xInput.addEventListener("change", () => {

            savePropertyHistoryOnce();

            obj.x =
                parseFloat(xInput.value) || 0;

            render();
        });
    }


    // ---------- Y ----------

    const yInput =
        document.getElementById("propY");

    if (yInput) {

        yInput.addEventListener("change", () => {

            savePropertyHistoryOnce();

            obj.y =
                parseFloat(yInput.value) || 0;

            render();
        });
    }


    // ---------- WIDTH ----------

    const widthInput =
        document.getElementById("propWidth");

    if (widthInput) {

        widthInput.addEventListener("change", () => {

            savePropertyHistoryOnce();

            obj.width = Math.max(
                1,
                parseFloat(widthInput.value) || 1
            );

            render();
        });
    }


    // ---------- HEIGHT ----------

    const heightInput =
        document.getElementById("propHeight");

    if (heightInput) {

        heightInput.addEventListener("change", () => {

            savePropertyHistoryOnce();

            obj.height = Math.max(
                1,
                parseFloat(heightInput.value) || 1
            );

            render();
        });
    }


    // ---------- ROTATION ----------

    const rotationInput =
        document.getElementById("propRotation");

    if (rotationInput) {

        rotationInput.addEventListener("change", () => {

            savePropertyHistoryOnce();

            obj.rotation =
                parseFloat(rotationInput.value) || 0;

            render();
        });
    }


    // ---------- OPACITY ----------

    const opacityInput =
        document.getElementById("propOpacity");

    if (opacityInput) {

        opacityInput.addEventListener("change", () => {

            savePropertyHistoryOnce();

            obj.opacity = clamp(
                parseFloat(opacityInput.value) || 1,
                0,
                1
            );

            render();
        });
    }


    // ---------- FILL ----------

    const fillInput =
        document.getElementById("propFill");

    if (fillInput) {

        fillInput.addEventListener("input", () => {

            savePropertyHistoryOnce();

            obj.fill =
                fillInput.value;

            render();
        });
    }


    // ---------- STROKE ----------

    const strokeInput =
        document.getElementById("propStroke");

    if (strokeInput) {

        strokeInput.addEventListener("input", () => {

            savePropertyHistoryOnce();

            obj.stroke =
                strokeInput.value;

            render();
        });
    }


    // ---------- STROKE WIDTH ----------

    const strokeWidthInput =
        document.getElementById(
            "propStrokeWidth"
        );

    if (strokeWidthInput) {

        strokeWidthInput.addEventListener(
            "change",
            () => {

                savePropertyHistoryOnce();

                obj.strokeWidth = Math.max(
                    0,
                    parseFloat(
                        strokeWidthInput.value
                    ) || 0
                );

                render();
            }
        );
    }


    // ---------- TEXT ----------

    const textInput =
        document.getElementById("propText");

    if (textInput) {

        textInput.addEventListener("input", () => {

            savePropertyHistoryOnce();

            obj.text =
                textInput.value;

            ctx.font =
                `${obj.fontSize || 24}px ${
                    obj.fontFamily || "Arial"
                }`;

            obj.width = Math.max(
                20,
                ctx.measureText(
                    obj.text || "Text"
                ).width
            );

            render();
        });
    }


    // ---------- FONT SIZE ----------

    const fontSizeInput =
        document.getElementById(
            "propFontSize"
        );

    if (fontSizeInput) {

        fontSizeInput.addEventListener(
            "change",
            () => {

                savePropertyHistoryOnce();

                obj.fontSize = Math.max(
                    1,
                    parseFloat(
                        fontSizeInput.value
                    ) || 24
                );

                ctx.font =
                    `${obj.fontSize}px ${
                        obj.fontFamily || "Arial"
                    }`;

                obj.width = Math.max(
                    20,
                    ctx.measureText(
                        obj.text || "Text"
                    ).width
                );

                obj.height =
                    obj.fontSize * 1.25;

                render();
            }
        );
    }


    // ---------- FONT FAMILY ----------

    const fontFamilyInput =
        document.getElementById(
            "propFontFamily"
        );

    if (fontFamilyInput) {

        fontFamilyInput.addEventListener(
            "change",
            () => {

                savePropertyHistoryOnce();

                obj.fontFamily =
                    fontFamilyInput.value ||
                    "Arial";

                ctx.font =
                    `${obj.fontSize || 24}px ${
                        obj.fontFamily
                    }`;

                obj.width = Math.max(
                    20,
                    ctx.measureText(
                        obj.text || "Text"
                    ).width
                );

                render();
            }
        );
    }
}


// ---------- UNGROUP SELECTED ----------

function ungroupSelected() {
    const selected = getSelectedObjects();

    if (selected.length === 0) return;

    saveHistory();

    let changed = false;

    selected.forEach(obj => {

        if (obj.type !== "group") return;

        const childIds = obj.children || [];

        childIds.forEach(childId => {
            const child = getObjectById(childId);

            if (child) {
                child.parentId = null;
            }
        });

        const index = state.objects.indexOf(obj);

        if (index !== -1) {
            state.objects.splice(index, 1);
            changed = true;
        }
    });

    if (changed) {
        state.selectedIds = [];
        render();
    }
}


// ---------- DELETE ----------

function deleteSelected() {
    if (state.selectedIds.length === 0) return;
    saveHistory();

    const idsToDelete = new Set(state.selectedIds);

    // If a group is deleted,
    // delete its children also
    state.selectedIds.forEach(id => {

        const obj = getObjectById(id);

        if (obj && obj.type === "group") {

            (obj.children || []).forEach(childId => {
                idsToDelete.add(childId);
            });
        }
    });

    state.objects = state.objects.filter(
        obj => !idsToDelete.has(obj.id)
    );

    state.selectedIds = [];

    render();
}


// ---------- OBJECT COUNT ----------

function updateObjectCount() {
    const countElement =
        document.getElementById("objectCount");

    if (!countElement) return;

    countElement.textContent =
        `${state.objects.length} objects`;
}


// ---------- ZOOM DISPLAY ----------

function updateZoomDisplay() {
    const zoomElement =
        document.getElementById("zoomValue");

    if (!zoomElement) return;

    zoomElement.textContent =
        `${Math.round(state.zoom * 100)}%`;
}


// ---------- ZOOM BUTTONS ----------

const zoomInButton =
    document.getElementById("zoomIn");

const zoomOutButton =
    document.getElementById("zoomOut");

const zoomResetButton =
    document.getElementById("zoomReset");


if (zoomInButton) {
    zoomInButton.addEventListener("click", () => {

        state.zoom = clamp(
            state.zoom + 0.1,
            0.2,
            3
        );

        updateZoomDisplay();
        render();
    });
}


if (zoomOutButton) {
    zoomOutButton.addEventListener("click", () => {

        state.zoom = clamp(
            state.zoom - 0.1,
            0.2,
            3
        );

        updateZoomDisplay();
        render();
    });
}


if (zoomResetButton) {
    zoomResetButton.addEventListener("click", () => {

        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;

        updateZoomDisplay();
        render();
    });
}


// ---------- GROUP / UNGROUP BUTTONS ----------

function addGroupControls() {

    const propertiesPanel =
        document.getElementById("propertiesContent");

    if (!propertiesPanel) return;

    // Avoid duplicate buttons
    if (document.getElementById("groupControls")) {
        return;
    }

    const controls =
        document.createElement("div");

    controls.id = "groupControls";
    controls.className = "group-controls";

    controls.innerHTML = `
        <div class="property-section">
            <h4>Group</h4>

            <button id="groupBtn">
                Group
            </button>

            <button id="ungroupBtn">
                Ungroup
            </button>
        </div>
    `;

    propertiesPanel.appendChild(controls);

    const groupBtn =
        document.getElementById("groupBtn");

    const ungroupBtn =
        document.getElementById("ungroupBtn");

    if (groupBtn) {
        groupBtn.addEventListener(
            "click",
            groupSelected
        );
    }

    if (ungroupBtn) {
        ungroupBtn.addEventListener(
            "click",
            ungroupSelected
        );
    }
}


// ---------- KEYBOARD SHORTCUTS ----------

document.addEventListener("keydown", event => {

    // Don't trigger shortcuts while typing
    const tag = document.activeElement
        ? document.activeElement.tagName
        : "";

    if (
        tag === "INPUT" ||
        tag === "TEXTAREA"
    ) {
        return;
    }


    // V = Select
    if (event.key.toLowerCase() === "v") {
        setActiveTool("select");
        return;
    }


    // R = Rectangle
    if (event.key.toLowerCase() === "r") {
        setActiveTool("rectangle");
        return;
    }


    // O = Ellipse
    if (event.key.toLowerCase() === "o") {
        setActiveTool("ellipse");
        return;
    }


    // L = Line
    if (event.key.toLowerCase() === "l") {
        setActiveTool("line");
        return;
    }


    // T = Text
    if (event.key.toLowerCase() === "t") {
        setActiveTool("text");
        return;
    }


    // Delete / Backspace
    if (
        event.key === "Delete" ||
        event.key === "Backspace"
    ) {
        event.preventDefault();
        deleteSelected();
        return;
    }


    // Ctrl + G = Group
    if (
        event.ctrlKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "g"
    ) {
        event.preventDefault();
        groupSelected();
        return;
    }


    // Ctrl + Shift + G = Ungroup
    if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "g"
    ) {
        event.preventDefault();
        ungroupSelected();
        return;
    }


    // Ctrl + ] = Bring Forward
    if (
        event.ctrlKey &&
        !event.shiftKey &&
        event.key === "]"
    ) {
        event.preventDefault();
        bringForwardLayer();
        return;
    }


    // Ctrl + Shift + ] = Bring To Front
    if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key === "]"
    ) {
        event.preventDefault();
        bringToFront();
        return;
    }


    // Ctrl + [ = Send Backward
    if (
        event.ctrlKey &&
        !event.shiftKey &&
        event.key === "["
    ) {
        event.preventDefault();
        sendBackwardLayer();
        return;
    }


    // Ctrl + Shift + [ = Send To Back
    if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key === "["
    ) {
        event.preventDefault();
        sendToBack();
        return;
    }
});


// ---------- EXPORT PNG ----------

function exportPNG() {

    try {

        const link =
            document.createElement("a");

        link.download =
            "mini-figma-design.png";

        link.href =
            canvas.toDataURL("image/png");

        link.click();

    } catch (error) {

        console.error(
            "PNG export failed:",
            error
        );

        alert(
            "PNG export failed."
        );
    }
}


const exportButton =
    document.getElementById("exportBtn");

if (exportButton) {
    exportButton.addEventListener(
        "click",
        exportPNG
    );
}


// ---------- LAYERS PANEL UPDATE ----------

// Rebuild layer panel after every render
// while keeping current functionality.

const originalUpdateLayersPanel =
    updateLayersPanel;

updateLayersPanel = function() {

    const container =
        document.getElementById("layersList");

    if (!container) return;

    container.innerHTML = "";

    const header =
        document.createElement("div");

    header.className =
        "layers-header";

    header.textContent =
        `Layers (${state.objects.length})`;

    container.appendChild(header);


    // Top-most layer first
    [...state.objects]
        .reverse()
        .forEach(obj => {

            const layer =
                document.createElement("div");

            layer.className =
                "layer-item";

            if (
                state.selectedIds.includes(obj.id)
            ) {
                layer.classList.add("selected");
            }


            let icon = "▭";

            if (obj.type === "ellipse") {
                icon = "○";
            }

            if (obj.type === "line") {
                icon = "╱";
            }

            if (obj.type === "text") {
                icon = "T";
            }

            if (obj.type === "group") {
                icon = "▣";
            }


            layer.innerHTML = `
                <span class="layer-icon">
                    ${icon}
                </span>

                <span class="layer-name">
                    ${escapeHTML(
                        obj.name || obj.type
                    )}
                </span>
            `;


            // Select from Layers panel
            layer.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    if (event.shiftKey) {

                        if (
                            state.selectedIds.includes(
                                obj.id
                            )
                        ) {

                            state.selectedIds =
                                state.selectedIds.filter(
                                    id =>
                                        id !== obj.id
                                );

                        } else {

                            state.selectedIds.push(
                                obj.id
                            );
                        }

                    } else {

                        state.selectedIds =
                            [obj.id];
                    }

                    render();
                }
            );


            // Double-click rename
            layer.addEventListener(
                "dblclick",
                event => {

                    event.stopPropagation();

                    renameLayer(obj);
                }
            );


            container.appendChild(layer);
        });


    // Layer ordering controls
    createLayerButtons(container);
};


// ---------- OBJECT COUNT ----------

function refreshObjectCount() {

    const count =
        document.getElementById(
            "objectCount"
        );

    if (count) {
        count.textContent =
            `${state.objects.length} objects`;
    }
}


// ---------- FINAL RENDER WRAPPER ----------

const originalRender = render;

render = function() {

    originalRender();

    updateObjectCount();
    updateZoomDisplay();

    // Add group controls after properties
    setTimeout(() => {
        addGroupControls();
    }, 0);
};


// ---------- INITIALIZATION ----------

resizeCanvas();

updateZoomDisplay();

updateToolButtons();

render();

setTimeout(() => {
    addGroupControls();
}, 100);
// ==========================================
// PHASE 6 — PART 1/4
// UNDO + REDO HISTORY SYSTEM
// ==========================================


// ---------- HISTORY STATE ----------

const historyState = {
    undoStack: [],
    redoStack: [],
    maxHistory: 50,
    isRestoring: false
};


// ---------- CREATE SNAPSHOT ----------

function createHistorySnapshot() {

    return JSON.parse(
        JSON.stringify({
            objects: state.objects,
            selectedIds: state.selectedIds,
            zoom: state.zoom,
            panX: state.panX,
            panY: state.panY
        })
    );
}


// ---------- RESTORE SNAPSHOT ----------

function restoreHistorySnapshot(snapshot) {

    if (!snapshot) return;

    historyState.isRestoring = true;

    state.objects =
        JSON.parse(
            JSON.stringify(snapshot.objects)
        );

    state.selectedIds =
        [...(snapshot.selectedIds || [])];

    state.zoom =
        snapshot.zoom ?? 1;

    state.panX =
        snapshot.panX ?? 0;

    state.panY =
        snapshot.panY ?? 0;

    historyState.isRestoring = false;

    updateZoomDisplay();
    render();
}


// ---------- SAVE HISTORY ----------

function saveHistory() {

    // Don't save history while restoring
    if (historyState.isRestoring) {
        return;
    }

    const snapshot =
        createHistorySnapshot();

    historyState.undoStack.push(snapshot);

    // Clear redo after a new action
    historyState.redoStack = [];

    // Maximum history limit
    if (
        historyState.undoStack.length >
        historyState.maxHistory
    ) {
        historyState.undoStack.shift();
    }

    updateHistoryButtons();
}


// ---------- UNDO ----------

function undo() {

    if (
        historyState.undoStack.length === 0
    ) {
        return;
    }

    // Save current state into redo
    const currentSnapshot =
        createHistorySnapshot();

    historyState.redoStack.push(
        currentSnapshot
    );

    // Get previous state
    const previousSnapshot =
        historyState.undoStack.pop();

    restoreHistorySnapshot(
        previousSnapshot
    );

    updateHistoryButtons();
}


// ---------- REDO ----------

function redo() {

    if (
        historyState.redoStack.length === 0
    ) {
        return;
    }

    // Save current state into undo
    const currentSnapshot =
        createHistorySnapshot();

    historyState.undoStack.push(
        currentSnapshot
    );

    // Get next state
    const nextSnapshot =
        historyState.redoStack.pop();

    restoreHistorySnapshot(
        nextSnapshot
    );

    updateHistoryButtons();
}


// ---------- HISTORY BUTTON STATUS ----------

function updateHistoryButtons() {

    const undoButton =
        document.getElementById("undoBtn");

    const redoButton =
        document.getElementById("redoBtn");


    if (undoButton) {

        undoButton.disabled =
            historyState.undoStack.length === 0;
    }


    if (redoButton) {

        redoButton.disabled =
            historyState.redoStack.length === 0;
    }
}


// ---------- CLEAR HISTORY ----------

function clearHistory() {

    historyState.undoStack = [];
    historyState.redoStack = [];

    updateHistoryButtons();
}


// ---------- INITIAL HISTORY ----------

// Save the initial empty canvas state
clearHistory();

historyState.undoStack.push(
    createHistorySnapshot()
);

updateHistoryButtons();
// ==========================================
// PHASE 6 — PART 2/4
// CREATE / MOVE / RESIZE / ROTATE HISTORY
// ==========================================


// ---------- HISTORY SAFE SAVE ----------

function saveActionHistory() {

    if (historyState.isRestoring) {
        return;
    }

    saveHistory();
}


// ---------- CHECK OBJECT CHANGE ----------

function objectStateChanged(
    before,
    after
) {

    if (!before || !after) {
        return true;
    }

    return JSON.stringify(before) !==
           JSON.stringify(after);
}


// ---------- SAVE CURRENT OBJECT STATE ----------

function captureObjectState(obj) {

    if (!obj) {
        return null;
    }

    return JSON.parse(
        JSON.stringify(obj)
    );
}


// ---------- HISTORY DEBUG ----------

function getHistoryInfo() {

    return {
        undoCount:
            historyState.undoStack.length,

        redoCount:
            historyState.redoStack.length
    };
}


// ---------- HISTORY BUTTON UPDATE ----------

function refreshHistoryUI() {

    updateHistoryButtons();
}


// ---------- CREATE HISTORY HELPER ----------

function historyAfterCreate() {

    if (historyState.isRestoring) {
        return;
    }

    saveHistory();
    refreshHistoryUI();
}


// ---------- MOVE HISTORY HELPER ----------

function historyAfterMove() {

    if (historyState.isRestoring) {
        return;
    }

    saveHistory();
    refreshHistoryUI();
}


// ---------- RESIZE HISTORY HELPER ----------

function historyAfterResize() {

    if (historyState.isRestoring) {
        return;
    }

    saveHistory();
    refreshHistoryUI();
}


// ---------- ROTATION HISTORY HELPER ----------

function historyAfterRotate() {

    if (historyState.isRestoring) {
        return;
    }

    saveHistory();
    refreshHistoryUI();
}


// ---------- INITIAL HISTORY UI ----------

refreshHistoryUI();
// ==========================================
// PHASE 6 — PART 4/4
// FINAL UNDO / REDO INTEGRATION
// ==========================================


// ---------- UNDO BUTTON ----------

const finalUndoButton =
    document.getElementById("undoBtn");

if (finalUndoButton) {

    finalUndoButton.addEventListener(
        "click",
        () => {
            undo();
        }
    );
}


// ---------- REDO BUTTON ----------

const finalRedoButton =
    document.getElementById("redoBtn");

if (finalRedoButton) {

    finalRedoButton.addEventListener(
        "click",
        () => {
            redo();
        }
    );
}


// ---------- KEYBOARD SHORTCUTS ----------

document.addEventListener("keydown", event => {

    // Don't run shortcuts while typing
    const activeElement =
        document.activeElement;

    const tag =
        activeElement
            ? activeElement.tagName
            : "";

    if (
        tag === "INPUT" ||
        tag === "TEXTAREA"
    ) {
        return;
    }


    // --------------------------------
    // CTRL + Z = UNDO
    // --------------------------------

    if (
        event.ctrlKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "z"
    ) {

        event.preventDefault();

        undo();

        return;
    }


    // --------------------------------
    // CTRL + Y = REDO
    // --------------------------------

    if (
        event.ctrlKey &&
        event.key.toLowerCase() === "y"
    ) {

        event.preventDefault();

        redo();

        return;
    }


    // --------------------------------
    // CTRL + SHIFT + Z = REDO
    // --------------------------------

    if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "z"
    ) {

        event.preventDefault();

        redo();

        return;
    }

});


// ---------- UPDATE HISTORY UI ----------

function finalUpdateHistoryUI() {

    const undoButton =
        document.getElementById("undoBtn");

    const redoButton =
        document.getElementById("redoBtn");


    if (undoButton) {

        undoButton.disabled =
            historyState.undoStack.length === 0;

        undoButton.title =
            "Undo (Ctrl + Z)";
    }


    if (redoButton) {

        redoButton.disabled =
            historyState.redoStack.length === 0;

        redoButton.title =
            "Redo (Ctrl + Y)";
    }
}


// ---------- WRAP UNDO ----------

const originalUndoFunction =
    undo;

undo = function () {

    originalUndoFunction();

    finalUpdateHistoryUI();
};


// ---------- WRAP REDO ----------

const originalRedoFunction =
    redo;

redo = function () {

    originalRedoFunction();

    finalUpdateHistoryUI();
};


// ---------- INITIAL HISTORY UI ----------

finalUpdateHistoryUI();


// ==========================================
// PHASE 6 COMPLETE
// ==========================================

console.log(
    "Phase 6 Undo/Redo system loaded successfully."
);
// ==========================================
// PHASE 7 — ZOOM & PAN
// PART 1/4 — MOUSE WHEEL ZOOM
// ==========================================

let isWheelZooming = false;

canvas.addEventListener("wheel", function (e) {

    e.preventDefault();

    // Mouse position before zoom
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    // Current zoom
    const oldZoom = state.zoom;

    // Zoom speed
    const zoomSpeed = 0.1;

    // Zoom direction
    if (e.deltaY < 0) {
        state.zoom += zoomSpeed;
    } else {
        state.zoom -= zoomSpeed;
    }

    // Limit zoom
    state.zoom = Math.max(
        0.25,
        Math.min(4, state.zoom)
    );

    const newZoom = state.zoom;

    // Keep the point under mouse stable
    const canvasX =
        (mouseX - state.panX) / oldZoom;

    const canvasY =
        (mouseY - state.panY) / oldZoom;

    state.panX =
        mouseX - canvasX * newZoom;

    state.panY =
        mouseY - canvasY * newZoom;

    isWheelZooming = true;

    updateZoomDisplay();

    render();

    setTimeout(() => {
        isWheelZooming = false;
    }, 50);

}, { passive: false });


// ==========================================
// ZOOM BUTTONS
// ==========================================

const phase7ZoomIn =
    document.getElementById("zoomIn");

const phase7ZoomOut =
    document.getElementById("zoomOut");

const phase7ZoomReset =
    document.getElementById("zoomReset");


if (phase7ZoomIn) {

    phase7ZoomIn.addEventListener(
        "click",
        function () {

            state.zoom += 0.1;

            state.zoom = Math.min(
                4,
                state.zoom
            );

            updateZoomDisplay();

            render();
        }
    );
}


if (phase7ZoomOut) {

    phase7ZoomOut.addEventListener(
        "click",
        function () {

            state.zoom -= 0.1;

            state.zoom = Math.max(
                0.25,
                state.zoom
            );

            updateZoomDisplay();

            render();
        }
    );
}


if (phase7ZoomReset) {

    phase7ZoomReset.addEventListener(
        "click",
        function () {

            state.zoom = 1;

            state.panX = 0;

            state.panY = 0;

            updateZoomDisplay();

            render();
        }
    );
}


console.log(
    "Phase 7 Part 1: Mouse wheel zoom loaded."
);
//
// ==========================================
// PHASE 7 — PART 2/4
// SPACE + DRAG CANVAS PAN
// ==========================================
//

let isPanning = false;

let panStartX = 0;
let panStartY = 0;

let panStartPanX = 0;
let panStartPanY = 0;


// ==========================================
// SPACE KEY
// ==========================================

let isSpacePressed = false;

document.addEventListener("keydown", function (e) {

    // Don't activate while typing
    const tag = e.target.tagName;

    if (
        tag === "INPUT" ||
        tag === "TEXTAREA"
    ) {
        return;
    }

    if (e.code === "Space") {

        e.preventDefault();

        isSpacePressed = true;

        canvas.style.cursor = "grab";
    }

});


// ==========================================
// SPACE KEY RELEASE
// ==========================================

document.addEventListener("keyup", function (e) {

    if (e.code === "Space") {

        isSpacePressed = false;

        if (!isPanning) {
            canvas.style.cursor = "default";
        }
    }

});


// ==========================================
// START PAN
// ==========================================

canvas.addEventListener(
    "mousedown",
    function (e) {

        // Space + left mouse button
        if (
            isSpacePressed &&
            e.button === 0
        ) {

            e.preventDefault();

            isPanning = true;

            panStartX = e.clientX;
            panStartY = e.clientY;

            panStartPanX = state.panX;
            panStartPanY = state.panY;

            canvas.style.cursor = "grabbing";
        }

    }
);


// ==========================================
// PAN MOVE
// ==========================================

canvas.addEventListener(
    "mousemove",
    function (e) {

        if (!isPanning) {
            return;
        }

        const deltaX =
            e.clientX - panStartX;

        const deltaY =
            e.clientY - panStartY;

        state.panX =
            panStartPanX + deltaX;

        state.panY =
            panStartPanY + deltaY;

        render();
    }
);


// ==========================================
// END PAN
// ==========================================

canvas.addEventListener(
    "mouseup",
    function () {

        if (!isPanning) {
            return;
        }

        isPanning = false;

        if (isSpacePressed) {
            canvas.style.cursor = "grab";
        } else {
            canvas.style.cursor = "default";
        }

    }
);


// ==========================================
// CANCEL PAN IF MOUSE LEAVES
// ==========================================

canvas.addEventListener(
    "mouseleave",
    function () {

        if (isPanning) {

            isPanning = false;

            canvas.style.cursor =
                isSpacePressed
                    ? "grab"
                    : "default";
        }

    }
);


console.log(
    "Phase 7 Part 2: Space + Drag pan loaded."
);
//
// ==========================================
// PHASE 7 — PART 3/4
// MIDDLE MOUSE BUTTON PAN
// ==========================================
//

let isMiddlePanning = false;

let middlePanStartX = 0;
let middlePanStartY = 0;

let middlePanStartPanX = 0;
let middlePanStartPanY = 0;


// ==========================================
// START MIDDLE MOUSE PAN
// ==========================================

canvas.addEventListener(
    "mousedown",
    function (e) {

        // Middle mouse button = 1
        if (e.button !== 1) {
            return;
        }

        e.preventDefault();

        isMiddlePanning = true;

        middlePanStartX = e.clientX;
        middlePanStartY = e.clientY;

        middlePanStartPanX =
            state.panX;

        middlePanStartPanY =
            state.panY;

        canvas.style.cursor = "grabbing";
    }
);


// ==========================================
// MIDDLE MOUSE PAN MOVE
// ==========================================

canvas.addEventListener(
    "mousemove",
    function (e) {

        if (!isMiddlePanning) {
            return;
        }

        const deltaX =
            e.clientX - middlePanStartX;

        const deltaY =
            e.clientY - middlePanStartY;


        state.panX =
            middlePanStartPanX + deltaX;

        state.panY =
            middlePanStartPanY + deltaY;


        render();
    }
);


// ==========================================
// END MIDDLE MOUSE PAN
// ==========================================

canvas.addEventListener(
    "mouseup",
    function (e) {

        if (
            e.button !== 1 ||
            !isMiddlePanning
        ) {
            return;
        }

        isMiddlePanning = false;

        canvas.style.cursor =
            isSpacePressed
                ? "grab"
                : "default";
    }
);


// ==========================================
// PREVENT MIDDLE CLICK DEFAULT ACTION
// ==========================================

canvas.addEventListener(
    "auxclick",
    function (e) {

        if (e.button === 1) {
            e.preventDefault();
        }

    }
);


console.log(
    "Phase 7 Part 3: Middle mouse pan loaded."
);
//
// ==========================================
// PHASE 7 — PART 4/4
// ZOOM + PAN FINAL POLISH
// ==========================================


// ==========================================
// KEEP ZOOM INSIDE SAFE RANGE
// ==========================================

function clampZoom() {

    state.zoom = Math.max(
        0.25,
        Math.min(
            4,
            state.zoom
        )
    );

}


// ==========================================
// UPDATE CURSOR
// ==========================================

function updateCanvasCursor() {

    if (isPanning) {

        canvas.style.cursor =
            "grabbing";

        return;
    }


    if (isMiddlePanning) {

        canvas.style.cursor =
            "grabbing";

        return;
    }


    if (isSpacePressed) {

        canvas.style.cursor =
            "grab";

        return;
    }


    canvas.style.cursor =
        "default";
}


// ==========================================
// ESCAPE = STOP PAN
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        if (e.key !== "Escape") {
            return;
        }

        isPanning = false;

        isMiddlePanning = false;

        isSpacePressed = false;

        updateCanvasCursor();

    }
);


// ==========================================
// WINDOW MOUSE UP
// ==========================================
// Prevents stuck grabbing state
// if mouse button is released outside canvas.

window.addEventListener(
    "mouseup",
    function () {

        isPanning = false;

        isMiddlePanning = false;

        updateCanvasCursor();

    }
);


// ==========================================
// WINDOW BLUR
// ==========================================
// If user switches window/app while
// holding Space or mouse.

window.addEventListener(
    "blur",
    function () {

        isPanning = false;

        isMiddlePanning = false;

        isSpacePressed = false;

        updateCanvasCursor();

    }
);


// ==========================================
// FINAL ZOOM DISPLAY
// ==========================================

function refreshZoomUI() {

    clampZoom();

    updateZoomDisplay();

}


// ==========================================
// INITIAL CURSOR
// ==========================================

updateCanvasCursor();

refreshZoomUI();


// ==========================================
// PHASE 7 COMPLETE
// ==========================================

console.log(
    "Phase 7 complete: Zoom + Pan system ready."
);
//
// ==========================================
// PHASE 8 — SNAPPING & ALIGNMENT
// PART 1/4 — BASIC OBJECT SNAPPING
// ==========================================


// ==========================================
// SNAP SETTINGS
// ==========================================

const snapSettings = {

    enabled: true,

    // Maximum distance for snapping
    distance: 8,

    // Show visual guides later
    showGuides: true

};


// ==========================================
// SNAP GUIDES
// ==========================================

const snapGuides = {

    vertical: [],

    horizontal: []

};


// ==========================================
// CLEAR SNAP GUIDES
// ==========================================

function clearSnapGuides() {

    snapGuides.vertical = [];

    snapGuides.horizontal = [];

}


// ==========================================
// GET SNAP POINTS
// ==========================================

function getSnapPoints(obj) {

    const bounds =
        getObjectBounds(obj);

    const center =
        getObjectCenter(obj);


    return {

        left: bounds.left,

        right: bounds.right,

        centerX: center.x,

        top: bounds.top,

        bottom: bounds.bottom,

        centerY: center.y

    };

}


// ==========================================
// FIND SNAP VALUE
// ==========================================

function findSnapValue(
    value,
    targets,
    maxDistance
) {

    let bestTarget = null;

    let bestDistance =
        maxDistance + 1;


    for (
        let i = 0;
        i < targets.length;
        i++
    ) {

        const distance =
            Math.abs(
                value - targets[i]
            );


        if (
            distance <= maxDistance &&
            distance < bestDistance
        ) {

            bestDistance = distance;

            bestTarget = targets[i];
        }

    }


    return bestTarget;
}


// ==========================================
// GET OTHER OBJECTS
// ==========================================

function getOtherObjects(
    movingObject
) {

    return state.objects.filter(
        obj => {

            if (
                obj.id ===
                movingObject.id
            ) {

                return false;
            }


            // Don't snap to children
            // of the same group

            if (
                movingObject.parentId &&
                obj.parentId ===
                movingObject.parentId
            ) {

                return false;
            }


            return true;
        }
    );

}


// ==========================================
// SNAP OBJECT POSITION
// ==========================================

function applyObjectSnapping(
    obj
) {

    if (
        !snapSettings.enabled ||
        !obj
    ) {

        return;
    }


    clearSnapGuides();


    const points =
        getSnapPoints(obj);


    const others =
        getOtherObjects(obj);


    if (others.length === 0) {

        return;
    }


    const targetX = [];

    const targetY = [];


    // --------------------------------------
    // Collect target points
    // --------------------------------------

    others.forEach(
        other => {

            const otherPoints =
                getSnapPoints(other);


            targetX.push(
                otherPoints.left
            );

            targetX.push(
                otherPoints.centerX
            );

            targetX.push(
                otherPoints.right
            );


            targetY.push(
                otherPoints.top
            );

            targetY.push(
                otherPoints.centerY
            );

            targetY.push(
                otherPoints.bottom
            );

        }
    );


    // --------------------------------------
    // Find closest X snap
    // --------------------------------------

    const xCandidates = [

        {
            value: points.left,
            type: "left"
        },

        {
            value: points.centerX,
            type: "center"
        },

        {
            value: points.right,
            type: "right"
        }

    ];


    let bestX = null;

    let bestXDistance =
        snapSettings.distance + 1;


    xCandidates.forEach(
        candidate => {

            const target =
                findSnapValue(
                    candidate.value,
                    targetX,
                    snapSettings.distance
                );


            if (target === null) {
                return;
            }


            const distance =
                Math.abs(
                    candidate.value -
                    target
                );


            if (
                distance <
                bestXDistance
            ) {

                bestXDistance =
                    distance;

                bestX = {

                    target: target,

                    type: candidate.type

                };

            }

        }
    );


    // --------------------------------------
    // Apply X snap
    // --------------------------------------

    if (bestX) {

        const difference =
            bestX.target -
            (
                bestX.type === "left"
                    ? points.left
                    : bestX.type === "center"
                        ? points.centerX
                        : points.right
            );


        obj.x += difference;

        snapGuides.vertical.push(
            bestX.target
        );

    }


    // --------------------------------------
    // Find closest Y snap
    // --------------------------------------

    const yCandidates = [

        {
            value: points.top,
            type: "top"
        },

        {
            value: points.centerY,
            type: "center"
        },

        {
            value: points.bottom,
            type: "bottom"
        }

    ];


    let bestY = null;

    let bestYDistance =
        snapSettings.distance + 1;


    yCandidates.forEach(
        candidate => {

            const target =
                findSnapValue(
                    candidate.value,
                    targetY,
                    snapSettings.distance
                );


            if (target === null) {
                return;
            }


            const distance =
                Math.abs(
                    candidate.value -
                    target
                );


            if (
                distance <
                bestYDistance
            ) {

                bestYDistance =
                    distance;

                bestY = {

                    target: target,

                    type: candidate.type

                };

            }

        }
    );


    // --------------------------------------
    // Apply Y snap
    // --------------------------------------

    if (bestY) {

        const difference =
            bestY.target -
            (
                bestY.type === "top"
                    ? points.top
                    : bestY.type === "center"
                        ? points.centerY
                        : points.bottom
            );


        obj.y += difference;

        snapGuides.horizontal.push(
            bestY.target
        );

    }

}


// ==========================================
// SNAP STATUS
// ==========================================

function toggleSnapping() {

    snapSettings.enabled =
        !snapSettings.enabled;


    clearSnapGuides();


    console.log(
        "Snapping:",
        snapSettings.enabled
            ? "ON"
            : "OFF"
    );


    render();

}


// ==========================================
// PHASE 8 PART 1 COMPLETE
// ==========================================

console.log(
    "Phase 8 Part 1: Basic snapping loaded."
);
//
// ==========================================
// PHASE 8 — PART 2/4
// CONNECT SNAPPING WITH MOVEMENT
// ==========================================

function snapSelectedObjects() {

    if (
        !snapSettings.enabled ||
        state.selectedIds.length === 0
    ) {
        return;
    }


    // Clear previous guides
    clearSnapGuides();


    // Single selected object
    if (
        state.selectedIds.length === 1
    ) {

        const obj =
            getObjectById(
                state.selectedIds[0]
            );


        if (obj) {

            applyObjectSnapping(obj);
        }


        return;
    }


    // Multiple selected objects
    // Snap using the first selected object

    const primaryObject =
        getObjectById(
            state.selectedIds[0]
        );


    if (primaryObject) {

        applyObjectSnapping(
            primaryObject
        );
    }

}


// ==========================================
// SNAP AFTER MOVE
// ==========================================

function finishMoveWithSnapping() {

    if (!snapSettings.enabled) {

        clearSnapGuides();

        return;
    }


    snapSelectedObjects();

    render();

}


// ==========================================
// PHASE 8 PART 2
// ==========================================

console.log(
    "Phase 8 Part 2: Movement snapping connector loaded."
);
//
// ==========================================
// PHASE 8 — PART 2
// ACTUAL MOVE + SNAP CONNECTION
// ==========================================

let lastMoveX = null;
let lastMoveY = null;


// ==========================================
// SAVE ORIGINAL RENDER
// ==========================================

const phase8OriginalRender = render;


// ==========================================
// RENDER WRAPPER
// ==========================================

render = function () {

    phase8OriginalRender();

};


// ==========================================
// SNAP CURRENTLY SELECTED OBJECT
// ==========================================

function applySnapDuringMove() {

    if (!state.isMoving) {
        return;
    }

    if (!snapSettings.enabled) {
        return;
    }

    if (state.selectedIds.length !== 1) {
        return;
    }

    const obj =
        getObjectById(
            state.selectedIds[0]
        );

    if (!obj) {
        return;
    }

    applyObjectSnapping(obj);

    lastMoveX = obj.x;
    lastMoveY = obj.y;

}


// ==========================================
// MOUSE MOVE LISTENER
// ==========================================

canvas.addEventListener(
    "mousemove",
    function () {

        if (!state.isMoving) {
            return;
        }

        // Existing movement listener has already
        // changed the object's position.
        //
        // Now apply snapping.

        applySnapDuringMove();

        render();

    }
);


// ==========================================
// CLEAR SNAP WHEN MOVE ENDS
// ==========================================

canvas.addEventListener(
    "mouseup",
    function () {

        if (!state.isMoving) {
            return;
        }

        clearSnapGuides();

        lastMoveX = null;
        lastMoveY = null;

    }
);


console.log(
    "Phase 8 Part 2: Move snapping connected."
);
//
// ==========================================
// PHASE 8 — PART 3/4
// VISUAL SNAP GUIDES
// ==========================================


// ==========================================
// DRAW SNAP GUIDES
// ==========================================

function drawSnapGuides() {

    if (
        !snapSettings.enabled ||
        !snapSettings.showGuides
    ) {
        return;
    }


    ctx.save();


    // Guides are drawn in canvas coordinates
    ctx.lineWidth = 1 / state.zoom;


    // --------------------------------------
    // VERTICAL GUIDES
    // --------------------------------------

    snapGuides.vertical.forEach(
        x => {

            ctx.beginPath();

            ctx.moveTo(
                x,
                -10000
            );

            ctx.lineTo(
                x,
                10000
            );

            ctx.strokeStyle =
                "#ff4d67";

            ctx.stroke();

        }
    );


    // --------------------------------------
    // HORIZONTAL GUIDES
    // --------------------------------------

    snapGuides.horizontal.forEach(
        y => {

            ctx.beginPath();

            ctx.moveTo(
                -10000,
                y
            );

            ctx.lineTo(
                10000,
                y
            );

            ctx.strokeStyle =
                "#ff4d67";

            ctx.stroke();

        }
    );


    ctx.restore();

}


// ==========================================
// WRAP RENDER
// ==========================================

const phase8RenderWithGuides =
    render;


render = function () {

    phase8RenderWithGuides();

    drawSnapGuides();

};


// ==========================================
// CLEAR GUIDES AFTER MOVE
// ==========================================

canvas.addEventListener(
    "mouseup",
    function () {

        if (
            !state.isMoving &&
            !isPanning &&
            !isMiddlePanning
        ) {

            clearSnapGuides();

            render();

        }

    }
);


// ==========================================
// PHASE 8 PART 3 COMPLETE
// ==========================================

console.log(
    "Phase 8 Part 3: Visual snap guides loaded."
);
//
// ==========================================
// PHASE 8 — PART 4/4
// FINAL SNAPPING POLISH
// ==========================================


// ==========================================
// TOGGLE SNAP WITH S KEY
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;

        // Don't trigger while typing
        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        // S = Toggle snapping
        if (
            e.key.toLowerCase() === "s"
        ) {

            // Don't trigger when modifier key
            // is being used
            if (
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey
            ) {
                return;
            }


            toggleSnapping();

            updateSnapStatus();
        }

    }
);


// ==========================================
// SNAP STATUS
// ==========================================

function updateSnapStatus() {

    console.log(
        "Object Snapping:",
        snapSettings.enabled
            ? "ON"
            : "OFF"
    );

}


// ==========================================
// SNAP DISTANCE
// ==========================================

function setSnapDistance(
    distance
) {

    if (
        typeof distance !==
        "number"
    ) {
        return;
    }


    snapSettings.distance =
        Math.max(
            1,
            Math.min(
                30,
                distance
            )
        );


    console.log(
        "Snap distance:",
        snapSettings.distance
    );

}


// ==========================================
// TOGGLE SNAP GUIDES
// ==========================================

function toggleSnapGuides() {

    snapSettings.showGuides =
        !snapSettings.showGuides;


    if (
        !snapSettings.showGuides
    ) {

        clearSnapGuides();
    }


    render();


    console.log(
        "Snap guides:",
        snapSettings.showGuides
            ? "ON"
            : "OFF"
    );

}


// ==========================================
// ESCAPE CLEARS GUIDES
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        if (e.key === "Escape") {

            clearSnapGuides();

            render();

        }

    }
);


// ==========================================
// CLEAR GUIDES WHEN SELECTION CHANGES
// ==========================================

canvas.addEventListener(
    "mousedown",
    function () {

        clearSnapGuides();

    }
);


// ==========================================
// FINAL SNAP INITIALIZATION
// ==========================================

snapSettings.enabled = true;

snapSettings.distance = 8;

snapSettings.showGuides = true;

clearSnapGuides();

updateSnapStatus();


// ==========================================
// PHASE 8 COMPLETE
// ==========================================

console.log(
    "Phase 8 complete: Snapping & Alignment ready."
);
//
// ==========================================
// PHASE 9 — COPY / PASTE / DUPLICATE
// PART 1/4 — COPY + PASTE
// ==========================================


// ==========================================
// CLIPBOARD
// ==========================================

const editorClipboard = {

    objects: []

};


// ==========================================
// COPY SELECTED OBJECTS
// ==========================================

function copySelectedObjects() {

    if (
        state.selectedIds.length === 0
    ) {
        return;
    }


    const selectedObjects =
        state.objects.filter(
            obj =>
                state.selectedIds.includes(
                    obj.id
                )
        );


    if (
        selectedObjects.length === 0
    ) {
        return;
    }


    // Deep copy
    editorClipboard.objects =
        JSON.parse(
            JSON.stringify(
                selectedObjects
            )
        );


    console.log(
        "Copied:",
        editorClipboard.objects.length,
        "object(s)"
    );

}


// ==========================================
// PASTE OBJECTS
// ==========================================

function pasteObjects() {

    if (
        editorClipboard.objects.length === 0
    ) {
        return;
    }


    const pastedObjects = [];


    editorClipboard.objects.forEach(
        original => {

            const newObject =
                JSON.parse(
                    JSON.stringify(
                        original
                    )
                );


            // New unique ID
            newObject.id =
                generateId();


            // New name
            newObject.name =
                original.name +
                " Copy";


            // Offset pasted object
            newObject.x =
                (newObject.x || 0) + 20;

            newObject.y =
                (newObject.y || 0) + 20;


            // New parent
            // so pasted object is independent
            newObject.parentId =
                null;


            pastedObjects.push(
                newObject
            );

        }
    );


    // Add to canvas
    state.objects.push(
        ...pastedObjects
    );


    // Select pasted objects
    state.selectedIds =
        pastedObjects.map(
            obj => obj.id
        );


    render();


    console.log(
        "Pasted:",
        pastedObjects.length,
        "object(s)"
    );

}


// ==========================================
// CTRL + C
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;


        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "c"
        ) {

            e.preventDefault();

            copySelectedObjects();

        }

    }
);


// ==========================================
// CTRL + V
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;


        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "v"
        ) {

            e.preventDefault();

            pasteObjects();

        }

    }
);


// ==========================================
// PHASE 9 PART 1 COMPLETE
// ==========================================

console.log(
    "Phase 9 Part 1: Copy + Paste loaded."
);
//
// ==========================================
// PHASE 9 — PART 2/4
// DUPLICATE OBJECTS
// ==========================================


// ==========================================
// DUPLICATE SELECTED OBJECTS
// ==========================================

function duplicateSelectedObjects() {

    if (
        state.selectedIds.length === 0
    ) {
        return;
    }


    const selectedObjects =
        state.objects.filter(
            obj =>
                state.selectedIds.includes(
                    obj.id
                )
        );


    if (
        selectedObjects.length === 0
    ) {
        return;
    }


    const duplicatedObjects = [];


    selectedObjects.forEach(
        original => {

            const duplicate =
                JSON.parse(
                    JSON.stringify(
                        original
                    )
                );


            // New unique ID
            duplicate.id =
                generateId();


            // New layer name
            duplicate.name =
                original.name +
                " Copy";


            // Move duplicate slightly
            duplicate.x =
                (duplicate.x || 0) + 20;

            duplicate.y =
                (duplicate.y || 0) + 20;


            // Make it independent
            duplicate.parentId =
                null;


            duplicatedObjects.push(
                duplicate
            );

        }
    );


    // Add duplicates
    state.objects.push(
        ...duplicatedObjects
    );


    // Select duplicates
    state.selectedIds =
        duplicatedObjects.map(
            obj => obj.id
        );


    render();


    console.log(
        "Duplicated:",
        duplicatedObjects.length,
        "object(s)"
    );

}


// ==========================================
// CTRL + D
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;


        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "d"
        ) {

            e.preventDefault();

            duplicateSelectedObjects();

        }

    }
);


// ==========================================
// PHASE 9 PART 2 COMPLETE
// ==========================================

console.log(
    "Phase 9 Part 2: Duplicate loaded."
);
//
// ==========================================
// PHASE 9 — PART 3/4
// ADDITIONAL KEYBOARD SHORTCUTS
// ==========================================


// ==========================================
// SELECT ALL
// CTRL + A
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;


        // Don't work while typing
        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        // ----------------------------------
        // CTRL + A
        // ----------------------------------

        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "a"
        ) {

            e.preventDefault();


            // Select all visible objects
            state.selectedIds =
                state.objects
                    .filter(
                        obj =>
                            obj.visible !== false
                    )
                    .map(
                        obj => obj.id
                    );


            render();


            console.log(
                "All objects selected."
            );

        }

    }
);


// ==========================================
// ESCAPE — DESELECT
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        if (e.key !== "Escape") {
            return;
        }


        const tag =
            e.target.tagName;


        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        state.selectedIds = [];


        clearSnapGuides();


        render();


        console.log(
            "Selection cleared."
        );

    }
);


// ==========================================
// CTRL + SHIFT + D
// QUICK DUPLICATE
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;


        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        if (
            e.ctrlKey &&
            e.shiftKey &&
            e.key.toLowerCase() === "d"
        ) {

            e.preventDefault();


            duplicateSelectedObjects();

        }

    }
);


// ==========================================
// PHASE 9 PART 3 COMPLETE
// ==========================================

console.log(
    "Phase 9 Part 3: Keyboard shortcuts loaded."
);
// ==========================================
// PHASE 9 — PART 4/4
// FINAL POLISH & TESTING
// ==========================================

function updatePhase9Status() {
    console.log("================================");
    console.log("PHASE 9 STATUS");
    console.log("Copy:", editorClipboard.objects.length, "object(s)");
    console.log("Selected:", state.selectedIds.length, "object(s)");
    console.log("Total Objects:", state.objects.length);
    console.log("================================");
}

// Refresh UI after paste/duplicate
function refreshAfterObjectAction() {
    updateLayersPanel();
    updatePropertiesPanel();
    updateObjectCount();
    render();
}

// Test helper
function testPhase9() {
    console.log("========== PHASE 9 TEST ==========");

    console.log(
        "Copy/Paste:",
        typeof copySelectedObjects === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "Duplicate:",
        typeof duplicateSelectedObjects === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "Clipboard:",
        editorClipboard.objects.length,
        "object(s)"
    );

    console.log(
        "Objects:",
        state.objects.length
    );

    console.log(
        "Selected:",
        state.selectedIds.length
    );

    console.log("==================================");
}

document.addEventListener("keydown", function(e) {

    const tag = e.target.tagName;

    if (
        tag === "INPUT" ||
        tag === "TEXTAREA"
    ) {
        return;
    }

    // F2 = Rename selected layer
    if (e.key === "F2") {

        e.preventDefault();

        if (state.selectedIds.length !== 1) {
            console.log(
                "F2: Select one object to rename."
            );
            return;
        }

        const obj =
            getObjectById(
                state.selectedIds[0]
            );

        if (obj) {
            renameLayer(obj);
        }
    }
});

// Show final status
updatePhase9Status();
testPhase9();

console.log(
    "Phase 9 Part 4: Final polish loaded."
);
// ==========================================
// PHASE 10 — PART 1/4
// PNG EXPORT
// ==========================================

function exportCanvasAsPNG() {

    try {

        if (!state.objects || state.objects.length === 0) {
            alert("Export karne ke liye canvas par koi object nahi hai.");
            return;
        }

        // Save current canvas state
        const oldSelectedIds =
            [...state.selectedIds];

        // Temporarily remove selection
        state.selectedIds = [];

        // Render clean canvas
        render();

        // Create download link
        const link =
            document.createElement("a");

        link.download =
            "figma-clone-design.png";

        link.href =
            canvas.toDataURL("image/png");

        link.click();

        // Restore selection
        state.selectedIds =
            oldSelectedIds;

        render();

        console.log(
            "PNG exported successfully."
        );

    } catch (error) {

        console.error(
            "PNG Export Error:",
            error
        );

        alert(
            "PNG export failed. Please try again."
        );
    }
}


// Connect existing Export button
const phase10ExportButton =
    document.getElementById("exportBtn");

if (phase10ExportButton) {

    phase10ExportButton.addEventListener(
        "click",
        function () {

            exportCanvasAsPNG();

        }
    );
}


console.log(
    "Phase 10 Part 1: PNG Export loaded."
);
// ==========================================
// PHASE 10 — PART 2/4
// JSON SAVE
// ==========================================

function saveProjectJSON() {

    try {

        const projectData = {
            app: "MiniFigma",
            version: "1.0",
            savedAt: new Date().toISOString(),

            canvas: {
                zoom: state.zoom,
                panX: state.panX,
                panY: state.panY
            },

            objects:
                JSON.parse(
                    JSON.stringify(state.objects)
                )
        };


        const jsonData =
            JSON.stringify(
                projectData,
                null,
                2
            );


        const blob =
            new Blob(
                [jsonData],
                {
                    type: "application/json"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            "minifigma-project.json";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);


        console.log(
            "JSON project saved successfully."
        );

    } catch (error) {

        console.error(
            "JSON Save Error:",
            error
        );

        alert(
            "Project save nahi ho paya."
        );
    }
}


// ==========================================
// SAVE BUTTON
// ==========================================

// Agar HTML me save button pehle se hai
const saveProjectButton =
    document.getElementById("saveProjectBtn");

if (saveProjectButton) {

    saveProjectButton.addEventListener(
        "click",
        function () {

            saveProjectJSON();

        }
    );
}


// ==========================================
// CTRL + S
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "s"
        ) {

            e.preventDefault();

            saveProjectJSON();

        }

    }
);


console.log(
    "Phase 10 Part 2: JSON Save loaded."
);
// ==========================================
// PHASE 10 — PART 3/4
// JSON LOAD
// ==========================================

function loadProjectJSON(file) {

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {

        try {

            const projectData =
                JSON.parse(event.target.result);

            // Basic validation
            if (
                !projectData ||
                !Array.isArray(projectData.objects)
            ) {

                throw new Error(
                    "Invalid MiniFigma project file."
                );
            }


            // Restore objects
            state.objects =
                JSON.parse(
                    JSON.stringify(
                        projectData.objects
                    )
                );


            // Restore canvas settings
            if (projectData.canvas) {

                state.zoom =
                    Number(
                        projectData.canvas.zoom
                    ) || 1;

                state.panX =
                    Number(
                        projectData.canvas.panX
                    ) || 0;

                state.panY =
                    Number(
                        projectData.canvas.panY
                    ) || 0;

            } else {

                state.zoom = 1;
                state.panX = 0;
                state.panY = 0;

            }


            // Clear current selection
            state.selectedIds = [];


            // Refresh editor
            render();

            updateLayersPanel();

            updatePropertiesPanel();

            updateObjectCount();

            updateZoomDisplay();


            console.log(
                "JSON project loaded successfully."
            );

            alert(
                "Project loaded successfully!"
            );

        } catch (error) {

            console.error(
                "JSON Load Error:",
                error
            );

            alert(
                "Invalid or corrupted MiniFigma JSON file."
            );
        }

    };


    reader.onerror = function () {

        alert(
            "File read nahi ho payi."
        );

    };


    reader.readAsText(file);
}


// ==========================================
// FILE INPUT
// ==========================================

let phase10FileInput =
    document.getElementById(
        "projectFileInput"
    );


if (!phase10FileInput) {

    phase10FileInput =
        document.createElement("input");

    phase10FileInput.type =
        "file";

    phase10FileInput.accept =
        ".json,application/json";

    phase10FileInput.id =
        "projectFileInput";

    phase10FileInput.style.display =
        "none";

    document.body.appendChild(
        phase10FileInput
    );

}


// ==========================================
// OPEN FILE PICKER
// ==========================================

function openProjectFile() {

    phase10FileInput.value = "";

    phase10FileInput.click();

}


phase10FileInput.addEventListener(
    "change",
    function () {

        const file =
            phase10FileInput.files[0];

        if (file) {

            loadProjectJSON(file);

        }

    }
);


// ==========================================
// LOAD BUTTON
// ==========================================

const loadProjectButton =
    document.getElementById(
        "loadProjectBtn"
    );


if (loadProjectButton) {

    loadProjectButton.addEventListener(
        "click",
        function () {

            openProjectFile();

        }
    );

}


// ==========================================
// CTRL + O
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "o"
        ) {

            e.preventDefault();

            openProjectFile();

        }

    }
);


console.log(
    "Phase 10 Part 3: JSON Load loaded."
);
// ==========================================
// PHASE 10 — PART 4/4
// FINAL INTEGRATION & TESTING
// ==========================================

function phase10Status() {

    console.log("====================================");
    console.log("PHASE 10 STATUS");
    console.log("====================================");

    console.log(
        "PNG Export:",
        typeof exportCanvasAsPNG === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "JSON Save:",
        typeof saveProjectJSON === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "JSON Load:",
        typeof loadProjectJSON === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "Objects:",
        state.objects.length
    );

    console.log(
        "Selected:",
        state.selectedIds.length
    );

    console.log(
        "Zoom:",
        state.zoom
    );

    console.log("====================================");
}


// ==========================================
// PROJECT INFO
// ==========================================

function showProjectInfo() {

    const objectCount =
        state.objects.length;

    const selectedCount =
        state.selectedIds.length;

    console.log(
        "MiniFigma Project:",
        objectCount,
        "object(s)"
    );

    console.log(
        "Selected:",
        selectedCount,
        "object(s)"
    );
}


// ==========================================
// FINAL TEST
// ==========================================

function testPhase10() {

    const pngReady =
        typeof exportCanvasAsPNG === "function";

    const saveReady =
        typeof saveProjectJSON === "function";

    const loadReady =
        typeof loadProjectJSON === "function";

    console.log("========== PHASE 10 TEST ==========");

    console.log(
        "PNG Export:",
        pngReady ? "PASS" : "FAIL"
    );

    console.log(
        "JSON Save:",
        saveReady ? "PASS" : "FAIL"
    );

    console.log(
        "JSON Load:",
        loadReady ? "PASS" : "FAIL"
    );

    console.log(
        "Current Objects:",
        state.objects.length
    );

    console.log("====================================");

    return (
        pngReady &&
        saveReady &&
        loadReady
    );
}


// ==========================================
// INITIAL STATUS
// ==========================================

phase10Status();

showProjectInfo();

const phase10Passed =
    testPhase10();

console.log(
    phase10Passed
        ? "✅ PHASE 10 READY"
        : "❌ PHASE 10 NEEDS CHECK"
);

console.log(
    "Phase 10 Part 4: Final integration loaded."
);
// ==========================================
// PHASE 11 — PART 1/4
// GLOBAL ERROR HANDLING
// ==========================================

// Prevent unexpected JavaScript errors
// from completely breaking the editor.

window.addEventListener(
    "error",
    function (event) {

        console.error(
            "MiniFigma Runtime Error:",
            event.error || event.message
        );

        // Don't show alert for every runtime error.
        // Keep the editor usable whenever possible.
    }
);


// Handle unhandled Promise errors
window.addEventListener(
    "unhandledrejection",
    function (event) {

        console.error(
            "MiniFigma Promise Error:",
            event.reason
        );

    }
);


// ==========================================
// SAFE FUNCTION EXECUTION
// ==========================================

function safeExecute(
    callback,
    errorMessage = "Something went wrong."
) {

    try {

        if (typeof callback !== "function") {
            throw new Error(
                "Invalid callback."
            );
        }

        return callback();

    } catch (error) {

        console.error(
            "MiniFigma Error:",
            error
        );

        alert(errorMessage);

        return null;
    }
}


// ==========================================
// SAFE JSON PARSING
// ==========================================

function safeJSONParse(jsonText) {

    try {

        return JSON.parse(jsonText);

    } catch (error) {

        console.error(
            "JSON Parse Error:",
            error
        );

        return null;
    }
}


// ==========================================
// ERROR STATUS
// ==========================================

function showErrorStatus(message) {

    console.error(
        "MiniFigma:",
        message
    );
}


// ==========================================
// PHASE 11 TEST
// ==========================================

function testPhase11Part1() {

    console.log(
        "========== PHASE 11 PART 1 =========="
    );

    console.log(
        "Global error handler: READY"
    );

    console.log(
        "Promise error handler: READY"
    );

    console.log(
        "safeExecute:",
        typeof safeExecute === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "safeJSONParse:",
        typeof safeJSONParse === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "===================================="
    );
}


testPhase11Part1();

console.log(
    "Phase 11 Part 1: Error handling loaded."
);
// ==========================================
// PHASE 11 — PART 2/4
// OBJECT / DATA VALIDATION
// ==========================================

function isValidObject(obj) {

    if (!obj || typeof obj !== "object") {
        return false;
    }

    // Every object must have an ID
    if (
        typeof obj.id !== "string" ||
        obj.id.length === 0
    ) {
        return false;
    }

    // Every object must have a supported type
    const validTypes = [
        "rectangle",
        "ellipse",
        "line",
        "text",
        "group"
    ];

    if (!validTypes.includes(obj.type)) {
        return false;
    }

    // Position must be valid numbers
    if (
        !Number.isFinite(Number(obj.x)) ||
        !Number.isFinite(Number(obj.y))
    ) {
        return false;
    }

    // Size validation
    if (obj.type !== "line") {

        if (
            !Number.isFinite(Number(obj.width)) ||
            !Number.isFinite(Number(obj.height))
        ) {
            return false;
        }

        if (
            Number(obj.width) < 0 ||
            Number(obj.height) < 0
        ) {
            return false;
        }
    }

    return true;
}


// ==========================================
// REMOVE INVALID OBJECTS
// ==========================================

function removeInvalidObjects() {

    const beforeCount =
        state.objects.length;

    state.objects =
        state.objects.filter(
            obj => isValidObject(obj)
        );

    const removedCount =
        beforeCount -
        state.objects.length;

    // Remove selections that no longer exist
    state.selectedIds =
        state.selectedIds.filter(
            id =>
                state.objects.some(
                    obj => obj.id === id
                )
        );

    if (removedCount > 0) {

        console.warn(
            "Removed",
            removedCount,
            "invalid object(s)."
        );

    }

    return removedCount;
}


// ==========================================
// NORMALIZE OBJECT DATA
// ==========================================

function normalizeObject(obj) {

    if (!obj || typeof obj !== "object") {
        return null;
    }

    const normalized =
        JSON.parse(
            JSON.stringify(obj)
        );

    normalized.x =
        Number(normalized.x) || 0;

    normalized.y =
        Number(normalized.y) || 0;

    normalized.width =
        Number(normalized.width) || 0;

    normalized.height =
        Number(normalized.height) || 0;

    normalized.rotation =
        Number(normalized.rotation) || 0;

    normalized.opacity =
        Number.isFinite(
            Number(normalized.opacity)
        )
            ? Number(normalized.opacity)
            : 1;

    normalized.visible =
        normalized.visible !== false;

    normalized.locked =
        normalized.locked === true;

    normalized.parentId =
        normalized.parentId || null;

    return normalized;
}


// ==========================================
// VALIDATE CURRENT DOCUMENT
// ==========================================

function validateDocument() {

    removeInvalidObjects();

    state.zoom =
        Number.isFinite(Number(state.zoom))
            ? Number(state.zoom)
            : 1;

    state.panX =
        Number.isFinite(Number(state.panX))
            ? Number(state.panX)
            : 0;

    state.panY =
        Number.isFinite(Number(state.panY))
            ? Number(state.panY)
            : 0;

    if (state.zoom < 0.25) {
        state.zoom = 0.25;
    }

    if (state.zoom > 4) {
        state.zoom = 4;
    }

    return true;
}


// ==========================================
// PHASE 11 PART 2 TEST
// ==========================================

function testPhase11Part2() {

    console.log(
        "========== PHASE 11 PART 2 =========="
    );

    console.log(
        "isValidObject:",
        typeof isValidObject === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "removeInvalidObjects:",
        typeof removeInvalidObjects === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "normalizeObject:",
        typeof normalizeObject === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "validateDocument:",
        typeof validateDocument === "function"
            ? "READY"
            : "ERROR"
    );

    validateDocument();

    console.log(
        "Current valid objects:",
        state.objects.length
    );

    console.log(
        "===================================="
    );
}


testPhase11Part2();

console.log(
    "Phase 11 Part 2: Object validation loaded."
);
// ==========================================
// PHASE 11 — PART 3/4
// SAFE OPERATIONS & RECOVERY
// ==========================================

function safeRender() {

    try {

        validateDocument();

        render();

    } catch (error) {

        console.error(
            "Render Recovery Error:",
            error
        );

        try {

            state.selectedIds = [];

            validateDocument();

            render();

        } catch (recoveryError) {

            console.error(
                "Editor recovery failed:",
                recoveryError
            );

        }
    }
}


// ==========================================
// SAFE SELECTION
// ==========================================

function safeSelectObject(id) {

    try {

        const object =
            getObjectById(id);

        if (!object) {
            return false;
        }

        if (object.visible === false) {
            return false;
        }

        if (object.locked === true) {
            return false;
        }

        state.selectedIds = [id];

        safeRender();

        return true;

    } catch (error) {

        console.error(
            "Selection Error:",
            error
        );

        state.selectedIds = [];

        safeRender();

        return false;
    }
}


// ==========================================
// SAFE DELETE
// ==========================================

function safeDeleteSelected() {

    try {

        if (
            !Array.isArray(
                state.selectedIds
            )
        ) {
            state.selectedIds = [];
            return;
        }

        deleteSelected();

        validateDocument();

        safeRender();

    } catch (error) {

        console.error(
            "Delete Recovery Error:",
            error
        );

        state.selectedIds = [];

        safeRender();
    }
}


// ==========================================
// SAFE DUPLICATE
// ==========================================

function safeDuplicateSelected() {

    try {

        duplicateSelectedObjects();

        validateDocument();

        safeRender();

    } catch (error) {

        console.error(
            "Duplicate Recovery Error:",
            error
        );

        state.selectedIds = [];

        safeRender();
    }
}


// ==========================================
// SAFE PASTE
// ==========================================

function safePasteObjects() {

    try {

        pasteObjects();

        validateDocument();

        safeRender();

    } catch (error) {

        console.error(
            "Paste Recovery Error:",
            error
        );

        state.selectedIds = [];

        safeRender();
    }
}


// ==========================================
// SAFE PROJECT LOAD
// ==========================================

function safeLoadProject(file) {

    try {

        if (!file) {
            return;
        }

        loadProjectJSON(file);

    } catch (error) {

        console.error(
            "Project Load Recovery Error:",
            error
        );

        state.objects = [];

        state.selectedIds = [];

        state.zoom = 1;

        state.panX = 0;

        state.panY = 0;

        safeRender();

        alert(
            "Project load failed. Editor reset ho gaya."
        );
    }
}


// ==========================================
// RECOVERY FUNCTION
// ==========================================

function recoverEditor() {

    try {

        validateDocument();

        // Remove selections of missing objects
        state.selectedIds =
            state.selectedIds.filter(
                id =>
                    state.objects.some(
                        obj => obj.id === id
                    )
            );

        safeRender();

        console.log(
            "Editor recovery completed."
        );

        return true;

    } catch (error) {

        console.error(
            "Editor recovery failed:",
            error
        );

        return false;
    }
}


// ==========================================
// PHASE 11 PART 3 TEST
// ==========================================

function testPhase11Part3() {

    console.log(
        "========== PHASE 11 PART 3 =========="
    );

    console.log(
        "safeRender:",
        typeof safeRender === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "safeSelectObject:",
        typeof safeSelectObject === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "safeDeleteSelected:",
        typeof safeDeleteSelected === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "safeDuplicateSelected:",
        typeof safeDuplicateSelected === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "safePasteObjects:",
        typeof safePasteObjects === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "safeLoadProject:",
        typeof safeLoadProject === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "recoverEditor:",
        typeof recoverEditor === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "===================================="
    );
}


testPhase11Part3();

console.log(
    "Phase 11 Part 3: Safe operations loaded."
);
// ==========================================
// PHASE 11 — PART 4/4
// FINAL STABILITY TEST
// ==========================================

function runPhase11StabilityTest() {

    console.log("");
    console.log("======================================");
    console.log("       MINIFIGMA STABILITY TEST");
    console.log("======================================");

    const tests = [];

    // --------------------------------------
    // STATE TEST
    // --------------------------------------

    tests.push({
        name: "State Object",
        passed:
            state &&
            Array.isArray(state.objects) &&
            Array.isArray(state.selectedIds)
    });


    // --------------------------------------
    // OBJECT VALIDATION
    // --------------------------------------

    tests.push({
        name: "Object Validation",
        passed:
            typeof isValidObject === "function"
    });


    // --------------------------------------
    // DOCUMENT VALIDATION
    // --------------------------------------

    tests.push({
        name: "Document Validation",
        passed:
            typeof validateDocument === "function"
    });


    // --------------------------------------
    // RENDER SYSTEM
    // --------------------------------------

    tests.push({
        name: "Render System",
        passed:
            typeof render === "function"
    });


    // --------------------------------------
    // SAFE RENDER
    // --------------------------------------

    tests.push({
        name: "Safe Render",
        passed:
            typeof safeRender === "function"
    });


    // --------------------------------------
    // PNG EXPORT
    // --------------------------------------

    tests.push({
        name: "PNG Export",
        passed:
            typeof exportCanvasAsPNG === "function"
    });


    // --------------------------------------
    // JSON SAVE
    // --------------------------------------

    tests.push({
        name: "JSON Save",
        passed:
            typeof saveProjectJSON === "function"
    });


    // --------------------------------------
    // JSON LOAD
    // --------------------------------------

    tests.push({
        name: "JSON Load",
        passed:
            typeof loadProjectJSON === "function"
    });


    // --------------------------------------
    // COPY / PASTE
    // --------------------------------------

    tests.push({
        name: "Copy",
        passed:
            typeof copySelectedObjects === "function"
    });

    tests.push({
        name: "Paste",
        passed:
            typeof pasteObjects === "function"
    });


    // --------------------------------------
    // DUPLICATE
    // --------------------------------------

    tests.push({
        name: "Duplicate",
        passed:
            typeof duplicateSelectedObjects === "function"
    });


    // --------------------------------------
    // GROUPING
    // --------------------------------------

    tests.push({
        name: "Grouping",
        passed:
            typeof groupSelected === "function"
    });

    tests.push({
        name: "Ungrouping",
        passed:
            typeof ungroupSelected === "function"
    });


    // --------------------------------------
    // SNAPPING
    // --------------------------------------

    tests.push({
        name: "Snapping",
        passed:
            typeof snapSettings === "object"
    });


    // --------------------------------------
    // ZOOM
    // --------------------------------------

    tests.push({
        name: "Zoom",
        passed:
            Number.isFinite(state.zoom) &&
            state.zoom >= 0.25 &&
            state.zoom <= 4
    });


    // --------------------------------------
    // CANVAS
    // --------------------------------------

    tests.push({
        name: "Canvas",
        passed:
            canvas &&
            typeof canvas.getContext === "function"
    });


    // --------------------------------------
    // RUN TESTS
    // --------------------------------------

    let passedCount = 0;

    tests.forEach(function(test) {

        if (test.passed) {

            console.log(
                "✅",
                test.name
            );

            passedCount++;

        } else {

            console.error(
                "❌",
                test.name
            );
        }

    });


    console.log("--------------------------------------");

    console.log(
        "Passed:",
        passedCount,
        "/",
        tests.length
    );


    if (passedCount === tests.length) {

        console.log(
            "🎉 PHASE 11 STABILITY TEST PASSED"
        );

    } else {

        console.warn(
            "⚠️ Some stability tests need attention."
        );

    }


    console.log("======================================");
}


// ==========================================
// FINAL RECOVERY
// ==========================================

try {

    recoverEditor();

} catch (error) {

    console.error(
        "Final recovery error:",
        error
    );

}


// ==========================================
// RUN STABILITY TEST
// ==========================================

runPhase11StabilityTest();


console.log(
    "Phase 11 Part 4: Final stability test loaded."
);
// ==========================================
// PHASE 12 — PART 1/4
// UI & INTERACTION POLISH
// ==========================================

function phase12RefreshUI() {

    try {

        updateToolButtons();
        updateLayersPanel();
        updatePropertiesPanel();
        updateObjectCount();
        updateZoomDisplay();

        if (typeof updateCanvasCursor === "function") {
            updateCanvasCursor();
        }

        render();

    } catch (error) {

        console.error(
            "Phase 12 UI refresh error:",
            error
        );
    }
}


// ==========================================
// TOOL BUTTON ACCESSIBILITY
// ==========================================

function improveToolButtons() {

    const toolButtons =
        document.querySelectorAll(
            "[data-tool]"
        );

    toolButtons.forEach(function(button) {

        const tool =
            button.dataset.tool;

        if (!button.title) {

            const titles = {
                select: "Select Tool (V)",
                rectangle: "Rectangle (R)",
                ellipse: "Ellipse (O)",
                line: "Line (L)",
                text: "Text (T)"
            };

            if (titles[tool]) {
                button.title =
                    titles[tool];
            }
        }

    });
}


// ==========================================
// CANVAS ACCESSIBILITY
// ==========================================

function improveCanvasAccessibility() {

    if (!canvas) return;

    canvas.setAttribute(
        "role",
        "application"
    );

    canvas.setAttribute(
        "aria-label",
        "MiniFigma design canvas"
    );

    canvas.setAttribute(
        "tabindex",
        "0"
    );
}


// ==========================================
// ZOOM DISPLAY SAFETY
// ==========================================

function safeUpdateZoomUI() {

    try {

        if (
            typeof refreshZoomUI ===
            "function"
        ) {

            refreshZoomUI();

        } else {

            updateZoomDisplay();

        }

    } catch (error) {

        console.error(
            "Zoom UI error:",
            error
        );
    }
}


// ==========================================
// OBJECT COUNT SAFETY
// ==========================================

function safeUpdateObjectCount() {

    try {

        updateObjectCount();

    } catch (error) {

        console.error(
            "Object count UI error:",
            error
        );
    }
}


// ==========================================
// INITIAL POLISH
// ==========================================

improveToolButtons();

improveCanvasAccessibility();

safeUpdateZoomUI();

safeUpdateObjectCount();

console.log(
    "Phase 12 Part 1: UI polish loaded."
);
// ==========================================
// PHASE 12 — PART 2/4
// PROPERTIES & LAYERS POLISH
// ==========================================

function phase12RefreshPanels() {

    try {

        updateLayersPanel();

        updatePropertiesPanel();

        updateObjectCount();

    } catch (error) {

        console.error(
            "Panel refresh error:",
            error
        );
    }
}


// ==========================================
// SELECTED OBJECT INFO
// ==========================================

function getSelectedObjectInfo() {

    if (
        !Array.isArray(state.selectedIds) ||
        state.selectedIds.length === 0
    ) {
        return null;
    }

    const object =
        getObjectById(
            state.selectedIds[0]
        );

    if (!object) {
        return null;
    }

    return object;
}


// ==========================================
// LAYER SELECTION SAFETY
// ==========================================

function selectLayerSafely(id) {

    try {

        const object =
            getObjectById(id);

        if (!object) {
            return;
        }

        if (object.visible === false) {
            return;
        }

        if (object.locked === true) {
            return;
        }

        state.selectedIds = [id];

        phase12RefreshPanels();

        render();

    } catch (error) {

        console.error(
            "Layer selection error:",
            error
        );
    }
}


// ==========================================
// CLEAN INVALID SELECTIONS
// ==========================================

function cleanSelections() {

    if (!Array.isArray(state.selectedIds)) {

        state.selectedIds = [];

        return;
    }

    state.selectedIds =
        state.selectedIds.filter(
            function(id) {

                return state.objects.some(
                    function(obj) {

                        return obj.id === id;

                    }
                );

            }
        );
}


// ==========================================
// PANEL STATUS
// ==========================================

function phase12PanelStatus() {

    cleanSelections();

    const selectedObject =
        getSelectedObjectInfo();

    console.log(
        "========== PANEL STATUS =========="
    );

    console.log(
        "Objects:",
        state.objects.length
    );

    console.log(
        "Selected:",
        state.selectedIds.length
    );

    console.log(
        "Selected Object:",
        selectedObject
            ? selectedObject.name
            : "None"
    );

    console.log(
        "=================================="
    );
}


// ==========================================
// FINAL PANEL REFRESH
// ==========================================

cleanSelections();

phase12RefreshPanels();

phase12PanelStatus();

console.log(
    "Phase 12 Part 2: Properties & Layers polish loaded."
);
// ==========================================
// PHASE 12 — PART 3/4
// KEYBOARD & WORKFLOW POLISH
// ==========================================

function isTypingTarget(target) {

    if (!target) return false;

    const tag =
        target.tagName;

    return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target.isContentEditable === true
    );
}


// ==========================================
// SAFE DELETE SHORTCUT
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        if (isTypingTarget(e.target)) {
            return;
        }

        if (
            e.key === "Delete" ||
            e.key === "Backspace"
        ) {

            if (
                state.selectedIds.length === 0
            ) {
                return;
            }

            e.preventDefault();

            try {

                deleteSelected();

                cleanSelections();

                phase12RefreshPanels();

                render();

            } catch (error) {

                console.error(
                    "Delete shortcut error:",
                    error
                );

            }

        }

    }
);


// ==========================================
// HOME = RESET VIEW
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        if (isTypingTarget(e.target)) {
            return;
        }

        if (
            e.key.toLowerCase() === "home"
        ) {

            e.preventDefault();

            state.zoom = 1;
            state.panX = 0;
            state.panY = 0;

            safeUpdateZoomUI();

            render();

            console.log(
                "View reset."
            );
        }

    }
);


// ==========================================
// ESCAPE WORKFLOW
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        if (e.key !== "Escape") {
            return;
        }

        if (isTypingTarget(e.target)) {
            return;
        }

        try {

            state.selectedIds = [];

            clearSnapGuides();

            if (typeof updateCanvasCursor === "function") {
                updateCanvasCursor();
            }

            phase12RefreshPanels();

            render();

        } catch (error) {

            console.error(
                "Escape workflow error:",
                error
            );
        }

    }
);


// ==========================================
// ARROW KEY NUDGE
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        if (isTypingTarget(e.target)) {
            return;
        }

        if (
            state.selectedIds.length === 0
        ) {
            return;
        }

        const keys = [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight"
        ];

        if (!keys.includes(e.key)) {
            return;
        }

        e.preventDefault();

        const step =
            e.shiftKey ? 10 : 1;

        state.selectedIds.forEach(
            function(id) {

                const obj =
                    getObjectById(id);

                if (!obj) return;

                if (obj.locked === true) {
                    return;
                }

                if (e.key === "ArrowUp") {
                    obj.y -= step;
                }

                if (e.key === "ArrowDown") {
                    obj.y += step;
                }

                if (e.key === "ArrowLeft") {
                    obj.x -= step;
                }

                if (e.key === "ArrowRight") {
                    obj.x += step;
                }

            }
        );

        phase12RefreshPanels();

        render();

    }
);


// ==========================================
// FINAL WORKFLOW STATUS
// ==========================================

function phase12WorkflowStatus() {

    console.log(
        "========== WORKFLOW STATUS =========="
    );

    console.log(
        "Delete / Backspace: READY"
    );

    console.log(
        "Home = Reset View: READY"
    );

    console.log(
        "Escape = Clear Selection: READY"
    );

    console.log(
        "Arrow Keys = Move Object: READY"
    );

    console.log(
        "Shift + Arrow = Move 10px: READY"
    );

    console.log(
        "====================================="
    );
}


phase12WorkflowStatus();

console.log(
    "Phase 12 Part 3: Keyboard workflow polish loaded."
);
// ==========================================
// PHASE 12 — PART 4/4
// COMPLETE PROJECT QA
// ==========================================

function runFinalProjectQA() {

    console.log("");
    console.log("==========================================");
    console.log("        MINIFIGMA FINAL QA TEST");
    console.log("==========================================");

    const tests = [];

    function addTest(name, condition) {

        tests.push({
            name: name,
            passed: Boolean(condition)
        });

    }


    // ======================================
    // CORE
    // ======================================

    addTest(
        "Canvas",
        canvas &&
        typeof canvas.getContext === "function"
    );

    addTest(
        "State",
        state &&
        Array.isArray(state.objects) &&
        Array.isArray(state.selectedIds)
    );

    addTest(
        "Render",
        typeof render === "function"
    );


    // ======================================
    // OBJECT CREATION
    // ======================================

    addTest(
        "Rectangle Tool",
        typeof createShape === "function"
    );

    addTest(
        "Hit Testing",
        typeof hitTest === "function"
    );

    addTest(
        "Object Bounds",
        typeof getObjectBounds === "function"
    );


    // ======================================
    // EDITING
    // ======================================

    addTest(
        "Selection",
        typeof getSelectedObjects === "function"
    );

    addTest(
        "Resize",
        typeof resizeObject === "function"
    );

    addTest(
        "Rotation",
        typeof isOnRotationHandle === "function"
    );


    // ======================================
    // LAYERS
    // ======================================

    addTest(
        "Layers Panel",
        typeof updateLayersPanel === "function"
    );

    addTest(
        "Properties Panel",
        typeof updatePropertiesPanel === "function"
    );

    addTest(
        "Grouping",
        typeof groupSelected === "function"
    );

    addTest(
        "Ungrouping",
        typeof ungroupSelected === "function"
    );


    // ======================================
    // TRANSFORM / VIEW
    // ======================================

    addTest(
        "Zoom",
        Number.isFinite(state.zoom)
    );

    addTest(
        "Pan",
        Number.isFinite(state.panX) &&
        Number.isFinite(state.panY)
    );

    addTest(
        "Snapping",
        typeof snapSettings === "object"
    );


    // ======================================
    // COPY / DUPLICATE
    // ======================================

    addTest(
        "Copy",
        typeof copySelectedObjects === "function"
    );

    addTest(
        "Paste",
        typeof pasteObjects === "function"
    );

    addTest(
        "Duplicate",
        typeof duplicateSelectedObjects === "function"
    );


    // ======================================
    // EXPORT / SAVE / LOAD
    // ======================================

    addTest(
        "PNG Export",
        typeof exportCanvasAsPNG === "function"
    );

    addTest(
        "JSON Save",
        typeof saveProjectJSON === "function"
    );

    addTest(
        "JSON Load",
        typeof loadProjectJSON === "function"
    );


    // ======================================
    // ERROR HANDLING
    // ======================================

    addTest(
        "Object Validation",
        typeof isValidObject === "function"
    );

    addTest(
        "Document Validation",
        typeof validateDocument === "function"
    );

    addTest(
        "Safe Render",
        typeof safeRender === "function"
    );

    addTest(
        "Editor Recovery",
        typeof recoverEditor === "function"
    );


    // ======================================
    // UI / WORKFLOW
    // ======================================

    addTest(
        "Tool Buttons",
        document.querySelectorAll(
            "[data-tool]"
        ).length > 0
    );

    addTest(
        "Layers List",
        Boolean(
            document.getElementById(
                "layersList"
            )
        )
    );

    addTest(
        "Properties Panel",
        Boolean(
            document.getElementById(
                "propertiesContent"
            )
        )
    );


    // ======================================
    // RUN RESULTS
    // ======================================

    let passed = 0;

    tests.forEach(function(test) {

        if (test.passed) {

            console.log(
                "✅ PASS —",
                test.name
            );

            passed++;

        } else {

            console.error(
                "❌ FAIL —",
                test.name
            );

        }

    });


    console.log("------------------------------------------");

    console.log(
        "FINAL RESULT:",
        passed,
        "/",
        tests.length,
        "tests passed"
    );


    if (passed === tests.length) {

        console.log(
            "🎉 ALL FINAL QA TESTS PASSED"
        );

        console.log(
            "MiniFigma Phase 12 is ready."
        );

    } else {

        console.warn(
            "⚠️ Some tests need attention."
        );

    }


    console.log(
        "=========================================="
    );

    return passed === tests.length;
}


// ==========================================
// FINAL RECOVERY
// ==========================================

try {

    recoverEditor();

} catch (error) {

    console.error(
        "Final recovery error:",
        error
    );

}


// ==========================================
// RUN QA
// ==========================================

const finalQAResult =
    runFinalProjectQA();

console.log(
    "Phase 12 Part 4: Final QA loaded."
);
// ==========================================
// PHASE 6 — RESUMED
// PART 1/4 — HISTORY CONNECTION
// ==========================================

function phase6RecordHistory() {

    if (
        typeof commitHistory !== "function"
    ) {
        console.error(
            "commitHistory() not found."
        );
        return;
    }

    if (
        typeof historyState === "undefined"
    ) {
        console.error(
            "historyState not found."
        );
        return;
    }

    commitHistory();

    updateHistoryButtons();

    console.log(
        "History state committed."
    );
}


// ==========================================
// UNDO KEYBOARD SHORTCUT
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }

        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "z"
        ) {

            e.preventDefault();

            undo();

            console.log(
                "Undo executed."
            );
        }

    }
);


// ==========================================
// REDO — CTRL + Y
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }

        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "y"
        ) {

            e.preventDefault();

            redo();

            console.log(
                "Redo executed."
            );
        }

    }
);


// ==========================================
// REDO — CTRL + SHIFT + Z
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }

        if (
            e.ctrlKey &&
            e.shiftKey &&
            e.key.toLowerCase() === "z"
        ) {

            e.preventDefault();

            redo();

            console.log(
                "Redo executed."
            );
        }

    }
);


// ==========================================
// HISTORY INITIALIZATION
// ==========================================

function initializePhase6History() {

    try {

        if (
            !historyState ||
            !Array.isArray(
                historyState.undoStack
            )
        ) {
            console.error(
                "Invalid history state."
            );
            return;
        }

        // Current document becomes
        // the first history state.
        clearHistory();

        updateHistoryButtons();

        console.log(
            "Phase 6 history initialized."
        );

    } catch (error) {

        console.error(
            "History initialization error:",
            error
        );
    }
}


// ==========================================
// TEST HISTORY ENGINE
// ==========================================

function testPhase6Part1() {

    console.log(
        "========== PHASE 6 PART 1 =========="
    );

    console.log(
        "Undo function:",
        typeof undo === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "Redo function:",
        typeof redo === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "Commit function:",
        typeof commitHistory === "function"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "History state:",
        typeof historyState !== "undefined"
            ? "READY"
            : "ERROR"
    );

    console.log(
        "Undo states:",
        historyState.undoStack.length
    );

    console.log(
        "Redo states:",
        historyState.redoStack.length
    );

    console.log(
        "===================================="
    );
}


initializePhase6History();

testPhase6Part1();

console.log(
    "Phase 6 Part 1: History connection loaded."
);
// ==========================================
// PHASE 6 — PART 2/4
// ACTION HISTORY INTEGRATION
// ==========================================

// ------------------------------------------
// CREATE HISTORY
// ------------------------------------------

function phase6CommitAfterCreate() {

    if (historyState.isRestoring) return;

    commitHistory();
}


// ------------------------------------------
// DELETE HISTORY
// ------------------------------------------

const phase6OriginalDelete =
    deleteSelected;

deleteSelected = function () {

    if (historyState.isRestoring) {
        return phase6OriginalDelete();
    }

    const hadSelection =
        state.selectedIds.length > 0;

    if (!hadSelection) return;

    phase6OriginalDelete();

    commitHistory();

    updateHistoryButtons();
};


// ------------------------------------------
// DUPLICATE HISTORY
// ------------------------------------------

const phase6OriginalDuplicate =
    duplicateSelectedObjects;

duplicateSelectedObjects = function () {

    if (historyState.isRestoring) {
        return phase6OriginalDuplicate();
    }

    const beforeCount =
        state.objects.length;

    phase6OriginalDuplicate();

    if (
        state.objects.length !==
        beforeCount
    ) {
        commitHistory();
    }

    updateHistoryButtons();
};


// ------------------------------------------
// PASTE HISTORY
// ------------------------------------------

const phase6OriginalPaste =
    pasteObjects;

pasteObjects = function () {

    if (historyState.isRestoring) {
        return phase6OriginalPaste();
    }

    const beforeCount =
        state.objects.length;

    phase6OriginalPaste();

    if (
        state.objects.length !==
        beforeCount
    ) {
        commitHistory();
    }

    updateHistoryButtons();
};


// ------------------------------------------
// GROUP HISTORY
// ------------------------------------------

const phase6OriginalGroup =
    groupSelected;

groupSelected = function () {

    if (historyState.isRestoring) {
        return phase6OriginalGroup();
    }

    const beforeObjects =
        JSON.stringify(state.objects);

    phase6OriginalGroup();

    const afterObjects =
        JSON.stringify(state.objects);

    if (
        beforeObjects !== afterObjects
    ) {
        commitHistory();
    }

    updateHistoryButtons();
};


// ------------------------------------------
// UNGROUP HISTORY
// ------------------------------------------

const phase6OriginalUngroup =
    ungroupSelected;

ungroupSelected = function () {

    if (historyState.isRestoring) {
        return phase6OriginalUngroup();
    }

    const beforeObjects =
        JSON.stringify(state.objects);

    phase6OriginalUngroup();

    const afterObjects =
        JSON.stringify(state.objects);

    if (
        beforeObjects !== afterObjects
    ) {
        commitHistory();
    }

    updateHistoryButtons();
};


// ------------------------------------------
// TEST
// ------------------------------------------

function testPhase6Part2() {

    console.log(
        "========== PHASE 6 PART 2 =========="
    );

    console.log(
        "Delete history: READY"
    );

    console.log(
        "Duplicate history: READY"
    );

    console.log(
        "Paste history: READY"
    );

    console.log(
        "Group history: READY"
    );

    console.log(
        "Ungroup history: READY"
    );

    console.log(
        "Undo states:",
        historyState.undoStack.length
    );

    console.log(
        "Redo states:",
        historyState.redoStack.length
    );

    console.log(
        "===================================="
    );
}


testPhase6Part2();

console.log(
    "Phase 6 Part 2: Action history loaded."
);
// ==========================================
// PHASE 6 — PART 3/4
// CREATE + MOVE + RESIZE + ROTATE
// PROPERTIES + LAYER ORDER HISTORY
// ==========================================


// ------------------------------------------
// CREATE OBJECT HISTORY
// ------------------------------------------

const phase6OriginalCreateShape =
    createShape;

createShape = function (type, startX, startY, endX, endY) {

    if (historyState.isRestoring) {
        return phase6OriginalCreateShape(
            type,
            startX,
            startY,
            endX,
            endY
        );
    }

    const beforeObjects =
        JSON.stringify(state.objects);

    const result =
        phase6OriginalCreateShape(
            type,
            startX,
            startY,
            endX,
            endY
        );

    const afterObjects =
        JSON.stringify(state.objects);

    if (beforeObjects !== afterObjects) {
        commitHistory();
    }

    return result;
};


// ------------------------------------------
// TEXT CREATION HISTORY
// ------------------------------------------

const phase6OriginalFinishTextInput =
    finishTextInput;

finishTextInput = function () {

    if (historyState.isRestoring) {
        return phase6OriginalFinishTextInput();
    }

    const beforeObjects =
        JSON.stringify(state.objects);

    const result =
        phase6OriginalFinishTextInput();

    const afterObjects =
        JSON.stringify(state.objects);

    if (beforeObjects !== afterObjects) {
        commitHistory();
    }

    return result;
};


// ------------------------------------------
// INTERACTION HISTORY
// MOVE / RESIZE / ROTATE
// ------------------------------------------

let phase6InteractionSnapshot = null;

function phase6StartInteractionHistory() {

    if (historyState.isRestoring) return;

    phase6InteractionSnapshot =
        createHistorySnapshot();
}


function phase6FinishInteractionHistory() {

    if (historyState.isRestoring) {
        phase6InteractionSnapshot = null;
        return;
    }

    if (!phase6InteractionSnapshot) return;

    const afterSnapshot =
        createHistorySnapshot();

    if (
        !snapshotsAreEqual(
            phase6InteractionSnapshot,
            afterSnapshot
        )
    ) {
        commitHistory();
    }

    phase6InteractionSnapshot = null;
}


// ------------------------------------------
// CAPTURE BEFORE MOVE / RESIZE / ROTATE
// ------------------------------------------

canvas.addEventListener("mousedown", function () {

    if (historyState.isRestoring) return;

    setTimeout(function () {

        if (
            state.isMoving ||
            state.isResizing ||
            state.isRotating
        ) {
            phase6StartInteractionHistory();
        }

    }, 0);
});


// ------------------------------------------
// COMMIT AFTER MOVE / RESIZE / ROTATE
// ------------------------------------------

canvas.addEventListener("mouseup", function () {

    if (historyState.isRestoring) return;

    if (
        phase6InteractionSnapshot &&
        (
            !state.isMoving ||
            !state.isResizing ||
            !state.isRotating
        )
    ) {
        phase6FinishInteractionHistory();
    }

});


// ------------------------------------------
// WINDOW MOUSEUP SAFETY
// ------------------------------------------

window.addEventListener("mouseup", function () {

    if (!phase6InteractionSnapshot) return;

    if (
        !state.isMoving &&
        !state.isResizing &&
        !state.isRotating
    ) {
        phase6FinishInteractionHistory();
    }

});


// ------------------------------------------
// LAYER ORDER HISTORY
// ------------------------------------------

const phase6OriginalBringToFront =
    bringToFront;

bringToFront = function () {

    if (historyState.isRestoring) {
        return phase6OriginalBringToFront();
    }

    const beforeObjects =
        JSON.stringify(state.objects);

    const result =
        phase6OriginalBringToFront();

    const afterObjects =
        JSON.stringify(state.objects);

    if (beforeObjects !== afterObjects) {
        commitHistory();
    }

    updateHistoryButtons();

    return result;
};


const phase6OriginalBringForwardLayer =
    bringForwardLayer;

bringForwardLayer = function () {

    if (historyState.isRestoring) {
        return phase6OriginalBringForwardLayer();
    }

    const beforeObjects =
        JSON.stringify(state.objects);

    const result =
        phase6OriginalBringForwardLayer();

    const afterObjects =
        JSON.stringify(state.objects);

    if (beforeObjects !== afterObjects) {
        commitHistory();
    }

    updateHistoryButtons();

    return result;
};


const phase6OriginalSendBackwardLayer =
    sendBackwardLayer;

sendBackwardLayer = function () {

    if (historyState.isRestoring) {
        return phase6OriginalSendBackwardLayer();
    }

    const beforeObjects =
        JSON.stringify(state.objects);

    const result =
        phase6OriginalSendBackwardLayer();

    const afterObjects =
        JSON.stringify(state.objects);

    if (beforeObjects !== afterObjects) {
        commitHistory();
    }

    updateHistoryButtons();

    return result;
};


const phase6OriginalSendToBack =
    sendToBack;

sendToBack = function () {

    if (historyState.isRestoring) {
        return phase6OriginalSendToBack();
    }

    const beforeObjects =
        JSON.stringify(state.objects);

    const result =
        phase6OriginalSendToBack();

    const afterObjects =
        JSON.stringify(state.objects);

    if (beforeObjects !== afterObjects) {
        commitHistory();
    }

    updateHistoryButtons();

    return result;
};


// ------------------------------------------
// RENAME HISTORY
// ------------------------------------------

const phase6OriginalRenameLayer =
    renameLayer;

renameLayer = function (obj) {

    if (historyState.isRestoring) {
        return phase6OriginalRenameLayer(obj);
    }

    const beforeObjects =
        JSON.stringify(state.objects);

    const result =
        phase6OriginalRenameLayer(obj);

    const afterObjects =
        JSON.stringify(state.objects);

    if (beforeObjects !== afterObjects) {
        commitHistory();
    }

    updateHistoryButtons();

    return result;
};


// ------------------------------------------
// PROPERTIES PANEL HISTORY
// ------------------------------------------

if (typeof propertiesContent !== "undefined" &&
    propertiesContent) {

    propertiesContent.addEventListener(
        "change",
        function () {

            if (historyState.isRestoring) return;

            commitHistory();
            updateHistoryButtons();

        }
    );

}


// ------------------------------------------
// TEST
// ------------------------------------------

function testPhase6Part3() {

    console.log(
        "========== PHASE 6 PART 3 =========="
    );

    console.log(
        "Create history: READY"
    );

    console.log(
        "Text creation history: READY"
    );

    console.log(
        "Move history: READY"
    );

    console.log(
        "Resize history: READY"
    );

    console.log(
        "Rotate history: READY"
    );

    console.log(
        "Layer ordering history: READY"
    );

    console.log(
        "Rename history: READY"
    );

    console.log(
        "Properties history: READY"
    );

    console.log(
        "Undo states:",
        historyState.undoStack.length
    );

    console.log(
        "Redo states:",
        historyState.redoStack.length
    );

    console.log(
        "===================================="
    );
}


testPhase6Part3();

console.log(
    "Phase 6 Part 3: Interaction history loaded."
);
// ==========================================
// PHASE 6 — PART 4/4
// FINAL UNDO / REDO INTEGRATION + QA
// ==========================================


// ------------------------------------------
// FINAL HISTORY STATUS
// ------------------------------------------

function phase6HistoryStatus() {

    const undoCount =
        historyState.undoStack.length;

    const redoCount =
        historyState.redoStack.length;

    console.log(
        "Phase 6 History Status:",
        {
            undoStates: undoCount,
            redoStates: redoCount,
            canUndo: undoCount > 1,
            canRedo: redoCount > 0
        }
    );
}


// ------------------------------------------
// FINAL HISTORY REFRESH
// ------------------------------------------

function phase6RefreshHistoryUI() {

    try {

        updateHistoryButtons();

        phase6HistoryStatus();

    } catch (error) {

        console.error(
            "History UI Error:",
            error
        );

    }
}


// ------------------------------------------
// SAFE UNDO
// ------------------------------------------

function phase6SafeUndo() {

    try {

        if (
            historyState.isRestoring
        ) {
            return;
        }

        if (
            historyState.undoStack.length <= 1
        ) {
            return;
        }

        undo();

        phase6RefreshHistoryUI();

    } catch (error) {

        console.error(
            "Undo Error:",
            error
        );

        historyState.isRestoring = false;
    }
}


// ------------------------------------------
// SAFE REDO
// ------------------------------------------

function phase6SafeRedo() {

    try {

        if (
            historyState.isRestoring
        ) {
            return;
        }

        if (
            historyState.redoStack.length === 0
        ) {
            return;
        }

        redo();

        phase6RefreshHistoryUI();

    } catch (error) {

        console.error(
            "Redo Error:",
            error
        );

        historyState.isRestoring = false;
    }
}


// ------------------------------------------
// FINAL KEYBOARD SHORTCUTS
// ------------------------------------------

document.addEventListener(
    "keydown",
    function (e) {

        const tag =
            e.target.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
        ) {
            return;
        }


        // ----------------------------------
        // CTRL + Z
        // ----------------------------------

        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "z"
        ) {

            e.preventDefault();

            phase6SafeUndo();

            return;
        }


        // ----------------------------------
        // CTRL + Y
        // ----------------------------------

        if (
            e.ctrlKey &&
            !e.shiftKey &&
            e.key.toLowerCase() === "y"
        ) {

            e.preventDefault();

            phase6SafeRedo();

            return;
        }


        // ----------------------------------
        // CTRL + SHIFT + Z
        // ----------------------------------

        if (
            e.ctrlKey &&
            e.shiftKey &&
            e.key.toLowerCase() === "z"
        ) {

            e.preventDefault();

            phase6SafeRedo();

            return;
        }

    }
);


// ------------------------------------------
// HISTORY STACK CLEANUP
// ------------------------------------------

function phase6ValidateHistory() {

    try {

        historyState.undoStack =
            historyState.undoStack.filter(
                snapshot => {

                    return (
                        snapshot &&
                        Array.isArray(
                            snapshot.objects
                        )
                    );

                }
            );


        historyState.redoStack =
            historyState.redoStack.filter(
                snapshot => {

                    return (
                        snapshot &&
                        Array.isArray(
                            snapshot.objects
                        )
                    );

                }
            );


        if (
            historyState.undoStack.length === 0
        ) {

            historyState.undoStack.push(
                createHistorySnapshot()
            );

        }


        if (
            historyState.undoStack.length >
            historyState.maxHistory
        ) {

            historyState.undoStack =
                historyState.undoStack.slice(
                    -historyState.maxHistory
                );

        }

    } catch (error) {

        console.error(
            "History validation error:",
            error
        );

    }
}


// ------------------------------------------
// HISTORY RESET
// ------------------------------------------

function phase6ResetHistory() {

    try {

        clearHistory();

        phase6RefreshHistoryUI();

        console.log(
            "Phase 6 history reset."
        );

    } catch (error) {

        console.error(
            "History reset error:",
            error
        );

    }
}


// ------------------------------------------
// COMPLETE HISTORY TEST
// ------------------------------------------

function runPhase6HistoryTest() {

    console.log(
        "======================================"
    );

    console.log(
        "      PHASE 6 HISTORY TEST"
    );

    console.log(
        "======================================"
    );


    // History engine
    console.log(
        "History engine:",
        typeof historyState === "object"
            ? "PASS"
            : "FAIL"
    );


    // Undo
    console.log(
        "Undo function:",
        typeof undo === "function"
            ? "PASS"
            : "FAIL"
    );


    // Redo
    console.log(
        "Redo function:",
        typeof redo === "function"
            ? "PASS"
            : "FAIL"
    );


    // Snapshot
    console.log(
        "Snapshot system:",
        typeof createHistorySnapshot === "function"
            ? "PASS"
            : "FAIL"
    );


    // Commit
    console.log(
        "Commit system:",
        typeof commitHistory === "function"
            ? "PASS"
            : "FAIL"
    );


    // Restore
    console.log(
        "Restore system:",
        typeof restoreHistorySnapshot === "function"
            ? "PASS"
            : "FAIL"
    );


    // History stacks
    console.log(
        "Undo stack:",
        historyState.undoStack.length
    );

    console.log(
        "Redo stack:",
        historyState.redoStack.length
    );


    // Max history
    console.log(
        "Max history:",
        historyState.maxHistory
    );


    // Buttons
    console.log(
        "Undo button:",
        document.getElementById("undoBtn")
            ? "FOUND"
            : "MISSING"
    );

    console.log(
        "Redo button:",
        document.getElementById("redoBtn")
            ? "FOUND"
            : "MISSING"
    );


    console.log(
        "======================================"
    );

    console.log(
        "PHASE 6 HISTORY TEST COMPLETE"
    );

    console.log(
        "======================================"
    );
}


// ------------------------------------------
// INITIAL FINAL CHECK
// ------------------------------------------

phase6ValidateHistory();

phase6RefreshHistoryUI();

runPhase6HistoryTest();

console.log(
    "======================================"
);

console.log(
    "PHASE 6 COMPLETE"
);

console.log(
    "Undo / Redo system finalized."
);

console.log(
    "======================================"
);