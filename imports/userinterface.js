const { createPool } = require("mysql");
const PERCENT_TRANSFER=6;
function userInterface() {
    app.post("/register", antispamendpoints, (req, res) => {

        if(req.body.username && req.body.email && req.body.password && req.body.cpassword) {
            const { body } = req;

            pool.query("SELECT id FROM users WHERE username = ? OR email = ?", [body.username, body.email], function(d,b) {
                if(d) throw d;
                if(b.length > 0) return res.json({success: false, error: `This username/email is already registered!`});

                if(body.username.length < 7) return res.json({success: false, error: `Username minimum length: 7!`});
                if(body.username.length > 14) return res.json({success: false, error: `Username maximum length: 14!`});
                if(!/^[a-zA-Z0-9]+$/i.test(body.username)) return res.json({success: false, error: `Username can only contain A-Z, a-z, 0-9!`});
                if(!validateEmail(body.email)) return res.json({success: false, error: `Invalid email format!`});
                if(body.password.length < 8) return res.json({success: false, error: `Password minimum length: 8!`});
                if(body.password.length > 16) return res.json({success: false, error: `Password maximum length: 8!`});
                if(passwordFormatter(body.password).includes("WRONG_CHARACTER")) return res.json({success: false, error: `Password has invalid characters: &, <, >, " and '!`});
                if(body.password != body.cpassword) return res.json({success: false, error: `The passwords are not equal!`});
        
                const USER_SECRET = createSecret(req.body.username, req.body.password);
                const USER_AVATAR = createAvatar(req.body.email);
                const USER_REGISTERED = new Date().toDateString();
                const USER_UUID = uuid4();
        
                pool.query(`INSERT INTO users SET uuid = ?, username = ?, email = ?, avatar = ?, password = ?, registered = ?, secret = ?`, [
                    USER_UUID, body.username, body.email, USER_AVATAR, encryptPassword(body.password), USER_REGISTERED, USER_SECRET
                ], function(a,b) {
                    if(a) throw a;
        
                    res.json({success: true});
                });
            });
        }

    });

    app.post("/login", antispamendpoints, (req, res) => {
        if(req.body.username && req.body.password) {
            const PASSWORD = encryptPassword(req.body.password);
            const NEW_SECRET = createSecret(req.body.username, req.body.password);

            pool.query(`SELECT id, email, registered, uuid, rank FROM users WHERE username = ? AND password = ?`, [req.body.username, PASSWORD], function(a,b) {
                if(a) throw a;
                if(b.length == 0) return res.json({success: false, error: `The username or password is wrong!`});

                const NEW_AVATAR = createAvatar(b[0].email);

                pool.query("UPDATE users SET secret = ?, avatar = ? WHERE id = ?", [NEW_SECRET, NEW_AVATAR, b[0].id], function(aa,bb) {
                    if(aa) throw aa;

                    req.session.uid = b[0].id;
                    req.session.username = req.body.username;
                    req.session.registered = b[0].registered;
                    req.session.uuid = b[0].uuid;
                    req.session.avatar = NEW_AVATAR;
                    req.session.rank = b[0].rank;
                    req.session.secret = encryptSecret(NEW_SECRET);
                    req.session.save();
                    res.json({success: true});
                });

            });
        }
    });

    // AFFILIATES
    app.post("/affiliates/redeem", pauthentication, antispamendpoints, (req, res) => {

        const { code } = req.body;
        let USER = req.session;

        pool.query("SELECT id FROM users WHERE aff_code = ?", [code], function(a,b) {
            if(a) throw a;
            if(b.length == 0) return res.json({success: false, error: "This code doesn't exists!"});

            if(b[0].id == USER.uid) return res.json({success: false, error: "You can't redeem your own code!"});

            pool.query("SELECT aff FROM users WHERE id = ?", [USER.uid], function(as, da) {
                if(as) throw as;
                if(da[0].aff > 0) return res.json({success: false, error: "You've already redeemed a code!"});

                pool.query("UPDATE users SET aff = ?, balance = balance + 10 WHERE id = ?", [b[0].id, USER.uid], function(aa,bb) {
                    if(aa) throw aa;
    
                    res.json({success: true, msg: `You have successfully redeemed <strong>${code}</strong> and got 10 COINS!`});
                });
            });
        });

    });

    app.post("/affiliates/create", pauthentication, antispamendpoints, (req, res) => {

        const { code } = req.body;
        let USER = req.session;

        if(!/^[a-zA-Z0-9]+$/i.test(code)) return res.json({success: false, error: `Code can only contain A-Z, a-z, 0-9!`});
        if(code.length < 3) return res.json({success: false, error: "The code needs to be at least 3 characters long!"});
        if(code.length > 12) return res.json({success: false, error: "The code can be maximum 12 characters long!"});

        pool.query("SELECT aff_code FROM users WHERE id = ?", [USER.uid], function(a,b) {
            if(a) throw a;
            if(b[0].aff_code) return res.json({success: false, error: "You already created your own code!"});

            pool.query("SELECT id FROM users WHERE aff_code = ?", [code], function(aa,bb) {
                if(aa) throw aa;
                if(bb.length > 0) return res.json({success: false, error: "This code is already used by someone else!"});

                pool.query("UPDATE users SET aff_code = ? WHERE id = ?",[code, USER.uid], function(aaa,bbb) {
                    if(aaa) throw aaa;
                    res.json({success: true, msg: `You have successfully created the code <strong>${code}</strong>!`});
                });
            });
        });

    });

    app.post("/affiliates/collect", pauthentication, antispamendpoints, (req, res) => {

        let USER = req.session;

        pool.query("SELECT aff_earnings FROM users WHERE id = ?", [USER.uid],function(a,b) {
            if(a) throw a;

            if(b[0].aff_earnings < 100) return res.json({success: false, error: "You can collect the affiliates earnings if you have more than 100 coins!"});

            pool.query("SELECT COUNT(`id`) AS depositors FROM users WHERE aff = ? AND deposited > 0", [USER.uid],function(aa,bb) {
                if(aa) throw aa;
                let depositors = 0;
                if(bb.length > 0) depositors = bb[0].depositors;

                if(depositors < 10) return res.json({success: false, error: "You can collect affiliates earnings if you have more than 10 depositors!"});

                let earnings = b[0].aff_earnings;

                pool.query("UPDATE users SET balance = balance + ?, aff_earnings = 0, aff_claimed = aff_claimed + ? WHERE id = ?", [earnings, earnings, USER.uid], function(ad,bd) {
                    if(ad) throw ad;

                    res.json({success: true, msg: `You have successfully collect ${earnings} coins!`});
                });
            });
        });

    });
    // 

    // WITHDRAW
    app.post("/withdraw/create", pauthentication, antispamendpoints, (req, res) => {

        const { address, amount } = req.body;
        let USER = req.session;
        let ADDRESS = address;
        let AMOUNT = parseInt(amount);

        if(ADDRESS == "") return res.json({success: false, error: "Please input a valid withdraw address!"});
        if(AMOUNT <= 0) return res.json({success: false, error: "Please input a valid withdraw amount! (1)"});
        if(isNaN(AMOUNT)) return res.json({success: false, error: "Please input a valid withdraw amount! (2)"});
        if(AMOUNT < 500) return res.json({success: false, error: "Minimum withdraw amount is 500 coins!"});

        pool.query("SELECT id FROM users WHERE address = ?", [address], function(a,b) {
            if(a) throw a;
            if(b.length > 0) return res.json({success: false, error: "You can't withdraw to an ETH Address from our website!"});

            pool.query("SELECT balance FROM users WHERE id = ?", [USER.uid], function(a,b) {
                if(a) throw a;
    
                let balance = parseInt(b[0].balance);
                if(balance < AMOUNT) return res.json({success: false, error: `You don't have enough balance to withdraw!`});
    
                let USD_AMOUNT = parseFloat(parseFloat(AMOUNT/100).toFixed(2));
    
                makeWithdrawal();
                async function makeWithdrawal() {
                    await CPClient.createWithdrawal({ amount: USD_AMOUNT, address: ADDRESS, currency: "ETH", currency2: "USD", add_tx_fee: 0, auto_confirm: 1, note: `Withdrawal of U${USER.uid} of $${USD_AMOUNT}.` }).then(function(r) {
                        console.log(r);
                        if(r.status == 1) {
                            pool.query("UPDATE users SET balance = balance - ?, withdrawn = withdrawn + ? WHERE id = ?", [amount, amount, USER.uid], function(aa,bb) {
                        
                                console.log(aa);
                            });
    
                            pool.query("INSERT INTO transactions SET tid = ?, uid = ?, type = ?, amount = ?, status = ?, timestamp = ?", [
                                r.id, USER.uuid, "WITHDRAW", AMOUNT, "PENDING", ltime()
                            ], function(ab, cd) {
                            
                                if(ab) throw ab;
                            });
                        }
                        if(r.status == 1) return res.json({success: true, msg: `The withdrawal has been created. Wait for blockchain to confirm the withdrawal!`});
                        else return res.json({success: false, error: "There was an error creating the withdraw!"});
                    }).catch((e) => {
                        console.error(e);
                    });
                }
            });
        });
    });
    // 

    app.post("/chat/message", pauthentication, antispamchat, (req, res) => {

        const { message } = req.body;
        let MSG = decodeURIComponent(message);
        let USER = req.session;

        if(MSG.length < 2) return res.json({success: false, error: `The length of the message is too short!`});
        else if(MSG.length > 100) return res.json({success: false, error: `The length of the message is too long!`});

        if(USER.rank == 100) nstep();
        else ismuted();

        function ismuted() {
            pool.query("SELECT mute FROM users WHERE id = ?", [USER.uid], function(a,b) {
                if(a) throw a;
                let muted = b[0].mute;
                if(muted-stime() > 0) return res.json({success: false, error: `You are muted! (Left: ${parseInt(muted-stime())}s)`});
                nstep();
            });
        }

        function nstep() {
            // COMMAND LINE
            if(MSG.startsWith("/")) {

                // args[0] == cmd;
                let args = MSG.split("/")[1].split(" ");

                if(args.length == 3 && args[0] == "mute" && USER.rank >= 1) {
                    let user = args[1];
                    let seconds = args[2];

                    pool.query("SELECT id FROM users WHERE uuid = ?", [user], function(a,b) {
                        if(a) throw a;
                        if(b.length == 0) return res.json({success: false, error: "User not found"});

                        if(isNaN(parseInt(seconds))) return res.json({success: false, error: "Second argument needs to be a valid seconds!"});

                        let muted = parseInt(parseInt(stime())+parseInt(seconds));

                        pool.query("UPDATE users SET mute = ? WHERE id = ?", [muted, b[0].id], function(e,r) {
                            if(e) throw e;
                            res.json({success: true, msg: `User successfully muted ${seconds} seconds!`});
                            pool.query("INSERT INTO logs SET type = ?, msg = ?, time = ?", [
                                'mute', `User ${b[0].id} got muted by mod/admin ${USER.username} for ${seconds} seconds`, ltime()
                            ]);
                        });
                    });

                    return;
                } else if(args.length == 3 && args[0] == "atip" && USER.rank == 100) {
                    let user = args[1];
                    let amount = parseInt(args[2]);

                    pool.query("SELECT id FROM users WHERE uuid = ?", [user], function(a,b) {
                        if(a) throw a;
                        if(b.length == 0) return res.json({success: false, error: "User not found"});

                        if(isNaN(parseInt(amount))) return res.json({success: false, error: "Second argument needs to be a valid amount!"});

                        pool.query("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, b[0].id], function(e,r) {
                            if(e) throw e;

                            res.json({success: true, msg: `You have successfully updated user's balance with ${amount} coins!`});

                            pool.query("INSERT INTO logs SET type = ?, msg = ?, time = ?", [
                                'atip', `Admin ${USER.uid} tipped user ${b[0].id} with ${amount} coins!`, ltime()
                            ]);
                        });
                    });

                    return;
                } else if(args.length == 3 && args[0] == "tip") {
                    let user = args[1];
                    let amount = parseInt(args[2]);

                    pool.query("SELECT id FROM users WHERE uuid = ?", [user], function(a,b) {
                        if(a) throw a;
                        if(b.length == 0) return res.json({success: false, error: "User not found"});

                        if(isNaN(parseInt(amount))) return res.json({success: false, error: "Second argument needs to be a valid amount!"});

                        pool.query("SELECT balance, deposited, username FROM users WHERE id = ?", [USER.uid], function(er, ro) {
                            if(er) throw er;

                            let balance = parseInt(ro[0].balance);
                            let deposited = parseInt(ro[0].deposited);

                            if(user == USER.uuid) return res.json({success: false, error: "You can't tip yourself!"});
                            if(balance < amount) return res.json({success: false, error: "You don't have enough balance to tip!"});
                            if(deposited < 500) return res.json({success: false, error: "You are able to tip users after depositing minimum $5.00!"});

                            pool.query("UPDATE users SET balance = balance - ? WHERE id = ?", [amount, USER.uid], function(as,bd) {
                                if(as) throw as;

                                pool.query("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, b[0].id], function(e,r) {
                                    if(e) throw e;
        
                                    sendUserBalance(USER.uid);
                                    sendUserBalance(b[0].id);
                                    io.to(b[0].id).emit("msg", "success", `You have received <strong>${amount}</strong> coins from <strong>${ro[0].username}</strong>`)
                                    res.json({success: true, msg: `You have successfully updated user's balance with ${amount} coins!`});

                                    pool.query("INSERT INTO logs SET type = ?, msg = ?, time = ?", [
                                        'tip', `User ${USER.uid} tipped user ${b[0].id} with ${amount} coins!`, ltime()
                                    ]);
                                });
                            });
                        });
                    });

                    return;
                } else if(args.length == 1 && args[0] == "clear" && USER.rank >= 1) {

                    CHATS = [];
                    io.emit("chat clear");
                    res.json({success: true, msg: "Chat cleared!"});

                    pool.query("UPDATE chat_log SET cleared = 1 WHERE cleared = 0");

                    return;
                }

                return res.json({success: false, error: `Command not found!`});


            } else dstep();
        }

        function dstep() {
            let props = {
                uuid: USER.uuid,
                username: USER.username,
                avatar: USER.avatar,
                rank: USER.rank,
                msg: escapeHtml(MSG)
            };

            pool.query("INSERT INTO chat_log SET uid = ?, props = ?, time = ?", [
                USER.uid, JSON.stringify(props), ltime()
            ], function(a,b) {
                if(a) throw a;

                props.id = b.insertId;

                CHATS.push(props);
                if(CHATS.length > 20) CHATS.shift();
                io.emit("user message", props);
            });
        }

    });

    app.post('/roulette/bet', pauthentication, antispamroulette, (req, res) => {

        const acc_colors = ["red", "green", "black"];
        const { amount, color } = req.body;

        if(Roulette.state != 1) return res.json({success: false, error: `You can place a bet in the next Roulette round!`});

        if(amount <= 0) return res.json({success: false, error: `You can't place a negative bet amount!`});
        if(isNaN(amount)) return res.json({success: false, error: `Invalid bet amount!`});

        if(getTotalBets(req.session.uid) == 3) return res.json({success: false, error: `You can place maximum 3 bets per round!`});

        pool.query("SELECT balance FROM users WHERE id = ?", [req.session.uid], function(a,b) {
            if(a) throw a;
            
            const BALANCE = parseInt(b[0].balance);

            if(amount > BALANCE) return res.json({success: false, error: `You don't have enough balance to bet!`});
            if(acc_colors.indexOf(color) == -1) return res.json({success: false, error: `Invalid color bet!`});

            pool.query("UPDATE users SET balance = balance - ?, rbets = rbets + 1, wagered = wagered + ? WHERE id = ?", [amount, amount, req.session.uid], function(aa,bb) {
                if(aa) throw aa;

                pool.query("INSERT INTO bets SET roundid = ?, uid = ?, amount = ?, color = ?, win = 0, time = ?", [
                    Roulette.roundid, req.session.uid, amount, color, ltime()
                ], function(aaa,bbb) {
                    if(aaa) throw aaa;

                    const NEW_BALANCE = parseInt(BALANCE - amount);

                    const USER_BET = {
                        id: bbb.insertId,
                        uid: req.session.uid,
                        username: req.session.username,
                        avatar: req.session.avatar,
                        amount: amount,
                        color: color,
                        won: 0
                    };
        
                    Roulette.bets.push(USER_BET);
        
                    if(Roulette.user_bets.hasOwnProperty(req.session.uid)) Roulette.user_bets[req.session.uid][color]++;
                    else {
                        Roulette.user_bets[req.session.uid] = {
                            red: 0,
                            green: 0,
                            black: 0
                        };
                        Roulette.user_bets[req.session.uid][color]++;
                    }

                    io.emit("roulette bet", USER_BET);
                    io.to(req.session.uid).emit("user balance", NEW_BALANCE);

                    res.json({success: true, msg: `You have successfully placed ${amount} coins on color ${color}!`});
                });
            });
        });
    });

    app.post("/transfer",pauthentication, authenticationUser,antispamroulette,(req, res)=>{
        let USER = req.user ;
        let {username,amount}= req.body;
        if(typeof username=="undefined" || typeof amount==""){
            return res.json({success: false, error: `Amount is a number`});
        }
        if(USER.username==username){
            return res.json({success: false, error: `Can't transfer to yourSelf`});
        }
        if(USER.balance<amount){
            return res.json({success: false, error: `You don't have enough balance to Transfer`});
        }
        pool.query("select * from users where username=?",[username],function(aaa,bbb){
            if(aaa) {
                return res.json({success: false, error: `Error. Please Contact Admin`});
            } ;
            if(bbb.length==0){
                return res.json({success: false, error: `user receive not found`});
            };
            userReceive = bbb[0];
            let amountReceive =  (amount/100)*(100-PERCENT_TRANSFER);
            amountReceive = parseInt(amountReceive);
            pool.query("UPDATE users set balance=balance-? where username=? ",[amount,USER.username],function(error,result){
                if(error){
                    return res.json({success: false, error: `Error when Change please Connect Admin`});
                };
                pool.query("UPDATE users set balance=balance+? where username=? ",[amountReceive,username],function(errorSend,resultSend){
                    if(errorSend){
                        return res.json({success: false, error: `Error when Send to User please Connect Admin`});
                    }
                    pool.query("INSERT INTO transactions  (tid,uid,type,amount,status,txid,timestamp) VALUES(?,?,?,?,?,?,?)",[userReceive.uuid,USER.uuid,"SEND",amount,"SUCCESS",userReceive.username,ltime()],function(errorTr,resultTr){
                        console.log(error);
                        pool.query("INSERT INTO transactions  (tid,uid,type,amount,status,txid,timestamp) VALUES(?,?,?,?,?,?,?)",[USER.uuid,userReceive.uuid,"RECEIVE",amount,"SUCCESS",USER.username,ltime()],function(errorTrRe,resultTrRe){
                            console.log(error);
                        })
                    })
                    return res.json({success: true, error: `Transfer Successfully`});
                })
            })
        })
    })
    function authenticationUser(req,res,next){
        let USER = req.session ;
        pool.query("SELECT * from users where id=?",[USER.uid],function(error,result){
            if(error){
                return res.json({success: false, error: `User Not Found`});
            }
            if(result.length>0){
                req.user= result[0];
                next();
            }
            else{
                return res.json({success: false, error: `User Not Found`});
            }
        })
        
    }
    app.post("/logout", (req, res) => {
        if(req.session.username) {
            req.session.destroy();
            res.json({success: true});
        }
    });

}