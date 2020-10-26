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
        port: 3000, // CHANGE ONLY IF YOU KNOW WHAT YOU DO!!
    },
    authentication: {
        secret: "RANDOM_STRING_HERE", // CHANGE IF YOU WANT ANOTHER SECRET FOR AUTHENTICATION PROTOCOL
    },
    coinpayments: {
        key: "a102908b6fa9512c573e123cca372ee6456809949027aadbe35ec3be453eb290",
        secret: "f47D9CAe1f073267557a6F0e33F2e9Ec44C3563E37C1bda77C22619f"
    }
};

module.exports = config;