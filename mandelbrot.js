
//Real and Imaginary bounds to our coordinate system
var RE_MAX = 1.1;
var RE_MIN = -2.5;
var IM_MAX = 1.2;
var IM_MIN = -1.2;
var MANDELBROT_SET_COLOR = [0, 0, 0, 255];
var CANVAS_WIDTH_HEIGHT_RATIO = 16.0/9.0;

var MAX_ITERATIONS = 900; //Number of iterations. Higher is slower but more detailed.
var STATIC_ZOOM_BOX_FACTOR = 0.25; //Amount of zoom from double clicks. Increase to increase zoom
var DEFAULT_MESSAGE = "Click or click and drag to zoom";

var globals = {}; //Stores global variables

window.addEventListener('load', initialLoad, false);

/**************************************************************************************************/

/**
 * Formats an integer to have commas in expected places
 */
Number.prototype.format = function(){
    var numberString = Math.round(this).toString();
    var precompiledRegularExpression = /(\d+)(\d{3})/;

    while (precompiledRegularExpression.test(numberString) ){
        numberString = numberString.replace(precompiledRegularExpression, '$1' + ',' + '$2');
    } // while

    return numberString;
} // Number.prototype.format

/*------------------------------------------------------------------------------------------------*/

function initialLoad() {
    var canvas = document.getElementsByTagName('canvas')[0];
    canvas.addEventListener('mousedown', handlePointer, false);
    canvas.addEventListener('mousemove', handlePointer, false);
    canvas.addEventListener('mouseup', handlePointer, false);

    document.getElementById('resetButton').addEventListener('click', handleResetButton, false);
    document.getElementById('lightenButton').addEventListener('click', handleLightenButton, false);
    document.getElementById('saveButton').addEventListener('click', handleSaveButton, false);
    document.getElementById('filenameForm').addEventListener('submit', handleFormSubmit, false);
    document.getElementById('changeParametersButton').addEventListener('click', handleChangeParameters, false);

    loadSizes()
} // initialLoad

/*------------------------------------------------------------------------------------------------*/

function loadSizes(){
    var canvas = document.getElementsByTagName('canvas')[0];
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    var ctx = canvas.getContext('2d');

    //Set the table width equal to the canvas width
    document.getElementsByTagName('table')[0].width = canvasWidth;
    document.getElementById('messageBox').innerHTML = DEFAULT_MESSAGE;

     globals.canvas = canvas;
    globals.canvas.context = ctx;
    //create an empty canvas image object the same size as the canvas
    globals.canvas.context.imageDataObject = ctx.createImageData(canvasWidth, canvasHeight);

    //Maintain the original width/height ratio
    globals.staticZoomBoxWidth = STATIC_ZOOM_BOX_FACTOR * canvasWidth;
    globals.staticZoomBoxHeight = STATIC_ZOOM_BOX_FACTOR * canvasHeight;

    globals.pointer = {};
    globals.pointer.down = false;

    //color and opacity of the zoom box
    canvas.getContext('2d').fillStyle = "rgba(255, 0, 0, 0.3)";

    resetZoom();
} // loadSizes

/*------------------------------------------------------------------------------------------------*/

function adjusted_RE_MAX(){
    var ReMax = globals.canvas.width * ( (IM_MAX - IM_MIN) / globals.canvas.height ) + RE_MIN;

    if (RE_MAX != ReMax){
        console.warn("RE_MAX has been adjusted to " + ReMax); //This should not occur
    } // if
    return ReMax;
} // adjusted_RE_MAX

/*------------------------------------------------------------------------------------------------*/

