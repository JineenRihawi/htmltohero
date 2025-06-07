const { MongoClient, ObjectId } = require("mongodb");
const express = require('express');  //import express lib
const session = require('express-session');
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs")
const i18n = require("./i18n");
const nodemailer = require("nodemailer");
const { from } = require("form-data");
const { inflate } = require("zlib");
const { error } = require("console");

const DATABASE_URL = "mongodb+srv://RHRS_USER:Txtkai18@mycluster.xya3g.mongodb.net/HTMLtoHERO?retryWrites=true&w=majority&appName=MyCluster";
const client = new MongoClient(DATABASE_URL);

let EMAILTRANSPORTER = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "html2hero@gmail.com",
        pass: "rgmv ydlb bcov vzej"
    }
})

let db, accountsCollection;

async function runDataBase() {
    try {

        await client.connect(); // Connect the client to server
        db = client.db();
        accountsCollection = db.collection("accounts");

    } catch (error) {
    }
}

async function insertOneToDatabase(object) {
    try {
        return await accountsCollection.insertOne(object);
    } catch (error) {
    }
}

async function findOneInDatabase(field, value) {
    try {
        return await accountsCollection.findOne({ [field]: value });
    } catch (error) {
    }
}

async function updateOneInDatabase(field, value, update) {
    try {
        return await accountsCollection.updateOne({ [field]: value }, update);
    } catch (error) {
    }
}

const app = express();   //creating app

app.use(express.urlencoded({ extended: true })); // To handle form data
app.use(express.json()); // To handle JSON data
app.use(cookieParser());
app.set('trust proxy', true);
app.set('view engine', 'ejs')
app.use(session({
    secret: 'ABsbnacjjskhjlejlrhJWEukxvnjnskdlfLWJEUkflskdvnleiI',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }   // Session expiration in ms (e.g., 1 minute)
}));


async function getAccount(TOKEN) {
    const OBJECTID = ObjectId.createFromHexString(TOKEN);
    const user = await findOneInDatabase("_id", OBJECTID);
    if (!user) {
        return "NOUSER";
    }
    return user;
}

async function isLoggedIn(TOKEN) {
    if (!TOKEN) return false;
    const USER = await getAccount(TOKEN);
    if (!USER || USER === "NOUSER") return false;
    return true;
}

async function sendEmail(subject, text, email) {
    try {

        let EMAIL = {
            from: "html2hero@gmail.com",
            to: email,
            subject: subject,
            text: text
        }

        EMAILTRANSPORTER.sendMail(EMAIL, (error, info) => { });

    } catch (error) {
    }
}

app.post("/api/consoleLog", (req, res) => { // Server tarafinda log cikartma
    try {
        console.log(req.body.message);
    } catch (error) {
    }
});

async function addPoints(TOKEN, amount) {
    try {
        let user = await getAccount(TOKEN);
        if (!user || user === "NOUSER") return;
        let points = user.points;
        if (points === undefined || isNaN(points)) return;
        let newPoints = points + amount;
        let levelsToAdd = 0;
        if (newPoints >= 500) {
            levelsToAdd = Math.floor(newPoints / 500);
            newPoints -= 500 * levelsToAdd;
        }
        const OBJECTID = ObjectId.createFromHexString(TOKEN);
        await updateOneInDatabase("_id", OBJECTID, { $set: { points: newPoints } });
        await updateOneInDatabase("_id", OBJECTID, { $inc: { level: levelsToAdd } });
        if (levelsToAdd > 0) return true;
        return false;
    } catch (error) {
        console.log(error)
    }
}

async function removePoints(TOKEN, amount) {
    try {
        let user = await getAccount(TOKEN);
        if (!user || user === "NOUSER") return;
        let points = user.points;
        if (points === undefined || isNaN(points)) return;
        let newPoints = points - amount;
        if (newPoints < 0) newPoints = 0;
        const OBJECTID = ObjectId.createFromHexString(TOKEN);
        await updateOneInDatabase("_id", OBJECTID, { $set: { points: newPoints } });
    } catch (error) {
        console.log(error)
    }
}

