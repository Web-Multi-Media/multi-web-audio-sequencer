var NUM_INSTRUMENTS = 2;

function Kit(name) {
  this.SAMPLE_BASE_PATH = "assets/sounds/drum-samples/";
  this.name = name;

  this.kickBuffer = null;
  this.snareBuffer = null;
  this.hihatBuffer = null;

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

  this.loadSample(kickPath, "kick");
  this.loadSample(snarePath, "snare");
  this.loadSample(hihatPath, "hihat");
  
};

Kit.prototype.loadSample = function(url, instrumentName) {
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  
  var kit = this;
  var bufferName = instrumentName + "Buffer";
  
  request.onload = function () {
    context.decodeAudioData(
      request.response,
      function(buffer) {
        kit[bufferName] = buffer;
        kit.instrumentLoadCount++;
      },
      function(buffer) {
        console.log("Error decoding drum samples " + instrumentName);
      }
    );
  }
  request.send();
};