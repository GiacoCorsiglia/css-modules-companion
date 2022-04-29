import * as vscode from "vscode";
// Use posix since we're working with vscode standardized URIs
import { posix as path } from "path";

const extensionName = "css-modules-companion";

const fileExtensions = ["scss", "sass", "less", "styl", "css"] as const;
type FileExtension = typeof fileExtensions[number];

export async function activate(context: vscode.ExtensionContext) {
  // Try to guess the preferred file extension based on what CSS language files
  // exist in this workspace (if any).
  let defaultFileExtension: FileExtension = "css";
  for (const ext of fileExtensions) {
    const files = await vscode.workspace.findFiles(`**/*.${ext}`, undefined, 1);
    if (files.length) {
      defaultFileExtension = ext;
      break;
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${extensionName}.toggleBetweenComponentAndCssModule`,
      toggleBetweenComponentAndCssModule
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${extensionName}.importCorrespondingCssModule`,
      importCorrespondingCssModule
    )
  );

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

    // Read the file extension out of settings if it exists, otherwise use the
    // default that we determined above.
    let fileExtension = vscode.workspace
      .getConfiguration(extensionName)
      .get<FileExtension | "auto">("fileExtension", "auto");
    if (!fileExtensions.includes(fileExtension as FileExtension)) {
      fileExtension = defaultFileExtension;
    }

    const cssModuleName = `${name}.module.${fileExtension}`;
    const cssModulePath = path.join(dir, cssModuleName);

    return uri.with({ path: cssModulePath });
  }

  async function createIfNotExists(uri: vscode.Uri): Promise<boolean> {
    // Check if the file already exists.
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      // If not, create it (assuming the user wants us to).
      const filename = path.basename(uri.path);
      const createItem: vscode.QuickPickItem = {
        label: "$(file-add) Create CSS Module",
        description: filename,
        picked: true,
      };
      const cancelItem: vscode.QuickPickItem = {
        label: "$(close) Cancel",
      };
      const response = await vscode.window.showQuickPick(
        [createItem, cancelItem],
        {
          placeHolder: "Create new CSS module?",
          canPickMany: false,
        }
      );
      if (response === createItem) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from("", "utf8"));
        return true;
      }
      return false;
    }
  }

  async function addImportForCssModule(
    uri: vscode.Uri,
    editor: vscode.TextEditor
  ) {
    const importPath = `./${path.basename(uri.path)}`;
    const importName = vscode.workspace
      .getConfiguration(extensionName)
      .get<string>("importName", "css");
    const importLine = `import ${importName} from "${importPath}";\n`;

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

    const exists = await createIfNotExists(uri);
    if (!exists) {
      return;
    }

    showTextDocumentInSmartColumn(uri);
  }

  async function importCorrespondingCssModule() {
    const uri = correspondingCssModuleUri();

    if (!uri) {
      return;
    }

    const exists = await createIfNotExists(uri);
    if (!exists) {
      return;
    }

    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      return;
    }

    addImportForCssModule(uri, editor);
  }

  async function openCorrespondingComponent() {
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

    const componentEditor = await showTextDocumentInSmartColumn(componentUri);
    addImportForCssModule(moduleUri, componentEditor);
  }

  async function toggleBetweenComponentAndCssModule() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const p = editor.document.uri.path;

    if (/\.module\.(css|scss|sass|less|styl)$/.test(p)) {
      openCorrespondingComponent();
    } else if (/\.(tsx|ts|jsx|js)$/.test(p)) {
      openCorrespondingCssModule();
    }
  }

  function showTextDocumentInSmartColumn(uri: vscode.Uri) {
    // This is currently the best we can do:
    // https://github.com/microsoft/vscode/issues/15178
    const existingEditor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.toString() === uri.toString()
    );

    return vscode.window.showTextDocument(uri, {
      viewColumn: existingEditor?.viewColumn || vscode.ViewColumn.Beside,
    });
  }
}
