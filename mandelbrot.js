
//Real and Imaginary bounds to our coordinate system
//var RE_MAX = 1.1;
//var RE_MIN = -2.5;
//var IM_MAX = 1.2;
//var IM_MIN = -1.2;
var RE_MAX = 2.0;
var RE_MIN = -2.0;
var IM_MAX = 2.0;
var IM_MIN = -2.0;
var MANDELBROT_SET_COLOR = [0, 0, 0, 255];
var ZOOM_BOX_COLOR = "rgba(255, 255, 255, 0.3)";
var CANVAS_WIDTH_HEIGHT_RATIO = 16.0 / 9.0;
var FRACTAL_SELECTOR = 0;
var COLOR_SELECTOR = 1;

var MAX_ITERATIONS = 2000; //Number of iterations. Higher is slower but more detailed.
var STATIC_ZOOM_BOX_FACTOR = 0.25; //Amount of zoom from double clicks. Increase to increase zoom
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
    var canvas = document.getElementsByTagName('canvas')[0];
    canvas.addEventListener('mousedown', handlePointer, false);
    canvas.addEventListener('mousemove', handlePointer, false);
    canvas.addEventListener('mouseup', handlePointer, false);

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
    canvas.getContext('2d').fillStyle = ZOOM_BOX_COLOR;

    resetZoom();
} // loadSizes

/*------------------------------------------------------------------------------------------------*/

/**
 * Adjusts ReMax such that the image will not be distorted (will have the same scale as the
 * imaginary axis.
 */
