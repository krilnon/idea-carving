// techcash, Citi virtual credit card

var
	techcash = require('techcash'),
    citiAuth = require('citi-auth'),
    virtualCC = require('citi-virtual-card-api')

var
	transactions = []

main()

function main(){
	refreshTechCashInfo()
    
    // setInterval(refreshTechCashInfo, 60 * 60 * 1000)
}

function refreshTechCashInfo(){
  var loginInfo = techcash.loginInfo({ user: 'tim', pass: 'beaver' })
  
  // login server is determined by username
  console.log('logging into techcash at address: ', loginInfo.server)
  
  techcash.getTransactions(loginInfo, 100, function(e){
   	e.data.transaction 
  })
  
  techcash.addMoney(5, loginInfo)
  
}
