function Wave() {
  this.wavesurfer = null;
  this.region = null;
  this.startTime = null;
  this.endTime = null;
  this.duration = null;
  this.trackName = null;
}

Wave.prototype.init = function(trackName) {
  this.wavesurfer = WaveSurfer.create({
    cursorWidth: 0,
    container: '#waveform-'+trackName,
    waveColor: 'gray',
    progressColor: 'gray',
  });
  this.trackName = trackName;
};

Wave.prototype.load = function(soundUrl) {
  var wavesurfer = this.wavesurfer;
  var wave = this;
  wavesurfer.load(soundUrl);
  wavesurfer.on('ready', function() {
    if (wave.region) {
      wave.region.remove();
    }
    var duration = wavesurfer.getDuration();
    wave.duration = duration;
    if (wave.startTime == null) {wave.startTime = 0;}
    if (wave.endTime == null) {wave.endTime = duration;}
    wave.region = wavesurfer.addRegion({
      start: wave.startTime,
      end: wave.endTime,
      color: 'hsla(400, 100%, 30%, 0.1)',
    });
    wave.startTime = 0;
    wave.endTime = duration;
    wavesurfer.on('region-updated', function(obj) {
      wave.startTime = obj.start;
      wave.endTime = obj.end;
    });
    wavesurfer.on('region-update-end', function(obj) {
      wave.sendRegion();
    });
    
    var timeline = Object.create(WaveSurfer.Timeline);
    timeline.init({
      wavesurfer: wavesurfer,
      container: '#waveform-timeline-'+wave.trackName,
    });
  });
};  

Wave.prototype.setStart = function(startTime) {
  this.startTime = startTime;
  this.region.start = startTime;  
  this.region.onResize(0, 'start');
};

Wave.prototype.setEnd = function(endTime) {
  this.endTime = endTime;
  this.region.end = endTime;  
  this.region.onResize(0);
};

Wave.prototype.restartRegion = function () {
  this.setStart(0);
  this.setEnd(this.duration);
};

Wave.prototype.sendRegion = function () {
  socket.emit('waveRegion', [this.trackName, this.startTime, this.endTime]);
  console.log('send wave region');
};