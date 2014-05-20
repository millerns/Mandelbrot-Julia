
//Real and Imaginary bounds to our coordinate system
var m_RE_MAX = 1.1;
var m_RE_MIN = -2.5;
var m_IM_MAX = 1.2;
var m_IM_MIN = -1.2;

var j_RE_MAX = 1.45;
var j_RE_MIN = -2.15;
var j_IM_MAX = 1.2;
var j_IM_MIN = -1.2;

var MANDELBROT_SET_COLOR = [0, 0, 0, 255];
var ZOOM_BOX_COLOR = "rgba(255, 255, 255, 0.3)";
var CANVAS_WIDTH_HEIGHT_RATIO = 16.0 / 9.0;
var FRACTAL_SELECTOR = 0;
var COLOR_SELECTOR = 1;

var JULIA_SEED_RE = -.67319;//-0.67319
var JULIA_SEED_IM = .3542;//0.34442

var MAX_ITERATIONS = 500; //Number of iterations. Higher is slower but more detailed.
var STATIC_ZOOM_BOX_FACTOR = 0.25; //Amount of zoom from clicks. Increase to increase zoom
var DEFAULT_MESSAGE = "";

//var CANVAS_WIDTH = 640;
//var CANVAS_HEIGHT = 360;
var SIZE_SELECTOR = 1;
var CANVAS_WIDTH = 0;
var CANVAS_HEIGHT = 0;

var ITERATION_SELECTOR = 4;

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
    var canvasM = document.getElementById('mandelbrotCanvas');
    canvasM.addEventListener('mousedown', handlePointerM, false);
    canvasM.addEventListener('mousemove', handlePointerM, false);
    canvasM.addEventListener('mouseup', handlePointerM, false);

    var canvasJ = document.getElementById('juliaCanvas');
    canvasJ.addEventListener('mousedown', handlePointerJ, false);
    canvasJ.addEventListener('mousemove', handlePointerJ, false);
    canvasJ.addEventListener('mouseup', handlePointerJ, false);

    document.getElementById('resetButton').addEventListener('click', handleResetButton, false);
    document.getElementById('changeColorButton').addEventListener('click', handleColorButton, false);
    document.getElementById('changeSizeButton').addEventListener('click', handleSizeButton, false);
    document.getElementById('changeIterationButton').addEventListener('click', handleIterationButton, false);
    document.getElementById('saveButton').addEventListener('click', handleSaveButton, false);
    document.getElementById('filenameForm').addEventListener('submit', handleFormSubmit, false);
        
    globals.j_re = JULIA_SEED_RE;
    globals.j_im = JULIA_SEED_IM;
    
    setJuliaPointMessage();
    setColorMessage();
    toggleCanvasSize();
    toggleIterations();
    loadSizes();
    
    resetZoomM();
    resetZoomJ();
} // initialLoad

/*------------------------------------------------------------------------------------------------*/

function loadSizes() {
    
    //MANDELBROT CANVAS-----------------------------------------
    var canvasM = document.getElementsByTagName('canvas')[0];
    canvasM.width = CANVAS_WIDTH;
    canvasM.height = CANVAS_HEIGHT;   
    var canvasMWidth = canvasM.width;
    var canvasMHeight = canvasM.height;
    var ctxM = canvasM.getContext('2d');

    //Set the table width equal to the canvas width
    document.getElementsByTagName('table')[0].width = canvasMWidth;

    globals.canvasM = canvasM;
    globals.canvasM.context = ctxM;
    //create an empty canvas image object the same size as the canvas
    globals.canvasM.context.imageDataObject = ctxM.createImageData(canvasMWidth, canvasMHeight);

    //color and opacity of the zoom box
    canvasM.getContext('2d').fillStyle = ZOOM_BOX_COLOR;

    globals.pointerM = {};
    globals.pointerM.down = false;

    //JULIA CANVAS-------------------------------------------------
    var canvasJ = document.getElementsByTagName('canvas')[1];
    canvasJ.width = CANVAS_WIDTH;
    canvasJ.height = CANVAS_HEIGHT;
    var canvasJWidth = canvasJ.width;
    var canvasJHeight = canvasJ.height;
    var ctxJ = canvasJ.getContext('2d');

    globals.canvasJ = canvasJ;
    globals.canvasJ.context = ctxJ;
    //create an empty canvas image object the same size as the canvas
    globals.canvasJ.context.imageDataObject = ctxJ.createImageData(canvasJWidth, canvasJHeight);

    //color and opacity of the zoom box
    canvasJ.getContext('2d').fillStyle = ZOOM_BOX_COLOR;

    globals.pointerJ = {};
    globals.pointerJ.down = false;

    //SHARED------------------------------------------

    //Maintain the original width/height ratio
    globals.staticZoomBoxWidth = STATIC_ZOOM_BOX_FACTOR * canvasMWidth;
    globals.staticZoomBoxHeight = STATIC_ZOOM_BOX_FACTOR * canvasMHeight;

    drawMandelbrotSet();
    drawJuliaSet();
} // loadSizes

