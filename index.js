const {env} = process
const moment = require('moment')
const {Wolfbet} = require('casinos')
const config = require('./config')

const {token, strategies} = config
const strategySelected = env.STRATEGY || 50
const currency = env.CURRENCY || 'doge'


const wolfbet = new Wolfbet(token)


const calcBaseAmount = (balance, increment, endurance) => balance * (1-increment)/(1-increment**endurance)
const now = () => moment().format('h:mm:ss')


const main = async () => {
  const strategy = strategies[strategySelected]
  const {bet_value, increment, endurance, rule, multiplier} = strategy
  let balance = await wolfbet.getBalance(currency)
  let dateBalance = moment()
  let baseAmount = calcBaseAmount(balance, increment, endurance)

  let looseInRow = 0
  let maxLoose = 0

  while(true) {
    const amount = baseAmount * increment ** looseInRow

    try {
      const betResponse = await wolfbet.placeBet({currency, amount: amount.toFixed(8), bet_value, rule, multiplier})
      const {bet} = betResponse

      if(bet.state === 'win') {
        if(dateBalance.isBefore(moment().subtract(6, 'hours'))) { //each 6hours recalculate baseAmount
          balance = await wolfbet.getBalance(currency)
          baseAmount = calcBaseAmount(balance, increment, endurance)
          dateBalance = moment()
	}

        console.log( 'win', now(), currency, (Number(bet.profit) - baseAmount*(1-increment**looseInRow)/(1-increment)).toFixed(8), 'maxLoose', maxLoose, 'looseInRow', looseInRow)
        looseInRow = 0
      } else {
        looseInRow++
        if(looseInRow > maxLoose) {
          maxLoose = looseInRow
          console.log(now(), 'maxLoose:', maxLoose)
	}
      }
      
    } catch (error){
      const waitedTime = 2*60*1000 
      await new Promise(r => setTimeout(()=> r(`Error ${error}, waited ${waitedTime}ms`), waitedTime)) //wait 2min for next try
    }
  }
}
main()
