import * as vscode from "vscode";
import { TextDocumentPositionParams } from "vscode-languageserver-protocol";
import { Shared } from "../../types";
import getErrorMessage from "../../services/getErrorMessage";
import fetchLeanData from "./services/fetchLeanData";
import shouldIgnoreEvent from "./services/shouldIgnoreEvent";

const getLeanClient = async (shared: Shared, editor: vscode.TextEditor) => {
  const leanExtension = vscode.extensions.getExtension("leanprover.lean4");
  if (!leanExtension) {
    throw new Error("leanExtensionNotFound");
  }

  let client;
  try {
    const clientProvider = leanExtension.exports.clientProvider;
    client = clientProvider.getActiveClient();
  } catch (error) {
    const version = leanExtension.packageJSON.version;
    shared.log.appendLine(`Lean extension version: ${version}`);
    const errorMessage = `
      Please press
      <span style="color: #4791b8; padding: 4px 7px; background: #90969621; border-radius: 3px; font-size: 12px; font-family: monospace; font-weight: 600;">CMD+SHIFT+P</span>
      , type <span style="color: #4791b8;">"Extensions: Install Specific Version of Extension..."</span>, and change your <b>lean4 vscode extension</b> to one of these versions: <b>v0.0.144</b>.<br/>
      Your <b>lean4 vscode extension</b> version is currently: <b>v${version}</b>.
      <br/><br/>

      <i style="color: #9d9d9e;">Explanation: Paperproof depends on lean4 extension in order to avoid loading your computer with excessive Lean server instances; however lean4 api regularly updates in a way that introduces breaking changes, resulting in a blank screen in Paperproof. Hopefully their api stabilizes soon and we can remove this step, but at the moment - please downgrade the lean4 extension, and turn off automatic extension updates for lean4.</i>
    `;
    throw new Error(`wrongLeanExtensionVersion: ${errorMessage}`);
  }

  if (!client) {
    throw new Error("leanClientNotFound");
  }

  if (!client.running) {
    // TODO this is desired, but temporarily disabled to debug asynchronicity
    // NOTE it looks like it works nicely without this too? Is this only useful on vscode editor startup?
    //
    // Dispose of the previous listener if there was one
    // shared.onLeanClientRestarted?.dispose();
    // shared.onLeanClientRestarted = client.restarted(() => {
    //   sendPosition(shared, editor)
    //   .then(() => {
    //     shared.onLeanClientRestarted?.dispose();
    //   });
    // });
    throw new Error("leanNotYetRunning");
  }

  return client;
};

const getResponseOrError = async (shared: Shared, editor: vscode.TextEditor, tdp: TextDocumentPositionParams) => {
  try {
    const leanClient = await getLeanClient(shared, editor);
    const body = await fetchLeanData(shared.log, leanClient, tdp);
    shared.log.appendLine("🎉 Sent everything");
    return body;
  } catch (error) {
    const message = getErrorMessage(error);
    const body = { error: message };
    shared.log.appendLine(`❌ Error: "${message}"`);
    return body;
  }
};

const sendPosition = async (shared: Shared, editor: vscode.TextEditor | undefined, token: vscode.CancellationToken) => {
  if (!editor || shouldIgnoreEvent(editor)) { return; };

  let tdp = {
    textDocument: { uri: editor.document.uri.toString() },
    position: { line: editor.selection.active.line, character: editor.selection.active.character },
  };
  shared.log.appendLine(`\nText selection: ${JSON.stringify(tdp)}`);

  const body = await getResponseOrError(shared, editor, tdp);
  if (token.isCancellationRequested) { return; }
  shared.latestInfo = body;
  await shared.webviewPanel?.webview.postMessage(body);
};

export default sendPosition;
