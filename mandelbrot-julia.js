
//Real and Imaginary bounds to our coordinate system
//var RE_MAX = 1.1;
//var RE_MIN = -2.5;
//var IM_MAX = 1.2;
//var IM_MIN = -1.2;

var RE_MAX = 1.0;
var RE_MIN = -2.0;
var IM_MAX = 1.5;
var IM_MIN = -1.5;


var MANDELBROT_SET_COLOR = [0, 0, 0, 255];
var ZOOM_BOX_COLOR = "rgba(255, 255, 255, 0.3)";
var CANVAS_WIDTH_HEIGHT_RATIO = 16.0 / 9.0;
var FRACTAL_SELECTOR = 0;
var COLOR_SELECTOR = 1;

var JULIA_SEED_RE = -.67319;//-0.67319
var JULIA_SEED_IM = .3542;//0.34442

var MAX_ITERATIONS = 1200; //Number of iterations. Higher is slower but more detailed.
var STATIC_ZOOM_BOX_FACTOR = 0.25; //Amount of zoom from clicks. Increase to increase zoom
var DEFAULT_MESSAGE = "Click or click and drag to zoom";

var globals = {}; //Stores global variables

window.addEventListener('load', initialLoad, false);

/**************************************************************************************************/

/**
 * Formats an integer to have commas in expected places
 */
Number.prototype.format = function() {
    var numberString = Math.round(this).toString();
    var precompiledRegularExpression = /(\d+)(\d{3})/;

    while (precompiledRegularExpression.test(numberString)) {
        numberString = numberString.replace(precompiledRegularExpression, '$1' + ',' + '$2');
    } // while

    return numberString;
} // Number.prototype.format

/*------------------------------------------------------------------------------------------------*/

function initialLoad() {
    var canvasM = document.getElementsByTagName('canvas')[0];    
    canvasM.addEventListener('mousedown', handlePointerM, false);
    canvasM.addEventListener('mousemove', handlePointerM, false);
    canvasM.addEventListener('mouseup', handlePointerM, false);

    var canvasJ = document.getElementsByTagName('canvas')[1];
    canvasJ.addEventListener('mousedown', handlePointerJ, false);
    canvasJ.addEventListener('mousemove', handlePointerJ, false);
    canvasJ.addEventListener('mouseup', handlePointerJ, false);

    document.getElementById('resetButton').addEventListener('click', handleResetButton, false);
    document.getElementById('changeColorButton').addEventListener('click', handleColorButton, false);
    document.getElementById('saveButton').addEventListener('click', handleSaveButton, false);
    document.getElementById('fractalToggleButton').addEventListener('click', handleFractalToggleButton, false);
    document.getElementById('filenameForm').addEventListener('submit', handleFormSubmit, false);
    document.getElementById('changeParametersButton').addEventListener('click', handleChangeParameters, false);

    loadSizes();
} // initialLoad

/*------------------------------------------------------------------------------------------------*/

