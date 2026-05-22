// hello.jsx -- Phase A smoke test
//
// Purpose: Confirm that VS Code (with the ExtendScript Debugger extension)
// can attach to Illustrator and run a .jsx file. If you see the alert popup,
// the whole pipeline is alive and you're ready for Phase B.
//
// How to run:
//   Option 1 (debugger): Open this file in VS Code, press F5. Illustrator
//                        must already be running with any document open.
//   Option 2 (direct):   In Illustrator, File > Scripts > Other Script...
//                        and pick this file.

if (app.documents.length === 0) {
    alert("Hello from Illustrator!\n\nNo document is open. Open any document and run me again to see its name.");
} else {
    alert("Hello from Illustrator!\n\nActive document: " + app.activeDocument.name);
}
