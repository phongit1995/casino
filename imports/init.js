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

app.get('/deposit', authentication, (req, res) => {
    req.session.page = "/deposit";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    res.render('deposit', {
        user: req.user
    });
});

app.get('/withdraw', authentication, (req, res) => {
    req.session.page = "/withdraw";
    req.session.save();
    if(!req.session.secret) return res.redirect("/");
    res.render('withdraw', {
        user: req.user
    });
});

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