const mysql = require('./db/mysql');

async function getPortfolio(tickerSymbol) {
    try {
        const res = await mysql.executeQuery(`select * from portfolio where tickerSymbol='${tickerSymbol}'`);
        return res[0];
    }
    catch(err) {
        console.error(`ERROR in getPortfolio for ${tickerSymbol}`, err);
        throw err;
    }
}

async function updatePortfolio(tradeInput) {
    try {
        const res = await mysql.executeQuery(`SELECT averageBuyPrice,shares from portfolio where tickerSymbol='${tradeInput.tickerSymbol}'`);
        let averageBuyPrice, shares;
        if(res[0] !== undefined) {
            averageBuyPrice = res[0].averageBuyPrice;
            shares = res[0].shares;
        }
        console.log('average bu price', averageBuyPrice);

        if(tradeInput.tradeType === 'SELL') {
            if(!shares) {
                throw {status: 500, message: "shares doesnt exists to SELL"};
            }
            if(shares < tradeInput.shares) {
                throw {status: 500, message: "enough shares doesnt exist to SELL"};
            }
            const res = await mysql.executeQuery(`UPDATE portfolio SET shares=shares-${tradeInput.shares} where tickerSymbol='${tradeInput.tickerSymbol}'`);
            return res;
        }
        
        if(tradeInput.tradeType === 'BUY') {
            if(averageBuyPrice && shares) {
                const finalavgPrice = (averageBuyPrice * shares + tradeInput.trxAmount)/(shares + tradeInput.shares);
                const totalShares = shares + tradeInput.shares;
                const res = await mysql.executeQuery(`UPDATE portfolio SET shares=${totalShares}, averageBuyPrice=${finalavgPrice} where tickerSymbol='${tradeInput.tickerSymbol}'`);
                return res;
            }
            const avgPrice = tradeInput.trxAmount / tradeInput.shares;
            const res = await mysql.executeQuery(`INSERT into portfolio (tickerSymbol,shares,averageBuyPrice) VALUES('${tradeInput.tickerSymbol}',${tradeInput.shares},${avgPrice})`);
            return res;
        }
        return {status: 500, message: "Invalid trade type" };
    }
    catch(err) {
        console.error(`ERROR in updatePortfolio for ${tradeInput.tickerSymbol}`, err);
        throw err;
    }
}

async function fetchPortfolio() {
    try {
        const res = await mysql.executeQuery(`SELECT * from portfolio`);
        return res;
    }
    catch(err) {
        console.log('ERROR in fetching portfolio', err);
        throw err;
    }
}

async function fetchReturns() {
    try {
        const portfolio = await mysql.executeQuery(`SELECT * from portfolio`);
        const currentPrice = 100;
        let returns=0;

        for(let i=0; i<portfolio.length; i++) {
            const diff = currentPrice-portfolio[i].averageBuyPrice < 0 ? 0 : currentPrice-portfolio[i].averageBuyPrice;
            returns += diff * portfolio[i].shares;
        }
        return {returns};
    }
    catch(err) {
        console.log(`ERROR while fetching returns`, err);
        throw err;
    }
}

async function invoke(req) {
    try {
        let res;
        switch(req.requestPath) {
            case '/portfolio/fetch':
                res = await fetchPortfolio(req.query);
                return res;
            case '/portfolio/returns':
                res = await fetchReturns(req.query);
                return res;
            default:
                break;
        }
    }
    catch(err) {
        console.log('ERROR in portfolioManager', req.params, err);
        return err;
    }
}

module.exports = {invoke, getPortfolio, updatePortfolio};