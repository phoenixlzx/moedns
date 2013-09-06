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
 $('body').css({'background-image': 'url(/images/background/' + images[Math.floor(Math.random() * images.length)] + ')'});

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
        if ($(this).val() == 'MX') {
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
        // alert(recordArray);
        // Set values for edit modal
        $("#record-id-edit").val(recordArray[0]);
        $("#record-id-static").text(recordArray[0]);
        if (recordArray[4] == '-') {
            $("#record-type-edit").val(recordArray[2]);
            $("#record-prio-edit").prop("disabled", true);
        } else {
            $("#record-prio-edit").prop("disabled", false).val(recordArray[4]);
            $("#record-type-edit").val(recordArray[2]);
        }
        $("#record-name-edit").val(recordArray[1]);
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
});


