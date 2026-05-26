// MAIN
var STROKE_WEIGHT = 1;
var THRESHOLD = 210;
var SCALE_SIZE = 100;
stickerPrep(STROKE_WEIGHT, THRESHOLD, SCALE_SIZE);




/**Prepares a sticker to be print and cut ready for a Roland BN20A Printer Cutter 
 * 
 * @param {Number} threshold Threshold value for image trace
 * @param {Number} offsetInches Offset value for offsetting cut contour
 * @param {Number} scalePercent How much the given image(s) will be scaled
 */
function stickerPrep(threshold, offsetInches, scalePercent) {
    if (threshold < 0 && threshold > 255) {
        alert("Threshold outside of range [0-255]");
        return; 
    }
    if (offsetInches < 0) {
        alert("Offset outside of range > 0");
        return; 
    }
    if (app.documents.length == 0 && app.activeDocument.pathItems.length > 0) {
        alert("Open a document first");
        return;
    }
    
    var doc = app.activeDocument;
    var sel = doc.selection;
    var rasterAndTrace = [];
    var copy = [];
    var contourPath = null;
    var XMLOffsetString = '<LiveEffect name="Adobe Offset Path">' + '<Dict data="R mlim 4 R ofst 3.6 I jntp 1 "/>' + '</LiveEffect>';
    var cutContour = findOrCreateCutContour(doc);
    if (sel.length < 1) {
        alert("Select at least 1 item");
        return;
    }

    //Embed
    for (var i = 0; i < doc.selection.length; i++) {
        var item = sel[i];
        if (item.typename !== "PlacedItem") {
            alert("Selected items must be PlacedItem, instead are " + item.typename);
            return;
        }
        item.embed();
        rasterAndTrace.push(doc.selection[i]);
        if (scalePercent !== 100) {
            rasterAndTrace[i].resize(scalePercent, scalePercent, undefined, undefined, undefined, undefined, undefined, Transformation.CENTER); //so many undefines...
        }
    }
    for (var k = 0; k < rasterAndTrace.length; k++) {
        copy.push(rasterAndTrace[k].duplicate());
    }

    //Trace
    for (var i = 0; i < sel.length; i++) {
        var item = rasterAndTrace[i];
        var traceObj = item.trace().tracing //grabbing the trace object
        var traceOpt = traceObj.tracingOptions;
        traceOpt.threshold = 230
        traceOpt.tracingMode = TracingModeType.TRACINGMODEBLACKANDWHITE;
        traceOpt.ignoreWhite = true;
        item.tracingMethod = TracingMethodType.TRACINGMETHODABUTTING;
        app.redraw();
        rasterAndTrace[i] = traceObj.expandTracing();
    }

    //Add swatch and stroke and offset
    for (var i = 0; i < rasterAndTrace.length; i++) {
        var path = rasterAndTrace[i].pageItems[0];
        applyCutContourStroke(path, cutContour, STROKE_WEIGHT); 
        path.applyEffect(XMLOffsetString);
        doc.selection = [path]
        app.executeMenuCommand("expandStyle");
    }

    //Create clipping mask
    for (var i = 0; i < rasterAndTrace.length; i++) {
        var contour = rasterAndTrace[i].pageItems[0];
        contour.move(rasterAndTrace[i].parent, ElementPlacement.PLACEATBEGINNING);
        var image = copy[i]
        image.zOrder(ZOrderMethod.SENDTOBACK);
        contour.zOrder(ZOrderMethod.BRINGTOFRONT);
        selectAndRunMenuCommand(doc, [contour, image], "makeMask");
        applyCutContourStroke(contour, cutContour, STROKE_WEIGHT);
    }
}

/** Runs a menu command
 * 
 * @param {Array} items List of items that selection will point to (expandStyle runs only on whats in selection)
 * @param {String} commandStr A string of the command to be run
 */
function selectAndRunMenuCommand(doc, items, commandStr) {
    doc.selection = items;
    app.executeMenuCommand(commandStr);
    app.executeMenuCommand("expandStyle");
}

/** Returns the CutContour CMYK magenta swatch color, creating it if it doesn't exist
 * 
 * @param {Document} doc Active Adobe Illustrator document
 * @return {Spot} The CutContour swatch color
 */
function findOrCreateCutContour(doc) {
    var spot = null;
    for (var i = 0; i < doc.spots.length; i++) {
        if (doc.spots[i].name === "CutContour") {
            spot = doc.spots[i];
            break;
        }
    }
    if (spot === null) {
        spot = doc.spots.add();
        spot.name = "CutContour";
        spot.colorType = ColorModel.SPOT;

        var magentaColor = new CMYKColor();
        magentaColor.magenta = 100;
        spot.color = magentaColor;
    }
    return spot;
}

/** Applies a given path the given spot color and stroke weight
 * 
 * @param {PathItem} path Path for spot color to be applied to 
 * @param {Spot} spot Specific spot color (CutContour swatch)
 * @param {Number} weight The path stroke weight
 */
function applyCutContourStroke(path, spot, weight) {
    var newSpotColor = new SpotColor();
    newSpotColor.spot = spot;
    
    path.stroked = true;
    path.strokeColor = newSpotColor;
    path.strokeWidth = weight;
    path.filled = false;
    path.strokeOverprint = true;
}