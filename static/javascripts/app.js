//audio node variables
var context;
var convolver;
var compressor;
var masterGainNode;
var effectLevelNode;
var lowPassFilterNode;

var noteTime;
var startTime;
var lastDrawTime = -1;
var LOOP_LENGTH = 16;
var rhythmIndex = 0;
var timeoutId;
var testBuffer = null;

var currentKit = null;
var wave = null;
var reverbImpulseResponse = null;

var tempo = 120;
var TEMPO_MAX = 200;
var TEMPO_MIN = 40;
var TEMPO_STEP = 4;

if (window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext')) {
  window.webkitAudioContext = AudioContext;
}

$(function () {

  init();
  addNewTrackEvent();
  //toggleSelectedListener();
  playPauseListener();
  lowPassFilterListener();
  reverbListener();
  createLowPassFilterSliders();
  initializeTempo();
  changeTempoListener();
  addSearchButtonEvent();

});

function createLowPassFilterSliders() {
  $("#freq-slider").slider({
    value: 1,
    min: 0,
    max: 1,
    step: 0.01,
    disabled: true,
    slide: changeFrequency
  });
  $("#quality-slider").slider({
    value: 0,
    min: 0,
    max: 1,
    step: 0.01,
    disabled: true,
    slide: changeQuality
  });
}

function lowPassFilterListener() {
  $('#lpf').click(function () {
    $(this).toggleClass("active");
    $(this).blur();
    if ($(this).hasClass("btn-default")) {
      $(this).removeClass("btn-default");
      $(this).addClass("btn-warning");
      lowPassFilterNode.active = true;
      $("#freq-slider,#quality-slider").slider("option", "disabled", false);
    } else {
      $(this).addClass("btn-default");
      $(this).removeClass("btn-warning");
      lowPassFilterNode.active = false;
      $("#freq-slider,#quality-slider").slider("option", "disabled", true);
    }
  })
}

function reverbListener() {
  $("#reverb").click(function () {
    $(this).toggleClass("active");
    $(this).blur();
    if ($(this).hasClass("btn-default")) {
      $(this).removeClass("btn-default");
      $(this).addClass("btn-warning");
      convolver.active = true;
    } else {
      $(this).addClass("btn-default");
      $(this).removeClass("btn-warning");
      convolver.active = false;
    }
  })
}

function changeFrequency(event, ui) {
  var minValue = 40;
  var maxValue = context.sampleRate / 2;
  var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
  var multiplier = Math.pow(2, numberOfOctaves * (ui.value - 1.0));
  lowPassFilterNode.frequency.value = maxValue * multiplier;
}

function changeQuality(event, ui) {
  //30 is the quality multiplier, for now. 
  lowPassFilterNode.Q.value = ui.value * 30;
}

function CheckAndTrigerPlayPause() {
  var $span = $('#play-pause').children("span");
  if ($span.hasClass('glyphicon-play')) {
    $span.removeClass('glyphicon-play');
    $span.addClass('glyphicon-pause');
    handlePlay();
  } else {
    $span.addClass('glyphicon-play');
    $span.removeClass('glyphicon-pause');
    handleStop();
  }
}


$(window).keypress(function (e) {
  if (e.charCode === 0 || e.charCode === 32) {
    e.preventDefault();
    CheckAndTrigerPlayPause();
  }
})

function playPauseListener() {
  $('#play-pause').click(function () {
    CheckAndTrigerPlayPause();
  });
}


function TranslateStateInActions(json) {
  console.log(json);

  // Add tracks and load buffers
  var trackUrl = json[1];
  var trackNameList = Object.keys(trackUrl);
  for (var j = 0; j < trackNameList.length; j++) {
    addNewTrack(trackNameList[j], trackUrl[trackNameList[j]]);
  }

  // Activate pads
  var jsonState = json[0];
  for (var i = 0; i < jsonState.length; i++) {
    var tabJson = JSON.parse(jsonState[i]);
    for (var j = 0; j < tabJson.length; j++) {
      toggleSelectedListenerSocket(tabJson[j][1]);
      console.log(jsonState[j]);
    }
  }
}


