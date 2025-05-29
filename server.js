const { MongoClient } = require("mongodb");
const express = require('express');  //import express lib
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs")
const i18n = require("./i18n")

const DATABASE_URL = "mongodb+srv://RHRS_USER:Txtkai18@mycluster.xya3g.mongodb.net/HTMLtoHERO?retryWrites=true&w=majority&appName=MyCluster";
const client = new MongoClient(DATABASE_URL);

let db, accountsCollection;

async function runDataBase() {
    try {

        await client.connect(); // Connect the client to server
        db = client.db();
        accountsCollection = db.collection("accounts");

    } catch (error) {
        console.log(error);
    }
}

async function insertOneToDatabase(object) {
    try {
        return await accountsCollection.insertOne(object);
    } catch (error) {
        console.log(error);
    }
}

async function findOneInDatabase(field, value) {
    try {
        return await accountsCollection.findOne({ [field]: value });
    } catch (error) {
        console.log(error);
    }
}

async function updateOneInDatabase(field, value, update) {
    try {
        return await accountsCollection.updateOne({ [field]: value }, update);
    } catch (error) {
        console.log(error);
    }
}

const app = express();   //creating app

app.use(express.urlencoded({ extended: true })); // To handle form data
app.use(express.json()); // To handle JSON data
app.use(cookieParser());
app.set('trust proxy', true);
app.set('view engine', 'ejs')

app.post("/api/consoleLog", (req, res) => { // Server tarafinda log cikartma
    try {
        console.log(req.body.message);
    } catch (error) {
        console.log(error);
    }
});

/*async function addPoints(email, amount) {
    try {
        let user = findOneInDatabase("email", email);
        user.
    } catch(error) {
        console.log(error)
    }
}*/