app.post("/api/login", async (req, res) => {
    try {
        const user = await findOneInDatabase("email", req.body.email);

        if (!user) {
            return res.json({ errorName: "invalidEmail", success: false });
        }

        const { email, password } = user;

        if (!password || !email) {
            return res.json({ errorName: "invalidCredentials", success: false });
        }

        if (req.body.password === password) {
            res.cookie("TOKEN", user._id);
            return res.json({ errorName: "noerror", success: true });
        } else {
            return res.json({ errorName: "invalidPassword", success: false });
        }
    } catch (error) {
        return res.json({ errorName: "serverError", success: false });
    }
});

app.post("/api/registerFirstStep", async (req, res) => {
    try {

        const { email, emailsubject, emailmessage } = req.body;

        const user = await findOneInDatabase("email", email);
        if (user) {
            return res.json({ errorName: "emailExsists" });
        }

        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let CODE = '';
        for (let i = 0; i < 6; i++) {
            CODE += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        req.session.CODE = CODE;

        await sendEmail(emailsubject, `${emailmessage} : ${CODE}`, email);
        return res.json({ errorName: "noerror" });

    } catch (error) {
        return res.json({ errorName: "serverError" });
    }
});

app.post("/api/registerSecondStep", async (req, res) => {
    try {

        const CODE = req.session.CODE;
        if(!CODE) return res.json({errorName: "codeExpired"});
        if (CODE.length !== 6) return res.json({errorName: "incorrectCode"});

        const { email, password, name, birthyear, birthmonth, birthday, codeinput } = req.body;

        if (codeinput === CODE) {

            const birthyearNum = parseInt(birthyear);
            const birthmonthNum = parseInt(birthmonth);
            const birthdayNum = parseInt(birthday);

            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const day = today.getDate();

            const USER = {
                email: email,
                password: password,
                name: name,
                birthyear: birthyearNum,
                birthmonth: birthmonthNum,
                birthday: birthdayNum,
                level: 1,
                points: 0,
                createday: day,
                createmonth: month,
                createyear: year,
                lastCheckedCssPageLink: "null",
                lastCheckedHtmlPageLink: "null",
                lastCheckedJsPageLink: "null",
                checkedCssPages: [],
                checkedHtmlPages: [],
                checkedJsPages: [],
                lastCompletedCssExerciseNumber: 0,
                lastCompletedJsExerciseNumber: 0,
                lastCompletedHtmlExerciseNumber: 0,
            };

            await insertOneToDatabase(USER);
            return res.json({errorName: "noerror"});

        } else {
            return res.json({errorName: "incorrectCode"});
        }

    } catch (error) {
        return res.json({errorName: "servererror"});
    }
});

app.post("/api/checkHtmlPage", async (req, res) => {
    try {
        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN === true) {
            const OBJECTID = ObjectId.createFromHexString(TOKEN);
            await updateOneInDatabase("_id", OBJECTID, { $push: { checkedHtmlPages: req.body.link } });
            await updateOneInDatabase("_id", OBJECTID, { $set: { lastCheckedHtmlPageLink: req.body.link } });
            return res.json({ redirectToLoginPage: false });
        } else {
            return res.json({ redirectToLoginPage: true });
        }
    } catch (error) {
    }
});

app.post("/api/checkCssPage", async (req, res) => {
    try {
        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN === true) {
            const OBJECTID = ObjectId.createFromHexString(TOKEN);
            await updateOneInDatabase("_id", OBJECTID, { $push: { checkedCssPages: req.body.link } });
            await updateOneInDatabase("_id", OBJECTID, { $set: { lastCheckedCssPageLink: req.body.link } });
            return res.json({ redirectToLoginPage: false });
        } else {
            return res.json({ redirectToLoginPage: true });
        }
    } catch (error) {
    }
});

app.post("/api/checkJsPage", async (req, res) => {
    try {
        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN === true) {
            const OBJECTID = ObjectId.createFromHexString(TOKEN);
            await updateOneInDatabase("_id", OBJECTID, { $push: { checkedJsPages: req.body.link } });
            await updateOneInDatabase("_id", OBJECTID, { $set: { lastCheckedJsPageLink: req.body.link } });
            return res.json({ redirectToLoginPage: false });
        } else {
            return res.json({ redirectToLoginPage: true });
        }
    } catch (error) {
    }
});

