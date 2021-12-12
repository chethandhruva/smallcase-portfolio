const mysql = require('./db/mysql');
const securityManager = require('./securityManagement');
const portfolioManager = require('./portfolioManagement');
const utils = require('./utils');
const moment = require('moment-timezone');

async function addOne(tradeInput) {
    try {
        inputValidation(tradeInput);
        const securityExists = await securityManager.isSecurityExists(tradeInput.tickerSymbol)
        if(!securityExists) {
            throw {status: 500, message: "Requested Security doesn't exist"};
        }

        if(tradeInput.type === 'SELL') {
            const portfolio = await portfolioManager.getPortfolio(tradeInput.tickerSymbol);
            if(portfolio.shares < tradeInput.shares ) {
                return {status: 500, message: `cant sell shares greater than ${portfolio.shares}`};
            }
        }

        const trxAmount = tradeInput.unitPrice * tradeInput.shares;
        const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
        tradeInput.trxAmount = trxAmount;

        const res = await mysql.executeQuery(`INSERT INTO trade (tickerSymbol,tradeType,unitPrice,shares,trxAmount,updatedAt) VALUES ('${tradeInput.tickerSymbol}','${tradeInput.tradeType}',${tradeInput.unitPrice},${tradeInput.shares},${trxAmount},'${updatedAt}')`);
        await portfolioManager.updatePortfolio(tradeInput);
        return {status: 200, message: "trade added successfully"};
    }
    catch(err) {
        console.error('ERROR in addTrade', tradeInput, err);
        throw err;
    }
}

function inputValidation(tradeInput) {
    if (!tradeInput.tickerSymbol) {
        throw { status: 403, message: "tickerSymbol is missing" };
    }
    if (!tradeInput.tradeType) {
        throw { status: 403, message: "tradeType is missing" };
    }
    if (!tradeInput.shares) {
        throw { status: 403, message: "shares is missing" };
    }
    if (!tradeInput.unitPrice) {
        throw { status: 403, message: "unitPrice is missing" };
    }
}

async function fetchTradeById(tradeId) {
    try {
        const res = await mysql.executeQuery(`SELECT * from trade where tradeId=${tradeId}`);
        return res[0];
    }
    catch(err) {
        console.log('ERROR in fetchTradeById', err);
        throw err;
    }
}

async function updateOne(tradeInput) {
    try {
        inputValidation(tradeInput);
        const currentTrade = await fetchTradeById(tradeInput.tradeId);
        const currentPortfolio = await portfolioManager.getPortfolio(tradeInput.tickerSymbol);

        if(!currentTrade) {
            throw {status: 500, message: "Trade doesnt exist to update"};
        }
        if(!currentPortfolio) {
            throw {status: 500, message: "Portfolio doesnt exist to update"};
        }
        const updatedTrade = JSON.parse(JSON.stringify(currentTrade));
        const updatedPortfolio = JSON.parse(JSON.stringify(currentPortfolio));

        updatedTrade.shares = tradeInput.shares;
        updatedTrade.tradeType = tradeInput.tradeType;
        updatedTrade.unitPrice = tradeInput.unitPrice;
        updatedTrade.trxAmount = tradeInput.unitPrice * tradeInput.shares;
        updatedTrade,updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');

        // if current trade type and updated trade type are same
        if(currentTrade.tradeType === updatedTrade.tradeType) {
            if(currentTrade.tradeType === 'SELL') {
                if(currentPortfolio.shares + currentTrade.shares - updatedTrade.shares < 0) {
                    throw {status: 500, message: "enough shares doesnt exists"};
                }
                updatedPortfolio.shares = currentPortfolio.shares + currentTrade.shares - updatedTrade.shares;
            }
            //update averagePrice only for buy trade
            if(currentTrade.tradeType === 'BUY') {
                if(currentPortfolio.shares - currentTrade.shares + updatedTrade.shares < 0) {
                    throw {status: 500, message: "enough shares doesnt exists"};
                }
                updatedPortfolio.shares = currentPortfolio.shares - currentTrade.shares + updatedTrade.shares;
                currentPortfolio.averageBuyPrice =  utils.revertAvgBuyPrice(currentPortfolio, currentTrade);
                updatedPortfolio.averageBuyPrice = utils.findAvgBuyPrice(currentPortfolio, updatedTrade);
            }
        }

        if(currentTrade.tradeType !== updatedTrade.tradeType) {
            if(currentTrade.tradeType === 'BUY') {
                if(currentPortfolio.shares - currentTrade.shares - updatedTrade.shares < 0) {
                    throw {status: 500, message: "enough shares doesnt exists"};
                }
                updatedPortfolio.shares = currentPortfolio.shares - currentTrade.shares - updatedTrade.shares;
                //reverting to the old avg when buy trade was done
                updatedPortfolio.averageBuyPrice =  utils.revertAvgBuyPrice(currentPortfolio, currentTrade);
            }
            //update new avg buy price for buy trade
            if(currentTrade.tradeType === 'SELL') {
                updatedPortfolio.shares =  currentPortfolio.shares + currentTrade.shares + updatedTrade.shares;
                updatedPortfolio.averageBuyPrice = (currentPortfolio.averageBuyPrice + updatedTrade.trxAmount)/updatedTrade.shares;
            }
        }

        //updating with new trade info in trade and portofolio tables
        const updatedTradeRes = await mysql.executeQuery(`UPDATE trade SET tradeType='${updatedTrade.tradeType}', shares=${updatedTrade.shares}, unitPrice=${updatedTrade.unitPrice}, trxAmount=${updatedTrade.trxAmount} where tradeId=${updatedTrade.tradeId}`);
        const updatedRes = await mysql.executeQuery(`UPDATE portfolio SET shares=${updatedPortfolio.shares}, averageBuyPrice=${updatedPortfolio.averageBuyPrice} where tickerSymbol='${updatedPortfolio.tickerSymbol}'`);

        return {status:200, message: "trade updated succsessfully"};
    }
    catch(err) {
        console.log('ERROR in updating', err);
        throw err;
    }
}

async function fetchAll() {
    try {
        const security = await mysql.executeQuery(`SELECT tickerSymbol from security`);
        const results = [];
        for(let i=0; i<security.length; i++) {
            const res = await mysql.executeQuery(`SELECT * from trade where tickerSymbol='${security[i].tickerSymbol}'`);
            results.push(...res);
        }
        return results;
    }
    catch(err) {
        console.log('ERROR in fetching trade', err);
        throw err;
    }
}

async function removeOne(tradeInput) {
    try {
        if(!tradeInput.tradeId) {
            throw {status: 403, message: "tradeId is missing"};
        }
        const res = await mysql.executeQuery(`DELETE from trade where tradeId=${tradeInput.tradeId}`);
        if(res.affectedRows === 0)
            return {status:403, message: "invalid tradeId"};
        return {status: 200, message: "delete trade successfully"};
    }
    catch(err) {
        console.log('ERROR in deleting trade', err);
        throw err;
    }
}

async function invoke(req) {
    try {
        let res;
        switch(req.requestPath) {
            case '/trade/add' : 
                res = await addOne(req.body);
                return res;
            case '/trade/update':
                res = await updateOne(req.body);
                return res;
            case '/trade/remove':
                res = await removeOne(req.body);
                return res;
            case '/trade/fetch':
                res = await fetchAll();
                return res;
            default:
                return {status:500, message: "Requested Path doesnt exist"};
        }
    }
    catch(err) {
        console.error('ERROR in Trades', err);
        return err;
    }
}

module.exports = {invoke};