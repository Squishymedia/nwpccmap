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

var renderBubbleText;
var renderFacetBlock;
var renderDetailsText;

var colors = {
  WAT: "blue"
 ,STCG: "yellow"
 ,NG: "red"
};

function colorIcon(color) {
  return new L.DivIcon({ className: 'icon-' + color });
}

function addStationMarker(group, row) {
  L.marker([row._lat, row._lng],
    { icon: colorIcon(colors[row._PriFuel] || 'grey') })
    .bindPopup(renderBubbleText(row))
    .on('click', function(ev) {
      $('#details').html(renderDetailsText(row));
    })
    .addTo(group);
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

function buildFacets(rows) {
  _.each(facets, function(f) {
    f.items = _.countBy(rows, f.key);
    // TODO: augment with display names for facet titles
  });

  return facets;
}

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

function redrawMarkers() {
  var rows = _.filter(allRows, facetFilter());
  markers.clearLayers();
  _.each(rows, function(row) {
    addStationMarker(markers, row);
  });
}

$(document).ready(function() {
  var map = L.map('map', { });

  map.setView([51.505, -0.09], 13);

  L.tileLayer('https://a.tiles.mapbox.com/v3/ezheidtmann.i6nb1fon/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18
  }).addTo(map);

  markers = new L.FeatureGroup().addTo(map);

  renderBubbleText = _.template($('#tplBubbleText').html());
  renderFacetBlock = _.template($('#tplFacetBlock').html());
  renderDetailsText = _.template($('#tplDetailsText').html());

  $.when(
    $.ajax('http://npc.sqm.io/sets/3/current?format=json') // latlng
   ,$.ajax('http://npc.sqm.io/sets/1/current?format=json') // "projects"
  ).then(function(geo, demo) {
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

    redrawMarkers();

    map.fitBounds(markers.getBounds().pad(0.5));

    $('#facets').on('change', function() {
      redrawMarkers();
    });
  });
});

})(jQuery);