function drawMandelbrot() {
    var startTime = new Date(); // Keep track of how long this render takes
    var canvas = globals.canvas;
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    var ctx = canvas.context;
    var imageDataObjectData = ctx.imageDataObject.data; // Reference

    //Set extrema needs to have been called first
    var ReMax = globals.ReMax;
    var ReMin = globals.ReMin;
    var ImMax = globals.ImMax;
    var ImMin = globals.ImMin;

    //Calculate outside the loop for opimixation
    var x_coefficient = (ReMax - ReMin) / canvasWidth;
    var y_coefficient = (ImMin - ImMax) / canvasHeight;

    var iterationSum = 0;
    var currentPixel = 0;

    for (var y=0; y< canvasHeight; y++){
        var c_Im = (y * y_coefficient) + ImMax; // c = c_Re + cIm * i

        for (var x=0; x<canvasWidth; x++){
            var c_Re = (x * x_coefficient) + ReMin; //convert the canvas x to the coordinate x

            var z_Re = 0; //z0
            var z_Im = 0;

            var c_belongsToMandelbrotSet = true;
            var iterationsForColor = 0;
            for (var iterationCount = 1; iterationCount <= MAX_ITERATIONS; iterationCount++) {
                iterationSum++;

                //Calculate here for optimization
                var z_Re_squared = z_Re * z_Re;
                var z_Im_squared = z_Im * z_Im;

                //checks if magnitude of z is greater than 2 and thus diverges to infinity
                if (z_Re_squared + z_Im_squared > 4) {
                    c_belongsToMandelbrotSet = false; // c is not a part of the Mandelbrot Set
                    iterationsForColor = iterationCount;
                    break;
                } // if

                //the next Z value
                z_Im = (2 * z_Re * z_Im) + c_Im;
                z_Re = z_Re_squared - z_Im_squared + c_Re;

            } // for
            var colorArray = [];
            if (c_belongsToMandelbrotSet){
                colorArray = MANDELBROT_SET_COLOR;
            } else {
                colorArray = setColor(iterationsForColor);
            } // if-else
            imageDataObjectData[currentPixel++] = colorArray[0];    //RED
            imageDataObjectData[currentPixel++] = colorArray[1];    //GREEN
            imageDataObjectData[currentPixel++] = colorArray[2];    //BLUE
            imageDataObjectData[currentPixel++] = colorArray[3];  //ALPHA

        } // for
    } // for

    //Place the image on the canvas
    ctx.putImageData(ctx.imageDataObject, 0, 0);

    var elapsedMilliseconds = (new Date()) - startTime;
    // Show elapsed time
    document.getElementById('elapsedTime').innerHTML = iterationSum.format() + 
            " iterations in " + (elapsedMilliseconds / 1000).toFixed(2) + " seconds";
    //Remove "calculating" message
    document.getElementById('messageBox').innerHTML = DEFAULT_MESSAGE;
} // drawMandelbrotSet

/*------------------------------------------------------------------------------------------------*/

/**
 * Converts a canvas x value to complex plane real value
 */
function xToRe(x){
    var x_coefficient = (globals.ReMax - globals.ReMin) / globals.canvas.width;
    return (x * x_coefficient) + globals.ReMin;
} // xToRe

/*------------------------------------------------------------------------------------------------*/

/**
 * Converts a canvas y value to complex plane imaginary value
 */
function yToIm(y){
    var y_coefficient = (globals.ImMin - globals.ImMax) / globals.canvas.height;
    return (y * y_coefficient) + globals.ImMax;
} // yToIm

/*------------------------------------------------------------------------------------------------*/

