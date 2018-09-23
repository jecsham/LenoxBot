//COMMANDS

//Filter by buttons
$("button").click(function() {
    var value = this.id;
    $("#commands-table tr").filter(function () {
        $(this).toggle($(this).attr('class').indexOf(value) > - 1);
    });
});

//Filter by text
$("#search-imput").on("keyup", function () {
    var value = $(this).val().toLowerCase();
    $("#commands-table tr").filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
    });
});