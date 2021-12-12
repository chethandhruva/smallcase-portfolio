const mysql = require('./db/mysql');

async function isSecurityExists(tickerSymbol) {
    try {
        const res = await mysql.executeQuery(`SELECT securityName from security where tickerSymbol = '${tickerSymbol}'`);
        if(res.length > 0) return true;
        return false;
    }
    catch(err) {
        console.error(`ERROR in executing security exists for ${tickerSymbol}`,err);
        return false; 
    }
}

async function addOne(securityInput) {
    try {
        const {securityName, tickerSymbol} = securityInput;
        if(!tickerSymbol) {
            throw { status: 403, message: `tickerSymbol is missing`}
        }
        if(!securityName) {
            throw { status: 403, message: `securityName is missing`}
        }
        const securityExists = await isSecurityExists(tickerSymbol);
        if(securityExists) {
            throw { status: 500, message: `tickerSymbol ${tickerSymbol} is already present`};
        }
        const res = await mysql.executeQuery(`INSERT INTO security (securityName,tickerSymbol) VALUES ('${securityName}','${tickerSymbol}')`);
        return { status: 200, message: "successfully inserted security"};
    }
    catch(err) {
        console.log(`ERROR in adding security ${securityInput}`,err);
        throw err;
    }
}

async function invoke(req) {
    try{
        let res;
        switch(req.requestPath) {
            case '/security/add':
                res = await addOne(req.body);
                return {status: 200, message: "security added successfully"};
            default:
                return {status: 500, message: "unknown request path"};
        }
    }
    catch(err) {
        console.log('ERROR in securityManager', req.body, err);
        return err;
    }
}

module.exports = {invoke, isSecurityExists};