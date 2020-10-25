const config = {
    license: {
        key: "adwdwdw"
    },
    mysql: {
        host: "localhost",
        user: "root",
        password: "",
        database: "casino"
    },
    server: {
        port: 8000, // CHANGE ONLY IF YOU KNOW WHAT YOU DO!!
    },
    authentication: {
        secret: "RANDOM_STRING_HERE", // CHANGE IF YOU WANT ANOTHER SECRET FOR AUTHENTICATION PROTOCOL
    },
    coinpayments: {
        key: "540eb488adc408cf94a721e73f93669124bb05f93c25d39e72a30e5740d91a21",
        secret: "cf7287354936B679fd8D48Aec160c32c59F630E495A965d90ebFDb12BEc9e51b"
    }
};

module.exports = config;