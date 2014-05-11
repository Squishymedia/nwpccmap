(function($) {

function normalizeTitlesByGuessing(res) {
  if (!res.column_machine_names) {
    var human_titles = res.column_names;
    var machine_titles = _.first(res.data);

    // If first row contains any all-numeric cells, count it as a data row.
    // Otherwise, count it as machine namse
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
    .addTo(group);
}

$(document).ready(function() {
  var map = L.map('map', { });

  map.setView([51.505, -0.09], 13);

  L.tileLayer('https://a.tiles.mapbox.com/v3/ezheidtmann.i6nb1fon/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18
  }).addTo(map);

  var markers = new L.FeatureGroup().addTo(map);

  renderBubbleText = _.template($('#tpl').html());
  $.when($.ajax('latlng.json'), $.ajax('demo.json')).then(function(geo, demo) {
    eachGeoObject(geo[0], demo[0], function(row) {
      if (row._lat && row._lng) {
        addStationMarker(markers, row);
      }
    });

    map.fitBounds(markers.getBounds().pad(0.5));
  });
});

})(jQuery);