function toggleSelectedListener(padMessage) {

  // $('.pad').click(function () {
  padMessage.toggleClass("selected");
  // SEND THIS TO SERVER WITH SOCKET
  console.log(padMessage.attr('class'), padMessage.parent().attr("data-instrument"));
  var instru = padMessage.parent().attr("data-instrument");
  var pad = padMessage.attr('class');
  //var tempo = $('#tempo-input').val();

  return pad + ' ' + instru;
  //});
}

// CALL THIS FUNCTION WHEN RECIEVING SOCKET
function toggleSelectedListenerSocket(msg) {
  console.log(msg);
  messages = msg.split(" ");
  if (messages[0] == "pad") {
    var instrument = messages[messages.length - 1];
    var column = parseInt(messages[1].split("_")[1]);
    var activate = (messages[2] == "selected") ? true : false;
    var pad_el = $('[data-instrument="' + instrument + '"]').children()[column + 1];
  }
  var current_state = (pad_el.getAttribute("class").split(" ")[2] == "selected") ? true : false;
  if (current_state) {
    if (activate == false) {
      pad_el.classList.remove("selected")
    }
  } else {
    if (activate) {
      pad_el.classList.add("selected")
    }
  }
}


function init() {
  initializeAudioNodes();
  loadKits();
  loadImpulseResponses();
}

function initializeAudioNodes() {
  context = new webkitAudioContext();
  var finalMixNode;
  if (context.createDynamicsCompressor) {
    // Create a dynamics compressor to sweeten the overall mix.
    compressor = context.createDynamicsCompressor();
    compressor.connect(context.destination);
    finalMixNode = compressor;
  } else {
    // No compressor available in this implementation.
    finalMixNode = context.destination;
  }


  // Create master volume.
  // for now, the master volume is static, but in the future there will be a slider
  masterGainNode = context.createGain();
  masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
  masterGainNode.connect(finalMixNode);

  //connect all sounds to masterGainNode to play them

  //don't need this for now, no wet dry mix for effects
  // // Create effect volume.
  // effectLevelNode = context.createGain();
  // effectLevelNode.gain.value = 1.0; // effect level slider controls this
  // effectLevelNode.connect(masterGainNode);

  // Create convolver for effect
  convolver = context.createConvolver();
  convolver.active = false;
  // convolver.connect(effectLevelNode);

  //Create Low Pass Filter
  lowPassFilterNode = context.createBiquadFilter();
  //this is for backwards compatibility, the type used to be an integer
  lowPassFilterNode.type = (typeof lowPassFilterNode.type === 'string') ? 'lowpass' : 0; // LOWPASS
  //default value is max cutoff, or passing all frequencies
  lowPassFilterNode.frequency.value = context.sampleRate / 2;
  lowPassFilterNode.connect(masterGainNode);
  lowPassFilterNode.active = false;
}

function loadKits() {
  //name must be same as path
  var kit = new Kit("TR808");
  
  //TODO: figure out how to test if a kit is loaded
  currentKit = kit;
}

function loadImpulseResponses() {
  reverbImpulseResponse = new ImpulseResponse("sounds/impulse-responses/matrix-reverb2.wav");
  reverbImpulseResponse.load();
}


//TODO delete this
function loadTestBuffer() {
  var request = new XMLHttpRequest();
  var url = "http://www.freesound.org/data/previews/102/102130_1721044-lq.mp3";
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  request.onload = function () {
    context.decodeAudioData(
      request.response,
      function (buffer) {
        testBuffer = buffer;
      },
      function (buffer) {
        console.log("Error decoding drum samples!");
      }
    );
  }
  request.send();
}

//TODO delete this
function sequencePads() {
  $('.pad.selected').each(function () {
    $('.pad').removeClass("selected");
    $(this).addClass("selected");
  });
}

function playNote(buffer, noteTime, startTime, endTime) {
  var voice = context.createBufferSource();
  voice.buffer = buffer;
  
  var currentLastNode = masterGainNode;
  if (lowPassFilterNode.active) {
    lowPassFilterNode.connect(currentLastNode);
    currentLastNode = lowPassFilterNode;
  }
  if (convolver.active) {
    convolver.buffer = reverbImpulseResponse.buffer;
    convolver.connect(currentLastNode);
    currentLastNode = convolver;
  }

  voice.connect(currentLastNode);
  voice.start(noteTime, startTime, endTime-startTime);
}

