function pathfinder() {
    if (app.documents.length == 0) {
        alert("Open a document first");
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;
    

    
    app.executeMenuCommand("Live Pathfinder Merge");
    app.executeMenuCommand("expandStyle");
    app.executeMenuCommand("Live Pathfinder Trim");
    app.executeMenuCommand("expandStyle");
    app.executeMenuCommand("Live Pathfinder Add");
    app.executeMenuCommand("expandStyle");
    alert("finished");
}

pathfinder();