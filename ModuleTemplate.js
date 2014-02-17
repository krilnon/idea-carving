function {{ moduleName }}Module(){
    {{#each members}}
        this.{{this.name}} = function(todoargslater){

        }
        
    {{/each}}
    this.add = function(arg0){ return new TodolistModule__add__RetVal() }

    this.size = {}

    this.removeAt = function(arg0){ return new TodolistModule__removeAt__RetVal() }


}