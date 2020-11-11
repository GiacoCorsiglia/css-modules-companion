import * as vscode from "vscode";
// Use posix since we're working with vscode standardized URIs
import { posix as path } from "path";

const extensionName = "css-modules-companion";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${extensionName}.openCorrespondingCssModule`,
      openCorrespondingCssModule
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${extensionName}.importCorrespondingCssModule`,
      importCorrespondingCssModule
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${extensionName}.openComponentForCorrespondingCssModule`,
      openComponentForCorrespondingCssModule
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${extensionName}.toggleBetweenComponentAndCssModule`,
      toggleBetweenComponentAndCssModule
    )
  );
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

async function addImportForCssModule(
  uri: vscode.Uri,
  editor: vscode.TextEditor
) {
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

  addImportForCssModule(uri, editor);
}

async function openComponentForCorrespondingCssModule() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null;
  }

  const moduleUri = editor.document.uri;
  const p = moduleUri.path;

  const dir = path.dirname(p);
  const cssModuleExt = path.extname(p);
  const cssModuleName = path.basename(p, cssModuleExt);

  if (!cssModuleName.endsWith(".module")) {
    return;
  }

  const name = cssModuleName.replace(/\.module$/, "");

  const extensions = ["tsx", "jsx", "ts", "js"];
  const uris = extensions.map((ext) =>
    moduleUri.with({ path: path.join(dir, `${name}.${ext}`) })
  );
  const stats = uris.map((uri) =>
    vscode.workspace.fs.stat(uri).then(
      () => uri,
      () => null
    )
  );
  const componentUri = (await Promise.all(stats)).filter((uri) => !!uri)[0];

  if (!componentUri) {
    return;
  }

  const componentEditor = await vscode.window.showTextDocument(componentUri);
  addImportForCssModule(moduleUri, componentEditor);
}

async function toggleBetweenComponentAndCssModule() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null;
  }

  const p = editor.document.uri.path;

  if (/\.module\.(css|scss|sass|less)$/.test(p)) {
    openComponentForCorrespondingCssModule();
  } else if (/\.(tsx|ts|jsx|js)$/.test(p)) {
    openCorrespondingCssModule();
  }
}
