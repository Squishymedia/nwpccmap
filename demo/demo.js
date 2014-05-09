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


$(document).ready(function() {
  var render = _.template($('#tpl').html());
  $.when($.ajax('latlng.json'), $.ajax('demo.json')).then(function(geo, demo) {
    eachGeoObject(geo[0], demo[0], function(row) {
      // Render to template! yay!
      $('#info').append(render(row));
    });

  });
});

})(jQuery);
