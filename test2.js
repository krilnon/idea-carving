// techcash, Citi virtual credit card

var
	techcash = require('techcash'),
    citiAuth = require('citiAuth'),
    virtualCC = require('virtualCC')

var
	transactions = []

var loginInfo = techcash.loginInfo({ user: 'tim', pass: 'beaver' })
var balance = techcash.addMoney(5, loginInfo)

techcash.getTransactions(loginInfo, 100, function(e){
 	e.data.transaction 
})