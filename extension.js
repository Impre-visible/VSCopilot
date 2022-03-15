const vscode = require('vscode');
const axios = require('axios');
const jsdom = require("jsdom");
const https = require('https');
const express = require('express');
const passport = require('passport');
const StackExchangeStrategy = require('passport-stack-exchange').Strategy;
const open = require('open');
const STORAGE_KEY = 'stackexchange_token';

let token;
let extensionContext;
let server;
let VSCodeLanguage = "us";


/**
 * Configurations.
 */

let STACK_EXCHANGE_APP_ID = '23031', // '*** YOUR APP ID (CLIENT ID) ***',
    STACK_EXCHANGE_APP_SECRET = 'yabxjcApKEczmsSXoYQG8g((', //'*** YOUR APP SECRET (CLIENT SECRET) ***',
    STACK_EXCHANGE_APP_KEY = 'MAsTBc4ad47BAQJOnCiZWQ((';

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

function authentication() {
    return new Promise(async(resolve, reject) => {
        let timeout = setTimeout(() => {
            reject();
            server.close();
        }, 60000);

        /*
         Passport session setup
         */
        passport.serializeUser(function(user, done) {
            done(null, user);
        });

        passport.deserializeUser(function(obj, done) {
            done(null, obj);
        });

        /*
         Use the StackExchangeStrategy within Passport
         */
        passport.use(new StackExchangeStrategy({
                clientID: STACK_EXCHANGE_APP_ID,
                clientSecret: STACK_EXCHANGE_APP_SECRET,
                callbackURL: 'http://127.0.0.1:3000/auth/stack-exchange/callback',
                stackAppsKey: STACK_EXCHANGE_APP_KEY,
                scope: 'no_expiry',
                site: 'stackoverflow'
            },
            function(accessToken, refreshToken, profile, done) {
                console.log("Token :", accessToken);
                resolve(accessToken);
                clearTimeout(timeout);

                process.nextTick(function() {
                    server.close();
                    return done(null, profile);
                });
            }
        ));

        /**
         * Configure Express
         */
        let app = express();
        app.use(passport.initialize());

        app.get('/auth/stack-exchange', passport.authenticate('stack-exchange'));

        app.get('/auth/stack-exchange/callback', passport.authenticate('stack-exchange', { failureRedirect: '/auth/stack-exchange' }),
            function(req, res) {
                res.send(sentences[VSCodeLanguage][0]);
            });

        server = app.listen(3000);

        open('http://127.0.0.1:3000/auth/stack-exchange');


    });
}

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
    let VSCodeExtension = vscode.extensions.all

    let extensionName = "MS-CEINTL.vscode-language-pack-";
    VSCodeExtension.forEach(extension => {
        if (extension.id.startsWith(extensionName)) {
            VSCodeLanguage = extension.id.replace(extensionName, "");
            console.log(extension.id)
        }
    })
    console.log(sentences[VSCodeLanguage][1]);


    extensionContext = context;
    //Récupération du token
    token = context.workspaceState.get(STORAGE_KEY, undefined);

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
            vscode.window.showErrorMessage(sentences[VSCodeLanguage][3]);
        }

        while (text.startsWith(" ")) {
            text = text.replace(" ", "");
        }

        while (text.startsWith("\n")) {
            text = text.replace("\n", "");
        }

        // get real extension for tags search
        let realExtension = languages[extension];

        await openCopilot(realExtension, text);
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
    try {
        if (!token) {
            token = await authentication();
            extensionContext.workspaceState.update(STORAGE_KEY, token);
        }
    } catch (err) { return; }

    // search in stackoverflow
    const path = `https://api.stackexchange.com/2.3/search?order=desc&sort=activity&tagged=${language}&intitle=${sentence}&site=stackoverflow&access_token=${token}&key=${STACK_EXCHANGE_APP_KEY}`;
    console.log(path)
    const doc = vscode.workspace.openTextDocument({
        language: language
    });
    let resp = await axios.get(path, { httpsAgent: agent });
    let json = resp.data;
    let canResponse;
    const posts = json.items;
    if (posts.length != 0) {
        for (let i = 0; i < posts.length; i++) {
            if (posts[i]["is_answered"] == true && posts[i]["accepted_answer_id"] !== undefined) {
                let id = posts[i]["accepted_answer_id"];
                const answer = `https://api.stackexchange.com/2.3/answers/${id}?order=desc&sort=activity&site=stackoverflow&filter=!nKzQURF6Y5&access_token=${token}&key=${STACK_EXCHANGE_APP_KEY}`;
                let reponse = await axios.get(answer);
                let jsonresp = reponse.data;
                let response = jsonresp.items[0].body;
                const dom = new JSDOM(response);
                try {
                    reponse = "\n" + dom.window.document.querySelector("code").textContent + "\r\n";
                    responses.push(reponse);
                    canResponse = "True"
                } catch (e) {
                    vscode.window.showErrorMessage(sentences[VSCodeLanguage][5]);
                    canResponse = "False"
                }
            }
        }
    } else {
        vscode.window.showErrorMessage(sentences[VSCodeLanguage][5]);
        canResponse = "False"
    }
    if (canResponse == "True") {
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