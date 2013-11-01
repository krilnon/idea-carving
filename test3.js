var todo = require('todo')
var todolist = require('todolist')

todo.on('serverUpdate', function(data){
  todolist.add(data.newTodos)// {}
})

$('#remove').click(function(e){
  todolist.removeAt(todolist.size - 1)
})