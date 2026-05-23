function offsetPath() {
    if (app.documents.length == 0 && app.activeDocument.pathItems.length > 0) {
        alert("Open a document first");
        return;
    }
    var doc = app.activeDocument;
    var sel = doc.selection;

    var XMLOffsetString = '<LiveEffect name="Adobe Offset Path">' + '<Dict data="R mlim 4 R ofst 3.6 I jntp 1 "/>' + '</LiveEffect>';
    for (var i = 0; i < sel.length; i++) {
        var item = sel[i];
        item.applyEffect(XMLOffsetString);
        doc.selection = [item]
        app.executeMenuCommand("expandStyle");
    }
    alert("Finished");
}

offsetPath();