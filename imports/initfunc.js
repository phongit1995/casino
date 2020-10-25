// INIT
function init() {
    // LIMITERS
    antispamroulette = rateLimit({
        windowMs: 3000,
        max: 1,
        message:
        "Please slow down!"
    });
    antispamendpoints = rateLimit({
        windowMs: 5000,
        max: 1,
        message:
        "Please slow down!"
    });
    antispamchat = rateLimit({
        windowMs: 3000,
        max: 1,
        message:
        "Please slow down!"
    });
    userInterface();
    startRoulette();

    // ROULETTE FUNCS
    getLastRRounds();

    // CHAT FUNCS
    getChatHistory();

    // INIT CP FUNCTION
    CPSystem();
}