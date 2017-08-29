const flags = require("flags");
const fs = require('fs');
const nodemailer = require("nodemailer");
const config = require("./config.json");

flags.defineString("file", "", "The csv file to use.");
flags.defineString("text", "", "The email text to send.");
flags.defineString("footer", "", "The email footer to send (if html email).");
flags.defineString("subject", "", "The email subject to send.");
flags.parse();

let userFile = flags.get("file");
let textFile = flags.get("text");
let footerFile = flags.get("footer");
let subject = flags.get("subject");

if (userFile === "") {
    console.log("Invalid parameters passed. Missing file.");
    process.exit();
} else if (textFile === "") {
    console.log("Invalid parameters passed. Missing text.");
    process.exit();
} else if (subject === "") {
    console.log("Invalid parameters passed. Missing subject.");
    process.exit();
}

let transporter = nodemailer.createTransport({
    host: config.server.host,
    port: (config.server.port || 587),
    secure: (config.server.secure || false),
    auth: {
        user: config.account.username,
        pass: config.account.password
    }
});

let footer = "";

if (footerFile !== "") {
    footer = fs.readFileSync(footerFile);
    console.log(`Using Footer Text:\n\n${footer}`);
}

fs.readFile(textFile, 'utf8', (err, data) => {
    if (err) {
        console.log(`An error occured trying to read the file ${textFile} for the email text body. Error Message:\n${err.message}`);
        process.exit();
    }

    console.log(`Processed file ${textFile} for the email text body. Text:\n${data}`);
    processUsersFile(data);
});

/**
 * @func processUsersFile gets the user information from the specified csv and parses it into an array.
 * 
 * @param {*} t the email text to be passed through with the user list to the sendMail func.
 */
let processUsersFile = (t) => {

    let users = [];

    fs.readFile(userFile, 'utf8', (err, data) => {
        if (err) {
            console.log(`An error occured trying to read the user list file ${userFile}. Error Message:\n${err.message}`);
            process.exit();
        }

        let rows = data.replace(/\r/g, "").split("\n");

        for (let row of rows) {
            let parts = row.split(",");
            users.push({
                name: parts[0],
                email: parts[1]
            });
        }

        sendMail(t, users);
    });

}

/**
 * @func parse parses template text with user information
 * 
 * @param {string} t the template text to parse with the user information
 * @param {*} u the user object
 */
let parse = (t, u) => {
    return t.replace(/\{\{NAME\}\}/g, u.name).replace(/\{\{EMAIL\}\}/g, u.email);
}

/**
 * @func sendMail loops through users and sends them the processed email text and subject
 * 
 * @param {string} t the text template to use
 * @param {*} u the list of users
 */
let sendMail = (t, u) => {
    for (let user of u) {
        let pText = parse(t, user);
        let pSubject = parse(subject, user);

        let opts = {
            from: config.account.username,
            to: user.email,
            subject: pSubject,
            text: pText,
            html: pText.replace(/\n/g, "<br />") + "<br />" + footer
        }

        transporter.sendMail(opts, (err, res) => {
            if (err) {
                console.log(`There was an error sending an email to ${user.email}. Error message:\n${err.message}`);
            }
            console.log(`Successfully sent email to ${user.email}. Details:\n${JSON.stringify(res)}`);
        });
    }
};