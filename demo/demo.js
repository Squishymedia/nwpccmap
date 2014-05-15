(function($) {

function normalizeTitlesByGuessing(res) {
  if (!res.column_machine_names) {
    var human_titles = res.column_names;
    var machine_titles = _.first(res.data);

    // If first row contains any all-numeric cells, count it as a data row.
    // Otherwise, count it as machine name
    if (_.any(machine_titles, function(t) { return /^[.\d]+$/.test(t); })) {
      res.column_machine_names = res.column_names;
    }
    else {
      res.column_machine_names = machine_titles;
      res.data.shift();
    }
  }
  
  return res;
}

/**
 * Run cb(row) for each row object in res
 *
 * @param res API return value
 * @param cb Callback, called as cb(object_keyed_by_machine_name)
 */
function eachRowObject(res, cb) {
  normalizeTitlesByGuessing(res);

  _.each(res.data, function(cells) {
    var obj = {};
    _.each(cells, function(val, i) {
      var col_name = res.column_machine_names[i] || 'col_' + i;
      obj['_' + col_name] = val;
    });

    obj.original = res;
    obj.cells = cells;

    cb(obj);
  });
}

/**
 * Run cb(row) for each geo-enabled row object in the second argument api return value
 *
 * @param geodata API return value for geodata
 * @param demodata API return value for station information
 * @param cb Callback, called as cb(obj)
 * @param o Options object
 */
function eachGeoObject(geodata, demodata, cb, o) {
  o = o || {};
  _.defaults(o, {
    geoKey: '_NWPCCID'
   ,dataKey: '_NWPCCID'
   ,latKey: '_Latitude'
   ,lngKey: '_Longitude'
  });
  var geoById = {};

  eachRowObject(geodata, function(row) {
    if (row[o.geoKey] && row[o.latKey] && row[o.lngKey]) {
      geoById[row[o.geoKey]] = row;
    }
  });

  eachRowObject(demodata, function(row) {
    row._lat = row._lng = null;
    if (geoById[row[o.dataKey]]) {
      var geo = geoById[row[o.dataKey]];
      row._lat = geo[o.latKey];
      row._lng = geo[o.lngKey];
    }
    
    cb(row);
  });
}

// placeholder for templates
var renderBubbleText;
var renderFacetBlock;
var renderDetailsText;

var markerLookup = {};

var iconType = {};

// Convert multi word facets to friendly single phrase for CSS
function slugify(text) {
  if (text) {
    // truncate at first space if applicable
    if(text.indexOf(' ') > 0) { text = text.substr(0,text.indexOf(' ')) };
    
    text = text.toLowerCase();
  
    text = text.replace(/[^a-z0-9 -]/g, ''); // remove invalid chars
  
    return text;
  }else{
    return 'grey';
  }
  
}

function colorIcon(ptype) {
  return new L.DivIcon({ className: 'i-' + ptype });
}

function addStationMarker(group, row) {
  var marker = L.marker([row._lat, row._lng],
    { icon: colorIcon(slugify(row._RES)) })
    .addTo(group);
    
  var popup = marker.bindPopup(renderBubbleText(row))
    .on('popupopen', function(ev) {
      $('#details').html(renderDetailsText(row));
    })
        
  markerLookup[row._NWPCCID] = marker;
}

var facets = {};
facets.resource = {
  name: "Resource"
 ,key: '_RES'
 ,items: {}
};

facets.primary_fuel = {
  name: "Primary Fuel"
 ,key: '_PriFuel'
 ,items: {}
};

// Groups resources by facets
function buildFacets(rows) {
  _.each(facets, function(f) {
    f.items = _.countBy(rows, f.key);
    // TODO: augment with display names for facet titles
  });

  return facets;
}

// Manages drilldown by facets (resource type)
function facetFilter() {
  var facetStates = _.map($('#facets').find('input'), function(elem) {
    var name = elem.name;
    var parts = name.split('__');
    return {
      key: parts[0]
     ,value: parts[1]
     ,state: elem.checked
    };
  });

  var any_checked = _.some(facetStates, function(fs) { return fs.state; });

  if (any_checked) {
    var filter = function(row) {
      return _.some(facetStates, function(fs) {
        return (fs.state && row[fs.key] && row[fs.key] == fs.value);
      });
    };
  }
  else {
    var filter = _.constant(true);
  }

  return filter;
}

var allRows;
var markers;

// Redraw all map markers and repopulate chosen list; based on filters.
function redrawMarkers() {
  var rows = _.filter(allRows, facetFilter());
  markers.clearLayers();
  $('#stations').empty().append($('<option>').attr("value",0).html("Search for a station.."));
  _.each(rows, function(row) {
    addStationMarker(markers, row);
    loadStationOpt(row); 
  });
  $('#stations').trigger("chosen:updated");
}

// Populate chosen list
function loadStationOpt(row) {
  $('#stations').append($('<option>').attr("value",row._NWPCCID).html(row._Namem));
}

// Close details view
function closeDetails() {
  $('#details').html('');
  
}

// Map config & event bindings
$(document).ready(function() {
  var map = L.map('map', { });

  // Center on Idaho, roughly
  map.setView([44.562138, -115.385450], 6);

  L.tileLayer('https://a.tiles.mapbox.com/v3/ezheidtmann.i6nb1fon/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18
  }).addTo(map);

  markers = new L.FeatureGroup().addTo(map);

  // Set up underscore templates for dynamic data
  renderBubbleText = _.template($('#tplBubbleText').html());
  renderFacetBlock = _.template($('#tplFacetBlock').html());
  renderDetailsText = _.template($('#tplDetailsText').html());

  // Retrieve power source and geo data
  $.when(
    $.ajax('http://npc.sqm.io/sets/3/current?format=json') // geo
   ,$.ajax('http://npc.sqm.io/sets/1/current?format=json') // power sources info
  ).then(function(geo, demo) {
    // Populate app data
    var rows = [];
    eachGeoObject(geo[0], demo[0], function(row) {
      if (row._lat && row._lng) {
        rows.push(row);
      }
    });

    // facets
    var facets = buildFacets(rows);
    $('#facets').html(renderFacetBlock({ facets: facets }));

    allRows = rows;

    // Initial marker creation
    redrawMarkers();

    $('#stations').chosen();
    
    // Center on relevant area
    map.fitBounds(markers.getBounds().pad(0.1));

    // When filters change, update map to reflect
    $('#facets').on('change', function() {
      redrawMarkers();
    });
    
    // Allows search / drilldown to pop up map marker + detail view
    $('#stations').on('change', function(){
      if ($('#stations').val() > 0) {
        markerLookup[$('#stations').val()].fire('click').openPopup();
      }
    });
    
    // Needs a different callback?
    //map.on('popupclose', closeDetails);
  });
  
  
});

})(jQuery);