function loadSizes() {
    //MANDELBROT CANVAS-----------------------------------------
    var canvasM = document.getElementsByTagName('canvas')[0];
    var canvasMWidth = canvasM.width;
    var canvasMHeight = canvasM.height;
    var ctxM = canvasM.getContext('2d');
    
    //Set the table width equal to the canvas width
    document.getElementsByTagName('table')[0].width = canvasMWidth;
    document.getElementById('messageBoxM').innerHTML = DEFAULT_MESSAGE;

    globals.canvasM = canvasM;
    globals.canvasM.context = ctxM;
    //create an empty canvas image object the same size as the canvas
    globals.canvasM.context.imageDataObject = ctxM.createImageData(canvasMWidth, canvasMHeight);

    //color and opacity of the zoom box
    canvasM.getContext('2d').fillStyle = ZOOM_BOX_COLOR;
    
    //JULIA CANVAS-------------------------------------------------
    var canvasJ = document.getElementsByTagName('canvas')[1];
    var canvasJWidth = canvasJ.width;
    var canvasJHeight = canvasJ.height;
    var ctxJ = canvasJ.getContext('2d');
    
    document.getElementsByTagName('table')[1].width = canvasJWidth;
    document.getElementById('messageBoxJ').innerHTML = DEFAULT_MESSAGE;
    
    globals.canvasJ = canvasJ;
    globals.canvasJ.context = ctxJ;
    //create an empty canvas image object the same size as the canvas
    globals.canvasJ.context.imageDataObject = ctxJ.createImageData(canvasJWidth, canvasJHeight);
        
    //color and opacity of the zoom box
    canvasJ.getContext('2d').fillStyle = ZOOM_BOX_COLOR;
    
    //SHARED------------------------------------------
    
    //Maintain the original width/height ratio
    globals.staticZoomBoxWidth = STATIC_ZOOM_BOX_FACTOR * canvasMWidth;
    globals.staticZoomBoxHeight = STATIC_ZOOM_BOX_FACTOR * canvasMHeight;

    globals.pointerM = {};
    globals.pointerM.down = false;
    globals.pointerJ = {};
    globals.pointerJ.down = false;

    globals.j_re = JULIA_SEED_RE;
    globals.j_im = JULIA_SEED_IM;
    
    resetZoom();
} // loadSizes

/*------------------------------------------------------------------------------------------------*/

/**
 * Adjusts ReMax such that the image will not be distorted (will have the same scale as the
 * imaginary axis.
 */
function adjusted_RE_MAX() {
    var ReMax = globals.canvasM.width * ((IM_MAX - IM_MIN) / globals.canvasM.height) + RE_MIN;

    if (RE_MAX != ReMax) {
        console.warn("RE_MAX has been adjusted to " + ReMax); //This should not occur
    } // if
    return ReMax;
} // adjusted_RE_MAX

/*------------------------------------------------------------------------------------------------*/

/**
 * Generates a fractal image using a s given iteration function and coloring function
 */
function createFractalImage(canvas, coordinateLimits, iterationFunction, coloringFunction){
    var startTime = new Date(); // Keep track of how long this render takes
    var context = canvas.context;
    var imageDataObjectData = context.imageDataObject.data; // Reference
    var imageIndex = 0;
    
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    
    var ReMax = coordinateLimits.ReMax;
    var ReMin = coordinateLimits.ReMin;
    var ImMax = coordinateLimits.ImMax;
    var ImMin = coordinateLimits.ImMin;
    
    var x_coordinate_to_pixel_conversion = (ReMax - ReMin) / canvasWidth;
    var y_coordinate_to_pixel_conversion = (ImMin - ImMax) / canvasHeight;
    
//    console.log("ReMax:" + ReMax);
//    console.log("ReMin:" + ReMin);
//    console.log("ImMax:" + ImMax);
//    console.log("ImMin:" + ImMin);
//    
//    console.log("x: " + x_coordinate_to_pixel_conversion);
//    console.log("y: " + y_coordinate_to_pixel_conversion);
    
    var iterationTotal = 0;
    
    for (var y = canvasHeight; y > 0; y--){
        var imaginary = y * y_coordinate_to_pixel_conversion - ImMin;
        for (var x = 0; x<canvasWidth; x++){
            var real = x * x_coordinate_to_pixel_conversion + ReMin;
            var iterations = iterationFunction(real, imaginary);
            iterationTotal += iterations;
            var colorArray = coloringFunction(iterations);
            imageDataObjectData[imageIndex++] = colorArray[0];
            imageDataObjectData[imageIndex++] = colorArray[1];
            imageDataObjectData[imageIndex++] = colorArray[2];
            imageDataObjectData[imageIndex++] = colorArray[3];
        }
        //console.log("x: " + real + ", y: " + imaginary + ": " + iterations);        
    }
        

    //Place the image on the canvas
    context.putImageData(context.imageDataObject, 0, 0);

    
    //show time taken & number of iterations    
    var elapsedMilliseconds = (new Date()) - startTime;
    document.getElementById('elapsedTimeM').innerHTML = iterationTotal.format() +
            " iterations in " + (elapsedMilliseconds / 1000).toFixed(2) + " seconds";
    
    //Remove "calculating" message
    document.getElementById('messageBoxM').innerHTML = DEFAULT_MESSAGE;
    
    console.log("ImMax: " + ImMax + ", ImMin: " + ImMin);
    
} // createFractalImage

