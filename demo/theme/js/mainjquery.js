
$('body').on('click', "a.load", function(event){
  var sid = $(this).attr("data-sid");
  
  $.get('/history/' + sid, function(response){
    
    $("#revisions").html(response);
    $(".set.active").removeClass("active");
    $("#set" + sid).addClass("active");
  
  });
});

$('body').on('click', "a.postnew", function(event){
  
  var sid = $(this).attr("data-sid");
  
  $.get('/postnew/' + sid, function(response){
    
    $("#update" + sid).html(response);
    
  });
});

$('body').on('click', "a.close-upload", function(event){
  var sid = $(this).attr("data-sid");
  
  var link = $("<a>").attr("class","postnew").attr("data-sid",""+sid).attr("href","#").html("Upload a new revision");
  
  $("#update" + sid).html(link);
  
});

$('body').on('click', "a.approve", function(event){
  var sid = $(this).attr("data-sid");
  var vid = $(this).parent().attr("data-vid");
  
  $.get('/sets/' + sid + '/' + vid + '/approve', function(response){
    
    $("#fyi" + sid).html(response);
    $(".revision.current").removeClass("current");
    $("#rev" + vid).addClass("current");
    
  });
});

$('#affixThis').affix({
    offset: {
      top: 100
    , bottom: function () {
        return (this.bottom = $('.footer').outerHeight(true))
      }
    }
  });