/*------------------------------------------------------------------------------------------------*/

/**
 * Adjusts ReMax such that the image will not be distorted (will have the same scale as the
 * imaginary axis.
 */
function adjusted_RE_MAX_M() {
    var ReMax = globals.canvasM.width * ((m_IM_MAX - m_IM_MIN) / globals.canvasM.height) + m_RE_MIN;

    if (m_RE_MAX != ReMax) {
        console.warn("RE_MAX has been adjusted to " + ReMax); //This should not occur
    } // if
    return ReMax;
} // adjusted_RE_MAX

/*------------------------------------------------------------------------------------------------*/

/**
 * Adjusts ReMax such that the image will not be distorted (will have the same scale as the
 * imaginary axis.
 */
function adjusted_RE_MAX_J() {
    var ReMax = globals.canvasJ.width * ((j_IM_MAX - j_IM_MIN) / globals.canvasJ.height) + j_RE_MIN;

    if (j_RE_MAX != ReMax) {
        console.warn("RE_MAX has been adjusted to " + ReMax); //This should not occur
    } // if
    return ReMax;
} // adjusted_RE_MAX

/*------------------------------------------------------------------------------------------------*/

/**
 * Generates a fractal image using a s given iteration function and coloring function
 */
function createFractalImage(canvas, coordinateLimits, iterationFunction, coloringFunction) {
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

    var iterationTotal = 0;

    for (var y = canvasHeight; y > 0; y--) {
        var imaginary = y * y_coordinate_to_pixel_conversion - ImMin;
        for (var x = 0; x < canvasWidth; x++) {
            var real = x * x_coordinate_to_pixel_conversion + ReMin;
            var iterations = iterationFunction(real, imaginary);
            iterationTotal += iterations;
            var colorArray = coloringFunction(iterations);
            imageDataObjectData[imageIndex++] = colorArray[0];
            imageDataObjectData[imageIndex++] = colorArray[1];
            imageDataObjectData[imageIndex++] = colorArray[2];
            imageDataObjectData[imageIndex++] = colorArray[3];
        } // for
    } // for


    //Place the image on the canvas
    context.putImageData(context.imageDataObject, 0, 0);


    //show time taken & number of iterations    
    var elapsedMilliseconds = (new Date()) - startTime;
    document.getElementById('timeMessage').innerHTML = iterationTotal.format() +
            " iterations in " + (elapsedMilliseconds / 1000).toFixed(2) + " seconds";

    //Remove "calculating" message
    //document.getElementById('messageBox').innerHTML = DEFAULT_MESSAGE;

} // createFractalImage

/*------------------------------------------------------------------------------------------------*/

/**
 * Draw the Mandelbrot Set
 */
function drawMandelbrotSet() {
    var coordinateLimits = {ReMax: globals.mReMax, ReMin: globals.mReMin, ImMax: globals.mImMax, ImMin: globals.mImMin};
    createFractalImage(globals.canvasM, coordinateLimits, mandelbrotIterationFunction, setColor);
} // drawMandelbrotSet

