$(function () {
  initSequencer();
  addNewTrackEvent();
  addChangeSequenceLengthEvent();
  playPauseListener();
  RecordListener();
  lowPassFilterListener();
  reverbListener();
  createLowPassFilterSliders();
  initializeTempo();
  changeTempoListener();
  search = initSearch();
});

function TranslateStateInActions(sequencerState) {
  var trackNames = sequencerState['trackNames'];
  var pads = sequencerState['pads'];
  var soundUrls = sequencerState['sounds'];
  var waves = sequencerState['waves'];
  var sequenceLength = sequencerState['sequenceLength'];
  var gains = sequencerState['gains'];
  var tempo = sequencerState['tempo'];

  // check if the tracks are already loaded
  if (JSON.stringify(sequencerState) != JSON.stringify(currentSequencerState)) {
    // Delete all existing tracks
    var numLocalTracks = $('.instrument').length;
    for (var i = numLocalTracks - 1; i >= 0; i--) {
      deleteTrack(i);
    }

    currentSequencerState = sequencerState;

    // change tempo
    changeTempo(tempo);

    // change seuquence length
    changeSequenceLength(sequenceLength);

    // Add tracks and load buffers
    for (var j = 0; j < trackNames.length; j++) {
      addNewTrack(j, trackNames[j], soundUrls[j], waves[j][0], waves[j][1], gains[j], pads[j]);
    }

    // Activate pads
    for (var i = 0; i < trackNames.length; i++) {
      var trackTabs = pads[i];
      for (var j = 0; j < trackTabs.length; j++) {
        toggleSelectedListenerSocket(i, j, trackTabs[j]);
      }
    }
  }
}

function toggleSelectedListener(padEl) {
  padEl.toggleClass("selected");
  var trackId = padEl.parent().parent().index();
  var padClass = padEl.attr('class');
  var padId = padClass.split(' ')[1].split('_')[1];
  var padState = (padEl.hasClass("selected")) ? 1 : 0;
  currentSequencerState.pads[trackId][padId] = padState;
  return [trackId, padId, padState]
}

function toggleSelectedListenerSocket(trackId, padId, padState) {
  var padEl = $('.instrument').eq(trackId).find('.pad').eq(parseInt(padId));
  var currentState = padEl.hasClass("selected");
  if (currentState) {
    if (padState == 0) {
      padEl.removeClass("selected");
    }
  } else {
    if (padState == 1) {
      padEl.addClass("selected");
    }
  }
  currentSequencerState.pads[trackId][padId] = padState;
}

// SEQUENCER ACTIONS
function addNewTrackEvent() {
  function newTrack() {
    var trackName = $('#newTrackName').val();
    var trackId = $('.instrument').length;
    // this action needs to be call in the same order in all clients in order to keep same order of tracks
    // we first send to server which will emit back the action
    // send to server
    sendNewTrack(trackName, null);
  }
  $('#addNewTrack').click(function () {
    newTrack();
  });
  $('#add-track-form').submit(function () {
    newTrack();
  });
}

function addNewTrackDetails() {
  $('#trackDetails').fadeIn('slow');
  $('#newTrackName').focus();

  $('#addNewTrack').on('click', function () {
    $('#trackDetails').fadeOut('slow');
  });
  $('#add-track-form').submit(function () {
    $('#trackDetails').fadeOut('slow');
  });

  $('#newTrackName').keyup(function () {
    if ($(this).val() != '') {
      $('#addNewTrack').removeAttr('disabled');
    } else {
      $('#addNewTrack').attr('disabled', 'disabled')
    }
  });
}

