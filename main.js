var selectedCoinId;
var allCoins;

var fetchAllTokens = new Promise(async (resolve) => {
        let response = await fetch("https://api.coingecko.com/api/v3/coins/list");
        let data = await response.json();
        let coins = data.map(d => {return {id: d.id, name: d.name}});
        resolve(coins);
    }
);

function preInit(){
    initTokens.then(init);
}

let init = async () => {
    setCurrentDate();
    let coinSelectBtn = document.getElementById("coin-select-btn");
    let calculateBtn = document.getElementById("calculate-btn");
    let coinInfoLabel = document.getElementById("coin-info");
    coinInfoLabel.textContent = "None selected";
    coinSelectBtn.addEventListener("click",selectCoinClick);
    calculateBtn.addEventListener("click",calculateClick);
    
}

window.onload = preInit;

var initTokens = new Promise(async (resolve) =>  {
    await fetchAllTokens.then(async (coins) => {
        allCoins = coins;
    });
    resolve();
});

var setCurrentDate = () => {
    let date = new Date();
    let dateSelect = document.getElementById("ma-starting-date");
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let monthStr = month > 9 ? `${month}` : `0${month}`;
    let dayStr = day > 9 ? `${day}` : `0${day}`;
    dateSelect.value = `${year}-${monthStr}-${dayStr}`;
}

var selectCoinClick = async () => {
    let contractField = document.getElementById("contract-field");
    let tokenNameField = document.getElementById("coin-search");
    let contractText = contractField.value;
    let tokenNameText = tokenNameField.value;
    let coinInfoLabel = document.getElementById("coin-info");
    if (contractText.length == 0){
        selectCoinFromName(tokenNameText);
    }else{
        let coin = await fetchCoinFromContract(contractText).then(coin => {return coin;}).catch(
            async (err) => {
                coinInfoLabel.textContent = err;
                contractText.textContent = "";
            }
        )
        selectedCoinId = coin.id;
        coinInfoLabel.textContent = coin.name;

    }
    
}
var calculateClick = async () => {
    let resultLabel = document.getElementById("calc-info");
    if(typeof selectedCoinId == "undefined"){
        resultLabel.textContent = "Please choose a coin.";
    }else{
        let dateSelect = document.getElementById("ma-starting-date");
        
        let maDaysField = document.getElementById("ma-days-field");
        let amountField = document.getElementById("amount-field");
        let showDetailCheckbox = document.getElementById("show-detail");
        let maDays = parseInt(maDaysField.value);
        let amount = parseInt(amountField.value);
        resultLabel.textContent = "Calculating...";
        let result = await convertMoneyToCoinByMA(dateSelect.value,selectedCoinId,maDays,amount);
        if(showDetailCheckbox.value == "on"){
            resultLabel.textContent = result.more_detail;
        }else{
            resultLabel.textContent = result.result;
        }
    }
    
}

var selectCoinFromName = (inputName) =>{
    var isFound = false;
    let coinInfoLabel = document.getElementById("coin-info");
    searchName = inputName.replace(/\s+/g, "").toLowerCase();
    console.log(searchName);
    for(token of allCoins){
        
        if(searchName == token.name.replace(/\s+/g, "").toLowerCase()){
            selectedCoinId = token.id;
            coinInfoLabel.textContent = token.name;
            isFound =true;
            break;
        }
    }
    if(!isFound){
        coinInfoLabel.textContent = "Coin has not been found";
    }
    

}

// var populateSelect = async(coins) => {
//     var coinSelect = document.getElementById("coin-select");
//     coins.sort((a,b) => {
//         if (a.name < b.name){
//             return -1;
//         }else{
//             return 1;
//         }
//     });
//     for(coin of coins){
//         var opt = document.createElement("option");
//         opt.value = coin.id;
//         opt.innerHTML = coin.name;
        
//         coinSelect.appendChild(opt);
        
//     }
// }



var fetchCoins = async () => new Promise(async (resolve) => {
    let response = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc");
    let data = await response.json();
    coins = data.map(d => {return {id: d.id,name: d.name}});
    resolve(coins);
});

/**
 * returns Coin from its contract address. Rejects if it cannot find any coin
 * with corresponding contract.
 * @param {string} contract contract address of token
 * @returns {Promise<Coin>} Promise representing Coin which fetched from contract 
 * address.
 */
