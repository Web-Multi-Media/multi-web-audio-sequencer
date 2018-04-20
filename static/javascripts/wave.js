function Wave() {
  this.wavesurfer = null;
  this.region = null;
  this.startTime = null;
  this.endTime = null;
  this.duration = null;
  this.trackEl = null;
  this.soundUrl = null;
  this.loadedAfterCollapse = false;
  this.container = null;
}

Wave.prototype.init = function(trackEl, container) {
  this.wavesurfer = WaveSurfer.create({
    cursorWidth: 0,
    container: container,
    waveColor: 'black',
    progressColor: 'black',
    height: 50
  });
  this.trackEl = trackEl;
  this.container = container;
};

Wave.prototype.load = function(soundUrl) {
  var wavesurfer = this.wavesurfer;
  this.soundUrl = soundUrl;
  wavesurfer.load(soundUrl);
  wavesurfer.on('ready', () => {
    if (this.region) {
      this.region.remove();
    }
    var duration = wavesurfer.getDuration();
    this.duration = duration;
    if (this.startTime === null) {this.startTime = 0;}
    if (this.endTime === null) {this.endTime = duration;}
    this.region = wavesurfer.addRegion({
      start: this.startTime,
      end: this.endTime,
      color: 'hsla(400, 100%, 30%, 0.2)',
    });
    wavesurfer.on('region-updated', (obj) => {
      this.startTime = obj.start;
      this.endTime = obj.end;
    });
    wavesurfer.on('region-update-end', (obj) => {
      this.sendRegion();
    });
    
    var timeline = Object.create(WaveSurfer.Timeline);
    var waveContainer = $(this.container);
    var timelineContainer = waveContainer.parents().children(".waveform-timeline")[0];
    timeline.init({
      wavesurfer: wavesurfer,
      container: timelineContainer
    });
  });
};  

Wave.prototype.reload = function() {
  this.load(this.soundUrl);
  this.loadedAfterCollapse = true;
}

Wave.prototype.clear = function(onClear=function() {}) {
  this.startTime = null;
  this.endTime = null;
  this.duration = null;
  this.soundUrl = null;
  this.loadedAfterCollapse = false;
  onClear();
}

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
  var trackId = this.trackEl.index();
  socket.emit('waveRegion', [trackId, this.startTime, this.endTime]);
  console.log('send wave region: ', this.startTime, this.endTime);
};