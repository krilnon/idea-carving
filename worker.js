var
	editor,
	testbed,
	history

$(init)

function init(){
	editor = CodeMirror($('#editor')[0], {
		value: initialCode.toString(),
		mode: 'javascript'
	})
	
	testbed = CodeMirror($('#testbed')[0], {
		value: '> testbed',
		mode: 'javascript',
		extraKeys: {
			Enter: function(){
				var val = testbed.getValue()
				testbed.setValue('')
				history.setValue(history.getValue() + '\n' + val + '\n' + '=> // output')
				//testbed.replaceSelection('\n', 'end')
				// don't do that, take out nearest newline to caret
			}
		}
	})
	
	history = CodeMirror($('#history')[0], {
		value: (new Array(9)).join('\n'),
		mode: 'javascript'
	})
}

var initialCode = function TodolistModule(){
    this.add = function(arg0){
    	// your code here!
    }

    this.size = {
    	// and here
    }

    this.removeAt = function(arg0){ 
		// and here
	}


}