function handlePointer(evt){
    //var canvasWidthHeightRatio = globals.canvas.width / globals.canvas.height;
    var canvasWidthHeightRatio = CANVAS_WIDTH_HEIGHT_RATIO;
    var ctx = globals.canvas.context;

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
            break;
        case 'mousemove':
            if (globals.pointer.down) {
                zoomBoxHeight = Math.abs(canvasY - globals.pointer.y1);
                //Keep zoom box dimensions properly proportioned
                zoomBoxWidth = zoomBoxHeight * canvasWidthHeightRatio;
                // Ensures that the initial Mandelbrot Set has already been rendered
                ctx.putImageData(globals.canvas.context.imageDataObject, 0, 0);
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

            if (zoomBoxHeight == 0){                            
                //No box was drawn, so perform fixed zoom
                var staticZoomBoxWidth = globals.staticZoomBoxWidth;
                var staticZoomBoxHeight = globals.staticZoomBoxHeight;
                var halfStaticZoomBoxWidth = staticZoomBoxWidth / 2;
                var halfStaticZoomBoxHeight = staticZoomBoxHeight /2;

                ctx.fillRect(canvasX - halfStaticZoomBoxWidth, canvasY - halfStaticZoomBoxHeight, 
                    staticZoomBoxWidth, staticZoomBoxHeight);

                // center the zoom box
                ReMin = xToRe(canvasX - halfStaticZoomBoxWidth);
                ImMax = yToIm(canvasY - halfStaticZoomBoxHeight);

                ReMax = xToRe(canvasX + halfStaticZoomBoxWidth);
                ImMin = yToIm(canvasY + halfStaticZoomBoxHeight);
            } else { 
                //A (possibly tiny) box was drawn, so perform zoom to that box
                ReMin = xToRe(globals.pointer.x1);
                ImMax = yToIm(globals.pointer.y1);

                ReMax = xToRe(zoomBoxWidth + globals.pointer.x1);
                ImMin = yToIm(zoomBoxHeight + globals.pointer.y1);
            } // if-else

            document.getElementById('messageBox').innerHTML = "Calculating...";
            // Clear previous data
            document.getElementById('elapsedTime').innerHTML = "";

            setExtrema(ReMax, ReMin, ImMax, ImMin);
            // Allows "calculating" to be displayed
            if (window.setImmediate){
                window.setImmediate(drawMandelbrot);
            } else {
                window.setTimeout(drawMandelbrot, 0);
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

function resetZoom(){                
    var reMax = adjusted_RE_MAX();

    setExtrema(reMax, RE_MIN, IM_MAX, IM_MIN);
    drawMandelbrot();
} // resetZoom

/*------------------------------------------------------------------------------------------------*/

function setCanvasSize(width){
    globals.canvas.width = width;
    var height = width / CANVAS_WIDTH_HEIGHT_RATIO;
    globals.canvas.height = height;

    loadSizes();
} // changeCanvasSize

/*------------------------------------------------------------------------------------------------*/

function saveImage(filename){

//                document.getElementById('messageBox').innerHTML = "<strong style='color:red';>CANNOT SAVE FILE</strong>";
      var dataURL = globals.canvas.toDataURL("image/png")
      document.getElementById('messageBox').innerHTML = "<a download=" + filename + " href="+ dataURL + " value='download'>Click here to download!</a>";                  

    document.getElementById('filenameForm').style.visibility = "hidden";
} // handleFormSubmit

/*------------------------------------------------------------------------------------------------*/

function handleResetButton(){
    resetZoom();
} // handleResetButton

/*------------------------------------------------------------------------------------------------*/

function handleLightenButton(){
    alert("handleLightenButton fired");
} // handleLightenButton

/*------------------------------------------------------------------------------------------------*/

function handleSaveButton(){
    document.getElementById('filenameForm').style.visibility = "visible";
    document.getElementById('filename').focus();
} // handleSaveButton

/*------------------------------------------------------------------------------------------------*/

function handleFormSubmit(evt){
    evt.preventDefault(); // Do not refresh the page when submit is clicked
    console.log("handleFormSubmit fired");
    var filename = evt.target[0].value;
    if (filename == ""){
        filename = "Mandelbrot.png";
    }
    saveImage(filename);

} // handleFormSubmit

/*------------------------------------------------------------------------------------------------*/

function handleChangeParameters(){
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

function setColor(iterations){                
    //return [255, 255, 255, 255];
//                for (var divisions = 10; divisions > 0; divisions--){
//                    if (iterations < (MAX_ITERATIONS / divisions)){
//                        return [0, 0, 20*divisions, 255];
//                    }
//                }

    var color = iterations % 255;
    //var color = Math.round(color / 10);
    //return [25, color*10, color*10, 255];
    return [25, color, color, 255];
    return [0, 0, iterations % 255, 255];

    return [0, 255, 0, 255];

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
