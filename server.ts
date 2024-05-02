import _http from "http";
import _url from "url";
import _fs from "fs";
import _express from "express";
import _dotenv from "dotenv";
import _cors from "cors";
import _fileUpload from "express-fileupload";
import _cloudinary, { UploadApiResponse } from 'cloudinary';
import _streamifier from "streamifier";
import _axios from "axios";
const _nodemailer = require("nodemailer");
import _bcrypt from "bcryptjs";
import _jwt from "jsonwebtoken";
import { v2 as cloudinary } from 'cloudinary';

// Lettura delle password e parametri fondamentali
_dotenv.config({ "path": ".env" });

// Configurazione Cloudinary
cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key_cloudinary,
    api_secret: process.env.api_secret_cloudinary
});

// Variabili relative a MongoDB ed Express
import { MongoClient, ObjectId } from "mongodb";
const DBNAME = process.env.DBNAME;
const CONNECTION_STRING: string = process.env.connectionStringAtlas;
const app = _express();

const PORT: number = parseInt(process.env.PORT);
let paginaErrore;
const PRIVATE_KEY = _fs.readFileSync("./keys/privateKey.pem", "utf8");
const CERTIFICATE = _fs.readFileSync("./keys/certificate.crt", "utf8");
const ENCRYPTION_KEY = _fs.readFileSync("./keys/encryptionKey.txt", "utf8");
const CREDENTIALS = { "key": PRIVATE_KEY, "cert": CERTIFICATE };
const server = _http.createServer(app);
// // Creazione ed avvio del server https, a questo server occorre passare le chiavi RSA (pubblica e privata)
// // app è il router di Express, si occupa di tutta la gestione delle richieste https

// const https_server = _https.createServer(CREDENTIALS, app);
// // Il secondo parametro facoltativo ipAddress consente di mettere il server in ascolto su una delle interfacce della macchina, se non lo metto viene messo in ascolto su tutte le interfacce (3 --> loopback e 2 di rete)
// https_server.listen(HTTPS_PORT, () => {
//     init();
//     console.log(`Server HTTPS in ascolto sulla porta ${HTTPS_PORT}`);
// });

server.listen(PORT, () => {
    init();
    console.log(`Il Server è in ascolto sulla porta ${PORT}`);
});

function init() {
    _fs.readFile("./static/error.html", function (err, data) {
        if (err) {
            paginaErrore = `<h1>Risorsa non trovata</h1>`;
        }
        else {
            paginaErrore = data.toString();
        }
    });
}

//********************************************************************************************//
// Routes middleware
//********************************************************************************************//

// 1. Request log
app.use("/", (req: any, res: any, next: any) => {
    console.log(`-----> ${req.method}: ${req.originalUrl}`);
    next();
});

// 2. Gestione delle risorse statiche
// .static() è un metodo di express che ha già implementata la firma di sopra. Se trova il file fa la send() altrimenti fa la next()
app.use("/", _express.static("./static"));

// 3. Lettura dei parametri POST di req["body"] (bodyParser)
// .json() intercetta solo i parametri passati in json nel body della http request
app.use("/", _express.json({ "limit": "50mb" }));
// .urlencoded() intercetta solo i parametri passati in urlencoded nel body della http request
app.use("/", _express.urlencoded({ "limit": "50mb", "extended": true }));

// 4. Aggancio dei parametri del FormData e dei parametri scalari passati dentro il FormData
// Dimensione massima del file = 10 MB
app.use("/", _fileUpload({ "limits": { "fileSize": (10 * 1024 * 1024) } }));

// 5. Log dei parametri GET, POST, PUT, PATCH, DELETE
app.use("/", (req: any, res: any, next: any) => {
    if (Object.keys(req["query"]).length > 0) {
        console.log(`       ${JSON.stringify(req["query"])}`);
    }
    if (Object.keys(req["body"]).length > 0) {
        console.log(`       ${JSON.stringify(req["body"])}`);
    }
    next();
});