/*------------------------------------------------------------------------------------------------*/

/**
 * Draw a Julia Set
 */
function drawJuliaSet() {
    var coordinateLimits = {ReMax: globals.jReMax, ReMin: globals.jReMin, ImMax: globals.jImMax, ImMin: globals.jImMin};
    createFractalImage(globals.canvasJ, coordinateLimits, juliaIterationFunction, setColor);
} // drawJuliaSet

/*------------------------------------------------------------------------------------------------*/

/**
 * Iterates according to the Mandelbrot function
 * @param {type} real
 * @param {type} imaginary
 * @returns {undefined}
 */
function mandelbrotIterationFunction(c_re, c_im) {
    var z_re = 0;
    var z_im = 0;
    for (var iterations = 1; iterations < MAX_ITERATIONS; iterations++) {
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
 * Iterates according to the Julia Set function
 */
function juliaIterationFunction(c_re, c_im) {

    var j_re = globals.j_re;
    var j_im = globals.j_im;

    var z_re = c_re;
    var z_im = c_im;
    for (var iterations = 1; iterations < MAX_ITERATIONS; iterations++) {
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
function xToReM(x) {
    var x_coefficient = (globals.mReMax - globals.mReMin) / globals.canvasM.width;
    return (x * x_coefficient) + globals.mReMin;
} // xToReM

/*------------------------------------------------------------------------------------------------*/

/**
 * Converts a canvas y value to complex plane imaginary value
 */
function yToImM(y) {
    //var y_coefficient = (globals.ImMin - globals.ImMax) / globals.canvas.height;
    var y_coefficient = -(globals.mImMax - globals.mImMin) / globals.canvasM.height
    return (y * y_coefficient) + globals.mImMax;
} // yToImM

/*------------------------------------------------------------------------------------------------*/

/**
 * Converts a canvas x value to complex plane real value
 */
function xToReJ(x) {
    var x_coefficient = (globals.jReMax - globals.jReMin) / globals.canvasJ.width;
    return (x * x_coefficient) + globals.jReMin;
} // xToReJ

/*------------------------------------------------------------------------------------------------*/

/**
 * Converts a canvas y value to complex plane imaginary value
 */
function yToImJ(y) {
    //var y_coefficient = (globals.ImMin - globals.ImMax) / globals.canvas.height;
    var y_coefficient = -(globals.jImMax - globals.jImMin) / globals.canvasJ.height;
    return (y * y_coefficient) + globals.jImMax;
} // yToImJ

/*------------------------------------------------------------------------------------------------*/

function handlePointerM(evt) {
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
                globals.j_re = xToReM(globals.pointerM.x1);
                globals.j_im = yToImM(globals.pointerM.y1);

                //draw julia set
                setJuliaPointMessage();
                resetZoomJ();
                //drawJuliaSet();
            } else {
                //A (possibly tiny) box was drawn, so perform zoom to that box
                ReMin = xToReM(globals.pointerM.x1);
                ImMax = yToImM(globals.pointerM.y1);

                ReMax = xToReM(zoomBoxWidth + globals.pointerM.x1);
                ImMin = yToImM(zoomBoxHeight + globals.pointerM.y1);

                setExtremaM(ReMax, ReMin, ImMax, ImMin);
                
                //document.getElementById('messageBox').innerHTML = "Calculating...";
                // Clear previous data
                document.getElementById('timeMessage').innerHTML = "";

                // Allows "calculating" to be displayed
                if (window.setImmediate) {
                    window.setImmediate(drawMandelbrotSet);
                } else {
                    window.setTimeout(drawMandelbrotSet, 0);
                } // if-else
            } // if-else
            break;
        default:
            alert("Error in switch statement");
    } // switch

} // handlePointerM

/*------------------------------------------------------------------------------------------------*/

function handlePointerJ(evt) {
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
                ReMin = xToReJ(globals.pointerJ.x1);
                ImMax = yToImJ(globals.pointerJ.y1);

                ReMax = xToReJ(zoomBoxWidth + globals.pointerJ.x1);
                ImMin = yToImJ(zoomBoxHeight + globals.pointerJ.y1);
                
                //document.getElementById('messageBox').innerHTML = "Calculating...";
                // Clear previous data
                document.getElementById('timeMessage').innerHTML = "";

                setExtremaJ(ReMax, ReMin, ImMax, ImMin);
                // Allows "calculating" to be displayed
                if (window.setImmediate) {
                    window.setImmediate(drawJuliaSet);
                } else {
                    window.setTimeout(drawJuliaSet, 0);
                } // if-else
            } // if-else
            break;
        default:
            alert("Error in switch statement");
    } // switch
} // handlePointerJ

