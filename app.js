// Imports
const flags = require("flags");
const fs = require('fs');
const nodemailer = require("nodemailer");
const config = require("./config.json");

// Define command line arguments
flags.defineString("users", "", "(Required) Path to the CSV file containing the users list.");
flags.defineString("subject", "", "(Required) The email subject to send.");
flags.defineString("body", "", "(Required) Path to the file containing the email body text to send.");
flags.defineString("footer", "", "(Optional) Path to the file containing the email footer to send (if html email).");

flags.exitOnError = true;
flags.usageInfo = `
Usage:

    node app.js [ARGS]

Arguments:
    --users     (Required) Path to the CSV file containing the users list.
    --subject   (Required) The templated email subject line to send.
    --body      (Required) Path to the file containing the email body text to send.
    --footer    (Optional) Path to the file containing the email footer to send. This will only be added if HTML email format is supported.

Example:

    node app.js --users "names.csv" --subject "Hello {{NAME}}" --body "email.txt" --footer "footer.html"
`;

flags.parse();

/**
 * @func usage prints the usage information to stdout and exits.
 */
let usage = () => {
    console.log(flags.usageInfo);
    process.exit();
};

/**
 * @func validateConfig validates a configuration json
 * 
 * @param {*} c a configuration json
 */
let validateConfig = (c) => {
    if (!c.account) {
        console.log("Config missing required field 'account'");
        return false;
    }
    if (!c.account.username) {
        console.log("Config missing required field 'account.username'");
        return false;
    }
    if (!c.account.password) {
        console.log("Config missing required field 'account.password'");
        return false;
    }
    if (!c.server) {
        console.log("Config missing required field 'server'");
        return false;
    }
    if (!c.server.host) {
        console.log("Config missing required field 'server.host'");
        return false;
    }
    if (c.server.port && typeof c.server.port !== "number") {
        console.log("Config contains invalid field 'server.port'. Must be of type 'number'");
        return false;
    }
    if (c.server.secure && typeof c.server.secure !== "boolean") {
        console.log("Config contains invalid field 'server.port'. Must be of type 'boolean'");
        return false;
    }
    return true;
};

/**
 * @func validateUser validates the parts of a user from the CSV
 * 
 * @param {*} user the user parts to validate
 */
let validateUser = (user) => {
    if (parts[0] === "") {
        console.log("Invalid user, name is empty.");
        return false;
    }
    if (parts[1] === "") {
        console.log("Invalid user, email is empty.");
        return false;
    }
    if (parts[1].indexOf("@") < 0) {
        console.log("Invalid user, invalid email provided.");
        return false;
    }
    return true;
};

/**
 * @func parse parses template text with user information
 * 
 * @param {string} t the template text to parse with the user information
 * @param {*} u the user object
 */
let parse = (t, u) => {
    return t.replace(/\{\{NAME\}\}/g, u.name).replace(/\{\{EMAIL\}\}/g, u.email);
};

/**
 * @func sendMail loops through users and sends them the processed email text and subject
 * 
 * @param {string} t the text template to use
 * @param {*} u the list of users
 */
let sendMail = (textBody, subjectText, users) => {
    let successCount = 0;

    for (let user of u) {
        let pText = parse(textBody, user);
        let pSubject = parse(subjectText, user);

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
            } else {
                console.log(`Successfully sent email to ${user.email}. Details:\n${JSON.stringify(res)}`);
                successCount++;
            }
        });
    }

    console.log(`Summary: ${successCount} / ${users.length} emails successfully sent.`);
};

// Grab the command line args
let userFile = flags.get("users");
let textFile = flags.get("body");
let footerFile = flags.get("footer");
let subject = flags.get("subject");

// Validate the required arguments
if (userFile === "") {
    console.log("Invalid parameters passed. Missing file.");
    usage();
} else if (textFile === "") {
    console.log("Invalid parameters passed. Missing text.");
    usage();
} else if (subject === "") {
    console.log("Invalid parameters passed. Missing subject.");
    usage();
}

// Validate the required configuration
if (!validateConfig(config)) {
    console.log("Exiting.");
    process.exit();
}

// Create the mail transporter
let transporter = nodemailer.createTransport({
    host: config.server.host,
    port: (config.server.port || 587),
    secure: (config.server.secure || false),
    auth: {
        user: config.account.username,
        pass: config.account.password
    }
});

// Parse the footer (if passed)
let footer = "";
if (footerFile !== "") {
    try {
        footer = fs.readFileSync(footerFile);
        console.log(`Using Footer Text:\n\n${footer}`);
    } catch (e) {
        console.log(`\nAn error occured:\n\n${e.message}`);
        usage();
    }
}

// Parse the email body text
let emailTextTemplate = "";
try {
    emailTextTemplate = fs.readFileSync(textFile);
} catch (e) {
    console.log(`An error occured trying to read the file ${textFile} for the email text body. Error Message:\n\t${e.message}`);
    usage();
}

console.log(`Processed file ${textFile} for the email text body. Text:\n${emailTextTemplate}`);

// Try to read the users file into a users array
let users = [];
try {
    let userData = fs.readFile(userFile);
    let rows = userData.split(/\r?\n|\r/);

    for (let row of rows) {
        let parts = row.split(",");

        if (!validateUser(parts)) {
            console.log("Exiting.");
            process.exit();
        }

        users.push({
            name: parts[0],
            email: parts[1]
        });
    }
} catch (e) {
    console.log(`An error occured trying to read the user list file ${userFile}. Error Message:\n\t${e.message}`);
    usage();
}

// Send the mail to the users list.
sendMail(emailTextTemplate, subject, users);