function schedule() {
  var currentTime = context.currentTime;

  // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
  currentTime -= startTime;

  while (noteTime < currentTime + 0.200) {
    var contextPlayTime = noteTime + startTime;
    var $currentPads = $(".column_" + rhythmIndex);
    $currentPads.each(function () {
      if ($(this).hasClass("selected")) {
        var instrumentName = $(this).parents().data("instrument");
        var bufferName = instrumentName + "Buffer";
        var waveName = instrumentName + "Wave";
        var wave = currentKit[waveName];
        playNote(currentKit[bufferName], contextPlayTime, wave.startTime, wave.endTime);
      }
    });
    if (noteTime != lastDrawTime) {
      lastDrawTime = noteTime;
      drawPlayhead(rhythmIndex);
    }
    advanceNote();
  }
  timeoutId = requestAnimationFrame(schedule)
}

function drawPlayhead(xindex) {
  var lastIndex = (xindex + LOOP_LENGTH - 1) % LOOP_LENGTH;

  //can change this to class selector to select a column
  var $newRows = $('.column_' + xindex);
  var $oldRows = $('.column_' + lastIndex);

  $newRows.addClass("playing");
  $oldRows.removeClass("playing");
}

function advanceNote() {
  // Advance time by a 16th note...
  // var secondsPerBeat = 60.0 / theBeat.tempo;
  //TODO CHANGE TEMPO HERE, convert to float
  tempo = Number($("#tempo-input").val());
  var secondsPerBeat = 60.0 / tempo;
  rhythmIndex++;
  if (rhythmIndex == LOOP_LENGTH) {
    rhythmIndex = 0;
  }

  //0.25 because each square is a 16th note
  noteTime += 0.25 * secondsPerBeat
  // if (rhythmIndex % 2) {
  //     noteTime += (0.25 + kMaxSwing * theBeat.swingFactor) * secondsPerBeat;
  // } else {
  //     noteTime += (0.25 - kMaxSwing * theBeat.swingFactor) * secondsPerBeat;
  // }

}

function handlePlay(event) {
  rhythmIndex = 0;
  noteTime = 0.0;
  startTime = context.currentTime + 0.005;
  schedule();
}

function handleStop(event) {
  cancelAnimationFrame(timeoutId);
  $(".pad").removeClass("playing");
}

function initializeTempo() {
  $("#tempo-input").val(tempo);
}

function changeTempoListener() {
  $("#increase-tempo").click(function () {
    if (tempo < TEMPO_MAX) {
      tempo += TEMPO_STEP;
      $("#tempo-input").val(tempo);
    }
  });

  $("#decrease-tempo").click(function () {
    if (tempo > TEMPO_MIN) {
      tempo -= TEMPO_STEP;
      $("#tempo-input").val(tempo);
    }
  });
}

function trackNameExist() {
  var instru = $('.instrument');
  var trackName = $('#newTrackName').val();
  var duplicate = false;
  instru.each(function(index){
   if(trackName === $(this).attr('data-instrument')){
    duplicate = true;
   }
  });
  return duplicate;
}

function addNewTrackEvent() {
  $('#addNewTrack').click(function () {
    var trackName = $('#newTrackName').val();
    var soundUrl = $('#newTrackUrl').val();

    if (trackNameExist() === false) {
      addNewTrack(trackName, soundUrl);
      // send to server
      sendNewTrack(trackName, soundUrl);
    }
  });
}