/*------------------------------------------------------------------------------------------------*/

/**
 * Sets the boundaries of the coordinate system. Should be called before any call
 * to drawMandelbrot
 */
function setExtremaM(ReMax, ReMin, ImMax, ImMin) {
    globals.mReMax = ReMax;
    globals.mReMin = ReMin;
    globals.mImMax = ImMax;
    globals.mImMin = ImMin;
} // setExtremaM

/*------------------------------------------------------------------------------------------------*/

/**
 * Sets the boundaries of the coordinate system. Should be called before any call
 * to drawMandelbrot
 */
function setExtremaJ(ReMax, ReMin, ImMax, ImMin) {
    globals.jReMax = ReMax;
    globals.jReMin = ReMin;
    globals.jImMax = ImMax;
    globals.jImMin = ImMin;
} // setExtremaJ

/*------------------------------------------------------------------------------------------------*/

function resetZoomM() {
    var reMax = adjusted_RE_MAX_M();
    setExtremaM(reMax, m_RE_MIN, m_IM_MAX, m_IM_MIN);
    drawMandelbrotSet();
} // resetZoom

/*------------------------------------------------------------------------------------------------*/

function resetZoomJ() {
    var reMax = adjusted_RE_MAX_J();
    setExtremaJ(reMax, j_RE_MIN, j_IM_MAX, j_IM_MIN);
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
    var dataURLM = globals.canvasM.toDataURL("image/png");
    var dataURLJ = globals.canvasJ.toDataURL("image/png");
    document.getElementById('saveMessage').innerHTML = "<a download=" + filename + " href=" + dataURLM +
            " value='download'>Download Mandelbrot</a> or <a download=" + filename + " href=" + dataURLJ +
            " value='download'>Download Julia</a>";

    document.getElementById('filenameForm').style.visibility = "hidden";
} // handleFormSubmit

/*------------------------------------------------------------------------------------------------*/

function handleResetButton() {
    resetZoomM();
    resetZoomJ();
} // handleResetButton

/*------------------------------------------------------------------------------------------------*/

function handleColorButton() {
    COLOR_SELECTOR += 1;
    if (COLOR_SELECTOR > 9) {
        COLOR_SELECTOR = 0;
    }
    setColorMessage();
    drawMandelbrotSet();
    drawJuliaSet();
} // handleLightenButton

/*------------------------------------------------------------------------------------------------*/

function handleSaveButton() {
    document.getElementById('filenameForm').style.visibility = "visible";
    document.getElementById('filename').focus();
} // handleSaveButton

/*------------------------------------------------------------------------------------------------*/

function handleSizeButton() {
    SIZE_SELECTOR += 1;
    if (SIZE_SELECTOR > 4) {
        SIZE_SELECTOR = 0;
    }
    toggleCanvasSize();
    loadSizes();
} // handleSizeButton

/*------------------------------------------------------------------------------------------------*/

function handleIterationButton() {
    ITERATION_SELECTOR += 1;
    if (ITERATION_SELECTOR > 7) {
        ITERATION_SELECTOR = 0;
    }
    toggleIterations();
    drawMandelbrotSet();
    drawJuliaSet();
} // handleIterationButton

/*------------------------------------------------------------------------------------------------*/

