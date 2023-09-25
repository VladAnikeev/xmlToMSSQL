const mssql = require('mssql')
const fs = require("fs");
const xml2js = require('xml2js');

// Настройка подключения
const config = {
    user: "user",
    password: "1",
    database: "MYDATABASE",
    server: 'DESKTOP-HOABVD5\\SQLEXPRESS',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // for azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    }
}

/**
 * 
 * @param string dateString - дата формате даты
 * @returns дату виде строки для DATETIME2 
 */
function formatterDate(dateString) {
    let pad = function (num) { return ('00' + num).slice(-2) };
    let date;
    date = new Date(dateString);
    return date.getUTCFullYear() + '.' +
        pad(date.getUTCMonth() + 1) + '.' +
        pad(date.getUTCDate()) + ' ' +
        pad(date.getUTCHours()) + ':' +
        pad(date.getUTCMinutes()) + ':' +
        pad(date.getUTCSeconds());
}

// открытие XML
const parser = new xml2js
    .Parser({ attrkey: "ATTR" });
let xml_string = fs
    .readFileSync("SSCC.xml", "utf8");

// Парсинг XML
let xmlResult;
parser.parseString(xml_string, (err, result) => {
    if (err)
        console.log("Error:", err);
    else {
        xmlResult = result;
    }
});


// Подключение 
mssql.connect(config, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log("Connected");

    let request = new mssql.Request();

    /**
     * функция для запросов и вывода результата
     * 
     * @param string sql  
     */
    function querySQL(sql) {
        request.query(sql, (err, recordSet) => {
            if (err) {
                return console.error(err.message + '\n');
            }
            console.log("successful sql query\n");
        })
    }

    // создание и заполнение данными таблицы up
    querySQL(
        `CREATE TABLE up
        (
            sscc BIGINT PRIMARY KEY IDENTITY,
            packing_date DATETIME2, 
            owner_id BIGINT,
            owner_organization_name NVARCHAR(500),
        );`
    );

    let up = xmlResult.root.up[0];

    querySQL(
        `SET IDENTITY_INSERT up ON

        INSERT INTO up
        (
            sscc,
            packing_date, 
            owner_id,
            owner_organization_name
        )
        VALUES
        (
            ${up.sscc[0]},
            '${formatterDate(up.packing_date[0])}',
            ${up.owner_id[0]},
            '${up.owner_organization_name[0]}'
        );`
    );

    // создание и заполнение данными таблицы down            

    querySQL(
        `CREATE TABLE down
        (
            sscc BIGINT PRIMARY KEY IDENTITY,
            packing_date DATETIME2, 
            owner_id BIGINT,
            owner_organization_name NVARCHAR(100),
        );`
    );

    let down = xmlResult.root.down[0];

    querySQL(
        `SET IDENTITY_INSERT down ON

        INSERT INTO down
        (
            sscc,
            packing_date, 
            owner_id,
            owner_organization_name
        )
        VALUES
        (
            ${down.sscc[0]},
            '${formatterDate(down.packing_date[0])}',
            ${down.owner_id[0]},
            '${down.owner_organization_name[0]}'
        );`
    );


    // создание и заполнение данными таблицы childs            

    querySQL(
        `CREATE TABLE childs
        (
            sgtin VARCHAR(28),
            sscc BIGINT, 
            status VARCHAR(40),
            gtin BIGINT,
            expiration_date DATETIME2,
            batch INT
        );`
    );


    xmlResult.root.down[0].childs.forEach(element => {

        querySQL(
            `INSERT INTO childs
            (
                sgtin,
                sscc, 
                status,
                gtin,
                expiration_date,
                batch
            )
            VALUES
            (
                '${element.sgtin[0]}',
                ${element.sscc[0]}, 
                '${element.status[0]}',
                ${element.gtin[0]},
                '${formatterDate(element.expiration_date[0])}',
                ${element.batch[0]}
            );`
        );
    });;

})