var fetchCoinFromContract = async(contract) => new Promise(async(resolve, reject) => {
    let response = await fetch(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${contract}`);
    let data = await response.json();
    if(data.success){
        reject("Token with given contract address has not been found.");
    }
    resolve({
        id: data.id,
        name: data.name
    });
});

/**
 * 
 * @param {string} coinId coin gecko id of coin
 * @param {string} date string of a date in dd-mm-yyyy format
 * @returns {Promise}  Promise respresenting coingecko data of coin with coinId 
 * of the date.
 */
var fetchCoinHistory= async (coinId,date) => new Promise(async(resolve) => {
    let response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${date}`);
    let data = await response.json();
    resolve(data);
});

/**
 * 
 * @param {Object} coinData coin gecko coin object
 * @returns {number} price value of the coin
 */
 var fetchClosingPrice = coinData => {
    let price = coinData.market_data.current_price.usd;
    return price;
}

/**
 * Calculates the date before daysAgo from today.
 * @param {number} daysAgo 
 * @returns {string} String of the date before daysAgo days of dd-mm-yyyy format.
 */
 var getNDaysAgoStr = (startDate, daysAgo) => {
    let pastDate = new Date();
    splitStartDate = startDate.split("-");
    
    let startDay = parseInt(splitStartDate[2]);
    let startMonth = parseInt(splitStartDate[1]);
    let startYear = parseInt(splitStartDate[0]);
    
    pastDate.setFullYear(startYear);
    pastDate.setMonth(startMonth - 1);
    pastDate.setDate(startDay);
    pastDate.setDate(pastDate.getDate()-daysAgo);
    let day = pastDate.getDate();
    let month = pastDate.getMonth() + 1;
    let year = pastDate.getFullYear();

    return `${day}-${month}-${year}`;
}

/**
 * Returns the closing prices of the days which are all the days before today and until
 * daysAgo amount of days. 
 * @param {string} coinId coingecko id of coin
 * @param {number} daysAgo number of days ago that the prices are fetched 
 * @returns {Promise<Price|Array>} Promise representing the array of Prices
 */
 var fetchPrevNDaysPrices = async (startDate, coinId, daysAgo) => new Promise(async(resolve) => {
    var result = []
    for(i=1;i<=daysAgo;i+=1){
        let date = await getNDaysAgoStr(startDate,i);
        let price = await fetchCoinHistory(coinId, date).then(fetchClosingPrice).catch(async (err) => {
            console.log(err);
        });
        result.push({ 
            date: date,
            price: price
        });
    }
    resolve(result);
});

/**
 * Calculates the simple moving average of given prices.
 * @param {Price|Array} prices Array of price objects
 * @returns {MA} MA object containing average result.
 */
 var calculateMA = async (prices) => {
    let sum = prices.filter(o => o.price != undefined).map(o => o.price).reduce((a,b) => a + b, 0);
    let days = prices.length;
    let average = sum/days;
    var detail = `${days} days moving average calculation details.`;
    detail += `Note: Calculation is done by using simple moving average calculation \n`;
    detail += `technique. Closing prices are used during the calculation. \n`;
    detail += `Days and closing prices which are included into the calculation; \n`;
    for(let price of prices){
        detail += `Date: ${price.date}\tClosing Price: ${price.price} \n`;
    }
    detail += `Sum = ${sum} \n`;
    detail += `Average = ${average} = ${sum}/${days}\n`;
    return {
        average: average,
        days: days,
        detail: detail};
}

/**
 * Converts the amount (usd) to coin amount by using ma
 * @param {number} amount usd to be converted
 * @param {MA} ma moving average object which will be used during the conversion
 * @returns {Object} containgin simple detail,more_detail included the ma's details also  and result.
 */
 var convertToCoinByMA = (amount, ma) => {
    let result = amount/ma.average;
    return { 
        result: result,
        detail: `${amount}/${ma.average} = ${result}`,
        more_detail: ma.detail + `result = ${amount}/${ma.average} = ${result}\nresult = ${result}\n`
    }

}

var convertMoneyToCoinByMA = async (startDate,coinId, days, amount) => {
    return convertToCoinByMA(amount, await calculateMA(await fetchPrevNDaysPrices(startDate,coinId,days)));
}