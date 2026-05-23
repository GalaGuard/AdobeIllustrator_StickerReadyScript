function colorPath() {
    if (app.documents.length == 0 && app.activeDocument.pathItems.length > 0) {
        alert("Open a document first");
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;
    if (doc.documentColorSpace !== DocumentColorSpace.CMYK) {
        alert("Document not in CMYK mode");
        return;
    }
    
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
    
    var newSpotColor = new SpotColor();
    newSpotColor.spot = spot;
    for (var i = 0; i < sel.length; i++) {
        var item = doc.pathItems[i];
        alert(item.typename === "PathItem");
        if (item.typename == "PathItem") {
            item.stroked = true;
            item.strokeColor = newSpotColor;
            item.strokeWidth = 1;
            item.filled = false;
            item.strokeOverprint = true;
        }
    }
    alert("finished");
}

colorPath();