/*------------------------------------------------------------------------------------------------*/

/**
 * Draw the Mandelbrot Set
 */
function drawMandelbrotSet(){
    var RE_MAX = 1.1;
    var RE_MIN = -2.5;
    var IM_MAX = 1.2;
    var IM_MIN = -1.2;
    //var coordinateLimits = {ReMax: RE_MAX, ReMin: globals.RE_MIN, ImMax:globals.IM_MAX, ImMin: globals.IM_MIN};
    var coordinateLimits = {ReMax: globals.ReMax, ReMin: globals.ReMin, ImMax:globals.ImMax, ImMin: globals.ImMin};
    createFractalImage(globals.canvasM, coordinateLimits, mandelbrotIterationFunction, setColor);
} // drawMandelbrotSet

/*------------------------------------------------------------------------------------------------*/

/**
 * Draw the BurningShip Fractal Set
 */
function drawBurningShipFractal(){
    var RE_MAX = 1.1;
    var RE_MIN = -2.5;
    var IM_MAX = 1.2;
    var IM_MIN = -1.2;
    var coordinateLimits = {ReMax: globals.ReMax, ReMin: globals.ReMin, ImMax:globals.ImMax, ImMin: globals.ImMin};
    createFractalImage(globals.canvas, coordinateLimits, burningShipIterationFunction, setColor);
} // drawBurningShipFractal

/*------------------------------------------------------------------------------------------------*/

/**
 * Draw a Julia Set
 */
function drawJuliaSet(){
    var RE_MAX = 1.1;
    var RE_MIN = -2.5;
    var IM_MAX = 1.2;
    var IM_MIN = -1.2;
    var coordinateLimits = {ReMax: globals.ReMax, ReMin: globals.ReMin, ImMax:globals.ImMax, ImMin: globals.ImMin};
    createFractalImage(globals.canvasJ, coordinateLimits, juliaIterationFunction, setColor);
} // drawJuliaSet

/*------------------------------------------------------------------------------------------------*/

/**
 * Iterates according to the Mandelbrot function
 * @param {type} real
 * @param {type} imaginary
 * @returns {undefined}
 */
function mandelbrotIterationFunction(c_re, c_im){
    var z_re = 0;
    var z_im = 0;
    for (var iterations = 1; iterations < MAX_ITERATIONS; iterations ++){
         //Calculate here for optimization
        var z_re_squared = z_re * z_re;
        var z_im_squared = z_im * z_im;
        
        //checks if magnitude of z is greater than 2 and thus diverges to infinity
        if (z_re_squared + z_im_squared > 4) {
            return iterations;
        } // if
        
        //the next Z value
        z_im = (2 * z_re * z_im) + c_im;
        z_re = z_re_squared - z_im_squared + c_re;
    }    
    return -1;
} // mandelbrotIterationFunction

/*------------------------------------------------------------------------------------------------*/

/**
 * Iterates according to the Burning Ship fractal
 */
function burningShipIterationFunction(c_re, c_im){
    var z_re = 0; //z0
    var z_im = 0;

    for (var iterations = 1; iterations <= MAX_ITERATIONS; iterations++) {

        var z_re_squared = z_re * z_re;
        var z_im_squared = z_im * z_im;

        //checks if magnitude of z is greater than 2 and thus diverges to infinity
        if (z_re_squared + z_im_squared > 4) {
            return iterations;
        } // if

        var z_re_abs = z_re;
        var z_im_abs = z_im;
        if (z_re_abs < 0) {
            z_re_abs = -z_re_abs;
        }
        if (z_im_abs < 0) {
            z_im_abs = -z_im_abs;
        }

        var z_Re_abs_squared = z_re_abs * z_re_abs;
        var z_Im_abs_squared = z_im_abs * z_im_abs;

        //the next Z value
        z_im = (2 * z_re_abs * z_im_abs) + c_im;
        z_re = z_Re_abs_squared - z_Im_abs_squared + c_re;
    } // for
    
    return -1;    
} // burningShipIterationFunction

