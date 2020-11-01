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
        key: "0087f551eb8c0578cde42184a5f5316fc951e7095bffb1379f58d0ef1295afb2",
        secret: "6b9a110416A5f1c7dDf9f9d94C705C341d8ff064742be1941ff453379fE2c051"
    },
    payeer:{
        account:"P1021945700",
        apiId:1193360077,
        apiPass:"Phongit1995",
        shopId:1193352428,
        shopSecret:"Phongit1995"
    }
};

module.exports = config;