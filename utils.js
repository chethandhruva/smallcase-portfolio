function revertAvgBuyPrice(currentPortfolio, currentTrade) {
    const avg = (currentPortfolio.averageBuyPrice - currentTrade.trxAmount) /
    (currentPortfolio.shares - currentTrade.shares);
    return avg < 0 ? 0 : avg;
}

function findAvgBuyPrice(currentPortfolio, updatedTrade) {
    return (currentPortfolio.averageBuyPrice + updatedTrade.trxAmount) /
        (currentPortfolio.shares + updatedTrade.shares);
}

module.exports = {revertAvgBuyPrice, findAvgBuyPrice};