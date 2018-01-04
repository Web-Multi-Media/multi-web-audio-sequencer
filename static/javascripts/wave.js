function Wave() {
  this.wavesurfer = null;
  this.region = null;
  this.startTime = null;
  this.endTime = null;
  this.duration = null;
}

Wave.prototype.init = function(trackName) {
  this.wavesurfer = WaveSurfer.create({
    cursorWidth: 0,
    container: '#waveform-'+trackName,
    waveColor: 'gray',
    progressColor: 'gray',
  });
};

Wave.prototype.load = function(soundUrl) {
  var wavesurfer = this.wavesurfer;
  var wave = this;
  wavesurfer.load(soundUrl);
  wavesurfer.on('ready', function() {
    var duration = wavesurfer.getDuration();
    wave.duration = duration;
    wave.region = wavesurfer.addRegion({
      start: 0,
      end: duration,
      color: 'hsla(400, 100%, 30%, 0.1)',
    });
    wave.startTime = 0;
    wave.endTime = duration;
    wavesurfer.on('region-updated', function(obj){
      wave.startTime = obj.start;
      wave.endTime = obj.end;
    });
  });
};

Wave.prototype.setStart = function(startTime) {
  this.startTime = startTime;
  this.region.start = startTime;  
  this.region.onResize(startTime, 'start');
};

Wave.prototype.setEnd = function(endTime) {
  this.endTime = endTime;
  this.region.end = endTime;  
  this.region.onResize(endTime);
};

Wave.prototype.restartRegion = function () {
  this.setStart(0);
  this.setEnd(this.duration);
};