app.post("/api/checkCheckedHtmlPage", async (req, res) => {
    try {

        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN === true) {
            const user = await getAccount(TOKEN);
            if (user.checkedHtmlPages.includes(req.body.PAGELINK)) {
                res.json({ PAGECHECKED: true })
            } else {
                return res.json({ PAGECHECKED: false })
            }
        } else {
            return res.json({ PAGECHECKED: false })
        }

    } catch (error) {
        res.json({ PAGECHECKED: false })
    }
});

app.post("/api/checkCheckedCssPage", async (req, res) => {
    try {

        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN === true) {
            const user = await getAccount(TOKEN);
            if (user.checkedCssPages.includes(req.body.PAGELINK)) {
                res.json({ PAGECHECKED: true })
            } else {
                return res.json({ PAGECHECKED: false })
            }
        } else {
            return res.json({ PAGECHECKED: false })
        }

    } catch (error) {
        res.json({ PAGECHECKED: false })
    }
});

app.post("/api/checkCheckedJsPage", async (req, res) => {
    try {

        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN === true) {
            const user = await getAccount(TOKEN);
            if (user.checkedJsPages.includes(req.body.PAGELINK)) {
                res.json({ PAGECHECKED: true })
            } else {
                return res.json({ PAGECHECKED: false })
            }
        } else {
            return res.json({ PAGECHECKED: false })
        }

    } catch (error) {
        res.json({ PAGECHECKED: false })
    }
});

app.use((req, res, next) => {
  if (req.hostname.endsWith('.onrender.com')) {
    return res.redirect('https://html2hero.net');
  }
  next();
});

app.get("/", async (req, res) => {    //get route
    try {
        res.sendFile(path.join(__dirname, '/views/redirector.html'));
    } catch (error) {
    }
});

//["en", "tr", "es", "fr", "de", "pt", "ar", "ru"]

// INDEX

