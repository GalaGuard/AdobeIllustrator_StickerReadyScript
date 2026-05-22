

function embedAndResize() {
    if (app.documents.length == 0) {
        alert("Open a document first");
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;

    for (var i = 0; i < sel.length; i++) {
        var item = sel[i];
        if (item.typename !== "PlacedItem") {
            alert("Selected items must be PlacedItem, instead are " + item.typename);
            return;
        }
        item.embed();
        item = doc.selection[i]
        item.resize(50, 50);
    }
    alert("finished");
}

embedAndResize();