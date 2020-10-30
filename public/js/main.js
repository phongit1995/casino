const NAME = "Roulette V.90";
var tpage;

$(function() {

    var chatInt = true;
    var socket;
    var rint;
    var focused = true;
    var ntimer = false;

    window.onfocus = function() {
        focused = true;
        if(ntimer) {
            ntimer = false;
            socket.emit("roulette", "timer", {});
        }
    };
    window.onblur = function() {
        focused = false;
        ntimer = true;
        clearInterval(rint);
        document.title = NAME;
    };

    getWindowPath();

    initWheel();
    initContextmenu();
    connect();

    function connect() {

        socket = io();

        socket.on("connect", function() {
            console.log(`WebSocket connected successfully to ${NAME}!`);
        });

        // ALERTS
        socket.on("msg", function(type, msg) { sendAlert(type,msg); });

        // ROULETTE SOCKETS
        socket.on("roulette timer", function(ts, rh, seconds) { clearInterval(rint); rouletteTimer(seconds); $(".round_info").text(`Round hash: ${rh} - Round created: ${ts} (Server Time)`) });
        socket.on("roulette roll", function(a) { rouletteRoll(a); });
        socket.on("roulette insta roll", function(a) { setWheelPosition(a); });
        socket.on("roulette history", function(h) { rouletteHistory(h); });
        socket.on("roulette bet", function(r) { rouletteBet(r); });
        socket.on("roulette bets", function(r) { rouletteBets(r); });
        socket.on("roulette new", function() { clearRouletteBets(); });

        // FAIR SOCKETS
        socket.on("fair rounds", function(s) { fairRounds(s); });

        // USER SOCKETS
        socket.on("user balance", function(b) { $(".roulette-balance").html(`Balance: <i class="fas fa-coins gold"></i>&nbsp;${b}`); });
        socket.on("user profile", function(a) { userProfile(a); });
        socket.on("view user profile", function(a,b) { viewUserProfile(a,b); });
        socket.on("user message", function(a) { userChatMessage(a); });
        socket.on("user messages", function(a) { userChatMessages(a); });
        socket.on("user affiliates", function(a) { userAffiliates(a); } );
        socket.on("user eth address", function(a) { userDepositAddress(a); });
        socket.on("user transactions", function(a) { userTransactions(a); });
        socket.on("online users", function(a) { chatUsersOnline(a); } );

        // ADMIN
        socket.on("chat clear", function() { chatClear(); });
    }


    // USER DOCUMENT FUNCTIONS
    $(document).on("click", "#goto_register_btn", function() { $("#loginModal").modal("hide"); setTimeout(() => { $("#registerModal").modal(); }, 150); });
    $(document).on("click", "#register_btn", function() { userRegister(); });
    $(document).on("click", "#login_btn", function() { userLogin(); });
    $(document).on("keypress", "#LPassword", function(e) { if(e.which == 13) userLogin(); });
    $(document).on("click", "#logout", function() { user("logout", "POST", {}, (err, res) => { if(!err && res.success) location.href = '/'; }) });
    $(document).on("click", ".rbet", function() { RBet($(this).attr("data-action")); });
    $(document).on("click", ".rbetbtn", function() { userRBet($(this).attr("data-bet")); });
    $(document).on("click", ".chatInt", function() { userChat(); });
    $(document).on("click", ".chat-btn", function() { userSendChat(); });
    $(document).on("keyup", ".chat-input", function(e) { if (e.keyCode == 13) { userSendChat(); } });
    $(document).on("click", "#aff_redemcodebtn", function() { userRedeemcode(); });
    $(document).on("click", "#aff_createcodebtn", function() { userCreatecode(); });
    $(document).on("click", "#aff_collectearningsbtn", function() { userAffCollect(); });
    $(document).on("click", "#withdraw_btn", function() { userWithdrawFunds(); });
    // add Transfer onclick
    $(document).on("click","#transfer_btn",function(){userTransfer();})
    $(document).on("click","#get_payeer_address",function(){get_address_payeer()})

    // USER FUNCTIONS
    function get_address_payeer(){
        
        let number_pay = $("#payeer_number").val();
        if(number_pay==""){
            return toastr.error(`Number Payeer please!`);
        }
        user("deposit/payeer","POST",{payerr:number_pay},(error,res)=>{
            if(error) return toastr.error(`Stop flood!`);
            console.log(res);
            if(!error && res.success) {
                $("#payerr_form").hide();
                $("#result_address_payeer").show();
                $("#result_address_payeer >a").attr("href",res.msg);
            } else toastr.error(res.error);
        })
    }
    function userTransfer(){
        let username = $("#username_transfer").val();
        let amount = $("#amount_transfer").val();
        console.log(username,amount);
        if(username==""){
            return toastr.error(`UserName please!`);
        }
        user("transfer","POST",{username:username,amount:amount},(error,res)=>{
            if(error) return toastr.error(`Stop flood!`);
            console.log(res);
            if(!error && res.success) {
                toastr.success(`Transfer sucessfully to user!`);
            } else toastr.error(res.error);
            
        })
    }
    function userRegister() {
        let username = $("#RUsername").val();
        let email = $("#REmail").val();
        let password = $("#RPassword").val();
        let cpassword = $("#RPassword2").val();
        user("register", "POST", {username: username, email: email, password: password, cpassword: cpassword}, (err, res) => {
            if(err) return toastr.error(`Stop flood!`);
            if(!err && res.success) {
                toastr.success(`You have been sucessfully register, you can now login!`);
            } else toastr.error(res.error);
            
        });
    }

    function userLogin() {
        let username = $("#LUsername").val();
        let password = $("#LPassword").val();
        user("login", "POST", {username: username, password: password}, (err, res) => {
            if(err) return toastr.error(`Stop flood!`);
            if(!err && res.success) {
                toastr.success(`You have been sucessfully logged in!`);
                setTimeout(() => {
                    location.href = '/';
                }, 500);
            } else toastr.error(res.error);
        });
    }

    function userProfile(u) {
        $(".profile .avatar").html(`<img src="${u.avatar}">`);
        $(".profile .info .name").text(u.username);
        $(".profile .info .registered").html(`Registered on <strong>${u.registered}</strong>`);
        $(".profile .info .uuid").html(`UUID: <strong>${u.uuid}</strong>`);
        $(".pstatistics .rbets").text(formatAmount(u.rbets));
        $(".pstatistics .deposited").text(formatAmount(u.deposited));
        $(".pstatistics .withdrawn").text(formatAmount(u.withdrawn));
        $(".pstatistics .wagered").text(formatAmount(u.wagered));
    }

    function userRBet(color) {
        let x = parseInt($("#RBet").val());
        user("roulette/bet", "POST", {amount: x, color: color}, (err, res) => {
            if(err) return toastr.error(`Stop flood!`);
            if(!err && res.success) toastr.success(res.msg);
            else toastr.error(res.error);
        });
    }

    function userChat() {
        if(chatInt) {
            chatInt = false;
            $("#chatInt").css("display", "block");
            $(".roulette").animate({width: "100%"}, 1000);
            $(".chat").animate({width: "0%"}, 1000);
            setTimeout(() => { $(".chat").css("display", "none"); }, 800);
            $("#chatInt").removeClass("hidden");
            $("#chatInt").animate({opacity: "1"}, 500);
        } else {
            chatInt = true;
            $(".chat").css("display", "block");
            $(".roulette").animate({width: "80%"}, 1000);
            $(".chat").animate({width: "20%"}, 1000);
            $("#chatInt").animate({opacity: "0"}, 500);
            setTimeout(() => { $("#chatInt").css("display", "none"); }, 500);
        }
    }

    function userChatMessage(a) {
        $(".chat-messages").append(formatChatMessage(a));
        scrollChat();
    }

    function userChatMessages(a) {
        let $msgs = "";
        for(let x in a) {
            $msgs += formatChatMessage(a[x]);
        }
        $(".chat-messages").html($msgs);
        scrollChat();
    }

    function chatClear() {
        $(".chat-messages").empty();
    }

    function formatChatMessage(x) {
        return `
            <div class="chat-message" data-uuid="${x.uuid}">
                <div class="avatar">
                    <img src="${x.avatar}">
                </div>
                <div class="user">
                    <div class="name">${formatChatRank(x.rank)}${x.username}</div>
                    <div class="message">${x.msg}</div>
                </div>
            </div>
        `;
    }

    function formatChatRank(rank) {
        if(!rank) return "";
        const RANKS = {
            0: "",
            100: `<span style="color: red;">ADMIN&nbsp;</span>`
        };
        return RANKS[rank];
    }

    function userSendChat() {
        let x = $(".chat-input").val();
        user("chat/message", "POST", {message: x}, (err, res) => {
            if(err) return toastr.error(`Stop flood!`);
            if(!err && res.success) toastr.success(res.msg);
            else toastr.error(res.error);
        });
        $(".chat-input").val("");
    }

    function userAffCollect() {
        user("affiliates/collect", "POST", {}, (err, res) => {
            if(err) return toastr.error(`Stop flood!`);
            if(!err && res.success) {
                toastr.success(res.msg);
                setTimeout(() => {
                    window.location.href = '/affiliates';
                }, 1000);
            }
            else toastr.error(res.error);
        });
    }

    function userDepositAddress(a) {
        $("#deposit_address").val(a);
        $(".ethqrimage").attr("src", `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${a}`);
    }

    function userRedeemcode() {
        let x = $("#aff_redeemcode").val();
        user("affiliates/redeem", "POST", {code: x}, (err, res) => {
            if(err) return toastr.error(`Stop flood!`);
            if(!err && res.success) {
                $("#aff_redemcodebtn").prop("disabled", true);
                $("#aff_redemcodebtn").css("cursor", "not-allowed");
                $("#aff_redemcodebtn").removeClass("btn-success").addClass("btn-danger");
                $("#aff_redeemcode").prop("readonly", true);
                $("#aff_redeemcode").css("cursor", "not-allowed");
                $("#aff_redeemcode").val(x);
                toastr.success(res.msg);
            }
            else toastr.error(res.error);
        });
    }

    function userCreatecode() {
        let x = $("#aff_createcode").val();
        user("affiliates/create", "POST", {code: x}, (err, res) => {
            if(err) return toastr.error(`Stop flood!`);
            if(!err && res.success) {
                $("#aff_createcodebtn").prop("disabled", true);
                $("#aff_createcodebtn").css("cursor", "not-allowed");
                $("#aff_createcodebtn").removeClass("btn-success").addClass("btn-danger");
                $("#aff_createcode").prop("readonly", true);
                $("#aff_createcodee").css("cursor", "not-allowed");
                $("#aff_createcode").val(x);
                toastr.success(res.msg);
            }
            else toastr.error(res.error);
        });
    }

    function userTransactions(a) {
        let $transactions = "";

        for(let x in a) {
            let i = a[x];

            let $status = `<span style="color: orange;">Pending</span>`;
            if(i.status == 2 && i.type == "withdraw") $status = `<span style="color: lightgreen;">Sent</span>`;
            if(i.status == 1 && i.type == "deposit") $status = `<span style="color: lightgreen;">Credited</span>`;

            $transactions += `
                <tr>
                    <td>${i.type.toUpperCase()}</td>
                    <td><i style="color: gold;" class="fas fa-coins"></i>&nbsp;${i.amount}</td>
                    <td>${i.txid ? `<a target="_blank" href="https://etherscan.io/tx/${i.txid}">${i.txid}</a>` : `processing txid..` }</td>
                    <td>${i.timestamp} (Server Time)</td>
                    <td>${$status}</td>
                </tr>
            `;
        }

        $('.pTransactions').html($transactions);
    }

    function userAffiliates(a) {
        console.log(a);
        $(".aff_users").html(`<i style="color: royalblue;" class="fas fa-user"></i>&nbsp;${a.users}`);
        $(".aff_depositors").html(`<i style="color: royalblue;" class="fas fa-user"></i>&nbsp;${a.depositors}`);
        $(".aff_earnings").html(`<i style="color: gold;" class="fas fa-coins"></i>&nbsp;${a.earnings}`);
        $(".aff_claimed").html(`<i style="color: gold;" class="fas fa-coins"></i>&nbsp;${a.claimed}`);
        $("#aff_collectearningsbtn").html(`<i class="fas fa-user-edit"></i> Collect <i class="fas fa-coins gold"></i> ${a.earnings}`);

        if(a.aff) {
            $("#aff_redemcodebtn").prop("disabled", true);
            $("#aff_redemcodebtn").css("cursor", "not-allowed");
            $("#aff_redemcodebtn").removeClass("btn-success").addClass("btn-danger");
            $("#aff_redeemcode").prop("readonly", true);
            $("#aff_redeemcode").css("cursor", "not-allowed");
            $("#aff_redeemcode").val(a.affocode);
        }

        if(a.affcode) {
            $("#aff_createcodebtn").prop("disabled", true);
            $("#aff_createcodebtn").css("cursor", "not-allowed");
            $("#aff_createcodebtn").removeClass("btn-success").addClass("btn-danger");
            $("#aff_createcode").prop("readonly", true);
            $("#aff_createcodee").css("cursor", "not-allowed");
            $("#aff_createcode").val(a.affcode);
        }
    }

    function userWithdrawFunds() {
        let x = $("#withdraw_address").val();
        let a = $("#withdraw_amount").val();
        user("withdraw/create", "POST", {address: x, amount: a}, (err, res) => {
            if(err) return toastr.error(`Stop flood!`);
            if(!err && res.success) toastr.success(res.msg);
            else toastr.error(res.error);
        });
    }

    // FAIR FUNCTIONS
    function fairRounds(s) {
        let $H = "";
        for(let x in s) {
            let H = s[x];
            $H += `
                <tr style="color: ${formatLRoundC(H.roll)}">
                    <td>${H.hash}</td>
                    <td>${H.time_start}</td>
                    <td>${H.time_end}</td>
                    <td>${H.secret}</td>
                    <td><div class="ball ${formatRoll(H.roll)}">${H.roll}</div></td>
                </tr>
            `;
        }
        $(".lastRounds").html($H);
    }

    function chatUsersOnline(a) {
        $(".onlineusers").text(a);
        console.log(a);
    }


    // ROULETTE FUNCTIONS
    function rouletteTimer(s) {
        var t = s;
        rint = setInterval(() => {
            t = t - 100;
            let sec = parseFloat(t/1000).toFixed(1);
            $(".roll-text").text(`ROLLING IN ${sec}S`);
            let p = 100 - ((20000-t)/20000) * 100;
            if(focused) if(tpage == "/") document.title = `${sec}s - ${NAME}`;
            $(".progress .progress-bar").css("width", `${p}%`);
            if(t <= 0) {
                $(".roll-text").text(`ROLLING!`);
                clearInterval(rint);
                if(tpage == "/") document.title = `ROLLING! - ${NAME}`;
            }
        }, 100);
    }

    function rouletteBet(r) {
        const { amount, color, username, avatar } = r;
        const $H = `<div class="player-bet" data-amount="${amount}"><div class="player"><img src="${avatar}"><span>${username}</span></div><div class="coins"><i class="fas fa-coins"></i>&nbsp;${formatAmount(amount)}</div></div>`;
        $(`.${color}-players`).append($H);
        let newDiv = $(`.${color}-players .player-bet`).sort(function(a,b) {
            var A = $(a).attr("data-amount");
            var B = $(b).attr("data-amount");
            return B-A;
        });
        $(`.${color}-players`).html(newDiv);
    }

    function rouletteBets(h) {
        let OBJ = {"red": "", "green": "", "black": ""};
        for(let r in h) {
            const { amount, color, username, avatar } = h[r];
            OBJ[color] += `<div class="player-bet" data-amount="${amount}"><div class="player"><img src="${avatar}"><span>${username}</span></div><div class="coins"><i class="fas fa-coins"></i>&nbsp;${formatAmount(amount)}</div></div>`;
        }
        for(let x in OBJ) {
            $(`.${x}-players`).html(OBJ[x]);
        }
        sortRouletteBets();
    }

    function rouletteRoll(a) {
        spinWheel(a);
        clearInterval(rint);
        if(tpage == "/") $(".roll-text").text(`ROLLING!`);
        document.title = `ROLLING! - ${NAME}`;
        if(tpage == "/") $(".progress .progress-bar").css("width", `0%`);
    }

    function sortRouletteBets() {
        const colors = ["red", "green", "black"];
        for(let x in colors) {
            let newDiv = $(`.${colors[x]}-players .player-bet`).sort(function(a,b) {
                var A = $(a).attr("data-amount");
                var B = $(b).attr("data-amount");
                return B-A;
            }); 
            $(`.${colors[x]}-players`).html(newDiv);
        }
    }

    function clearRouletteBets() {
        const colors = ["red", "green", "black"];
        for(let x in colors) {
            $(`.${colors[x]}-players`).empty();
        }
    }

    function RBet(act) {
        let x = parseInt($("#RBet").val());
        switch(act) {
            case "clear":
                x = 0;
            break;
            case "+10":
                x += 10;
            break;
            case "+100":
                x += 100;
            break;
            case "+1000":
                x += 1000;
            break;
            case "+10000":
                x += 10000;
            break;
            case "+100000":
                x += 100000;
            break;
            case "1/2":
                x = parseInt(x/2);
            break;
            case "x2":
                x = parseInt(x*2);
            break;
        }
        $("#RBet").val(x);
    }

    function rouletteType(x) {
        if(x >= 1 && x <= 7) return "red";
        else if(x >= 8 && x <= 14) return "black";
        else return "green";
    }

    function rouletteHistory(h) {
        let $hist = "";
        for(let x in h) {
            $hist += `<div class="bhist ${rouletteType(h[x])}">${h[x]}</div>`;
        }
        $(".rollsHistory").html($hist);
    }

    // USER INTERFACE FUNCTION
    function user(type, method, obj, cb) {
        let TYPE = `/${type}`;
        if(method == "GET") TYPE = `/${type}?${obj}`;
        $.ajax({
            url: TYPE,
            method: method,
            data: obj,
            success: (resp) => {
                cb(0, resp);
            },
            error: (err) => {
                cb(1, err);
            }
        });
    }

    // CONTEXT MENU
    function initContextmenu() {
        $.contextMenu({
            selector: '.chat .chat-messages .chat-message', 
            callback: function(key, options) {
                switch(key) {
                    case "copy_uuid":
                        copyUUID($(this));
                        toastr.success("UUID copied to clipboard!");
                    break;
                }
            },
            items: {
                "copy_uuid": {name: "Copy UUID", icon: "fas fa-copy"},
            }
        });
    }

    function copyUUID(x) {
        let uuid = x.attr("data-uuid");
        copyToClipboard(uuid);
    }


    function copyToClipboard(text) {
        var $temp = $("<input>");
        $("body").append($temp);
        $temp.val(text).select();
        document.execCommand("copy");
        $temp.remove();
    }

    function sendAlert(type, msg) {
        toastr[type](msg);
        console.log(type, msg);
    }
});

