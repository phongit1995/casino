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
    res.render('index', {
        user: req.user
    });
});

app.get('/fair', authentication, (req, res) => {
    req.session.page = "/fair";
    req.session.save();
    res.render('fair', {
        user: req.user
    });
});

app.get('/profile', authentication, (req, res) => {
    req.session.page = "/profile";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    res.render('profile', {
        user: req.user
    });
});

app.get('/affiliates', authentication, (req, res) => {
    req.session.page = "/affiliates";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    res.render('affiliates', {
        user: req.user
    });
});

app.get('/deposit', authentication,async (req, res) => {
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
            res.render('deposit', {
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
    res.render('withdraw', {
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
            pool.query("INSERT INTO transactions (tid,uid,type,amount,status) VALUES(?,?,?,?,?)",[label,uuid_user,"DEPOSIT",amountCoin,"SUCCESS"],function(errorSet,resultSet){
                if(errorSet){console.log("Inset Fail");
                console.log(errorSet);
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