/*------------------------------------------------------------------------------------------------*/

/**
 * Iterates according to the Julia Set function
 */
function juliaIterationFunction(c_re, c_im){
    
    var j_re = globals.j_re;
    var j_im = globals.j_im;
    
    var z_re = c_re;
    var z_im = c_im;
    for (var iterations = 1; iterations < MAX_ITERATIONS; iterations ++){
         //Calculate here for optimization
        var z_re_squared = z_re * z_re;
        var z_im_squared = z_im * z_im;
        
        //checks if magnitude of z is greater than 2 and thus diverges to infinity
        if (z_re_squared + z_im_squared > 4) {
            return iterations;
        } // if
        
        //the next Z value
        z_im = (2 * z_re * z_im) + j_im;
        z_re = z_re_squared - z_im_squared + j_re;
    }    
    return -1;
} // juliaIterationFunction

/*------------------------------------------------------------------------------------------------*/

/**
 * Converts a canvas x value to complex plane real value
 */
function xToRe(x) {
    var x_coefficient = (globals.ReMax - globals.ReMin) / globals.canvasM.width;
    return (x * x_coefficient) + globals.ReMin;
} // xToRe

/*------------------------------------------------------------------------------------------------*/

/**
 * Converts a canvas y value to complex plane imaginary value
 */
function yToIm(y) {
    //var y_coefficient = (globals.ImMin - globals.ImMax) / globals.canvas.height;
    var y_coefficient = -(globals.ImMax - globals.ImMin) / globals.canvasM.height
    return (y * y_coefficient) + globals.ImMax;
} // yToIm

/*------------------------------------------------------------------------------------------------*/

function handlePointerM(evt){
    var canvas = globals.canvasM;
    
    //var canvasWidthHeightRatio = globals.canvas.width / globals.canvas.height;
    var canvasWidthHeightRatio = CANVAS_WIDTH_HEIGHT_RATIO;
    var ctx = canvas.context;

    var canvasX;
    var canvasY;

    if (evt.offsetX && evt.offsetY) {
        // Not supported by FireFox
        canvasX = evt.offsetX;
        canvasY = evt.offsetY;
    } else {
        // Supported by FireFox
        canvasX = evt.clientX - evt.target.offsetLeft;
        canvasY = evt.clientY - evt.target.offsetTop;
    } // if-else

    var zoomBoxWidth;
    var zoomBoxHeight;

    var ReMax;
    var ReMin;
    var ImMax;
    var ImMin;

    switch (evt.type) {
        case 'mousedown' :
            globals.pointerM.x1 = canvasX;
            globals.pointerM.y1 = canvasY;
            globals.pointerM.down = true;
            //console.log("canvasX: " + canvasX + ", canvasY: " + canvasY);
            break;
        case 'mousemove':
            if (globals.pointerM.down) {
                zoomBoxHeight = Math.abs(canvasY - globals.pointerM.y1);
                //Keep zoom box dimensions properly proportioned
                zoomBoxWidth = zoomBoxHeight * canvasWidthHeightRatio;
                // Ensures that the initial Mandelbrot Set has already been rendered
                ctx.putImageData(canvas.context.imageDataObject, 0, 0);
                // Draw the zoom box
                ctx.fillRect(globals.pointerM.x1, globals.pointerM.y1, zoomBoxWidth, zoomBoxHeight);
            } // if
            break;
        case 'mouseup':
            globals.pointerM.down = false;
            // Only Allow top-left to bottom-right zoom boxes
            zoomBoxHeight = Math.abs(canvasY - globals.pointerM.y1);
            // Enforce proportions
            zoomBoxWidth = zoomBoxHeight * canvasWidthHeightRatio;

            if (zoomBoxHeight === 0) {
                //No box was drawn, so pick a point for the julia set
                //get point
                globals.j_re = xToRe(globals.pointerM.x1);
                globals.j_im = yToIm(globals.pointerM.y1);
                                
                //draw julia set
                drawJuliaSet();                
            } else {
                //A (possibly tiny) box was drawn, so perform zoom to that box
                ReMin = xToRe(globals.pointerM.x1);
                ImMax = yToIm(globals.pointerM.y1);
                //ImMax = yToIm(globals.pointer.y1);

                ReMax = xToRe(zoomBoxWidth + globals.pointerM.x1);
                ImMin = yToIm(zoomBoxHeight + globals.pointerM.y1);
                //ImMin = yToIm(globals.pointer.y1 = zoomBoxHeight);
            } // if-else

            
//            console.log("CanvasY: %d, PointerY: %d, ZoomBoxHeight: %d, ImMax: %f, ImMin: %f", 
//                canvasY, globals.pointer.y1, zoomBoxHeight, ImMax, ImMin);
            document.getElementById('messageBoxM').innerHTML = "Calculating...";
            // Clear previous data
            document.getElementById('elapsedTimeM').innerHTML = "";

            setExtrema(ReMax, ReMin, ImMax, ImMin);
            // Allows "calculating" to be displayed
            if (window.setImmediate) {
                window.setImmediate(drawMandelbrotSet);
            } else {
                window.setTimeout(drawMandelbrotSet, 0);
            } // if-else
            break;
        default:
            alert("Error in switch statement");
    } // switch
    
}

