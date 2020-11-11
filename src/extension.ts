import * as vscode from "vscode";
// Use posix since we're working with vscode standardized URIs
import { posix as path } from "path";

const extensionName = "css-modules-companion";

export function activate(context: vscode.ExtensionContext) {
  const openDisposable = vscode.commands.registerCommand(
    `${extensionName}.openCorrespondingCssModule`,
    openCorrespondingCssModule
  );

  const importDisposable = vscode.commands.registerCommand(
    `${extensionName}.importCorrespondingCssModule`,
    importCorrespondingCssModule
  );

  context.subscriptions.push(openDisposable);
  context.subscriptions.push(importDisposable);
}

function correspondingCssModuleUri() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null;
  }

  const uri = editor.document.uri;
  const p = uri.path;

  const dir = path.dirname(p);
  const ext = path.extname(p);
  const name = path.basename(p, ext);

  const fileType = vscode.workspace
    .getConfiguration(extensionName)
    .get<"css" | "scss" | "sass" | "less">("fileType", "css");

  const cssModuleName = `${name}.module.${fileType}`;
  const cssModulePath = path.join(dir, cssModuleName);

  return uri.with({ path: cssModulePath });
}

async function ensureUriExists(uri: vscode.Uri) {
  // Check if the file already exists.
  try {
    await vscode.workspace.fs.stat(uri);
  } catch {
    // If not, create it.
    await vscode.workspace.fs.writeFile(uri, Buffer.from("", "utf8"));
  }
}

async function openCorrespondingCssModule() {
  const uri = correspondingCssModuleUri();

  if (!uri) {
    return;
  }

  await ensureUriExists(uri);

  vscode.window.showTextDocument(uri);
}

async function importCorrespondingCssModule() {
  const uri = correspondingCssModuleUri();

  if (!uri) {
    return;
  }

  await ensureUriExists(uri);

  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }

  const importPath = `./${path.basename(uri.path)}`;
  const importLine = `import styles from "${importPath}";\n`;

  const document = editor.document;

  const text = document.getText();
  if (text.includes(importPath)) {
    // I guess it's already imported.
    return;
  }

  editor.edit((editBuilder) => {
    // Just insert it at the top and let the code action sort it later.
    editBuilder.insert(document.positionAt(0), importLine);
  });
}
