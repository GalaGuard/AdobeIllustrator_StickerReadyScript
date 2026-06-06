// MAIN
var STROKE_WEIGHT = 1;
var THRESHOLD = 240;
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
    var pairs = [];
    var contourPath = null;
    var XMLOffsetString = '<LiveEffect name="Adobe Offset Path">' + '<Dict data="R mlim 4 R ofst 3.6 I jntp 1 "/>' + '</LiveEffect>';
    var cutContour = findOrCreateCutContour(doc);
    if (doc.selection.length < 1) {
        alert("Select at least 1 item");
        return;
    }

    var liveSel = doc.selection;
    var sources = [];
    for (var i = 0; i < liveSel.length; i++) {
        sources.push(liveSel[i]);
    }
    
    //Embed
    for (var i = 0; i < sources.length; i++) {
        var item = sources[i];
        if (item.typename !== "PlacedItem") {
            alert("Selected items must be PlacedItem, instead are " + item.typename);
            return;
        }
        doc.selection = [item];
        item.embed();
        pairs.push({ trace: doc.selection[0], copy: null });
        if (scalePercent !== 100) {
            pairs[i].trace.resize(scalePercent, scalePercent, undefined, undefined, undefined, undefined, undefined, Transformation.CENTER); //so many undefines...
        }
    }
    for (var i = 0; i < pairs.length; i++) {
        pairs[i].copy = pairs[i].trace.duplicate();
    }

    //Trace and Unite
    for (var i = 0; i < pairs.length; i++) {
        var item = pairs[i].trace;
        var traceObj = item.trace().tracing //grabbing the trace object
        var traceOpt = traceObj.tracingOptions;
        traceOpt.threshold = THRESHOLD
        traceOpt.tracingMode = TracingModeType.TRACINGMODEBLACKANDWHITE;
        traceOpt.ignoreWhite = true;
        traceOpt.tracingMethod = TracingMethodType.TRACINGMETHODABUTTING;
        app.redraw();
        pairs[i].trace = traceObj.expandTracing();

        //These four lines I still have kinda no idea why this works in creating the silhouette I need
        selectAndRunMenuCommand(doc, [pairs[i].trace], "noCompoundPath");
        var released = doc.selection[0];
        selectAndRunMenuCommand(doc, [released], "Live Pathfinder Merge");
        var merge = doc.selection[0];
        selectAndRunMenuCommand(doc, [merge], "Live Pathfinder Trim");
        var trim = doc.selection[0];
        selectAndRunMenuCommand(doc, [trim], "Live Pathfinder Add");
        pairs[i].trace = doc.selection[0];
    }

    
    //Add swatch and stroke and offset
    for (var i = 0; i < pairs.length; i++) {
        var units = [];
        var src = pairs[i].trace.pageItems;
        for (var s = 0; s < src.length; s++) {
            units.push(src[s]);
        }

        for (var j = 0; j < units.length; j++) {
            var path = units[j];
            applyCutContourStroke(path, cutContour, STROKE_WEIGHT);
            path.applyEffect(XMLOffsetString);
            doc.selection = [path];
        }
        app.executeMenuCommand("expandStyle");
    }
    
    //Create clipping mask
    for (var i = 0; i < pairs.length; i++) {
        var contour = pairs[i].trace.pageItems[0];
        var image = pairs[i].copy;
        contour.move(image.parent, ElementPlacement.PLACEATBEGINNING);
        doc.selection = [contour, image];

        app.executeMenuCommand("makeMask");
        var mask = doc.selection[0].pageItems[0];
        if (mask.typename == "CompoundPathItem") {
            mask = mask.pathItems[0];
        }
        applyCutContourStroke(mask, cutContour, STROKE_WEIGHT);
    }
    app.executeMenuCommand("expandStyle");
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