function handlePointerJ(evt){
    var canvas = globals.canvasJ;
    var canvasWidthHeightRatio = CANVAS_WIDTH_HEIGHT_RATIO;
    var ctx = canvas.context;

    var canvasX;
    var canvasY;

    if (evt.offsetX && evt.offsetY) {
        // Not supported by FireFox
        canvasX = evt.offsetX;
        canvasY = evt.offsetY;
    } else {
        // Supported by FireFox
        canvasX = evt.clientX - evt.target.offsetLeft;
        canvasY = evt.clientY - evt.target.offsetTop;
    } // if-else

    var zoomBoxWidth;
    var zoomBoxHeight;

    var ReMax;
    var ReMin;
    var ImMax;
    var ImMin;

    switch (evt.type) {
        case 'mousedown' :
            globals.pointerJ.x1 = canvasX;
            globals.pointerJ.y1 = canvasY;
            globals.pointerJ.down = true;
            //console.log("canvasX: " + canvasX + ", canvasY: " + canvasY);
            break;
        case 'mousemove':
            if (globals.pointerJ.down) {
                zoomBoxHeight = Math.abs(canvasY - globals.pointerJ.y1);
                //Keep zoom box dimensions properly proportioned
                zoomBoxWidth = zoomBoxHeight * canvasWidthHeightRatio;
                // Ensures that the initial Mandelbrot Set has already been rendered
                ctx.putImageData(canvas.context.imageDataObject, 0, 0);
                // Draw the zoom box
                ctx.fillRect(globals.pointerJ.x1, globals.pointerJ.y1, zoomBoxWidth, zoomBoxHeight);
            } // if
            break;
        case 'mouseup':
            globals.pointerJ.down = false;
            // Only Allow top-left to bottom-right zoom boxes
            zoomBoxHeight = Math.abs(canvasY - globals.pointerJ.y1);
            // Enforce proportions
            zoomBoxWidth = zoomBoxHeight * canvasWidthHeightRatio;

            if (zoomBoxHeight === 0) {
               //do nothing
                
            } else {
                //A (possibly tiny) box was drawn, so perform zoom to that box
                ReMin = xToRe(globals.pointerJ.x1);
                ImMax = yToIm(globals.pointerJ.y1);
                //ImMax = yToIm(globals.pointer.y1);

                ReMax = xToRe(zoomBoxWidth + globals.pointerJ.x1);
                ImMin = yToIm(zoomBoxHeight + globals.pointerJ.y1);
                //ImMin = yToIm(globals.pointer.y1 = zoomBoxHeight);
            } // if-else

            
            console.log("CanvasY: %d, PointerY: %d, ZoomBoxHeight: %d, ImMax: %f, ImMin: %f", 
                canvasY, globals.pointerJ.y1, zoomBoxHeight, ImMax, ImMin);
            document.getElementById('messageBoxM').innerHTML = "Calculating...";
            // Clear previous data
            document.getElementById('elapsedTimeM').innerHTML = "";

            setExtrema(ReMax, ReMin, ImMax, ImMin);
            // Allows "calculating" to be displayed
            if (window.setImmediate) {
                window.setImmediate(drawJuliaSet);
            } else {
                window.setTimeout(drawJuliaSet, 0);
            } // if-else
            break;
        default:
            alert("Error in switch statement");
    } // switch
}

