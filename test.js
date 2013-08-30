var 
	path = require('path'),
	junk = require('junk'),
	fakemod = require('fake-module')

junk.foo
junk.bar.baz
junk.bar.zap('hi', 42, {}, new WeakMap())
junk.bar.zap('hi', 'grr', {}, new WeakMap())

fakemod.someVal

var foo = fs.readFileSync('foo.txt')

foo.bar