function addNewTrack(trackName, soundUrl) {

  // create html
  var padEl = '<div class="pad column_0">\n\n</div>\n';

  for (var i = 1; i < 16; i++) {
    padEl = padEl + '<div class="pad column_' + i + '">\n\n</div>\n';
  }

  
  var newTrack = '<div ondrop="drop(event)" ondragover="allowDrop(event)" ondragleave="exitDrop(event)" class="row instrument" data-instrument="' +
    trackName + '">' +
    '<span class="instrument-label"><strong class="instrumentName">' +
    trackName +
    '</strong></span>\n' +
    padEl +
    '<button class="deleteTrackButton btn btn-warning">delete</button><div id="waveform-'+
    trackName +
    '"></div><div id="waveform-timeline-'+
    trackName +
    '"></div><button class="refreshWaveRegionButton">refresh</button></div>';

  var prevTrack = $('.instruments').children().last();
  prevTrack.after(newTrack);

  // load wavesurfer visu
  currentKit[trackName+'Wave'] = new Wave();
  var wave = currentKit[trackName+'Wave'];
  wave.init(trackName);
  addRefreshRegionEvent(trackName);

  // load buffer
  currentKit.loadSample(soundUrl, trackName);
  
  // add click events
  addPadClickEvent(socket, trackName);
  addDeleteTrackClickEvent(trackName);
}

function addDeleteTrackClickEvent(trackName) {
  var deleteButton = $('div[data-instrument="' + trackName + '"]').children(".deleteTrackButton")[0];
  $(deleteButton).click(function () {
    deleteTrack(trackName);

    // send to serveur
    sendDeleteTrack(trackName);
  });
}

function deleteTrack(trackName) {
  // delete html
  $(".row[data-instrument='" + trackName + "']").remove();

  // delete buffer
  delete currentKit[trackName + "Buffer"];
}

// FREESOUND
freesound.setToken("bs5DQrWNL9d8zrQl0ApCvcQqwg0gg8ytGE60qg5o");

function freesoundIframe(soundId) {
  return '<iframe frameborder="0" scrolling="no" src="https://freesound.org/embed/sound/iframe/' + soundId + '/simple/small/" width="375" height="30"></iframe>';
}

function searchFreesound(query) {
  var page = 1
  var filter = "duration:[0.3 TO 2.0]"
  var sort = "rating_desc"
  freesound.textSearch(query, {
      page: page,
      filter: filter,
      sort: sort,
      fields: 'id,name,url,previews',
    },
    function (sounds) {
      var msg = ""
      //      msg = "<h3>Searching for: " + query + "</h3>"
      //      msg += "With filter: " + filter + " and sorting: " + sort + "<br>"
      //      msg += "Num results: " + sounds.count + "<br><ul>"
      for (i = 0; i <= 10; i++) {
        var snd = sounds.getSound(i);
        msg += "<div>" + freesoundIframe(snd.id) + "<div class='drag-me' draggable='true' ondragstart='drag(event)' sound-url='" + snd.previews["preview-lq-mp3"] + "'>Drag</div></div>";
      }
      msg += "</ul>"
      document.getElementById("search-result-container").innerHTML = msg;
    },
    function () {
      document.getElementById('error').innerHTML = "Error while searching...";
    }
  );
}

function addSearchButtonEvent() {
  $('#search-button').click(function () {
    var query = $('#search-query').val();
    searchFreesound(query);
  });
}


// Drag and drop sounds
function allowDrop(ev) {
  ev.preventDefault();
  var target = ev.target;
  var trackEl = $(target).hasClass('row') ? $(target) : $(target).parents('.row');
  trackEl.addClass("drop-over");
}

function exitDrop(ev) {
  ev.preventDefault();
  var target = ev.target;
  var trackEl = $(target).hasClass('row') ? $(target) : $(target).parents('.row');
  trackEl.removeClass("drop-over");
}

function drag(ev) {
  currentSoundUrl = ev.target.getAttribute("sound-url");
  ev.dataTransfer.setData("text", "");
}

function drop(ev) {
  ev.preventDefault();
  var target = ev.target;
  var trackEl = $(target).hasClass('row') ? $(target) : $(target).parents('.row');
  var trackName = trackEl.attr("data-instrument");
  currentKit.loadSample(currentSoundUrl, trackName);
  sendLoadSound(trackName, currentSoundUrl);
  trackEl.removeClass("drop-over");
}


// Wave visu
function addRefreshRegionEvent(trackName) {
  var refreshButton = $('div[data-instrument="' + trackName + '"]').children(".refreshWaveRegionButton")[0];
  $(refreshButton).click(function () {
    var waveName = trackName + "Wave";
    currentKit[waveName].restartRegion();
  });
}