function handlePointer(evt, canvas) {
    //var canvasWidthHeightRatio = globals.canvas.width / globals.canvas.height;
    var canvasWidthHeightRatio = CANVAS_WIDTH_HEIGHT_RATIO;
    var ctx = canvas.context;

    var canvasX;
    var canvasY;

    if (evt.offsetX && evt.offsetY) {
        // Not supported by FireFox
        canvasX = evt.offsetX;
        canvasY = evt.offsetY;
    } else {
        // Supported by FireFox
        canvasX = evt.clientX - evt.target.offsetLeft;
        canvasY = evt.clientY - evt.target.offsetTop;
    } // if-else

    var zoomBoxWidth;
    var zoomBoxHeight;

    var ReMax;
    var ReMin;
    var ImMax;
    var ImMin;

    switch (evt.type) {
        case 'mousedown' :
            globals.pointer.x1 = canvasX;
            globals.pointer.y1 = canvasY;
            globals.pointer.down = true;
            //console.log("canvasX: " + canvasX + ", canvasY: " + canvasY);
            break;
        case 'mousemove':
            if (globals.pointer.down) {
                zoomBoxHeight = Math.abs(canvasY - globals.pointer.y1);
                //Keep zoom box dimensions properly proportioned
                zoomBoxWidth = zoomBoxHeight * canvasWidthHeightRatio;
                // Ensures that the initial Mandelbrot Set has already been rendered
                ctx.putImageData(canvas.context.imageDataObject, 0, 0);
                // Draw the zoom box
                ctx.fillRect(globals.pointer.x1, globals.pointer.y1, zoomBoxWidth, zoomBoxHeight);
            } // if
            break;
        case 'mouseup':
            globals.pointer.down = false;
            // Only Allow top-left to bottom-right zoom boxes
            zoomBoxHeight = Math.abs(canvasY - globals.pointer.y1);
            // Enforce proportions
            zoomBoxWidth = zoomBoxHeight * canvasWidthHeightRatio;

            if (zoomBoxHeight === 0) {
                //No box was drawn, so pick a point for the julia set
                //get point
                globals.j_center_re = xToRe(globals.pointer.x1);
                globals.j_center_im = yToIm(globals.pointer.y1);
                //draw julia set
                drawJuliaSet();
                
            } else {
                //A (possibly tiny) box was drawn, so perform zoom to that box
                ReMin = xToRe(globals.pointer.x1);
                ImMax = yToIm(globals.pointer.y1);
                //ImMax = yToIm(globals.pointer.y1);

                ReMax = xToRe(zoomBoxWidth + globals.pointer.x1);
                ImMin = yToIm(zoomBoxHeight + globals.pointer.y1);
                //ImMin = yToIm(globals.pointer.y1 = zoomBoxHeight);
            } // if-else

            
            console.log("CanvasY: %d, PointerY: %d, ZoomBoxHeight: %d, ImMax: %f, ImMin: %f", 
                canvasY, globals.pointer.y1, zoomBoxHeight, ImMax, ImMin);
            document.getElementById('messageBoxM').innerHTML = "Calculating...";
            // Clear previous data
            document.getElementById('elapsedTimeM').innerHTML = "";

            setExtrema(ReMax, ReMin, ImMax, ImMin);
            // Allows "calculating" to be displayed
            if (window.setImmediate) {
                if (FRACTAL_SELECTOR === 0) {
                    window.setImmediate(drawMandelbrotSet);
                } else if (FRACTAL_SELECTOR === 1) {
                    window.setImmediate(drawBurningShipFractal);
                } else if (FRACTAL_SELECTOR === 2) {
                    window.setImmediate(drawJuliaSet);
                }
            } else {
                if (FRACTAL_SELECTOR === 0) {
                    window.setTimeout(drawMandelbrotSet, 0);
                } else if (FRACTAL_SELECTOR === 1) {
                    window.setTimeout(drawBurningShipFractal, 0);
                } else if (FRACTAL_SELECTOR === 2) {
                    window.setTimeout(drawJuliaSet, 0);
                }
            } // if-else
            break;
        default:
            alert("Error in switch statement");
    } // switch
} // handlePointer

