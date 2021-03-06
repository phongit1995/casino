const { request } = require("http");
let requestPromise = require("request");

let Rates;

getRates();
async function getRates() {
    await CPClient.rates({short: 0, accepted: 1}).then(function(r) {
        Rates = r;
        console.log(`Rates loaded!`);
    });
}

redisClient.on('error', (err) => {
    console.error('Redis error: ', err);
});

pool.connect((err) => {
  if (err) return console.error(err);
  console.log('Database connected!');
  setInterval(() => {
    pool.query("SELECT 1");
  }, 60 * 60 * 1000);
});

server.listen(SERVER.port, () => {
    console.log(`[SERVER] Listening to port :${SERVER.port}!`);
});

app.set('view engine', 'pug');
app.set('view engine', 'ejs');
app.use('/', express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
const SESSION = session({
    secret: AUTH.secret,
    name: "ESCoreAuthentication",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    store: new redisStore({ host: 'localhost', port: 6379, client: redisClient, ttl: 86400 }),
});
app.use(SESSION);

io.use(sharedsession(SESSION, {
    autoSave: true
}));

app.get('/', authentication, (req, res) => {
    req.session.page = "/";
    req.session.save();
    res.render('index.pug', {
        user: req.user
    });
});

app.get('/fair', authentication, (req, res) => {
    req.session.page = "/fair";
    req.session.save();
    res.render('fair.pug', {
        user: req.user
    });
});



app.get('/affiliates', authentication, (req, res) => {
    req.session.page = "/affiliates";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    res.render('affiliates.pug', {
        user: req.user
    });
});
app.get("/deposit",authentication,(req,res)=>{
    req.session.page = "/deposit";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    res.render('deposit.ejs', {
        user: req.user
    });
})
app.get("/deposit/payeer",authentication,(req,res)=>{
    req.session.page = "/deposit/payeer";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    res.render('deposit-payeer.ejs', {
        user: req.user
    });
})
app.post("/deposit/payeer",authentication, async(req,res)=>{
    if(!req.session.secret) return res.redirect("/");
    let {payerr} = req.body ;
    if(typeof payerr=="undefined" ){
        return res.json({success: false, error: `Payeer is a number`});
    }
    
    let orderId=req.session.uuid+"_"+Date.now();
    let description = md5(orderId);
    let resultGet = await getUrlPayeer(orderId,payerr,description);
    resultGet = JSON.parse(resultGet);
    console.log(resultGet);
    if(resultGet.auth_error!=0){
        return res.json({success: false, error: `Error . Please Contact Admin`});
    }
    else {
        return res.json({success: true, msg: resultGet.url});
    }
})

app.get('/deposit/coinpayments', authentication,async (req, res) => {
    req.session.page = "/deposit";
    req.session.save();
    console.log(req.session.uuid);
   
    if(!req.session.secret) return res.redirect("/");
    CPClient.getCallbackAddress({
        currency:"ETH",
        label:req.session.uuid +"_"+Date.now(),
        ipn_url:"http://roulettev90.com/verify/ipn"
        },(error,data)=>{
        if(error){
            console.log(error);
            res.send("Error get call back address");
        }
        else {
            res.render('deposit-coinpayments.pug', {
                user: req.user,
                address:data.address
            });
        }
    })
});

app.get('/withdraw', authentication, (req, res) => {
    req.session.page = "/withdraw";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    res.render('withdraw.pug', {
        user: req.user
    });
});
app.post("/verify/ipn",async(req,res)=>{
    console.log(req.body);
    let {status,label,amount}=req.body;
    if(typeof status== "undefined" || typeof label== "undefined" ||typeof amount== "undefined" ){
        return res.send("ERROR_DATA");
    }
    let uuid_user = label.slice(0,label.indexOf("_"));
    if(status!=100){
        res.send("STATUS_NOT_FOUND");
    }
    pool.query("SELECT COUNT(*) as numberCount from transactions where tid=?",[label],function(error,rows,fields){
        if(error)throw error ;
        if(rows[0].numberCount>0){
                console.log("BAN GHI DA TON TAI");
                return "IS EXIT"
        };
        requestPromise.get("https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD",function(errorRQ,dataRQ,body){
            if(errorRQ)throw errorRQ ; 
            let dataQR = JSON.parse(body);
            let amountCoin = dataQR.USD*amount*100;
            pool.query("INSERT INTO transactions (tid,uid,type,amount,status,txid,timestamp) VALUES(?,?,?,?,?,?,?)",[label,uuid_user,"DEPOSIT",amountCoin,"SUCCESS","ETH",ltime()],function(errorSet,resultSet){
                if(errorSet){console.log("Inset Fail");
                console.log(errorSet);
                throw errorSet;
                };
                pool.query("UPDATE users SET balance= balance+ ? ,deposited=deposited+ ?WHERE uuid=?",[amountCoin,amountCoin,uuid_user],function(errorAdd,resultAdd){
                    if(errorAdd){
                        console.log("ADD ERROR");
                        throw errorAdd;
                    }
                    console.log("ADD COIN SUCCESS USER :" + uuid_user + "  Coin : " + amountCoin );
                })
            })
        })
    })
    res.send("Phong")
})
app.get("/profile",authentication,(req,res)=>{
    req.session.page = "/profile";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    pool.query("SELECT * FROM transactions where uid=? ORDER BY timestamp DESC",[req.user.uuid],function(error,data){
        res.render("profile2.ejs",{user:req.user,transaction:data});
    })
    
    
})
app.get("/transfer",authentication,(req,res)=>{
    req.session.page = "/transfer";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    res.render('transfer.ejs', {
        user: req.user
    });
})

// PAYEER STATUS
app.get("/payeer/success",(req,res)=>{
    if(req.query.m_status!="success"){
        return res.send("Error . Please Contact Admin");
    }
    if(!parsePaymentCallback(req.query)){
        return res.send("Error . Please Contact Admin")
    };
    let uuid_user = req.query.m_orderid.slice(0,req.query.m_orderid.indexOf("_"));
    pool.query("SELECT COUNT(*) as numberCount from transactions where tid=?",[req.query.m_orderid],function(error,rows,fields){
        if(error)throw error ;
        if(rows[0].numberCount>0){
                console.log("BAN GHI DA TON TAI");
                return res.send("Error code 300. IS EXIT");
        };
        let amountCoin = parseInt(req.query.m_amount*100);
        pool.query("INSERT INTO transactions (tid,uid,type,amount,status,txid,timestamp) VALUES(?,?,?,?,?,?,?)",[req.query.m_orderid,uuid_user,"DEPOSIT",amountCoin,"SUCCESS","PAYERR",ltime()],function(errorSet,resultSet){
            if(errorSet){
                console.log(errorSet);
                return res.send("Error code 301. IS EXIT");
            };
            pool.query("UPDATE users SET balance= balance+ ? ,deposited=deposited+ ? WHERE uuid=?",[amountCoin,amountCoin,uuid_user],function(errorAdd,resultAdd){
                if(errorAdd){
                    console.log(errorAdd);
                    return res.send("Error code 302. IS EXIT");
                }
                console.log("ADD COIN SUCCESS USER :" + uuid_user + "  Coin : " + amountCoin );
                return res.send("Deposit Success . Please wait 15 to 30 minutes for the confirmation system")
            })
        })
    })
    
})
app.post("/payeer/fail",(req,res)=>{
    res.send("FAIL WHEN DEPOSIT")
})
app.post("/payeer/status",(req,res)=>{
    console.log("----STATUS PAYEER----");
    console.log("----STATUS PAYEER----");
    console.log("----STATUS PAYEER----");
    console.log(req.body);
    console.log("----STATUS PAYEER----");
    console.log("----STATUS PAYEER----");
    console.log("----STATUS PAYEER----");
})

// GLOBALS
var antispamroulette;
var antispamendpoints;
var antispamchat;
var Roulette = {
    roundid: -1,
    fair: {},
    state: 0,
    ntimer: 10,
    timer: 20,
    curr_timer: 0,
    min_bet: 10,
    max_bet: 50000,
    bets: [],
    user_bets: {},
    history: [],
    rng: -1
};
var LRounds;
var User = {};

var CHATS = [];

var ousers = {};

// USER INTERFACE
init();