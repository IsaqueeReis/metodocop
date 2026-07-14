const ts = require('typescript');
const fs = require('fs');
const file = 'App.tsx';
const code = fs.readFileSync(file, 'utf8');

const sourceFile = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
);

function printDiagnostics(diagnostics) {
    if (diagnostics && diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            if (diagnostic.file) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
            } else {
                console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
            }
        });
    } else {
        console.log('No errors.');
    }
}

printDiagnostics(sourceFile.parseDiagnostics);
