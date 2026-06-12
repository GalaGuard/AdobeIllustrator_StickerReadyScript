// MAIN
var STROKE_WEIGHT = 1;
var THRESHOLD = 240;
var SCALE_SIZE = 100;

var val = showStickerDialog();
if (val != null) {
    stickerPrep(val['thresholdNum'], val['offsetNum'], val['scaleNum']);
}

/** Creates and presents UI to input options like threshold, offset, and scale for stickerPrep()
 * 
 * @returns {Number} Inputted threshold
 * @returns {Number} Inputted offset
 * @returns {Number} Inputted scale
 */
function showStickerDialog() {
    var dlg = new Window("dialog", "Sticker Prep Inputs");
    dlg.orientation = "column";

    var threshold = dlg.add("group");
    threshold.add("statictext", undefined, "Threshold (0-255):");
    var thresholdSlider = threshold.add("slider", undefined, 230, 0, 255); 
    var thresholdValue  = threshold.add("statictext", undefined, "230");
    thresholdSlider.onChanging = function() {
        thresholdValue.text = thresholdSlider.value.toFixed(2);
    };
    
    var offset = dlg.add("group");
    offset.add("statictext", undefined, "Offset (0-0.5):");
    var offsetSlider = offset.add("slider", undefined, 0.05, 0, 0.5);
    var offsetValue  = offset.add("statictext", undefined, "0.05");
    offsetSlider.onChanging = function() {
        offsetValue.text = offsetSlider.value.toFixed(2) + " in";
    };

    var scale = dlg.add("group");
    scale.add("statictext", undefined, "Scale (inches):");
    var scaleInput = scale.add("edittext", undefined, "3");
    scaleInput.characters = 6; 
    scale.add("statictext", undefined, "in");
    
    var btns = dlg.add("group");
    btns.add("button", undefined, "Cancel", {name: "cancel"});
    var run = btns.add("button", undefined, "Run",    {name: "ok"});
    run.onClick = function() {
        var t = parseInt(scaleInput.text, 10);
        if (isNaN(t) || t < 0) {
            alert("Scale cannot be negative");
            return;
        }
        dlg.close(1);
    }
    if (dlg.show() === 1) {
        return {
            thresholdNum: parseInt(thresholdValue.text, 10),
            offsetNum: parseFloat(offsetValue.text),
            scaleNum: parseInt(scaleInput.text, 10),
        };
    } else {
        return null;
    }
}

/**Prepares a sticker to be print and cut ready for a Roland BN20A Printer Cutter 
 * 
 * @param {Number} threshold Threshold value for image trace
 * @param {Number} offsetInches Offset value for offsetting cut contour
 * @param {Number} scalePercent How much the given image(s) will be scaled
 */
function stickerPrep(threshold, offsetInches, scaleInches) {
    if (app.documents.length == 0 && app.activeDocument.pathItems.length > 0) {
        alert("Open a document first");
        return;
    }
    
    var doc = app.activeDocument;
    var pairs = [];
    var contourPath = null;
    var XMLOffsetString = '<LiveEffect name="Adobe Offset Path">' + '<Dict data="R mlim 4 R ofst ' + (offsetInches * 72) + ' I jntp 1 "/>' + '</LiveEffect>';
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
        
        var b = pairs[i].trace.geometricBounds;
        var widthPts  = Math.abs(b[2] - b[0]);
        var heightPts = Math.abs(b[1] - b[3]);
        var targetPts = scaleInches * 72;
        var scaleX = (targetPts / widthPts)  * 100;
        var scaleY = (targetPts / heightPts) * 100;
        pairs[i].trace.resize(scaleX, scaleY, undefined, undefined, undefined, undefined, undefined, Transformation.CENTER); //so many undefines...
    }
    for (var i = 0; i < pairs.length; i++) {
        pairs[i].copy = pairs[i].trace.duplicate();
    }

    //Trace and Unite
    for (var i = 0; i < pairs.length; i++) {
        var item = pairs[i].trace;
        var traceObj = item.trace().tracing //grabbing the trace object
        var traceOpt = traceObj.tracingOptions;
        traceOpt.threshold = threshold;
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
        var contour = largestItem(pairs[i].trace.pageItems);
        if (contour == null) {
            continue;
        }
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

/**Gets the path with the largest bound for each specific trace object in pairs
 * 
 * @param {PathItems} list The list of PathItems for the given trace object in pairs
 * @returns {PathItem} The path with the largest gemotric bounds
 */
function largestItem(list) {
    var biggest = null;
    var biggestArea = 0;
    for (var k = 0; k < list.length; k++) {
        var b = list[k].geometricBounds;
        var area = Math.abs(b[2] - b[0]) * Math.abs(b[1] - b[3]);
        if (area > biggestArea) {
            biggestArea = area;
            biggest = list[k];
        }
    }
    return biggest;
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