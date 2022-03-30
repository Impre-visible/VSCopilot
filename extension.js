const vscode = require('vscode');
const axios = require('axios');
const https = require('https');

let VSCodeLanguage = "us";
let resp
    /**
     * Configurations.
     */

let sentences = {
    'fr': ["Tu peux fermer la page maintenant!", "VSCopilot est lancé!", "Veuillez ouvrir un fichier pour utiliser VSCopilot!", "Vous n'etes pas sur un commentaire de language connu !",
        "Clique ici pour lancer la recherche !", "Votre recherche est imprécise. Veuillez la reformuler !"
    ],
    'us': ["You can close the page now!", "VSCopilot is launched!", "Please open a file to use VSCopilot!", "You are not on a known language comment!",
        "Click here to start the search!", "Your search is imprecise. Please reformulate it!" // US
    ],
    'es': ["Ya puedes cerrar la página.", "¡Se lanza VSCopilot!", "¡Por favor, abra un archivo para utilizar VSCopilot!", "¡No está en un comentario de idioma conocido!",
        "Haga clic aquí para iniciar la búsqueda!", "Su búsqueda es imprecisa. Por favor, reformúlelo." // Espagnol
    ],
    'de': ["Sie können die Seite jetzt schließen!", "VSCopilot ist gestartet!", "Bitte öffnen Sie eine Datei, um VSCopilot zu verwenden!", "Sie befinden sich nicht auf einem Kommentar mit bekannter Sprache!",
        "Klicke hier, um die Suche zu starten!", "Ihre Suche ist unpräzise. Bitte formulieren Sie sie neu!" // Allemand
    ],
    'it': ["Ora puoi chiudere la pagina!", "VSCopilot è stato lanciato!", "Si prega di aprire un file per utilizzare VSCopilot!", "Non sei su un commento in una lingua conosciuta!",
        "Clicca qui per iniziare la ricerca!", "La tua ricerca è imprecisa. Per favore, riformulalo!" // Italien
    ],
    'zh-hans': ["你现在可以关闭该页面了!", "VSCopilot启动了!", "请打开文件以使用VSCopilot!", "你不是在一个已知的语言评论!",
        "点击这里开始搜索!", "你的搜索是不精确的。请重新制定!" // Chinois simplifié
    ],
    'ja': ["これでページを閉じることができます", "VSCopilotが発売されました", "VSCopilotを使用するには、ファイルを開いてください", "既知の言語コメントではありません",
        "検索を開始するにはここをクリック", "検索が不正確です。ぜひ、再製造してください" // Japon
    ],
    'ru': ["Теперь вы можете закрыть страницу!", "VSCopilot запущен!", "Пожалуйста, откройте файл, чтобы использовать VSCopilot!", "Вы не находитесь на известном языковом комментарии!",
        "Нажмите здесь, чтобы начать поиск!", "Ваш поиск неточен. Пожалуйста, измените формулировку!" // Russe
    ],
    'pt-br': ["Você pode fechar a página agora!", "VSCopilot é lançado!", "Favor abrir um arquivo para usar o VSCopilot!", "Você não está em um comentário em um idioma conhecido!",
        "Clique aqui para iniciar a busca!", "Sua busca é imprecisa. Reformulem-na, por favor!" // Portugais Bresilien
    ],
    'pl': ["Teraz możesz zamknąć stronę!", "VSCopilot został uruchomiony!", "Aby korzystać z VSCopilota, należy otworzyć plik!", "Nie masz komentarza w znanym języku!",
        "Kliknij tutaj, aby rozpocząć poszukiwania!", "Twoje wyszukiwanie jest nieprecyzyjne. Proszę przeformułować ten produkt!" // Polonais
    ],
    'cs': ["Nyní můžete stránku zavřít!", "VSCopilot je spuštěn!", "Otevřete prosím soubor pro použití VSCopilot!", "Nejste na známém jazykovém komentáři!",
        "Klikněte zde a začněte hledat!", "Vaše hledání je nepřesné. Prosím, přeformulujte ji!" // Tcheque
    ],
    'hu': ["Most már bezárhatja az oldalt!", "A VSCopilot elindult!", "A VSCopilot használatához nyisson meg egy fájlt!", "Ön nem egy ismert nyelvi hozzászóláson van!",
        "Kattintson ide a keresés megkezdéséhez!", "A keresése pontatlan. Kérem, fogalmazza újra!" // Hongrois
    ],
    'bg': ["Вече можете да затворите страницата!", "VSCopilot е стартиран!", "Моля, отворете файл, за да използвате VSCopilot!", "Не сте в коментар на известен език!",
        "Кликнете тук, за да започнете търсенето!", "Търсенето ви е неточно. Моля, преформулирайте го!" // Bulgare
    ],
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const agent = new https.Agent({
    rejectUnauthorized: false
});

let statusBarItem;
const languages = { "js": "javascript", "py": "python", "pyw": "python", "ts": "typescript", "go": "go", "cpp": "c++", "cs": "c#", "css": "css", "dart": "dart", "fs": "f#", "fsi": "f#", "fsx": "f#", "fsscript": "f#", "html": "html", "htm": "html", "java": "java", "jl": "julia", "less": "less", "php": "php", "ps1": "powershell", "scss": "scss", "sql": "tsql" };

/**
 * @param {vscode.ExtensionContext} context
 */


function activate(context) {
    let VSCodeExtension = vscode.extensions.all

    let extensionName = "MS-CEINTL.vscode-language-pack-";
    VSCodeExtension.forEach(extension => {
        if (extension.id.startsWith(extensionName)) {
            VSCodeLanguage = extension.id.replace(extensionName, "");
        }
    })
    console.log(sentences[VSCodeLanguage][1]);


    let disposable = vscode.commands.registerCommand('vscopilot.openCopilot', async() => {
        // Verify if user is in a project
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage(sentences[VSCodeLanguage][2]);
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
        if (line.startsWith("//")) { // Single line JS/TS/C/C++/C#/Dart/Java comment
            text = line.slice(2);
        } else if (line.startsWith("///")) { // Single line F# comment
            text = line.slice(3);
        } else if (line.startsWith("<!--")) { // Single line HTML comment
            text = line.slice(4);
            if (text.endsWith(" -->")) {
                text = text.slice(0, -4);
            } else if (text.endsWith("-->")) {
                text = text.slice(0, -3);
            }
        } else if (line.startsWith("/*")) { // Multi line JS/TS/C/C++/C#/CSS/Dart/Java comment
            text = line.slice(2);
            if (text.endsWith(" */")) {
                text = text.slice(0, -3);
            } else if (text.endsWith("*/")) {
                text = text.slice(0, -2);
            }
        } else if (line.startsWith("#=")) { // Multi line Julia comment
            text = line.slice(2);
            if (text.endsWith(" =#")) {
                text = text.slice(0, -3);
            } else if (text.endsWith("=#")) {
                text = text.slice(0, -2);
            }
        } else if (line.startsWith("<#")) { // Multi line Powershell comment
            text = line.slice(2);
            if (text.endsWith(" #>")) {
                text = text.slice(0, -3);
            } else if (text.endsWith("#>")) {
                text = text.slice(0, -2);
            }
        } else if (line.startsWith("#")) { // Single line Py/Powershell comment
            text = line.slice(1);
        } else if (line.startsWith("--")) { // Single line TSQL comment
            text = line.slice(2);
        } else if (line.startsWith('"""')) { // Multi line Py comment
            text = line.slice(3);
            if (text.endsWith(' """')) {
                text = text.slice(0, -4);
            } else if (text.endsWith('"""')) {
                text = text.slice(0, -3);
            }
        } else if (line.startsWith("def ")) { // basic Py function
            text = line.slice(4);
            while (text.endsWith("(") == false) {
                text = text.slice(0, -1);
            }
            text = text.slice(0, -1);
        } else if (line.startsWith("async def ")) { // async Py function
            text = line.slice(10);
            while (text.endsWith("(") == false) {
                text = text.slice(0, -1);
            }
            text = text.slice(0, -1);
        } else if (line.startsWith("function ")) { // JS/TS function
            text = line.slice(9);
            while (text.endsWith("(") == false) {
                text = text.slice(0, -1);
            }
            text = text.slice(0, -1);
        } else if (line.startsWith("async function ")) { // async JS/TS function
            text = line.slice(15);
            while (text.endsWith("(") == false) {
                text = text.slice(0, -1);
            }
            text = text.slice(0, -1);
        } else if (line.startsWith("func ")) { // function GO
            text = line.slice(5);
            while (text.endsWith("(") == false) {
                text = text.slice(0, -1);
            }
            text = text.slice(0, -1);
        } else if (line.startsWith("void ")) { // function C++/Dart
            text = line.slice(5);
            while (text.endsWith("(") == false) {
                text = text.slice(0, -1);
            }
            text = text.slice(0, -1);
        } else if (line.startsWith("public static ")) { // function C# for static
            text = line.slice(14);
            while (text.endsWith("(") == false) {
                text = text.slice(0, -1);
            }
            text = text.slice(0, -1);
        } else if (line.startsWith("public async ")) { // function C# for async
            text = line.slice(13);
            while (text.endsWith("(") == false) {
                text = text.slice(0, -1);
            }
            text = text.slice(0, -1);
        } else if (line.startsWith("let ")) { // function F#
            text = line.slice(4);
            while (text.endsWith("(") == false) {
                text = text.slice(0, -1);
            }
            while (text.endsWith(" ") == false) {
                text = text.slice(0, -1);
            }
            text = text.slice(0, -1);
        } else {
            vscode.window.showErrorMessage(sentences[VSCodeLanguage][3]);
        }

        while (text.startsWith(" ")) {
            text = text.replace(" ", "");
        }

        while (text.startsWith("\n")) {
            text = text.replace("\n", "");
        }
        let replaced = text.split(' ').join('%20')
            // get real extension for tags search
        let realExtension = languages[extension];

        await openCopilot(realExtension, replaced);
    });

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    statusBarItem.text = "VSCopilot";
    statusBarItem.tooltip = sentences[VSCodeLanguage][4];
    statusBarItem.command = "vscopilot.openCopilot";
    statusBarItem.show();
    context.subscriptions.push(disposable);
    // add text to vscode file
}

// this method is called when your extension is deactivated
function deactivate() {}

async function openCopilot(language, sentence) {
    const editor = vscode.window.activeTextEditor;
    // request to the api
    const path = `https://vscopilot.chevrier.cf/api/${language}/${sentence}/`;
    console.log(path)
    resp = ""
    resp = await axios.get(path, { httpsAgent: agent });
    let json = resp.data;
    let response = json.response;
    editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, `\n${response}`);
    });
    editor.document.save();
}

module.exports = {
    activate,
    deactivate
}