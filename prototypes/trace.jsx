function traceImage() {
    if (app.documents.length == 0) {
        alert("Open a document first");
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;
    
    for (var i = 0; i < sel.length; i++) {
        var item = sel[i];
        if (item.typename !== "RasterItem") {
            alert("Selected items must be RasterItem, instead are " + item.typename);
            return;
        }
        var traceObj = item.trace().tracing //grabbing the trace object
        var traceOpt = traceObj.tracingOptions;
        traceOpt.threshold = 230
        traceOpt.tracingMode = TracingModeType.TRACINGMODEBLACKANDWHITE;
        traceOpt.ignoreWhite = true;
        item.tracingMethod = TracingMethodType.TRACINGMETHODABUTTING;
        app.redraw();
        traceObj.expandTracing();
    }
    alert("finished");
}

traceImage();