function addNewTrack(trackId, trackName, soundUrl = null, startTime = null, endTime = null, gain = -6, pads = null) {
  var uniqueTrackId = Date.now();

  // update sequencer state
  currentSequencerState.trackNames[trackId] = trackName;
  currentSequencerState.pads[trackId] = pads !== null ? pads : Array(64).fill(0);
  currentSequencerState.sounds[trackId] = soundUrl;
  currentSequencerState.waves[trackId] = [startTime, endTime];
  currentSequencerState.gains[trackId] = gain;

  // create html
  var padEl = '<div class="pad column_0">\n\n</div>\n';

  for (var i = 1; i < MAXLENGTH; i++) {
    if (i < currentKit.sequenceLength) {
      if (i % 16 == 0 && i != 0) {
        padEl = padEl + ' <br> ';
      }
      padEl = padEl + '<div class="pad column_' + i + '">\n\n</div>\n';
    } else {
      if (i % 16 == 0 && i != 0) {
        padEl = padEl + ' <br style="display: none;"> ';
      }
      padEl = padEl + '<div class="pad column_' + i + '" style="display: none;">\n\n</div>\n';
    }
  }

  var newTrack = '<div ondrop="drop(event)" ondragover="allowDrop(event)" ondragleave="exitDrop(event)" class="row instrument" data-instrument="' +
    trackName +
    '"><div class="col-xs-2 col-lg-2"> <a data-toggle="collapse" aria-expanded="false" aria-controls="edit-' +
    uniqueTrackId +
    '" href="#edit-' +
    uniqueTrackId +
    '" class="instrument-label"><i class="glyphicon glyphicon-chevron-right"></i> <strong class="instrumentName">' +
    trackName +
    '</strong></a></div><div class="col-xs-7 col-lg-8 pad-container">' +
    padEl +
    '</div><div class="col-xs-3 col-lg-2" title="Track gain"><input type="text" value="-6" class="dial">' +
    '<button type="button" class="mute-track btn btn-primary" data-toggle="button">M</button>' +
    '<button type="button" class="solo-track btn btn-primary" data-toggle="button">S</button>' +
    '<button class="deleteTrackButton btn btn-warning"><div class="glyphicon glyphicon-remove"></div></button></div>' + 
    '<div id="edit-' +
    uniqueTrackId +
    '" class="edit-zone collapse"><div class="waveform-container"></div><div class="waveform-timeline"></div><button class="refreshWaveRegionButton btn btn-success"><i class="glyphicon glyphicon-refresh"></i></button></div></div></div>';

  var prevTrack = $('#newTrack');
  prevTrack.before(newTrack);

  var thisTrack = $('.instrument').eq(trackId);

  // add gainNode
  currentKit.gainNodes[trackId] = context.createGain();
  addKnob(trackId, gain);
    
  // add solo mute gain node
  currentKit.soloMuteNodes[trackId] = context.createGain();
  currentKit.mutedTracks[trackId] = 1;
  currentKit.soloedTracks[trackId] = 0;

  // load wavesurfer visu
  currentKit.waves[trackId] = new Wave();
  var wave = currentKit.waves[trackId];
  var waveContainer = thisTrack.find('.waveform-container')[0];
  wave.init(thisTrack, waveContainer);
  addRefreshRegionEvent(trackId);

  // load the edit visu on the first collapse
  thisTrack.children('.edit-zone').on('shown.bs.collapse', function () {
    if (!wave.loadedAfterCollapse) {
      wave.reload();
    }
  });

  // load buffer
  if (soundUrl) {
    currentKit.loadSample(soundUrl, trackId);
    if (startTime !== 'null' && startTime !== false) {
      wave.startTime = startTime;
      wave.endTime = endTime;
    }
  }

  // add click events
  addPadClickEvent(socket, trackId);
  addDeleteTrackClickEvent(trackId);
  addRotateTriangleEvent(trackId);
  addMuteTrackEvent(trackId);
  addSoloTrackEvent(trackId);
}


// gain knob
function addKnob(trackId, gain) {
  var knob = $('.instrument').eq(trackId).find(".dial");
  knob.knob({
    width: 30,
    height: 30,
    min: -35,
    max: 6,
    step: 1,
    displayInput: false,
    thickness: 0.5,
    change: function (v) {
      var trackId = $(this.$).parents('.instrument').index();
      currentKit.changeGainNodeValue(trackId, v);
    },
    release: function (v) {
      var trackId = $(this.$).parents('.instrument').index();
      currentKit.changeGainNodeValue(trackId, v);
      // send db gain value to server
      sendTrackGain(trackId, v)
    }
  });
  knob.val(gain.toString());
  knob.trigger('change');
  currentKit.changeGainNodeValue(trackId, gain);
}

function changeTrackGain(trackId, gain) {
  var knob = $('.instrument').eq(trackId).find(".dial");
  knob.val(gain.toString());
  knob.trigger('change');
}


// change sequence length
function addChangeSequenceLengthEvent() {
  var changeLength = function (sequenceLength) {
    if (Number.isInteger(parseFloat(sequenceLength)) && parseInt(sequenceLength) <= 64 && parseInt(sequenceLength) > 0) {
      changeSequenceLength(sequenceLength);
      sendSequenceLength(sequenceLength);
    }
  }
  $('#change-sequence-length-form').submit(function () {
    var sequenceLength = $('#sequence-length').val();
    changeLength(sequenceLength);
  });
  $('#change-sequence-length').click(function () {
    var sequenceLength = $('#sequence-length').val();
    changeLength(sequenceLength);
  });
  $('#sequence-length').change(function () {
    var sequenceLength = $('#sequence-length').val();
    changeLength(sequenceLength);
  });
}


// delete track
function addDeleteTrackClickEvent(trackId) {
  var deleteButton = $('.instrument').eq(trackId).find(".deleteTrackButton")[0];
  $(deleteButton).click(function () {
    var trackId = $(this).parents('.instrument').index();
    // this action needs to be call in the same order in all clients in order to keep same order of tracks
    //deleteTrack(trackId);
    // send to serveur
    sendDeleteTrack(trackId);
  });
}

