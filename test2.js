// techcash, Citi virtual credit card

var
	techcash = require('techcash'),
    citiAuth = require('citi-auth'),
    virtualCC = require('citi-virtual-card-api')

var
	transactions = []

var loginInfo = techcash.loginInfo({ user: 'tim', pass: 'beaver' })
var balance = techcash.addMoney(5, loginInfo)

techcash.getTransactions(loginInfo, 100, function(e){
 	e.data.transaction 
})