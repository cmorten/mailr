# mailr
For emailing a list from a csv

## Requires:

1. `npm install`

2. `config.json` e.g.

    ```
    {
        "account": {
            "username": "name@mail.com",
            "password": "*******"
        },
        "server": {
            "host": "smtp.live.com",
            "port": 587
        }
    }
    ```

3. `names.csv` e.g.

    ```
    Name1,name1@mail.com
    Name2,name2@mail.com
    Name3,name3@mail.com
    ```

4. `email.txt` e.g.

    ```
    Dear {{NAME}},

    Thanks for letting me test on your email {{EMAIL}} ({{NAME}}) so I can get this working, it's much appreciated :)

    Best Wishes,

    A friend xoxo
    ```

5. (Optional) `footer.html` e.g.

    ```
    <br />
    <b>Super Friend Inc. &copy 2017</b>
    ```

## Usage

```
node app.js [ARGS]

Arguments:
    --users     (Required) Path to the CSV file containing the users list.
    --subject   (Required) The templated email subject line to send.
    --body      (Required) Path to the file containing the email body text to send.
    --footer    (Optional) Path to the file containing the email footer to send. This will only be added if HTML email format is supported.

Example Usage:

    node app.js --users "names.csv" --subject "Hello {{NAME}}" --body "email.txt" --footer "footer.html"
```