function handleFormSubmit(evt) {
    evt.preventDefault(); // Do not refresh the page when submit is clicked
    var filename = evt.target[0].value;
    if (filename === "") {
        filename = "Fractal.png";
    }
    saveImage(filename);

} // handleFormSubmit

/*------------------------------------------------------------------------------------------------*/

/**
 * Display the currently used seed for the displayed julia set
 */
function setJuliaPointMessage(){
    document.getElementById("pointMessage").innerHTML = "Seed: (" + globals.j_re + ", " + globals.j_im + "i)";   
} // setJuliaPointMessage

/*------------------------------------------------------------------------------------------------*/

/**
 * Change the maximum number of iterations to perform
 */
function toggleIterations(){
    switch (ITERATION_SELECTOR){
        case 0:
            MAX_ITERATIONS = 5;
            break;
        case 1:
            MAX_ITERATIONS = 10;
            break;
        case 2:
            MAX_ITERATIONS = 25;
            break;
        case 3:
            MAX_ITERATIONS = 100;
            break;
        case 4:
            MAX_ITERATIONS = 500;
            break;
        case 5:
            MAX_ITERATIONS = 1000;
            break;
        case 6:
            MAX_ITERATIONS = 2000;
            break;            
        case 7:
            MAX_ITERATIONS = 3000;
            break;
        default:
            MAX_ITERATIONS = 500;
    } // switch    
    setIterationMessage();
} // toggleIterations

/*------------------------------------------------------------------------------------------------*/

/**
 * Display the maximum number of iterations to perform
 */
function setIterationMessage(){
    var iterationName = "Uknown Iterations";
    switch (ITERATION_SELECTOR){
        case 0:
            iterationName = "5";
            break;
        case 1:
            iterationName = "10";
            break;
        case 2:
            iterationName = "25";
            break;
        case 3:
            iterationName = "100";
            break;
        case 4:
            iterationName = "500";
            break;
        case 5:
            iterationName = "1000";
            break;
        case 6:
            iterationName = "2000";
            break;            
        case 7:
            iterationName = "3000";
            break;
        default:
            iterationName = "Uknown iterations";
    } // switch    
    document.getElementById("iterationMessage").innerHTML = iterationName + " iterations";
} // setIterationMessage

/*------------------------------------------------------------------------------------------------*/

/**
 * Toggle the sizes of the canvases.
 */
function toggleCanvasSize(){
    switch (SIZE_SELECTOR){
        case 0: //tiny
            CANVAS_WIDTH = 320;
            CANVAS_HEIGHT = 180;
            break;
        case 1: //small
            CANVAS_WIDTH = 640;
            CANVAS_HEIGHT = 360;            
            break;
        case 2: //medium
            CANVAS_WIDTH = 960;
            CANVAS_HEIGHT = 540;            
            break;
        case 3: //large
            CANVAS_WIDTH = 1280;
            CANVAS_HEIGHT = 720;            
            break;
        case 4: //huge
            CANVAS_WIDTH = 1920;
            CANVAS_HEIGHT = 1080;            
            break;
        default: //medium
            CANVAS_WIDTH = 960;
            CANVAS_HEIGHT = 540;            
    } // switch
    setSizeMessage();
}// toggleCanvasSize

/*------------------------------------------------------------------------------------------------*/

/**
 * Display the name of the currently selected size
 */
function setSizeMessage(){
    var sizeName = "Uknown Size";
    switch (SIZE_SELECTOR){
        case 0: //tiny
            sizeName = "320 x 180";
            break;
        case 1: //small
            sizeName = "640 x 360";
            break;
        case 2: //medium
            sizeName = "960 x 540";
            break;
        case 3: //large
            sizeName = "1280 x 720";
            break;
        case 4: //huge
            sizeName = "1920 x 1080";
            break;
        default: //medium
            sizeName = "960 x 540";
    } // switch    
    document.getElementById("sizeMessage").innerHTML = sizeName;
} // setSizeMessage

/*------------------------------------------------------------------------------------------------*/

