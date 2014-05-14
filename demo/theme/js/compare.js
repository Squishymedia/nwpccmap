// Config

var DATA_SERV = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');

// the starting point peer / "master"
var master = $("#masterid").val();

// Main comparator and subcategory comparator
var comp, subcomp = 0;

// Chart margin + size variables
// (using mbostock margin convention - http://bl.ocks.org/mbostock/3019563 )
var margin = {top: 20, right: 20, bottom: 40, left: 300};
var width = 950 - margin.left - margin.right,
    height = 1250 - margin.top - margin.bottom;
    
// Other custom variables for D3
var textSize = 18,
    barPadding = 10,
    axisTicks = 10,
    barHeight = 45;
  
// Create drawing area
var chart = d3.select("#chart-wrap").append("svg")
              .attr("class", "chart")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Create axis + label elements for render/repositioning later
chart.append("g")
     .attr("class", "x axis");
  
/*
 * reloadChart()
 *
 * Acquires new data based on the peers
 * and comparators selected.
 * 
 * Updates the chart based on the new data,
 * making any necessary changes to the scale/axes.
 */
function reloadChart(){
  
  // Initial scale setup
  var xScale = d3.scale.linear().range([0, width]);
  
  var ids = master;
    
  $( 'input.peer:checkbox:checked' ).each(function(){
    ids += ',' + $(this).val();
  });
  
  var lang = $("#lang-set").val();
  
  // Retrieve comparison data
  $.get(DATA_SERV + '/compdata/' + lang + '/' + ids + '/' + $('#comp').val() + '/' + subcomp, function(response) {
    
    // Parse into actual data vs config metadata
    var data = response.bars,
        meta = response.meta,
        subcats = response.subcats;
    
    // Before updating globals, see if subcategories need to be updated
    if(comp != $('#comp').val()){
      populateSubCats(subcats)
    }
    
    // Update globals now
    comp = $('#comp').val(),
    subcomp = $('#subcomp').val();

    // Alter scale domain based on new category if it has changed
    if(meta['xMax'] == 'get'){
      var maxz = d3.max(data, function(d) { return Number(d.point); });
      
      xScale.domain([meta['xMin'], maxz]).nice();
    }else{
      xScale.domain([meta['xMin'],meta['xMax']]);
    }                 

    // Generate d3 axis based on new scale
    var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("top")
                .ticks(axisTicks);
        
    var bars = chart.selectAll("g.data")
        .data(data, function(d) {
          // Ensure data not suppressed
          //if(d.nice.trim() != '*'){
            return d.point + '.' + d.id;
          /*}else{
            // If data suppressed, remove it from the data stack (we shouldn't render it right now)
            for(var i = 0; i < data.length; i++) {
                if(data[i].id === d.id) {
                   console.log(data);
                   console.log(data[i]);
                   data.splice(i, 1);
                   console.log(data);
                }
            }
          }*/
        });
        
    var nbar = bars.enter().append("g")
              .attr("class","data")
              .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; })
    
    // Fade out old bars' text.
    bars.exit().select("text")
        .transition().duration(250)
        .style("opacity",0);
    
    // Transition old bars...
    bars.exit().select("rect")
        .transition().duration(250).delay(250)
        .attr("height", 0);
        
    // Then remove them.
    bars.exit().transition().duration(250).delay(250).remove();
    
    // Move bars to stay sorted
    bars.transition().duration(250).delay(500)
        .attr("transform", function(d, i) {
            return "translate(0," + ((i + .5) * (barHeight + barPadding) + barPadding)   + ")";
         })
        .select("rect")
        .attr("width", function(d) { return xScale(d.point); });
    
    // Create the bar itself, and transition it.
    nbar.append("rect")
        .attr("x", function(d) { return xScale(0);})
        // Apply special class to the master school being compared
        .attr("class", function(d) { if(d.id == master){ return "master"; } })
        .attr("width", 0)
        .attr("height", barHeight)
        .transition().duration(250).delay(1000)
        .attr("width", function(d) { return xScale(d.point); });
    
    // Add the label.
    nbar.append("text")
        .attr("y", barHeight - (textSize / 2) - barPadding)
        .attr("x", -margin.left)
        .attr("dx", ".75em")
        .attr("width", margin.left)
        .attr("class", "bar-label")
        .style("opacity",0)
        .text(function(d) { return d.label; })
        .transition().duration(1000).delay(1500)
        .style("opacity",100);
        
    // "Nice" data point label.
    nbar.append("text")
        .attr("y", (barHeight / 2) + (textSize / 2) - 3)
        .attr("x", function(d) { return xScale(0);})
        .attr("dx", ".75em")
        .attr("class", "bar-nice")
        .style("opacity",0)
        .text(function(d) {
          if(meta['Variable'].indexOf("Pct") != -1 && d.nice.indexOf("%") == -1){
            return d.nice + '%';
          }else{
            return d.nice;
          }
          })
        .transition().duration(1000).delay(1500)
        .style("opacity",100);
  
    chart.select(".x.axis")
         .attr("transform", "translate(0," + textSize * 1.5 + ")")
         .attr("width", width)
         .call(xAxis);
          
    $("#axis-label").text(meta['Description']);
  });
  
  function type(d) {
    d.point = +d.point; // coerce to number
    return d;
  }  
}