function deleteTrack(trackId) {
  // delete html
  $('.instrument').eq(trackId).remove();

  // delete buffer
  currentKit.buffers.splice(trackId, 1);

  // delete wave
  currentKit.waves.splice(trackId, 1);

  // delete gain
  currentKit.gainNodes.splice(trackId, 1);
  
  // delete gain and solo mute lists
  currentKit.soloMuteNodes.splice(trackId, 1);
  currentKit.mutedTracks.splice(trackId, 1);
  currentKit.soloedTracks.splice(trackId, 1);

  // update sequencer state
  currentSequencerState.trackNames.splice(trackId, 1);
  currentSequencerState.sounds.splice(trackId, 1);
  currentSequencerState.pads.splice(trackId, 1);
  currentSequencerState.waves.splice(trackId, 1);
  currentSequencerState.gains.splice(trackId, 1);
}


// Mute solo track
function addMuteTrackEvent(trackId) {
  var muteTrackButton = $('.instrument').eq(trackId).find('.mute-track').eq(0);
  muteTrackButton.click(function () {
    $(this).trigger("blur");
    var trackId = $(this).parents('.instrument').index();
    toggleMuteTrack(trackId);
    solveMuteSoloConflicts();
  });
}

function addSoloTrackEvent(trackId) {
  var soloTrackButton = $('.instrument').eq(trackId).find('.solo-track').eq(0);
  soloTrackButton.click(function () {
    $(this).trigger("blur");
    var trackId = $(this).parents('.instrument').index();
    toggleSoloTrack(trackId);
    solveMuteSoloConflicts();
  });
}

function toggleSoloTrack(trackId) {
  currentKit.soloedTracks[trackId] = (currentKit.soloedTracks[trackId] == 1) ? 0 : 1;
  if (currentKit.soloedTracks[trackId] == 1 && currentKit.mutedTracks[trackId] == 0) {
    $('.instrument').eq(trackId).find('.mute-track').eq(0).button('toggle');
    toggleMuteTrack(trackId);
  }
}

function toggleMuteTrack(trackId) {
  currentKit.mutedTracks[trackId] = (currentKit.mutedTracks[trackId] == 1) ? 0 : 1;
  if (currentKit.mutedTracks[trackId] == 0 && currentKit.soloedTracks[trackId] == 1) {
    $('.instrument').eq(trackId).find('.solo-track').eq(0).button('toggle');
    toggleSoloTrack(trackId);
  }
}

function solveMuteSoloConflicts() {
  var soloedTracks = currentKit.soloedTracks;
  var mutedTracks = currentKit.mutedTracks;
  
  // Check if somes tracks are muted 
  var payableTracks = soloedTracks.includes(1) ? soloedTracks : mutedTracks;

  for (var trackId = 0; trackId < payableTracks.length; trackId++) {
    if (payableTracks[trackId]) {
      // track is not muted
      currentKit.soloMuteNodes[trackId].gain.value = 1;
    } else {
      // track is muted
      currentKit.soloMuteNodes[trackId].gain.value = 0;
    }
  }
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
  var trackId = trackEl.index();
  currentKit.loadSample(currentSoundUrl, trackId);
  sendLoadSound(trackId, currentSoundUrl);
  trackEl.removeClass("drop-over");
}


// Wave visu
function addRefreshRegionEvent(trackId) {
  var refreshButton = $('.instrument').eq(trackId).children(".edit-zone").children(".refreshWaveRegionButton")[0];
  $(refreshButton).click(function () {
    var trackId = $(this).parents('.instrument').index();
    currentKit.waves[trackId].restartRegion();
    currentKit.waves[trackId].sendRegion();
  });
}


// enable/disable search button
$('#search-query').keyup(function () {
  if ($(this).val() != '') {
    $('#search-button').removeAttr('disabled');
  } else {
    $('#search-button').attr('disabled', 'disabled')
  }
});

// rotate triangle dropdown
function addRotateTriangleEvent(trackId) {
  $(".instrument-label").eq(trackId).click(function () {
    var trackId = $(this).parents('.instrument').index();
    $('.instrument').eq(trackId).find(".glyphicon").toggleClass('rotation');
  });
}


// Presets
function saveCurrentSequencerstatePreset(presetName) {
  sendSequencerPreset(JSON.stringify(currentSequencerState), presetName);
}

function loadSequencerStatePreset(sequencerPresetState) {
  TranslateStateInActions(JSON.parse(sequencerPresetState));
}

$("#save-preset").click(function () {
  var presetName = sequencerPresetNames.length;
  saveCurrentSequencerstatePreset(presetName);
});

function addSequencerPreset(presetName) {
  sequencerPresetNames.push(presetName);
  $("#preset-container").append('<div id="preset-' + presetName + '" class="dropdown-item btn" type="button">' + presetName + '</div>');
  $("#preset-" + presetName).click(function () {
    sendLoadSequencerPreset(sequencerPresetNames.indexOf(presetName));
  });
}