// ROULETTE FUNCTIONS

function initWheel() {
    let $wheel = $(".roulette-wrapper .wheel"), row = "";

    row += `
        <div class="roww">
            <div class="card red">1</div>
            <div class="card black">14</div>
            <div class="card red">2</div>
            <div class="card black">13</div>
            <div class="card red">3</div>
            <div class="card black">12</div>
            <div class="card red">4</div>
            <div class="card green">0</div>
            <div class="card black">11</div>
            <div class="card red">5</div>
            <div class="card black">10</div>
            <div class="card red">6</div>
            <div class="card black">9</div>
            <div class="card red">7</div>
            <div class="card black">8</div>
        </div>
    `;

    for(let x = 0; x < 29; x++) { $wheel.append(row); }
}

function spinWheel(roll){
  var $wheel = $('.roulette-wrapper .wheel'),
  		order = [0, 11, 5, 10, 6, 9, 7, 8, 1, 14, 2, 13, 3, 12, 4],
      position = order.indexOf(roll);
            
  var rows = 12,
  		card = 75 + 3 * 2,
      landingPosition = (rows * 15 * card) + (position * card);
  	
    // var randomize = Math.floor(Math.random() * 75) - (75/2);
    var randomize = 0;
    
  landingPosition = landingPosition + randomize;
    
  var object = {
		x: Math.floor(Math.random() * 50) / 100,
    y: Math.floor(Math.random() * 20) / 100
	};
  
  $wheel.css({
		'transition-timing-function':'cubic-bezier(0,'+ object.x +','+ object.y + ',1)',
		'transition-duration':'6s',
		'transform':'translate3d(-'+landingPosition+'px, 0px, 0px)'
	});
  
  setTimeout(function(){
		$wheel.css({
			'transition-timing-function':'',
			'transition-duration':'',
		});
    
    var resetTo = -(position * card + randomize);
        $wheel.css('transform', 'translate3d('+resetTo+'px, 0px, 0px)');
        
        if(tpage == "/") $(".roll-text").text(`ROLLED ${roll}!`);
        if(tpage == "/") document.title = `ROLLED ${roll}! - ${NAME}`;
  }, 6 * 1000);
}