/*
 * changeComparator()
 * 
 * Fire when changing the main or sub category.
 * 
 * Fires separately from reload, because some peers may
 * need to be suppressed based on the data selected
 */
function changeComparator(){
  // By default set all checkboxes back to available
  
  var id = $('#masterid').val();
  
  // If main category changed, send this request without subcategory (subcomp null.)
  // Otherwise, send subcomp normally.
  
  if(comp != $('#comp').val() && subcomp != null){
    subcomp = null;
  }else if(comp == $('#comp').val()){
    subcomp = $('#subcomp').val();
  }
  
  var lang = $("#lang-set").val();
  
  // Get list of suppressed schools from server
  $.get(DATA_SERV + '/suppdata/' + lang + '/' + id + '/' + $('#comp').val() + '/' + subcomp, function(response) {
    supp = response.suppressed;
    
    // Enable all, remove master message.
    $('.peer').prop('disabled', false).parent().removeClass('dis');
    $('#suppress-master').text('');
    
    if(supp.length > 0) {
      
      // Check all suppressed IDs if there are any
      for(x = 0; x < supp.length; x++){
        
        // Special message for master suppressed
        if(supp[x] == id) {
          $('#suppress-master').show();
        }
        
        // Uncheck and disable suppressed
        $('input:checkbox[value="' + supp[x] + '"]').prop('disabled', true).parent().addClass('dis');
      }
    
      // Inform user of suppressed peers
      $('#suppress-notice').show();
    }else{
      // If none, remove message.
      $('#suppress-notice').hide();
      $('#suppress-master').hide();
    }
    
    reloadChart();
  });
}

function populateSubCats(subcats){
  // If not empty, clear existing, then populate list
  if(subcats !== null && subcats.length > 0){
    
    $('#subcomp').empty();
    
    for(x = 0; x < subcats.length; x++){
      $("<option></option>").val(subcats[x].cid).text(subcats[x].Label).appendTo($("#subcomp"));
    }
    
    $('#subcomp').prop('disabled',false);
    
  }else{   // If empty, empty and ensure disable
    
    $('#subcomp').prop('disabled',true);
    $('#subcomp').empty();
    $("<option></option>").text("(no subcategories)").val("null").appendTo($('#subcomp'));
    
  }
}

// when ready, fire reload chart for the first time.
$(function(){
  changeComparator();
});

$('.comparator.trigger').change(function(){
  changeComparator();
});

$('.peer.trigger').change(function(){
  reloadChart();
}); 