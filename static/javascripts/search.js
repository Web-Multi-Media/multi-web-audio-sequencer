// FREESOUND SEARCH
function initSearch() {
  var search = new Search();
  search.setToken();
  search.addButtonEvents();
  search.noteType();
  search.noteKey();
  return search;
}

function Search() {
  var query = null;
  var page = null;
  var numPages = null;
  var numSounds = null;
  var sliderValue = null;
  var loopType = null;
  var options = null;
}

Search.prototype.setToken = function () {
  $.get(base_path + '/get_freesound_token')
    .done(function(data) {
      freesound.setToken(data);
    });
};

Search.prototype.freesoundIframe = function (soundId) {
  return '<iframe frameborder="0" scrolling="no" src="https://freesound.org/embed/sound/iframe/' + soundId + '/simple/small/" width="375" height="30"></iframe>';
};

// Search.prototype.searchFreesound = function (query, page, filter, descriptors) {
  Search.prototype.searchFreesound = function (query, page, filter, noteKey) {
    var self = this;

    self.query = query;
    self.page = page;
    self.filter = filter;
    self.noteKey = noteKey;
    var sort = "rating_desc";
    options = {
      query: query,
      page: page,
      filter: filter,
      sort: sort,
      fields: 'id,name,url,previews',
    };

    if (noteKey) {
     options.descriptors_filter = noteKey;
    }

    freesound.combinedSearch((options), 
    function (sounds) {
      console.log('valeur de la query', sounds);
      var msg = ""
      self.numSounds = sounds.length;
      self.numPages = Math.ceil(self.numSounds / 15);
      var numSoundCurrentPage = sounds.results.length;

      for (i = 0; i < numSoundCurrentPage; i++) {
        var snd = sounds.getSound(i);
        msg += "<div>" + self.freesoundIframe(snd.id) + "<div class='drag-me' draggable='true' ondragstart='drag(event)' sound-url='" + snd.previews["preview-lq-ogg"] + "'>Drag</div></div>";
      }
      msg += "</ul>"
      document.getElementById("search-result-container").innerHTML = msg;
      $('#page').html(self.page + '/' + self.numPages);
      $('#next').removeAttr('disabled');
      if (self.page >= self.numPages) {
        $('#next').attr('disabled', 'disabled');
      } else {
        $('#next').removeAttr('disabled');
      }
      if (self.page === 1) {
        $('#previous').attr('disabled', 'disabled');
      } else {
        $('#previous').removeAttr('disabled');
      }
      document.getElementById('error').innerHTML = "";
    },
    function () {
      document.getElementById('error').innerHTML = "Error while searching...";
    }
  )
};

Search.prototype.addButtonEvents = function () {
  var self = this;
  $('#search-button').click(function () {
    self.searchEvent();
  });

  $('#search-form').submit(function () {
    self.searchEvent();
  });

  $('#previous').click(function () {
    self.page -= 1;
    self.searchFreesound(self.query, self.page, self.filter, self.descriptors);
  });

  $('#next').click(function () {
    self.page += 1;
    self.searchFreesound(self.query, self.page, self.filter, self.descriptors);
  });
};

Search.prototype.noteType = function() {
  $('.loop-type').click(function() {
    loopType = $(this).val();
    if ($(this).val() === 'loop') {
      $('#loop').addClass('active');
      $('#single-note').removeClass('active');
      $('#chord').removeClass('active');
    } else if ($(this).val() === 'single-note') {
      $('#single-note').addClass('active');
      $('#loop').removeClass('active');
      $('#chord').removeClass('active');
    } else if ($(this).val() === 'chord') {
      $('#chord').addClass('active');
      $('#loop').removeClass('active');
      $('#single-note').removeClass('active');
    }
    console.log(loopType);
    return loopType;
  });
}
// Set note key filter
Search.prototype.noteKey = function() {
  $('.key').click(function(){
    if($(this).hasClass('active')) {
      $(this).removeClass('active');
    } else {
      $('.key').removeClass('active');
      $(this).addClass('active')
      return $(this).value;
    }
  })
}

Search.prototype.searchEvent = function () {
  this.query = $('#search-query').val();
  this.sliderValue = $('#sampleDuration').val();
  var duration = "duration:[" + this.sliderValue.split(',')[0] + ".0 TO " + this.sliderValue.split(',')[1] + ".0]";
  var filter =  duration;
  var noteKey;

  if($('.loop-type.active').val() != undefined) {
    this.loopType = $('.loop-type.active').val();
    filter += " tag:" + this.loopType;
  }

  if($('.key').hasClass('active')) {
    noteKey = "tonal.key_key:\"" + $('.key.active').val() + "\"";
  } 

  this.searchFreesound(this.query, 1, filter, noteKey);
};

