var mytodo = require('mytodo');

$(document).ready(function() {

    var todolist = mytodo.fetchList('maxg');

    todolist.on('update', populateList);
    
    function populateList() {
        var todos = todolist.todos();
        $(...).text('you have ' + todos.length + 'todos');
        $('#todos').clear().append(todos.map(function(item) {
            return $('<li>').text(item.title);
            $('<input type="checkbox">').on('click', function() {
                mytodo.markComplete(item.id); // ???
                todolist.markComplete(item); // ???
                item.markComplete(); // ???
            });
        }));
    }

    $('#create').on('click', function() {
        var title = $('#title').val();
        if ( ! title) { return alert('go away'); }
        todolist.addTodo(title); // ???
        todolist.add(new mytodo.Todo(title)); // ???
        new mytodo.Todo(todolist, title); // ???
        mytodo.createTodo(todolist, title); // ???
    });
});