/*------------------------------------------------------------------------------------------------*/

/**
 * Sets the boundaries of the coordinate system. Should be called before any call
 * to drawMandelbrot
 */
function setExtrema(ReMax, ReMin, ImMax, ImMin) {
    globals.ReMax = ReMax;
    globals.ReMin = ReMin;
    globals.ImMax = ImMax;
    globals.ImMin = ImMin;
} // setExtrema

/*------------------------------------------------------------------------------------------------*/

function resetZoom() {
    var reMax = adjusted_RE_MAX();    
    setExtrema(reMax, RE_MIN, IM_MAX, IM_MIN);
    drawMandelbrotSet();
    drawJuliaSet();
} // resetZoom

/*------------------------------------------------------------------------------------------------*/

function setCanvasSize(width) {
    globals.canvasM.width = width;
    var height = width / CANVAS_WIDTH_HEIGHT_RATIO;
    globals.canvasM.height = height;

    loadSizes();
} // changeCanvasSize

/*------------------------------------------------------------------------------------------------*/

function saveImage(filename) {

//document.getElementById('messageBox').innerHTML = "<strong style='color:red';>CANNOT SAVE FILE</strong>";
    var dataURL = globals.canvasM.toDataURL("image/png")
    document.getElementById('messageBox').innerHTML = "<a download=" + filename + " href=" + dataURL + " value='download'>Click here to download!</a>";

    document.getElementById('filenameForm').style.visibility = "hidden";
} // handleFormSubmit

/*------------------------------------------------------------------------------------------------*/

function handleResetButton() {
    resetZoom();
} // handleResetButton

/*------------------------------------------------------------------------------------------------*/

function handleColorButton() {
    COLOR_SELECTOR += 1;
    if (COLOR_SELECTOR > 2) {
        COLOR_SELECTOR = 0;
    }
} // handleLightenButton

/*------------------------------------------------------------------------------------------------*/

function handleSaveButton() {
    document.getElementById('filenameForm').style.visibility = "visible";
    document.getElementById('filename').focus();
} // handleSaveButton

/*------------------------------------------------------------------------------------------------*/

function handleFractalToggleButton() {
    FRACTAL_SELECTOR += 1;
    if (FRACTAL_SELECTOR > 2) {
        FRACTAL_SELECTOR = 0;
    }
    resetZoom();
}

/*------------------------------------------------------------------------------------------------*/

function handleFormSubmit(evt) {
    evt.preventDefault(); // Do not refresh the page when submit is clicked
    var filename = evt.target[0].value;
    if (filename === "") {
        if (FRACTAL_SELECTOR === 0) {
            filename = "Mandelbrot.png";
        } else if (FRACTAL_SELECTOR === 1) {
            filename = "BurningShip.png";
        } else if (FRACTAL_SELECTOR === 2) {
            filename = "Julia.png";
        }
    }
    saveImage(filename);

} // handleFormSubmit

/*------------------------------------------------------------------------------------------------*/

function handleChangeParameters() {
    //setMaxIterations();
    var iterations = document.getElementById('iterations').value;
    MAX_ITERATIONS = iterations;

    var width = document.getElementById('width').value;
    setCanvasSize(width);
    //return;
//                var canvasWidthHeightRatio = 1.5;
//                var width = 900;
//                globals.canvas.width = width;
//                globals.canvas.style.width=width + "px";
//                var height = width / canvasWidthHeightRatio;                
//                globals.canvas.height = height;
//                globals.canvas.style.height=height + "px";
//                handleResetButton();
}