// 6. Controllo degli accessi tramite CORS
// Procedura che lascia passare tutto, accetta tutte le richieste
const corsOptions = {
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true
};
app.use("/", _cors(corsOptions));
/*
const whitelist = [
    "http://edoardopizzorno-crudserver.onrender.com",	// porta 80 (default)
    "https://edoardopizzorno-crudserver.onrender.com",	// porta 443 (default)
    "https://localhost:3000",
    "http://localhost:4200" // server angular
];
// Procedura che utilizza la whitelist, accetta solo le richieste presenti nella whitelist
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) // browser direct call
            return callback(null, true);
        if (whitelist.indexOf(origin) === -1) {
            var msg = `The CORS policy for this site does not allow access from the specified Origin.`
            return callback(new Error(msg), false);
        }
        else
            return callback(null, true);
    },
    credentials: true
};
app.use("/", _cors(corsOptions));
*/

// 7. Configurazione di nodemailer con utilizzo di username e password
/*
const auth = {
    "user": process.env.gmailUser,
    "pass": process.env.gmailPassword,
}
const transporter = _nodemailer.createTransport({
    "service": "gmail",
    "auth": auth
});
let message = _fs.readFileSync("./message.html", "utf8");
*/

// 8. Configurazione di nodemailer con utilizzo di oAuth2

// 9. Login
app.post("/api/login", async (req, res, next) => {
    let username = req["body"].username;
    let pwd = req["body"].password;
    console.log(username, pwd)

    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    const collection = client.db(DBNAME).collection("utenti");
    let regex = new RegExp(`^${username}$`, "i");
    let rq = collection.findOne({ "username": regex }, { "projection": { "username": 1, "password": 1 } });
    rq.then((dbUser) => {
        if (!dbUser) {
            res.status(401).send("Username non valido");
        }
        else {
            _bcrypt.compare(pwd, dbUser.password, (err, success) => {
                if (err) {
                    res.status(500).send(`Bcrypt compare error: ${err.message}`);
                }
                else {
                    if (!success) {
                        res.status(401).send("Password non valida");
                    }
                    else {
                        let token = createToken(dbUser);
                        console.log(token);
                        res.setHeader("authorization", token);
                        // Fa si che la header authorization venga restituita al client
                        res.setHeader("access-control-expose-headers", "authorization");
                        res.send({ "ris": "ok" });
                    }
                }
            })
        }
    });
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
    rq.finally(() => client.close());
});

// 10. Login con Google
app.post("/api/googleLogin", async (req: any, res: any, next: any) => {
    if (!req.headers["authorization"]) {
        res.status(403).send("Token mancante");
    }
    else {
        // Otteniamo il token completo
        let token = req.headers["authorization"];
        // Otteniamo il payload del token con una decodifica Base64
        let payload = _jwt.decode(token);
        let username = payload.email;
        const client = new MongoClient(CONNECTION_STRING);
        await client.connect();
        const collection = client.db(DBNAME).collection("utenti");
        let regex = new RegExp(`^${username}$`, "i");
        let rq = collection.findOne({ "username": regex }, { "projection": { "username": 1 } });
        rq.then((dbUser) => {
            if (!dbUser) {
                res.status(403).send("Username non autorizzato all'accesso");
            }
            else {
                let token = createToken(dbUser);
                console.log(token);
                res.setHeader("authorization", token);
                // Fa si che la header authorization venga restituita al client
                res.setHeader("access-control-expose-headers", "authorization");
                res.send({ "ris": "ok" });
            }
        });
        rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
        rq.finally(() => client.close());
    }
});

const auth = { user: process.env.mail, pass: process.env.password };
const transporter = _nodemailer.createTransport({
    service: 'gmail',
    auth: auth
});