app.post("/api/login", async (req, res) => {
    try {
        const user = await findOneInDatabase("email", req.body.email);

        if (!user) {
            return res.json({ errorName: "invalidEmail" });
        }

        const { email, password } = user;

        if (!password || !email) {
            res.cookie("isLoggedIn", false);
            return res.json({ errorName: "invalidCredentials" });
        }

        if (req.body.password === password) {
            res.cookie("isLoggedIn", true);
            res.cookie("currentEmail", email);
            res.cookie("currentPassword", password);
            return res.json({ isLoggedIn: true });
        } else {
            res.cookie("isLoggedIn", false);
            return res.json({ errorName: "invalidPassword" });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.cookie("isLoggedIn", false);
        return res.status(500).json({ errorName: "serverError" });
    }
});

app.post("/api/register", async (req, res) => {
    try {
        const { email, password, name, birthyear, birthmonth, birthday } = req.body;

        const birthyearNum = parseInt(birthyear);
        const birthmonthNum = parseInt(birthmonth);
        const birthdayNum = parseInt(birthday);

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        const user = await findOneInDatabase("email", email);
        if (user) {
            return res.json({ errorName: "emailExsists" });
        }

        const USER = {
            email: email,
            password: password,
            name: name,
            birthyear: birthyearNum,
            birthmonth: birthmonthNum,
            birthday: birthdayNum,
            level: 0,
            points: 0,
            createday: day,
            createmonth: month,
            createyear: year,
            lastCheckedCssPageLink: null,
            lastCheckedHtmlPageLink: null,
            lastCheckedJsPageLink: null,
            checkedCssPages: [],
            checkedHtmlPages: [],
            checkedJsPages: [],
            lastCompletedCssExerciseNumber: 0,
            lastCompletedCssJsNumber: 0,
            lastCompletedHtmlExerciseNumber: 0,
        };
        await insertOneToDatabase(USER);

        return res.json({ errorName: "noerror" });

    } catch (error) {
        console.error("Registration error:", error);
        return res.json({ errorName: "serverError" });
    }
});

app.post("/api/getAccount", (req, res) => {
    try {

        findOneInDatabase("email", req.body.email).then(user => {
            if (user) {
                let pass = user.password;
                if (pass === req.body.password) res.json(user);
            }
        });
    } catch (error) {
        console.log(error);
    }
});

app.post("/api/checkHtmlPage", async (req, res) => {
    try {
        const isLoggedIn = req.cookies.isLoggedIn;
        const email = req.cookies.currentEmail;
        if (isLoggedIn == "true") {
            await updateOneInDatabase("email", email, { $push: { checkedHtmlPages: req.body.link } });
            await updateOneInDatabase("email", email, { $set: { lastCheckedHtmlPageLink: req.body.link } });
        }
    } catch (error) {
        console.log(error);
    }
});

app.post("/api/checkCssPage", async (req, res) => {
    try {
        const isLoggedIn = req.cookies.isLoggedIn;
        const email = req.cookies.currentEmail;
        if (isLoggedIn == "true") {
            await updateOneInDatabase("email", email, { $push: { checkedCssPages: req.body.link } });
            await updateOneInDatabase("email", email, { $set: { lastCheckedCssPageLink: req.body.link } });
        }
    } catch (error) {
        console.log(error);
    }
});

app.post("/api/checkJsPage", async (req, res) => {
    try {
        const isLoggedIn = req.cookies.isLoggedIn;
        const email = req.cookies.currentEmail;
        if (isLoggedIn == "true") {
            await updateOneInDatabase("email", email, { $push: { checkedJsPages: req.body.link } });
            await updateOneInDatabase("email", email, { $set: { lastCheckedJsPageLink: req.body.link } });
        }
    } catch (error) {
        console.log(error);
    }
});

app.post("/api/checkCheckedHtmlPage", async (req, res) => {
    try {

        const isLoggedIn = req.cookies.isLoggedIn;
        const email = req.cookies.currentEmail;
        if (isLoggedIn == "true") {
            await findOneInDatabase("email", email).then(user => {
                if (user) {
                    if (user.checkedHtmlPages.includes(req.body.PAGELINK)) res.json({ PAGECHECKED: true })
                }
            })
        }

    } catch (error) {
        console.log(error);
        res.json({ PAGECHECKED: false })
    }
});

app.post("/api/checkCheckedCssPage", async (req, res) => {
    try {

        const isLoggedIn = req.cookies.isLoggedIn;
        const email = req.cookies.currentEmail;
        if (isLoggedIn == "true") {
            await findOneInDatabase("email", email).then(user => {
                if (user) {
                    if (user.checkedCssPages.includes(req.body.PAGELINK)) res.json({ PAGECHECKED: true })
                }
            })
        }

    } catch (error) {
        console.log(error);
        res.json({ PAGECHECKED: false })
    }
});


app.post("/api/checkCheckedJsPage", async (req, res) => {
    try {

        const isLoggedIn = req.cookies.isLoggedIn;
        const email = req.cookies.currentEmail;
        if (isLoggedIn == "true") {
            await findOneInDatabase("email", email).then(user => {
                if (user) {
                    if (user.checkedJsPages.includes(req.body.PAGELINK)) res.json({ PAGECHECKED: true })
                }
            })
        }

    } catch (error) {
        console.log(error);
        res.json({ PAGECHECKED: false })
    }
});

app.get("/", async (req, res) => {    //get route
    try {
        res.sendFile(path.join(__dirname, '/views/redirector.html'));
    } catch (error) {
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
    }
});

app.get("/:lang/profile", (req, res) => {

    try {
        const lang = req.params.lang;

        const isLoggedIn = req.cookies.isLoggedIn;
        if (isLoggedIn === undefined || isLoggedIn === null || isLoggedIn == "false") {
            return res.redirect('/' + lang + '/login');
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('profile', {
            t,
            lang
        })

    } catch (error) {
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
    }
});

app.get("/:lang/exercises/html", (req, res) => {

    try {
        const lang = req.params.lang;

        const isLoggedIn = req.cookies.isLoggedIn;
        if (isLoggedIn === undefined || isLoggedIn === null || isLoggedIn == "false") {
            return res.redirect('/' + lang + '/login');
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        /*
        let user = findOneInDatabase("email", req.cookies.email);
        if (!user) {
            return res.redirect('/');
        }

        let qnumber = user.lastCompletedHtmlExerciseNumber;
        if (!qnumber || isNaN(qnumber) || qnumber <= 0) {
            return res.redirect('/');
        }*/

        /*
        let partials = [];
        for (let i = 1; i <= qnumber; i++) {
            partials.push(`${i}`);
        }*/

        t = i18n.getFixedT(lang);

        res.render('exercisesHtml', {
            t,
            lang
        })

    } catch (error) {
        console.log(error);
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
        console.log(error);
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
        console.log(error);
    }
});

app.get("/:lang/exercises/css", (req, res) => {

    try {
        const lang = req.params.lang;

        const isLoggedIn = req.cookies.isLoggedIn;
        if (isLoggedIn === undefined || isLoggedIn === null || isLoggedIn == "false") {
            return res.redirect('/' + lang + '/login');
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('exercisesCss', {
            t,
            lang
        })

    } catch (error) {
        console.log(error);
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
        console.log(error);
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
        console.log(error);
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
        console.log(error);
    }
});

app.get("/:lang/exercises/js", (req, res) => {

    try {
        const lang = req.params.lang;

        const isLoggedIn = req.cookies.isLoggedIn;
        if (isLoggedIn === undefined || isLoggedIn === null || isLoggedIn == "false") {
            return res.redirect('/' + lang + '/login');
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        t = i18n.getFixedT(lang);

        res.render('exercisesJs', {
            t,
            lang
        })

    } catch (error) {
        console.log(error);
    }
});

app.get("/:lang/login", (req, res) => {

    try {
        const lang = req.params.lang;

        const options = {
            async: true
        }

        if (!["en", "tr", "es", "fr", "de", "pt", "ar", "ru"].includes(lang)) {
            return res.redirect("/404")
        }

        const isLoggedIn = req.cookies.isLoggedIn;
        if (isLoggedIn === "true") {
            return res.redirect('/' + lang + '/profile');
        }

        t = i18n.getFixedT(lang);

        res.render('login', {
            t,
            lang,
            options
        })

    } catch (error) {
        console.log(error);
    }
});

app.get("/404", (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '/views/redirector404.html'));
    } catch (error) {
        console.log(error);
    }
});

app.use(async (req, res, next) => {
    try {
        res.sendFile(path.join(__dirname, '/views/redirector404.html'));
    } catch (error) {
        console.log(error);
    }
});

runDataBase().then(() => {
    app.listen(3000, () => {
        console.log("Server listening on port 3000");
    });
});

