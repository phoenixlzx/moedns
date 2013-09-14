 /*
 *
 * jQuery & other functions.
 *
 * */
 // Random background-image
 var images = [
     '001.jpg',
     '002.jpg',
     '003.jpg',
     '004.jpg',
     '005.jpg',
     '006.jpg',
     '007.jpg'
 ];
 $('body').css({'background-image': 'url(/images/background/' + images[Math.floor(Math.random() * images.length)] + ')' });

// Remove spaces in an array
Array.prototype.cleanArray = function(valueToDelete){
    for (var i = 0; i < this.length; i++) {
        if (this[i] == (valueToDelete)) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
}

trimSpace = function (str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

 /*function loadStatus(server) {
     // alert(server);
     $.ajax({
         url: '/statusapi/' + server // $(this).substring($(this).attr('id').indexOf('-'))
     }).done(function(data) {
             $("#status-" + server).html(function() {
                 switch (data) {
                     case "0":
                         return '<span class="glyphicon glyphicon-ok-sign"></span>&nbsp;&nbsp;<span class="text-success">UP</span>';
                     case "1":
                         return '<span class="glyphicon glyphicon-remove-sign"></span>&nbsp;&nbsp;<span class="text-danger">DOWN</span>';
                     case "2":
                         return '<span class="glyphicon glyphicon-exclamation-sign"></span>&nbsp;&nbsp;<span class="text-warning">TIMEDOUT</span>'
                 }
             });
         });
 }*/

// jQuery methods.
$(document).ready(function() {
    // Show delete button on hover at domain list
    $("[id^='delete-domain']").hide();
    $("[id^='domain-row']").hover(function() {
            $(this).find("[id^='delete-domain']").show();
        }, function () {
            $(this).find("[id^='delete-domain']").hide();
        }
    );

    // Pass value to warning modal on deletion
    $("a[id^='delete-domain-']").click(function() {
        var line = 'domain-row' + $(this).attr('id').substring($(this).attr('id').lastIndexOf('-'));
        var domainObj = $("tr#" + line).children("td").map(function() {
            return $(this).text();
        }).get();
        var domain = jQuery.makeArray(domainObj);
        domain = domain[0].split(/[\n\s]+/g);

        // Set values
        $("form#domain-delete-form").attr("action", "/domain/" + domain[2] + "/delete");
        $("input#domainId").val(domain[1]);
        $("#domainId-static").text(domain[1]);
        $("#domainName-static").text(domain[2]);
    });

    // Enable 'priority' if type is MX
    $("#record-type").change(function() {
        if ($(this).val() == 'MX' || $(this).val() == 'SRV') {
            $("#record-prio").prop("disabled", false);
        } else {
            $("#record-prio").prop("disabled", true);
        }
    });

    $("#record-type-edit").change(function() {
        if ($(this).val() == 'MX') {
            $("#record-prio-edit").prop("disabled", false);
        } else {
            $("#record-prio-edit").prop("disabled", true);
        }
    });


    // Get data from a single tr when editing a record
    $("a[id^='record-edit']").click(function() {
        var line = 'record-row' + $(this).attr('id').substring($(this).attr('id').lastIndexOf('-'));
        var recordData = $("tr#" + line).children("td").map(function() {
            return $(this).text();
        }).get();
        var recordArray = jQuery.makeArray(recordData);
        var pathname = window.location.pathname;
        var path = pathname.substring(pathname.lastIndexOf('/') + 1);
        // alert(trimSpace(recordArray[1]));
        recordArray[1] = trimSpace(recordArray[1]);
        // Set values for edit modal
        $("#record-id-edit").val(recordArray[0]);
        $("#record-id-static").text(recordArray[0]);
        // alert(recordArray[4]);
        if (trimSpace(recordArray[4]) == '-') {
            $("#record-type-edit").val(recordArray[2]);
            $("#record-prio-edit").prop("disabled", true);
        } else {
            $("#record-prio-edit").prop("disabled", false).val(recordArray[4]);
            $("#record-type-edit").val(recordArray[2]);
        }
        if (recordArray[1] == path) {
            $("#record-name-edit").val('@');
        } else {
            $("#record-name-edit").val(recordArray[1]);
        }

        $("#record-ttl-edit").val(recordArray[5]);
        $("#record-content-edit").val(recordArray[3].slice(0, recordArray[3].lastIndexOf('.')));
    });

    // Get data from a single tr when deleting a record
    $("a[id^='record-delete']").click(function() {
        var line = 'record-row' + $(this).attr('id').substring($(this).attr('id').lastIndexOf('-'));
        var recordData = $("tr#" + line).children("td").map(function() {
            return $(this).text();
        }).get();
        var recordArray = jQuery.makeArray(recordData);
        // alert(recordArray);
        // Set values for edit modal
        $("#recordId").val(recordArray[0]);
        $("#recordId-static").text(recordArray[0]);
        $("#recordType-static").text(recordArray[2])
        $("#recordName-static").text(recordArray[1]);
        $("#recordContent-static").text(recordArray[3].slice(0, recordArray[3].lastIndexOf('.')));
    });

    // Get data from a single tr when editing a user
    $("a[id^='user-edit']").click(function() {
        var line = 'user-row' + $(this).attr('id').substring($(this).attr('id').lastIndexOf('-'));
        var userData = $("tr#" + line).children("td").map(function() {
            return $(this).text();
        }).get();
        var userArray = jQuery.makeArray(userData);
        // alert(userArray);
        // Set values for edit modal

        $("#user-name-edit").val(userArray[0]);
        $("#user-email-edit").val(userArray[1]);
        $("#user-role-edit").val(userArray[2]);
    });

    // Get data from a single tr when deleting a user
    $("a[id^='user-delete']").click(function() {
        var line = 'user-row' + $(this).attr('id').substring($(this).attr('id').lastIndexOf('-'));
        var userData = $("tr#" + line).children("td").map(function() {
            return $(this).text();
        }).get();
        var userArray = jQuery.makeArray(userData);
        // alert(userArray);
        // Set values for edit modal
        $("input#username").val(userArray[0]);
        $("#username-static").text(userArray[0]);
        $("#email-static").text(userArray[1])
        $("#role-static").text(userArray[2]);
    });

    // Get data from a single tr when editing a domain
    $("a[id^='domain-edit']").click(function() {
        var line = 'domain-row' + $(this).attr('id').substring($(this).attr('id').lastIndexOf('-'));
        var domainData = $("tr#" + line).children("td").map(function() {
            return $(this).text();
        }).get();
        var domainArray = jQuery.makeArray(domainData);
        // alert(domainArray);
        // Set values for edit modal


        $("#domainId").val(domainArray[0]);
        $("#domain-id").text(domainArray[0])
        $("#domain-name-edit").text(domainArray[1]);
        $("#belongs").val(domainArray[2]);
    });

    // Get data from a single tr when deleting a domain
    $("a[id^='domain-delete']").click(function() {
        var line = 'domain-row' + $(this).attr('id').substring($(this).attr('id').lastIndexOf('-'));
        var domainData = $("tr#" + line).children("td").map(function() {
            return $(this).text();
        }).get();
        var domainArray = jQuery.makeArray(domainData);
        // alert(userArray);
        // Set values for edit modal
        $("#domainId-delete").val(domainArray[0]);
        $("#domain-id-static").text(domainArray[0])
        $("#domain-name-static").text(domainArray[1]);
        $("#domain-belongs-delete").val(domainArray[2]);
        $("#domain-belongs-static").text(domainArray[2]);
    });


    // $("div.about-inner").load('static_html/about.html');

    // Record form show by type
    $("button#submit-record").prop("disabled", true);
    $("#record-type").change(function() {
        // alert($(this).val());
        var type = $(this).val();
        $("div#record-data").load('/addrecordapi #' + type);
        // $("div#record-data>div[id!='+type+']").attr("class", "hide");
        // $("div#" + type).attr("class", "").slideDown("fast");
        $("button#submit-record").prop("disabled", false);

    });

    // Table sorter
    $("table.sortable").tablesorter({
        // sort on the first column and third column, order asc
        sortList: [[2,0]]
    });


});


