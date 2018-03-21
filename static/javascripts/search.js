// FREESOUND SEARCH
function initSearch() {
  var search = new Search();
  search.setToken();
  search.addButtonEvents();
  return search;
}

function Search() {
  var query = null;
  var page = null;
  var numPages = null;
  var numSounds = null;
  var sliderValue = null;
}

Search.prototype.setToken = function () {
  $.get(base_path + '/get_freesound_token', [],function(data) {
    freesound.setToken(data);
  });
};

Search.prototype.freesoundIframe = function (soundId) {
  return '<iframe frameborder="0" scrolling="no" src="https://freesound.org/embed/sound/iframe/' + soundId + '/simple/small/" width="375" height="30"></iframe>';
};

Search.prototype.searchFreesound = function (query, page, filter) {
  var self = this;

  self.query = query;
  self.page = page;
  self.filter = filter;
  var sort = "rating_desc";
  freesound.textSearch(query, {
      page: page,
      filter: filter,
      sort: sort,
      fields: 'id,name,url,previews',
    },
    function (sounds) {
      var msg = ""
      self.numSounds = sounds.count;
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
  );
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
    self.searchFreesound(self.query, self.page, self.filter);
  });

  $('#next').click(function () {
    self.page += 1;
    self.searchFreesound(self.query, self.page, self.filter);
  });
};

Search.prototype.searchEvent = function () {
  this.query = $('#search-query').val();
  this.sliderValue = $('#sampleDuration').val();
  var duration = "duration:[" + this.sliderValue.split(',')[0] + ".0 TO " + this.sliderValue.split(',')[1] + ".0]"
  this.searchFreesound(this.query, 1, duration);
};