function adjusted_RE_MAX() {
    var ReMax = globals.canvas.width * ((IM_MAX - IM_MIN) / globals.canvas.height) + RE_MIN;

    if (RE_MAX != ReMax) {
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

    //Calculate outside the loop for optimization
    var x_coordinate_to_pixel = (ReMax - ReMin) / canvasWidth;
    var y_coordinate_to_pixel = (ImMin - ImMax) / canvasHeight;

    //counts the total iterations made
    var iterationSum = 0;
    //the current pixel of the image
    var currentPixel = 0;

    //for (var y=0; y< canvasHeight; y++){
    for (var y = 0; y < canvasHeight; y++) {
        var c_Im = (y * y_coordinate_to_pixel) + ImMax; // c = c_Re + cIm * i

        for (var x = 0; x < canvasWidth; x++) {
            var c_Re = (x * x_coordinate_to_pixel) + ReMin; //convert the canvas x to the coordinate x

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
            if (c_belongsToMandelbrotSet) {
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

function drawBurningShip() {

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

    //for (var y=canvasHeight; y> 0; y--){
    for (var y = 0; y < canvasHeight; y++) {
        var c_Im = (y * y_coefficient) + ImMax; // c = c_Re + cIm * i

        for (var x = 0; x < canvasWidth; x++) {
            var c_Re = (x * x_coefficient) + ReMin; //convert the canvas x to the coordinate x

            var z_Re = 0; //z0
            var z_Im = 0;

            var c_belongsToBurningShip = true;
            var iterationsForColor = 0;
            for (var iterationCount = 1; iterationCount <= MAX_ITERATIONS; iterationCount++) {
                iterationSum++;

                //---------
//                var z_r2 = z_re * z_re;
//                var z_i2 = z_Im * z_Im;
//                
//                if (z_r2 + z_i2 > 4){
//                    c_belongsToBurningShip = false;
//                    if (iterationCount <= MAX_ITERATIONS * )
//                }

                //---------
                //Calculate here for optimization
                var z_Re_squared = z_Re * z_Re;
                var z_Im_squared = z_Im * z_Im;

                //checks if magnitude of z is greater than 2 and thus diverges to infinity
                if (z_Re_squared + z_Im_squared > 4) {
                    c_belongsToBurningShip = false; // c is not a part of the Burning Ship Set
                    iterationsForColor = iterationCount;
                    break;
                } // if

//                var z_Re_abs = Math.abs(z_Re);
                var z_Re_abs = z_Re;
                var z_Im_abs = z_Im;
                if (z_Re_abs < 0) {
                    z_Re_abs = -z_Re_abs;
                }
                if (z_Im_abs < 0) {
                    z_Im_abs = -z_Im_abs;
                }
//                var z_Im_abs = Math.abs(z_Im);

                var z_Re_abs_squared = z_Re_abs * z_Re_abs;
                var z_Im_abs_squared = z_Im_abs * z_Im_abs;

                //the next Z value
                //z_Im = (2 * z_Re * z_Im) + c_Im;
                //z_Re = z_Re_squared - z_Im_squared + c_Re;
                z_Re = z_Re_abs_squared - z_Im_abs_squared + c_Re;
                z_Im = (2 * z_Re_abs * z_Im_abs) + c_Im;

            } // for
            var colorArray = [];
            if (c_belongsToBurningShip) {
                colorArray = MANDELBROT_SET_COLOR;
            } else {
                colorArray = setColor(iterationsForColor);
            } // if-else
            imageDataObjectData[currentPixel++] = colorArray[0];    //RED
            imageDataObjectData[currentPixel++] = colorArray[1];    //GREEN
            imageDataObjectData[currentPixel++] = colorArray[2];    //BLUE
            imageDataObjectData[currentPixel++] = colorArray[3];    //ALPHA

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
} // drawBurningShip

/*------------------------------------------------------------------------------------------------*/

function drawJulia() {

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

    //Calculate outside the loop for opimization
    var x_coefficient = (ReMax - ReMin) / canvasWidth;
    var y_coefficient = (ImMin - ImMax) / canvasHeight;

    var iterationSum = 0;
    var currentPixel = 0;

//    var c_Re = -.74173;
//    var c_Im = .15518;

//    var c_Re = -.62772;
//    var c_Im = .42193;

    var c_Re = -1;
    var c_Im = 0;

    var boundaryValue = 4;
    //boundaryValue *= boundaryValue;

    //for (var y=canvasHeight; y> 0; y--){
    for (var y = 0; y < canvasHeight; y++) {
        var z_Im = (y * y_coefficient) + ImMax; // c = c_Re + cIm * i

        for (var x = 0; x < canvasWidth; x++) {
            var z_Re = (x * x_coefficient) + ReMin; //convert the canvas x to the coordinate x

            var belongsToJulia = true;
            var iterationsForColor = 0;
            for (var iterationCount = 1; iterationCount <= MAX_ITERATIONS; iterationCount++) {
                iterationSum++;

                var z_Re_squared = z_Re * z_Re;
                var z_Im_squared = z_Im * z_Im;

                //checks if magnitude of z is greater than 2 and thus diverges to infinity
                if ((z_Re > boundaryValue) || (z_Im > boundaryValue)) {
                    belongsToJulia = false; // c is not a part of the set
                    iterationsForColor = iterationCount;
                    break;
                } // if

                z_Re = z_Re_squared - z_Im_squared + c_Re;
                z_Im = (2 * z_Re * z_Im) + c_Im;

            } // for
            var colorArray = [];
            if (belongsToJulia) {
                colorArray = MANDELBROT_SET_COLOR;
            } else {
                colorArray = setColor(iterationsForColor);
            } // if-else
            imageDataObjectData[currentPixel++] = colorArray[0];    //RED
            imageDataObjectData[currentPixel++] = colorArray[1];    //GREEN
            imageDataObjectData[currentPixel++] = colorArray[2];    //BLUE
            imageDataObjectData[currentPixel++] = colorArray[3];    //ALPHA

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
} // drawBurningShip

/*------------------------------------------------------------------------------------------------*/


/**
 * Converts a canvas x value to complex plane real value
 */
function xToRe(x) {
    var x_coefficient = (globals.ReMax - globals.ReMin) / globals.canvas.width;
    return (x * x_coefficient) + globals.ReMin;
} // xToRe

/*------------------------------------------------------------------------------------------------*/

/**
 * Converts a canvas y value to complex plane imaginary value
 */
function yToIm(y) {
    var y_coefficient = (globals.ImMin - globals.ImMax) / globals.canvas.height;
    return (y * y_coefficient) + globals.ImMax;
} // yToIm

/*------------------------------------------------------------------------------------------------*/

function handlePointer(evt) {
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

            if (zoomBoxHeight == 0) {
                //No box was drawn, so perform fixed zoom
                var staticZoomBoxWidth = globals.staticZoomBoxWidth;
                var staticZoomBoxHeight = globals.staticZoomBoxHeight;
                var halfStaticZoomBoxWidth = staticZoomBoxWidth / 2;
                var halfStaticZoomBoxHeight = staticZoomBoxHeight / 2;

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
            if (window.setImmediate) {
                if (FRACTAL_SELECTOR == 0) {
                    window.setImmediate(drawMandelbrot);
                } else if (FRACTAL_SELECTOR == 1) {
                    window.setImmediate(drawBurningShip);
                } else if (FRACTAL_SELECTOR == 2) {
                    window.setImmediate(drawJulia);
                }
            } else {
                if (FRACTAL_SELECTOR == 0) {
                    window.setTimeout(drawMandelbrot, 0);
                } else if (FRACTAL_SELECTOR == 1) {
                    window.setTimeout(drawBurningShip, 0);
                } else if (FRACTAL_SELECTOR == 2) {
                    window.setTimeout(drawJulia, 0);
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
    if (FRACTAL_SELECTOR == 0) {
        drawMandelbrot();
    } else if (FRACTAL_SELECTOR == 1) {
        drawBurningShip();
    } else if (FRACTAL_SELECTOR == 2) {
        drawJulia();
    }
} // resetZoom

/*------------------------------------------------------------------------------------------------*/

function setCanvasSize(width) {
    globals.canvas.width = width;
    var height = width / CANVAS_WIDTH_HEIGHT_RATIO;
    globals.canvas.height = height;

    loadSizes();
} // changeCanvasSize

/*------------------------------------------------------------------------------------------------*/

function saveImage(filename) {

//document.getElementById('messageBox').innerHTML = "<strong style='color:red';>CANNOT SAVE FILE</strong>";
    var dataURL = globals.canvas.toDataURL("image/png")
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
    console.log("handleFormSubmit fired");
    var filename = evt.target[0].value;
    if (filename == "") {
        if (FRACTAL_SELECTOR == 0) {
            filename = "Mandelbrot.png";
        } else if (FRACTAL_SELECTOR == 1) {
            filename = "BurningShip.png";
        } else if (FRACTAL_SELECTOR == 2) {
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

    if (COLOR_SELECTOR == 0) {
        return juliaColors(iterations);
    } else if (COLOR_SELECTOR == 1) {
        return spectrumCycle(iterations);
    } else if (COLOR_SELECTOR == 2) {
        return burningColors(iterations);
    } else if (COLOR_SELECTOR == 3) {
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