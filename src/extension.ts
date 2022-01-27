import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {
    const opacity = 50;
    const dimDecoration = vscode.window.createTextEditorDecorationType(<vscode.DecorationRenderOptions> {
        textDecoration: `none; opacity: ${opacity / 100}`
    });
    const errorDecoration = vscode.window.createTextEditorDecorationType(<vscode.DecorationRenderOptions> {
        color: '#ff0000',
    });
    context.subscriptions.push(dimDecoration);

    let isActive = false;
    let activeDisposables: vscode.Disposable[] = [];
    let currentEditorInPractice: vscode.TextEditor | null = null;

    const moveToPosition = (editor: vscode.TextEditor, position: vscode.Position) => {
        const newSelection = new vscode.Selection(position, position);
        if (!editor.selection.isEqual(newSelection)) {
            editor.selection = newSelection;
        }
        editor.setDecorations(dimDecoration, [new vscode.Range(new vscode.Position(0, 0), position)]);
        editor.setDecorations(errorDecoration, []);
    };

    context.subscriptions.push(vscode.commands.registerCommand('type', args => {
        if (!vscode.window.activeTextEditor) {
            vscode.commands.executeCommand('default:type', args);
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (isActive) {
            const text = args.text;
            const start = vscode.window.activeTextEditor.selection.start;

            if (start.isAfterOrEqual(vscode.window.activeTextEditor.document.lineAt(start.line).range.end)) {
                // at the very end
                if (args.text === '\n' || args.text === '\r\n') {
                    // move to next line
                    const end = new vscode.Position(start.line + 1, 0);
                    moveToPosition(editor, end);
                } else {
                    // nothing
                }
            } else {
                const end = start.with(start.line, start.character + 1);
                const textUnderCursor = vscode.window.activeTextEditor.document.getText(new vscode.Range(start, end));
                if (text === textUnderCursor) {
                    moveToPosition(editor, end);
                } else {
                    editor.setDecorations(dimDecoration, [new vscode.Range(new vscode.Position(0, 0), start)]);
                    editor.setDecorations(errorDecoration, [new vscode.Range(start, end)]);
                }
            }
        } else {
            vscode.commands.executeCommand('default:type', args);
        }
    }));

	context.subscriptions.push(vscode.commands.registerCommand('typing-practice.startTypingPracticeFromCursor', () => {
		if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage('Please open a file first.');
            return;
        }

        isActive = true;
        vscode.commands.executeCommand('setContext', 'typing-practice.active', true);
        startTypingStatus.hide();
        endTypingStatus.show();
        const editor = vscode.window.activeTextEditor;
        currentEditorInPractice = editor;

        editor.setDecorations(dimDecoration, [
            new vscode.Range(new vscode.Position(0, 0), editor.selection.start)
        ]);

        activeDisposables.push(vscode.window.onDidChangeTextEditorSelection(e => {
            if (e.textEditor === editor) {
                moveToPosition(editor, editor.selection.start);
            }
        }));
	}));

    const moveBackwards = () => {
        if (isActive && vscode.window.activeTextEditor) {
            const editor = vscode.window.activeTextEditor;
            const start = editor.selection.start;
            if (start.line === 0 && start.character === 0) {
                moveToPosition(editor, start);
            } else if (start.line === 0) {
                const prev = start.with(start.line, start.character - 1);    
                moveToPosition(editor, prev);
            } else if (start.character === 0) {
                const prev = start.with(start.line - 1, vscode.window.activeTextEditor.document.lineAt(start.line - 1).range.end.character);
                moveToPosition(editor, prev);
            } else {
                const prev = start.with(start.line, start.character - 1);
                moveToPosition(editor, prev);
            }
        }
    };

    context.subscriptions.push(vscode.commands.registerCommand('typing-practice.backspace', () => {
        moveBackwards();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('typing-practice.delete', () => {
        moveBackwards();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('typing-practice.tab', () => {
        if (isActive && vscode.window.activeTextEditor) {
            const editor = vscode.window.activeTextEditor;
            const start = editor.selection.start;

            if (start.character === 0) {
                const firstNonWhitespaceIndex = editor.document.lineAt(start.line).firstNonWhitespaceCharacterIndex;
                const end = start.with(start.line, firstNonWhitespaceIndex);
                moveToPosition(editor, end);
            } else {
                const end = start.with(start.line, start.character + 1);
                const textUnderCursor = vscode.window.activeTextEditor.document.getText(new vscode.Range(start, end));
    
                if (textUnderCursor === '\t') {
                    moveToPosition(editor, end);
                }
            }
        }
    }));

    const stop = () => {
        activeDisposables.forEach(d => d.dispose());
        activeDisposables = [];

        // remove decorations
        currentEditorInPractice?.setDecorations(dimDecoration, []);
        currentEditorInPractice?.setDecorations(errorDecoration, []);
        currentEditorInPractice = null;
        // disable typing
        isActive = false;
        vscode.commands.executeCommand('setContext', 'typing-practice.active', false);
        endTypingStatus.hide();
        startTypingStatus.show();
    };

	context.subscriptions.push(vscode.commands.registerCommand('typing-practice.endTypingPractice', () => {
        stop();
	}));

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        stop();
    }));

    const startTypingStatus = vscode.window.createStatusBarItem('typing-practice.startTyping', vscode.StatusBarAlignment.Left, 0);
    startTypingStatus.text = '$(pencil) Start Practice';
    startTypingStatus.command = 'typing-practice.startTypingPracticeFromCursor';
    const endTypingStatus = vscode.window.createStatusBarItem('typing-practice.startTyping', vscode.StatusBarAlignment.Left, 0);
    endTypingStatus.text = '$(pencil) End Practice';
    endTypingStatus.command = 'typing-practice.endTypingPractice';
    context.subscriptions.push(startTypingStatus, endTypingStatus);

    startTypingStatus.show();
}

// this method is called when your extension is deactivated
export function deactivate() {}
