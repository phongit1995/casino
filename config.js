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
        key: "f1e150e15a98c4cf43291aafe0a7c304c4ffa95a294df024d4282e68cb127083",
        secret: "54C972a4AFc422EB3bb971dF7f80D027bBf3e421B87b6BAdf596B33d7a1a4c81"
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