function setColor(iterations) {
    //return [255, 255, 255, 255];
//                for (var divisions = 10; divisions > 0; divisions--){
//                    if (iterations < (MAX_ITERATIONS / divisions)){
//                        return [0, 0, 20*divisions, 255];
//                    }
//                }

//    var color = iterations % 255;
//    //var color = Math.round(color / 10);
//    //return [25, color*10, color*10, 255];
//    return [25, color, color, 255];
//    return [0, 0, iterations % 255, 255];
//
//    return [0, 255, 0, 255];
//    
    //return [255, 255, 255, 255];
    //return juliaColors(iterations);
    //return burningColors(iterations);
    //return singleHueStraight(iterations + 50);
    //return spectrumCycle(iterations);

    if (COLOR_SELECTOR === 0) {
        return juliaColors(iterations);
    } else if (COLOR_SELECTOR === 1) {
        return spectrumCycle(iterations);
    } else if (COLOR_SELECTOR === 2) {
        return burningColors(iterations);
    } else if (COLOR_SELECTOR === 3) {
        return singleHueStraight(iterations + 50);
    } else {
        return [255, 255, 255, 255];
    }

//                if (iterations < (MAX_ITERATIONS / 10)){
//                    return [255, 0, 0, 255];
//                } else if (iterations < (MAX_ITERATIONS / 4)){
//                    return [0, 255, 0, 255];
//                } else if (iterations < (3 * MAX_ITERATIONS / 2)){
//                    return [0, 0, 255, 255];
//                } else {
//                    return [255, 255, 0, 255];
//                } // if
} // setColor

function juliaColors(iterations) {
    if (iterations < 0){
        return MANDELBROT_SET_COLOR;
    }
    var color = iterations % 5;
    var r = 0;
    var g = 0;
    var b = (color + 1) * 50;
    return [r, g, b, 255];
}


function burningColors(iterations) {
    //return burningColorsPurpleToGreen(iterations);
    return burningColorsTwo(iterations);
}

function burningColorsTwo(iterations) {
    if (iterations < 0){
        return MANDELBROT_SET_COLOR;
    }
    var color = iterations % 255;
    var r = (color - 200) * 3;//(color/3.0)^2;
    //console.log(r);
    //var g = (iterations * 2)^(1/2);
    var g = color;// - (color/4.0)^2;
    var b = 100 - color ^ 2;
    //var b = 0;

//    if (color > 200){
//        r = color - 200;
//    }
//    
    return [r, g, b, 255];
}

function burningColorsPurpleToGreen(iterations) {

    var color = iterations % 255;
    var r = 50 - iterations / 25;
    var g = iterations;
    var b = 50 - iterations / 25;
    return [r, g, b, 255];

    //return spectrumCycle(iterations);
//var color
    //return [255,255,255,255];
}

function singleHueStraight(iterations) {
    var color = iterations % 255;
    return [5, 0, color, 255];
    //var color = Math.round(color / 10);
    //return [25, color*10, color*10, 255];
//    return [25, color, color, 255];
//    return [0, 0, iterations % 255, 255];
//
//    return [0, 255, 0, 255];
}

function spectrumCycle(iterations) {
    if (iterations < 0){
        return MANDELBROT_SET_COLOR;
    }
    var round = true;
    var hue = iterations % 764;
    var r = 1;
    var g = 1;
    var b = 1;
    if (hue <= 255) {
        b = 255 - hue;
        g = hue;
    } else if (hue <= 510) {
        g = 510 - hue;
        r = hue - 255;
    } else {
        r = 764 - hue;
        b = hue - 510;
    }
    if (round) {
        r = 10 * Math.round(r / 10.0);
        g = 10 * Math.round(g / 10.0);
        b = 10 * Math.round(b / 10.0);
    }
    return [r, g, b, 255];
}