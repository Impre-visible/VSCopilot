// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');
const jsdom = require("jsdom");
const https = require('https');
/*
const oauth = require('axios-oauth-client');
const tokenProvider = require('axios-token-interceptor');


const getOwnerCredentials = oauth.client(axios.create(), {
    url: 'https://stackoverflow.com/oauth/access_token',
    client_id: '23031',
    client_secret: 'yabxjcApKEczmsSXoYQG8g((',
    code: '6v7gSZ4fs9Y1PULOKFzkEA))',
    redirect_uri: "https://stackexchange.com"
})

const instance = axios.create();
instance.interceptors.request.use(
    oauth.interceptor(tokenProvider, getOwnerCredentials)
);

*/
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const agent = new https.Agent({
    rejectUnauthorized: false
});
const { JSDOM } = jsdom;

let statusBarItem;
let responses = [];
const languages = { "js": "javascript", "py": "python", "pyw": "python", "ts": "typescript", "go": "go" };

/**
 * @param {vscode.ExtensionContext} context
 */


function activate(context) {

    console.log('VSCopilot est lancé!');
    let disposable = vscode.commands.registerCommand('vscopilot.openCopilot', async() => {
        // Verify if user is in a project
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage("Veuillez ouvrir un fichier pour utiliser VSCopilot");
            return
        }

        // get content of where is cursor
        let line = editor.document.lineAt(editor.selection.active.line).text;

        // remove all tabulation
        while (line.startsWith("    ")) {
            line = line.replace("    ", "");
        }

        const path = vscode.window.activeTextEditor.document.uri.path;
        const exts = path.split(".");
        const extension = exts[exts.length - 1];
        let text = "";

        // remove comments str
        if (line.startsWith("//")) {
            text = line.slice(2);
        } else if (line.startsWith("/*")) {
            text = line.slice(2);
            if (text.endsWith(" */")) {
                text = text.slice(0, -3);
            } else if (text.endsWith("*/")) {
                text = text.slice(0, -2);
            }
        } else if (line.startsWith("#")) {
            text = line.slice(1);
        } else if (line.startsWith('"""')) {
            text = line.slice(3);
            if (text.endsWith(' """')) {
                text = text.slice(0, -4);
            } else if (text.endsWith('"""')) {
                text = text.slice(0, -3);
            }
        } else {
            vscode.window.showErrorMessage("Vous n'etes pas sur un commentaire de language connu !");
        }

        while (text.startsWith(" ")) {
            text = text.replace(" ", "");
        }

        // get real extension for tags search
        let realExtension = languages[extension];

        await openCopilot(realExtension, text);
    });

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    statusBarItem.text = "VSCopilot";
    statusBarItem.tooltip = "Clique ici pour lancer la recherche";
    statusBarItem.command = "vscopilot.openCopilot";
    statusBarItem.show();
    context.subscriptions.push(disposable);
    // add text to vscode file
}

// this method is called when your extension is deactivated
function deactivate() {}

async function openCopilot(language, sentence) {

    // search in stackoverflow
    const path = `https://api.stackexchange.com/2.3/search?order=desc&sort=activity&tagged=${language}&intitle=${sentence}&site=stackoverflow`;
    const doc = vscode.workspace.openTextDocument({
        language: language
    });
    console.log(axios.get(path, { httpsAgent: agent }));
    let resp = await axios.get(path, {
        httpsAgent: agent
    });
    let json = resp.data;
    const posts = json["items"];
    for (let i = 0; i < posts.length; i++) {
        if (posts[i]["is_answered"] == true && posts[i]["accepted_answer_id"] !== undefined) {
            let id = posts[i]["accepted_answer_id"];
            const answer = `https://api.stackexchange.com/2.3/answers/${id}?order=desc&sort=activity&site=stackoverflow&filter=!nKzQURF6Y5`;
            let reponse = await axios.get(answer);
            let jsonresp = reponse.data;
            let response = jsonresp["items"][0]["body"];
            const dom = new JSDOM(response);
            reponse = "/*\n" + dom.window.document.querySelector("code").textContent + "*/\r\n";
            responses.push(reponse);
        }
    }

    let trueResponse = getResponses(responses);
    vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.Beside,
        preview: true,
        preserveFocus: true,
    }).then(e => {
        e.edit(edit => {
            edit.insert(new vscode.Position(0, 0), trueResponse);
        });
    });
}

function getResponses(list) {
    let array2 = []
    list.forEach(element => {
        if (element.includes("\n")) {
            array2.push(element + "\n\n")
        }
    })
    return array2.join("")
}

module.exports = {
    activate,
    deactivate
}