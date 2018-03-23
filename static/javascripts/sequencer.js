//audio node variables
var context;
var convolver;
var compressor;
var masterGainNode;
var effectLevelNode;
var lowPassFilterNode;

var currentSequencerState = null;
var currentKit = null;
var wave = null;
var reverbImpulseResponse = null;
var sequencerPresetNames = [];

var mediaRecorder;
var recordingDest;
var chunks = [];

var noteTime;
var startTime;
var lastDrawTime = -1;
var rhythmIndex = 0;
var timeoutId;
var testBuffer = null;
var isRecording = false;
var isPlaying = false;

var tempo = 120;
var TEMPO_MAX = 200;
var TEMPO_MIN = 40;
var TEMPO_STEP = 1;
var MAXLENGTH = 64;
var COMPRESSOR_ACTIVATED = false;


if (window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext')) {
  window.webkitAudioContext = AudioContext;
}

// object and event listeners
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
  });
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

function playPauseListener() {
  $('#play-pause').click(function () {
    checkAndTrigerPlayPause();
  });
}

function checkAndTrigerPlayPause() {
  var $span = $('#play-pause').children("span");
  if ($span.hasClass('glyphicon-play')) {
    $span.removeClass('glyphicon-play');
    $span.addClass('glyphicon-pause');
    isPlaying = 1;
    handlePlay();
  } else {
    isPlaying = 0;
    $span.addClass('glyphicon-play');
    $span.removeClass('glyphicon-pause');
    handleStop();
  }
}

// TODO: work on this space stuff
// Currently many keys are mapped to the play/pause button, and it avoids using them in the text inputes (space, arrows, delete, ...)
//$(window).keypress(function (e) {
//  if (e.charCode === 0 || e.charCode === 32) {
//    e.preventDefault();
//    CheckAndTrigerPlayPause();
//  }
//})

function checkAndTrigerRecord() {
  if (!isRecording) {
    console.log("Record is triggered");
    isRecording = 1;
    $('#record').css('color', 'red');
    mediaRecorder.start();
  } else {
    console.log("Record is untriggered");
    isRecording = 0;
    $('#record').css('color', 'white');
    mediaRecorder.stop();
  }
}

function RecordListener() {
  $('#record').click(function () {
    checkAndTrigerRecord();
  });
}

function onDataAvailableInRecorderFunc(evt) {
  // push each chunk (blobs) in an array
  if (evt.data.size > 0) {
    chunks.push(evt.data);
    var blob = new Blob(chunks, {
      'type': 'audio/ogg; codecs=opus'
    });
    var soundSrc = URL.createObjectURL(blob);
    var newHtmlEl = '<div style="height:40px; margin:3px;"><audio src=' + soundSrc + ' controls=controls></audio><a style="position: absolute; margin:3px;" class="btn btn-success" href=' + soundSrc + ' download="exported_loop.ogg">Download</a><br><div>';
    $(newHtmlEl).appendTo(".exported-audio");
    chunks = [];
  }
}

function handlePlay(event) {
  rhythmIndex = 0;
  noteTime = 0.0;
  startTime = context.currentTime + 0.005;
  schedule();
}

function handleStop(event) {
  clearTimeout(timeoutId);
  $(".pad").removeClass("playing");
}

function initializeTempo() {
  $("#tempo-input").val(tempo);
}

function changeTempo(tempo_input) {
  tempo = tempo_input;
  $("#tempo-input").val(tempo_input);
  currentSequencerState.tempo = tempo;
}

function changeTempoListener() {
  $("#increase-tempo").click(function () {
    if (tempo < TEMPO_MAX) {
      tempo += TEMPO_STEP;
      changeTempo(tempo);
      sendTempo(tempo);
    }
  });

  $("#decrease-tempo").click(function () {
    if (tempo > TEMPO_MIN) {
      tempo -= TEMPO_STEP;
      changeTempo(tempo);
      sendTempo(tempo);
    }
  });
}

function changeSequenceLength(sequenceLength) {
  changeNumPads(sequenceLength);
  currentKit.changeSequenceLength(sequenceLength);
  $('#sequence-length').val(sequenceLength);
}

function changeNumPads(numPads) {
  var instrumentTracks = $('.instrument');
  var numPadsNow = currentKit.sequenceLength;
  if (parseInt(numPads) > parseInt(numPadsNow)) {
    instrumentTracks.each(function (index) {
      var lineBreaks = $(this).children('.pad-container').children('br');
      var pads = $(this).children('.pad-container').children('.pad');
      for (var i = numPadsNow; i < numPads; i++) {
        if (i % 16 == 0) {
          lineBreaks.eq(i / 16 - 1).show();
        }
        pads.eq(i).show();
      }
    });
  } else if (parseInt(numPads) < parseInt(numPadsNow)) {
    instrumentTracks.each(function (index) {
      var lineBreaks = $(this).children('.pad-container').children('br');
      var pads = $(this).children('.pad-container').children('.pad');
      for (var i = numPadsNow - 1; i >= numPads; i--) {
        if (i % 16 == 0) {
          lineBreaks.eq(i / 16 - 1).hide();
        }
        pads.eq(i).hide();
      }
    });
  }
}

// sequencer schedule
function schedule() {
  var currentTime = context.currentTime;

  // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
  currentTime -= startTime;

  while (noteTime < currentTime + 0.200) {
    var contextPlayTime = noteTime + startTime;

    currentSequencerState.pads.forEach(function (entry, trackId) {
      if (entry[rhythmIndex] == 1) {
        wave = currentKit.waves[trackId];
        playNote(currentKit.buffers[trackId], 
                 contextPlayTime, wave.startTime, wave.endTime, 
                 currentKit.gainNodes[trackId], currentKit.soloMuteNodes[trackId]);
      }
    });
    if (noteTime != lastDrawTime) {
      lastDrawTime = noteTime;
      drawPlayhead(rhythmIndex);
    }
    
    if (isPlaying)
      advanceNote();
  }
  if (isPlaying)
    timeoutId = setTimeout(schedule, 50);
}

function drawPlayhead(xindex) {
  var lastIndex = (xindex + currentKit.sequenceLength - 1) % currentKit.sequenceLength;

  //can change this to class selector to select a column
  var $newRows = $('.column_' + xindex);
  var $oldRows = $('.column_' + lastIndex);

  $newRows.addClass("playing");
  $oldRows.removeClass("playing");
}

function advanceNote() {
  // Advance time by a 16th note...
  tempo = currentSequencerState.tempo;
  var secondsPerBeat = 60.0 / tempo;
  rhythmIndex++;
  if (rhythmIndex == currentKit.sequenceLength) {
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

// SEQUENCER SCHEDULER
function initSequencer(extended=true) {
  initializeAudioNodes(extended);
  loadKits();
  loadImpulseResponses();
}

function initializeAudioNodes(extended=true) {
  context = new webkitAudioContext();
  if (extended) {
    recordingDest = context.createMediaStreamDestination();
    mediaRecorder = new MediaRecorder(recordingDest.stream);
    mediaRecorder.ondataavailable = onDataAvailableInRecorderFunc;
  }

  var finalMixNode;
  if (context.createDynamicsCompressor && COMPRESSOR_ACTIVATED) {
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

function playNote(buffer, noteTime, startTime, endTime, gainNode, soloMuteNode) {
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

  voice.connect(soloMuteNode);
  soloMuteNode.connect(gainNode);
  gainNode.connect(currentLastNode);
  if (recordingDest) {
    gainNode.connect(recordingDest);
  }
  voice.start(noteTime, startTime, endTime - startTime);
}