app.post("/api/cambiaPassword", async (req, res, next) => {
    let username = req["body"].username;
    let password = req["body"].newPass;
    password = _bcrypt.hashSync(password, 10);
    console.log(username, password);
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("utenti");
    let rq = collection.updateOne({ "username": username }, { "$set": { "password": password } });
    rq.then((data) => {
        let mailOptions = {
            from: auth.user,
            to: username,
            subject: 'Cambio password',
            text: `La tua password è: ${req["body"].newPass}`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                res.send(data);
            }
        });
        //res.send(data);
    });
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

// 11. Controllo del token
app.use("/api/", (req: any, res: any, next: any) => {
    console.log("Controllo tokenccccccccccc");
    console.log(req.headers["authorization"]);
    if (!req.headers["authorization"]) {
        console.log("Token mancante");
        res.status(403).send("Token mancante");
    }
    else {
        let token = req.headers["authorization"];
        _jwt.verify(token, ENCRYPTION_KEY, (err, payload) => {
            if (err) {
                res.status(403).send(`Token non valido: ${err}`);
            }
            else {
                let newToken = createToken(payload);
                console.log(newToken);
                res.setHeader("authorization", newToken);
                // Fa si che la header authorization venga restituita al client
                res.setHeader("access-control-expose-headers", "authorization");
                req["payload"] = payload;
                next();
            }
        });
    }
});

function createToken(data) {
    let currentTimeSeconds = Math.floor(new Date().getTime() / 1000);
    let payload = {
        "_id": data._id,
        "username": data.username,
        // Se c'è iat mette iat altrimenti mette currentTimeSeconds
        "iat": data.iat || currentTimeSeconds,
        "exp": currentTimeSeconds + parseInt(process.env.TOKEN_EXPIRE_DURATION)
    }
    let token = _jwt.sign(payload, ENCRYPTION_KEY);
    return token;
}

//********************************************************************************************//
// Routes finali di risposta al client
//********************************************************************************************//

// La .send() mette status 200 e fa il parsing. In caso di codice diverso da 200 la .send() non fa il parsing
// I parametri GET in Express sono restituiti in req["query"]
// I parametri POST, PATCH, PUT, DELETE in Express sono restituiti in req["body"]
// Se nella url ho /api/:parametro il valore del parametro passato lo troverò in req["params"].parametro
// Se uso un input:files il contenuto dei files li troverò in req["files"].nomeParametro
// nomeParametro contiene due campi principali: 
// nomeParametro.name contiene il nome del file scelto dal client
// nomeParametro.data contiene il contenuto binario del file
// _streamifier serve solo per aggiungere immagine binarie su Cloudinary