function setWheelPosition(roll) {
    var $wheel = $('.roulette-wrapper .wheel'),
        order = [0, 11, 5, 10, 6, 9, 7, 8, 1, 14, 2, 13, 3, 12, 4],
    position = order.indexOf(roll);
        
    var rows = 12,
        card = 75 + 3 * 2,
    landingPosition = (rows * 15 * card) + (position * card);

    // var randomize = Math.floor(Math.random() * 75) - (75/2);
    var randomize = 0;

    landingPosition = landingPosition + randomize;

    var object = {
        x: Math.floor(Math.random() * 50) / 100,
        y: Math.floor(Math.random() * 20) / 100
    };

    $wheel.css({
        'transition-timing-function':'cubic-bezier(0,'+ object.x +','+ object.y + ',1)',
        'transition-duration':'0s',
        'transform':'translate3d(-'+landingPosition+'px, 0px, 0px)'
    });

    setTimeout(function(){
        $wheel.css({
            'transition-timing-function':'',
            'transition-duration':'',
        });

        var resetTo = -(position * card + randomize);
        $wheel.css('transform', 'translate3d('+resetTo+'px, 0px, 0px)');

        if(tpage == "/") $(".roll-text").text(`ROLLED ${roll}!`);
        if(tpage == "/") document.title = `ROLLED ${roll}! - ${NAME}`;
    }, 0);
}

// COOKIE FUNCTION
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }


// WINDOW PAHT
function getWindowPath() {
    var page = window.location.pathname;
    tpage = page;
    $(`.nav-item[data-link="${page}"]`).addClass("active");
}

// FORMAT NUMBER
function formatAmount(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// FORMAT ROLL
function formatRoll(x) {
    if(x >= 1 && x <= 7) return "red";
    else if(x >= 8 && x <= 14) return "black";
    else return "green";
}

function formatLRoundC(x) {
    if(x >= 1 && x <= 7) return "#f95146";
    else if(x >= 8 && x <= 14) return "grey";
    else return "#00c74d";
}

// scroll chat
function scrollChat() {
    setTimeout(() => {
        $(".chat-messages").scrollTop(999999);
    }, 100);
}