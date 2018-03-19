var NUM_INSTRUMENTS = 2;

function Kit(name) {
  this.SAMPLE_BASE_PATH = "assets/sounds/drum-samples/";
  this.name = name;
  this.sequenceLength = 16;
  this.buffers = [];
  this.waves = [];
  this.gainNodes = [];
  this.isUnmuted = [];
  this.isSoloed = [];
  this.isPlayable = [];

  this.startedLoading = false;
  this.isLoaded = false;
  this.instrumentLoadCount = 0;
}

Kit.prototype.pathName = function() {
  return this.SAMPLE_BASE_PATH + this.name + "/";
};

Kit.prototype.changeSequenceLength = function(sequenceLength) {
  this.sequenceLength = parseInt(sequenceLength);
  currentSequencerState.sequenceLength = sequenceLength;
};

Kit.prototype.changeGainNodeValue = function(trackId, value) {
  this.gainNodes[trackId].gain.value = linear2db(value);
  currentSequencerState.gains[trackId] = value;
};

Kit.prototype.loadSample = function(url, trackId) {
  // update sequencer state
  currentSequencerState.sounds[trackId] = url;
  
  // load sound in buffer
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  var kit = this;
  
  // load wavesurfer visu
  kit.waves[trackId].clear();
  kit.waves[trackId].load(url);
  
  request.onload = function () {
    context.decodeAudioData(
      request.response,
      function(buffer) {
        kit.buffers[trackId] = buffer;
        kit.instrumentLoadCount++;
      },
      function(buffer) {
        console.log("Error decoding drum samples for track " + trackId);
      }
    );
  }
  request.send();
};

function linear2db(x) {
  return Math.pow(10, (x / 20));
}