/**
 * Displays the name of the currently selected color scheme on the page.
 */
function setColorMessage(){
    var colorMessage = document.getElementById("colorMessage");
    var colorName = "N/A";
    
    switch (COLOR_SELECTOR){
        case 0:
            colorName = "Crazy Blue";
            break;
        case 1:
            colorName = "Spectrum Cycle";
            break;
        case 2:
            colorName = "Burning Green";
            break;
        case 3:
            colorName = "Red";
            break;
        case 4:
            colorName = "Green";
            break;
        case 5:
            colorName = "Blue";
            break;
        case 6:
            colorName = "Purple";
            break;
        case 7:
            colorName = "Yellow";
            break;
        case 8:
            colorName = "Cyan";
            break;
        case 9:
            colorName = "White";
            break;
        default:
            colorName = "Uknown Color";
    }
    
    colorMessage.innerHTML = colorName;
    
} // setColorMessage

/*------------------------------------------------------------------------------------------------*/

/**
 * Returns a color for a given number of iterations according to the currently selected
 * color scheme.
 */
function setColor(iterations) {
    switch (COLOR_SELECTOR){
        case 0:
            return juliaColors(iterations);
        case 1:
            return spectrumCycle(iterations);
        case 2:
            return burningColors(iterations);
        case 3:
            return singleHueStraightR(iterations);
        case 4:
            return singleHueStraightG(iterations);
        case 5:
            return singleHueStraightB(iterations);
        case 6:
            return singleHueStraightP(iterations);
        case 7:
            return singleHueStraightY(iterations);
        case 8:
            return singleHueStraightC(iterations);
        case 9:
            return singleHueStraightW(iterations);
        default:
            return spectrumCycle(iterations);
    } // switch    
} // setColor

/*------------------------------------------------------------------------------------------------*/

function juliaColors(iterations) {
    if (iterations < 0) {
        return MANDELBROT_SET_COLOR;
    }
    var color = iterations % 5;
    var r = 0;
    var g = 0;
    var b = (color + 1) * 50;
    return [r, g, b, 255];
}

/*------------------------------------------------------------------------------------------------*/

function burningColors(iterations) {
    if (iterations < 0) {
        return MANDELBROT_SET_COLOR;
    }
    var color = iterations % 255;
    var r = (color - 200) * 3;
    var g = color;
    var b = 100 - color ^ 2;
 
    return [r, g, b, 255];
}

/*------------------------------------------------------------------------------------------------*/

function burningColorsPurpleToGreen(iterations) {

    var color = iterations % 255;
    var r = 50 - iterations / 25;
    var g = iterations;
    var b = 50 - iterations / 25;
    return [r, g, b, 255];
}

/*------------------------------------------------------------------------------------------------*/

function singleHueStraightR(iterations) {
    var color = iterations % 255;
    return [color, 0, 0, 255];
}

/*------------------------------------------------------------------------------------------------*/

function singleHueStraightG(iterations) {
    var color = iterations % 255;
    return [0, color, 0, 255];
}

/*------------------------------------------------------------------------------------------------*/

function singleHueStraightB(iterations) {
    var color = iterations % 255;
    return [0, 0, color, 255];
}

/*------------------------------------------------------------------------------------------------*/

function singleHueStraightY(iterations) {
    var color = iterations % 255;
    return [color, color, 0, 255];
}

/*------------------------------------------------------------------------------------------------*/

function singleHueStraightC(iterations) {
    var color = iterations % 255;
    return [0, color, color, 255];
}

/*------------------------------------------------------------------------------------------------*/

function singleHueStraightP(iterations) {
    var color = iterations % 255;
    return [color, 0, color, 255];
}

/*------------------------------------------------------------------------------------------------*/

function singleHueStraightW(iterations) {
    var color = iterations % 255;
    return [color, color, color, 255];
}

/*------------------------------------------------------------------------------------------------*/

function spectrumCycle(iterations) {
    if (iterations < 0) {
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

/*------------------------------------------------------------------------------------------------*/