app.get("/api/elencoMail", async (req, res, next) => {
    let username = req["payload"].username;
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    const collection = client.db(DBNAME).collection("mail");
    let rq = collection.findOne({ "username": username }, { "projection": { "mail": 1 } });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err.message}`));
    rq.finally(() => client.close());
});

app.post("/api/perizie", async (req, res, next) => {
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("utenti");
    let rq = collection.find({}).toArray();
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/trovaUtente", async (req, res, next) => {
    let username = req["body"].utente;
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("utenti");
    let regex = new RegExp(`^${username}$`, "i");
    let rq = collection.findOne({ "idName": regex });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/creaUtente", async (req, res, next) => {
    let idName = req["body"].name;
    let username = req["body"].mail;
    console.log(idName, username);
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("utenti");
    let rq = collection.insertOne({ "idName": idName, "username": username, "password": _bcrypt.hashSync("password", 10) });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.delete("/api/perizie/:id", async (req, res, next) => {
    let id = req.params.id;
    id = new ObjectId(id);
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("perizie");
    let rq = collection.deleteOne({ _id: id });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.delete("/api/utenti/:id", async (req, res, next) => {
    let id = req.params.id;
    id = new ObjectId(id);
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("utenti");
    let rq = collection.deleteOne({ _id: id });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/perizie/:id", async (req, res, next) => {
    let id = req.params.id;
    id = new ObjectId(id);
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("perizie");
    let rq = collection.findOne({ _id: id });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/aggiornaPerizia/:id", async (req, res, next) => {
    let id = req.params.id;
    id = new ObjectId(id);
    let username = req["body"].username;
    let data = req["body"].data;
    let descrizione = req["body"].descrizione;
    let ora = req["body"].ora;

    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("perizie");
    let rq = collection.updateOne({ _id: id }, { "$set": { "username": username, "data": data, "descrizione": descrizione, "ora": ora } });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/prendiUtente", async (req, res, next) => {
    let id = req["body"].id;
    id = new ObjectId(id);
    console.log("id" + id);
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("utenti");
    let rq = collection.findOne({ _id: id });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/trovaUtenteByUser", async (req, res, next) => {
    let username = req["body"].utente;
    console.log("id" + username);
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("utenti");
    let rq = collection.findOne({ "username": username });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/trovaPerizie", async (req, res, next) => {

    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("perizie");
    let rq = collection.find({}).toArray();
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/trovaPerizieId", async (req, res, next) => {
    let username = req["body"].username;
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("perizie");
    let rq = collection.find({ "username": username }).toArray();
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/prendiImmagini", async (req, res, next) => {
    var cloudinary = require('cloudinary');
    cloudinary.v2.api
        .resource('rilieviPerizie/perizia1')
        .then(result => res.send(result));
});

app.post("/api/caricaLoginImage", async (req, res, next) => {
    var cloudinary = require('cloudinary');
    cloudinary.v2.api
        .resource('rilieviPerizie/loginFolder/login')
        .then(result => res.send(result));
});

app.post("/api/addPerizia", async (req, res, next) => {

    // cloudinary.v2.api
    //     .resource('rilieviPerizie/perizia1')
    //     .then(result => res.send(result));
    let username = req["body"].username;
    let data = req["body"].data;
    let ora = req["body"].ora;
    let descrizione = req["body"].descrizione;
    let latitudine = req["body"].latitudine;
    let longitudine = req["body"].longitudine;
    let foto = req["body"].foto;
    let commento = req["body"].commento;

    let arrayFoto = [];

    for (let i = 0; i < foto.length; i++) {
        arrayFoto.push(await caricaCloudinary(foto[i]))
    }

    let addItem = {
        "username": username,
        "data": data,
        "ora": ora,
        "latitudine": latitudine,
        "longitudine": longitudine,
        "descrizione": descrizione,
        "foto": arrayFoto,
        "commento": commento
    }

    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    let collection = client.db(DBNAME).collection("perizie");
    let rq = collection.insertOne(addItem);
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
    console.log(username);
});

function caricaCloudinary(foto) {
    return new Promise((resolve, reject) => {
        console.log(foto)
        _cloudinary.v2.uploader.upload(foto, { "folder": "rilieviPerizie" })
            .catch((err) => {
                console.log(err);
                reject(err);
            })
            .then(async function (response: UploadApiResponse) {
                console.log(response);
                resolve(response.url);
            });
    });
}





app.post("/api/sendMail", async (req, res, next) => {
    let mittente = req['payload'].username;
    let mail = req.body.mail;
    mail.from = mittente;
    let destinatario = mail.to;
    delete mail.to;
    // console.log(mail);
    const client = new MongoClient(CONNECTION_STRING);
    await client.connect();
    const collection = client.db(DBNAME).collection("mail");
    let rq = collection.updateOne({ "username": destinatario }, { "$push": { "mail": mail } });
    rq.then((result) => {
        res.status(200).send({ "ris": "ok" });
    }).catch((err) => {
        res.status(500).send("Errore invio mail");
    }).finally(() => client.close());
});
//********************************************************************************************//
// Default route e gestione degli errori
//********************************************************************************************//

app.use("/", (req, res, next) => {
    res.status(404);
    if (req.originalUrl.startsWith("/api/")) {
        res.send(`Api non disponibile`);
    }
    else {
        res.send(paginaErrore);
    }
});

app.use("/", (err, req, res, next) => {
    console.log("************* SERVER ERROR ***************\n", err.stack);
    res.status(500).send(err.message);
});