var NUM_INSTRUMENTS = 2;

function Kit(name) {
  this.SAMPLE_BASE_PATH = "assets/sounds/drum-samples/";
  this.name = name;
  this.sequenceLength = 16;
  this.buffers = [];
  this.waves = [];
  this.gainNodes = [];

  this.startedLoading = false;
  this.isLoaded = false;
  this.instrumentLoadCount = 0;
}

Kit.prototype.pathName = function() {
  return this.SAMPLE_BASE_PATH + this.name + "/";
};

Kit.prototype.changeSequenceLength = function(sequenceLength) {
  this.sequenceLength = parseInt(sequenceLength);
};

Kit.prototype.loadSample = function(url, trackId, startTime = null) {
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
        if (startTime) {
          kit.waves[trackId].setStart(startTime);
        }
      },
      function(buffer) {
        console.log("Error decoding drum samples for track " + trackId);
      }
    );
  }
  request.send();
};