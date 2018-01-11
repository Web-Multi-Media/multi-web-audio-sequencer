var NUM_INSTRUMENTS = 2;

function Kit(name) {
  this.SAMPLE_BASE_PATH = "assets/sounds/drum-samples/";
  this.name = name;

  this.buffers = [];
  this.waves = [];

  this.startedLoading = false;
  this.isLoaded = false;
  this.instrumentLoadCount = 0;
}

Kit.prototype.pathName = function() {
  return this.SAMPLE_BASE_PATH + this.name + "/";
};

Kit.prototype.load = function() {
  if (this.startedLoading) {
    return;
  }

  this.startedLoading = true;

  var pathName = this.pathName();

  var kickPath = pathName + "kick.mp3";
  var snarePath = pathName + "snare.mp3";
  var hihatPath = pathName + "hihat.mp3";

  this.loadSample(kickPath, 0);
  this.loadSample(snarePath, 1);
  this.loadSample(hihatPath, 2);
  
};

Kit.prototype.loadSample = function(url, trackId) {
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