app.get("/en", (req, res) => {

    try {
        const lang = "en";

        t = i18n.getFixedT(lang);

        res.render('index', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/tr", (req, res) => {

    try {
        const lang = "tr";

        t = i18n.getFixedT(lang);

        res.render('index', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/es", (req, res) => {

    try {
        const lang = "es";

        t = i18n.getFixedT(lang);

        res.render('index', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/fr", (req, res) => {

    try {
        const lang = "fr";

        t = i18n.getFixedT(lang);

        res.render('index', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/de", (req, res) => {

    try {
        const lang = "de";

        t = i18n.getFixedT(lang);

        res.render('index', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/pt", (req, res) => {

    try {
        const lang = "pt";

        t = i18n.getFixedT(lang);

        res.render('index', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/ar", (req, res) => {

    try {
        const lang = "ar";

        t = i18n.getFixedT(lang);

        res.render('index', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/ru", (req, res) => {

    try {
        const lang = "ru";

        t = i18n.getFixedT(lang);

        res.render('index', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/404", (req, res) => {

    try {
        const lang = req.params.lang;

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('notFound', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/profile", async (req, res) => {

    try {
        const lang = req.params.lang;

        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN !== true) {
            return res.redirect('/' + lang + '/login');
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        let user = await getAccount(TOKEN);
        if (!user || user === "NOUSER") return res.redirect("/");

        let name = user.name;
        let birthyear = user.birthyear;
        let birthmonth = user.birthmonth;
        let birthday = user.birthday;
        let createyear = user.createyear;
        let createmonth = user.createmonth;
        let createday = user.createday;
        let level = user.level;
        let points = user.points;
        let lastCheckedCssPageLink = user.lastCheckedCssPageLink;
        let lastCheckedHtmlPageLink = user.lastCheckedHtmlPageLink;
        let lastCheckedJsPageLink = user.lastCheckedJsPageLink;
        let lastCompletedCssExerciseNumber = user.lastCompletedCssExerciseNumber;
        let lastCompletedJsExerciseNumber = user.lastCompletedJsExerciseNumber;
        let lastCompletedHtmlExerciseNumber = user.lastCompletedHtmlExerciseNumber;

        let qnumberHtml = user.checkedHtmlPages.length;
        let qnumberCss = user.checkedCssPages.length;
        let qnumberJs = user.checkedJsPages.length;

        let profileUrl = user.profileUrl;

        t = i18n.getFixedT(lang);

        res.render('profile', {
            t,
            lang,
            name,
            birthyear,
            birthmonth,
            birthday,
            createyear,
            createmonth,
            createday,
            level,
            points,
            lastCheckedCssPageLink,
            lastCheckedHtmlPageLink,
            lastCheckedJsPageLink,
            lastCompletedCssExerciseNumber,
            lastCompletedJsExerciseNumber,
            lastCompletedHtmlExerciseNumber,
            qnumberHtml,
            qnumberCss,
            qnumberJs,
            profileUrl
        })

    } catch (error) {
    }
});

app.get("/:lang/search", (req, res) => {

    try {
        const lang = req.params.lang;
        const content = "";

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('search', {
            t,
            lang,
            content
        })

    } catch (error) {
    }
});

app.get("/:lang/register", (req, res) => {

    try {
        const lang = req.params.lang;

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('register', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/search/:content", (req, res) => {

    try {
        const lang = req.params.lang;
        const content = req.params.content;

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('search', {
            t,
            lang,
            content
        })

    } catch (error) {
    }
});

app.get("/:lang/tutorials/html", (req, res) => {

    try {
        const lang = req.params.lang;

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('tutorialsHtml', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/tutorials/html/:page", (req, res) => {

    try {
        const lang = req.params.lang;
        const page = req.params.page;
        const viewPath = path.join(__dirname, "views", "htmlTutorials", page + ".ejs");
        if (!fs.existsSync(viewPath)) {
            return res.redirect("/404");
        }


        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render(`htmlTutorials/${page}`, {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/exercises/html", async (req, res) => {

    try {
        const lang = req.params.lang;

        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN !== true) {
            return res.redirect('/' + lang + '/login');
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        let USER = await getAccount(TOKEN);
        if (!USER || USER === "NOUSER") {
            return res.redirect(`/${lang}`);
        }

        let qnumber = USER.lastCompletedHtmlExerciseNumber;
        if (!qnumber || isNaN(qnumber) || qnumber <= 0 || qnumber > 20) {
            const OBJECTID = ObjectId.createFromHexString(TOKEN);
            await updateOneInDatabase("_id", OBJECTID, { $set: { lastCompletedHtmlExerciseNumber: 1 } });
            return res.redirect(`/${lang}`);
        }

        let partials = [];
        for (let i = 1; i <= qnumber; i++) {
            partials.push(`${i}`);
        }

        t = i18n.getFixedT(lang);

        res.render('exercisesHtml', {
            t,
            lang,
            qnumber,
            partials
        })

    } catch (error) {
    }
});

app.post("/api/checkHtmlAnswer", async (req, res) => {
    try {

        const { question, answer } = req.body;

        const TOKEN = req.cookies.TOKEN;

        let user = await getAccount(TOKEN);
        if (!user || user === "NOUSER") {
            return res.json({ error: true, success: false, pointsAdd: 0, pointsRemove: 0, levelUp: false });
        }

        let qnumber = user.lastCompletedHtmlExerciseNumber;
        if (!qnumber || isNaN(qnumber) || qnumber <= 0 || qnumber > 20) {
            const OBJECTID = ObjectId.createFromHexString(TOKEN);
            await updateOneInDatabase("_id", OBJECTID, { $set: { lastCompletedHtmlExerciseNumber: 1 } });
            return res.json({ error: true, success: false, pointsAd: 0, pointsRemove: 0, levelUp: false });
        }

        if (!question || !answer) {
            return res.json({ error: true, success: false, pointsAdd: 0, pointsRemove: 0, levelUp: false });
        }

        const answers = [3, 2, 4, 3, 2, 5, 2, 4, 3, 2, 5, 3, 4, 2, 5, 3, 4, 4, 2, 3];
        const points = [10, 10, 20, 30, 40, 50, 60, 70, 80, 90, 90, 100, 100, 100, 120, 120, 150, 150, 150, 300];

        if (question === qnumber) {
            if (answer === answers[qnumber - 1]) {
                const OBJECTID = ObjectId.createFromHexString(TOKEN);
                await updateOneInDatabase("_id", OBJECTID, { $inc: { lastCompletedHtmlExerciseNumber: 1 } });
                let result = await addPoints(TOKEN, points[qnumber - 1]);
                return res.json({ error: false, success: true, pointsAdd: points[qnumber - 1], pointsRemove: 0, levelUp: result });
            } else {
                await removePoints(TOKEN, points[qnumber - 1] / 10);
                return res.json({ error: false, success: false, pointsAdd: 0, pointsRemove: points[qnumber - 1] / 10, levelUp: false });
            }
        }

    } catch (error) {
    }
});

app.get("/:lang/tutorials/css", (req, res) => {

    try {
        const lang = req.params.lang;

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('tutorialsCss', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/tutorials/css/:page", (req, res) => {

    try {
        const lang = req.params.lang;
        const page = req.params.page;
        const viewPath = path.join(__dirname, "views", "cssTutorials", page + ".ejs");
        if (!fs.existsSync(viewPath)) {
            return res.redirect("/404");
        }


        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render(`cssTutorials/${page}`, {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/exercises/css", async (req, res) => {

    try {
        const lang = req.params.lang;

        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN !== true) {
            return res.redirect('/' + lang + '/login');
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        let USER = await getAccount(TOKEN);
        if (!USER || USER === "NOUSER") {
            return res.redirect(`/${lang}`);
        }

        let qnumber = USER.lastCompletedCssExerciseNumber;
        if (!qnumber || isNaN(qnumber) || qnumber <= 0 || qnumber > 20) {
            const OBJECTID = ObjectId.createFromHexString(TOKEN);
            await updateOneInDatabase("_id", OBJECTID, { $set: { lastCompletedCssExerciseNumber: 1 } });
            return res.redirect(`/${lang}`);
        }

        let partials = [];
        for (let i = 1; i <= qnumber; i++) {
            partials.push(`${i}`);
        }

        t = i18n.getFixedT(lang);

        res.render('exercisesCss', {
            t,
            lang,
            qnumber,
            partials
        })

    } catch (error) {
    }
});

app.post("/api/checkCssAnswer", async (req, res) => {
    try {

        const { question, answer } = req.body;

        const TOKEN = req.cookies.TOKEN;

        let user = await getAccount(TOKEN);
        if (!user || user === "NOUSER") {
            return res.json({ error: true, success: false, pointsAdd: 0, pointsRemove: 0, levelUp: false });
        }

        let qnumber = user.lastCompletedCssExerciseNumber;
        if (!qnumber || isNaN(qnumber) || qnumber <= 0 || qnumber > 20) {
            const OBJECTID = ObjectId.createFromHexString(TOKEN);
            await updateOneInDatabase("_id", OBJECTID, { $set: { lastCompletedCssExerciseNumber: 1 } });
            return res.json({ error: true, success: false, pointsAd: 0, pointsRemove: 0, levelUp: false });
        }

        if (!question || !answer) {
            return res.json({ error: true, success: false, pointsAdd: 0, pointsRemove: 0, levelUp: false });
        }

        const answers = [3, 2, 4, 1, 5, 2, 3, 4, 1, 5, 2, 3, 4, 1, 5, 2, 3, 4, 1, 5];
        const points = [10, 10, 10, 20, 50, 80, 80, 100, 100, 110, 140, 140, 140, 140, 150, 150, 180, 190, 200, 400];

        if (question === qnumber) {
            if (answer === answers[qnumber - 1]) {
                const OBJECTID = ObjectId.createFromHexString(TOKEN);
                await updateOneInDatabase("_id", OBJECTID, { $inc: { lastCompletedCssExerciseNumber: 1 } });
                let result = await addPoints(TOKEN, points[qnumber - 1]);
                return res.json({ error: false, success: true, pointsAdd: points[qnumber - 1], pointsRemove: 0, levelUp: result });
            } else {
                await removePoints(TOKEN, points[qnumber - 1] / 10);
                return res.json({ error: false, success: false, pointsAdd: 0, pointsRemove: points[qnumber - 1] / 10, levelUp: false });
            }
        }

    } catch (error) {
    }
});

app.get("/:lang/codeeditor", (req, res) => {

    try {
        const lang = req.params.lang;

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('codeeditor', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/tutorials/js", (req, res) => {

    try {
        const lang = req.params.lang;

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('tutorialsJs', {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/tutorials/js/:page", (req, res) => {

    try {
        const lang = req.params.lang;
        const page = req.params.page;
        const viewPath = path.join(__dirname, "views", "jsTutorials", page + ".ejs");
        if (!fs.existsSync(viewPath)) {
            return res.redirect("/404");
        }


        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render(`jsTutorials/${page}`, {
            t,
            lang
        })

    } catch (error) {
    }
});

app.get("/:lang/exercises/js", async (req, res) => {

    try {
        const lang = req.params.lang;

        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);

        if (LOGIN !== true) {
            return res.redirect('/' + lang + '/login');
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        let USER = await getAccount(TOKEN);
        if (!USER || USER === "NOUSER") {
            return res.redirect(`/${lang}`);
        }

        let qnumber = USER.lastCompletedJsExerciseNumber;
        if (!qnumber || isNaN(qnumber) || qnumber <= 0 || qnumber > 24) {
            const OBJECTID = ObjectId.createFromHexString(TOKEN);
            await updateOneInDatabase("_id", OBJECTID, { $set: { lastCompletedJsExerciseNumber: 1 } });
            return res.redirect(`/${lang}`);
        }

        let partials = [];
        for (let i = 1; i <= qnumber; i++) {
            partials.push(`${i}`);
        }

        t = i18n.getFixedT(lang);

        res.render('exercisesJs', {
            t,
            lang,
            qnumber,
            partials
        })

    } catch (error) {
    }
});

app.post("/api/checkJsAnswer", async (req, res) => {
    try {

        const { question, answer } = req.body;

        const TOKEN = req.cookies.TOKEN;

        let user = await getAccount(TOKEN);
        if (!user || user === "NOUSER") {
            return res.json({ error: true, success: false, pointsAdd: 0, pointsRemove: 0, levelUp: false });
        }

        let qnumber = user.lastCompletedJsExerciseNumber;
        if (!qnumber || isNaN(qnumber) || qnumber <= 0 || qnumber > 24) {
            const OBJECTID = ObjectId.createFromHexString(TOKEN);
            await updateOneInDatabase("_id", OBJECTID, { $set: { lastCompletedJsExerciseNumber: 1 } });
            return res.json({ error: true, success: false, pointsAd: 0, pointsRemove: 0, levelUp: false });
        }

        if (!question || !answer) {
            return res.json({ error: true, success: false, pointsAdd: 0, pointsRemove: 0, levelUp: false });
        }

        const answers = [2, 2, 3, 2, 1, 3, 2, 3, 2, 2, 3, 2, 3, 3, 1, 2, 1, 2, 1, 2, 2, 3, 2, 2];
        const points = [20, 20, 30, 40, 50, 50, 60, 60, 60, 70, 70, 90, 100, 120, 150, 150, 150, 180, 200, 200, 210, 240, 250, 500];

        if (question === qnumber) {
            if (answer === answers[qnumber - 1]) {
                const OBJECTID = ObjectId.createFromHexString(TOKEN);
                await updateOneInDatabase("_id", OBJECTID, { $inc: { lastCompletedJsExerciseNumber: 1 } });
                let result = await addPoints(TOKEN, points[qnumber - 1]);
                return res.json({ error: false, success: true, pointsAdd: points[qnumber - 1], pointsRemove: 0, levelUp: result });
            } else {
                await removePoints(TOKEN, points[qnumber - 1] / 10);
                return res.json({ error: false, success: false, pointsAdd: 0, pointsRemove: points[qnumber - 1] / 10, levelUp: false });
            }
        }

    } catch (error) {
    }
});

app.get("/:lang/login", async (req, res) => {

    try {
        const lang = req.params.lang;

        const options = {
            async: true
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        const TOKEN = req.cookies.TOKEN;
        const LOGIN = await isLoggedIn(TOKEN);
        if (LOGIN === true) {
            return res.redirect('/' + lang + '/profile');
        }

        t = i18n.getFixedT(lang);

        res.render('login', {
            t,
            lang,
            options
        })

    } catch (error) {
    }
});

app.get("/404", (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '/views/redirector404.html'));
    } catch (error) {
    }
});

app.use(async (req, res, next) => {
    try {
        res.sendFile(path.join(__dirname, '/views/redirector404.html'));
    } catch (error) {
    }
});

runDataBase().then(() => {
    app.listen(3000, () => {
        console.log("Server listening on port 3000");
    });
});