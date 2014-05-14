(function () {
  var termTemplate = "<strong>$1</strong>";
  var MIN_LENGTH = 1;

  var renderD = function (ul, item, d){
    item.$a = $( "<a>" ).attr('href','/districts/' + item.value).text( item.label ).append( $( "<span>" ).text( ' ' + item.info ) );
    item.$li = $( "<li>" )
        .attr( "data-value", item.value )
        .append( item.$a )
        .appendTo( ul );

    return item.$li;
  };

  var renderS = function (ul, item, s){
    item.$a = $( "<a>" ).attr('href','/schools/' + item.value).text( item.label ).append( $( "<span>" ).text( ' ' + item.info ) );
    item.$li = $( "<li>" )
        .attr( "data-value", item.value )
        .append( item.$a )
        .appendTo( ul );

    return item.$li;
  };

  /**
   * Wrap search string in <strong> tag wherever it appears in the results
   */
  function replaceSearch(me,search){
    var regex = new RegExp( '(' + search + ')', 'gi' );
    var city = me.find('span').text();
    me.find('span').remove();
    me.html( me.text().replace(regex, termTemplate))
    me.append($( "<span>" ).html(city))
  }

  /**
   * Act on focus (arrow-key selection of result).
   */
  function focusCallback(e, ui) {
    // Put school or district name in input field
    $(this).val(ui.item.label);
    // Add focus class to li
    ui.item.$li.addClass('focus').siblings().removeClass('focus');
    return false;
  }

  /**
   * Act on selection (click on result or press enter)
   */
  function selectCallback(e, ui) {
    // Navigate to selected district or school
    window.location.href = ui.item.$a.prop('href');
    return false;
  }

  /**
   * Act on menu being opened or updated (usually happens when search
   * results return from the server)
   */
  function openCallback(e, ui) {
    // highlight search term in the results list
    var acData = $(this).data('uiAutocomplete');
    acData
      .menu
      .element
      .find('a')
      .each(function() {
        replaceSearch($(this),acData.term);
      });
  }

  $(document).ready(function() {
    $("#search-districts").autocomplete({
      source: "/search/districts/",
      minLength: MIN_LENGTH,
      open: openCallback,
      select: selectCallback,
      focus: focusCallback
    });

    $("#search-districts").data('uiAutocomplete')._renderItem = renderD;

    $("#search-schools").autocomplete({
      source: "/search/schools/",
      minLength: MIN_LENGTH,
      open: openCallback,
      select: selectCallback,
      focus: focusCallback
    });

    $("#search-schools").data('uiAutocomplete')._renderItem = renderS;
  });
})();
