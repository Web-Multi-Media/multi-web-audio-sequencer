function Wave() {
  this.soundBuffer = null;
  this.wavesurfer = null;
  this.startTime = null;
  this.endTime = null;
}

Wave.prototype.init = function(trackName) {
  this.wavesurfer = WaveSurfer.create({
    cursorWidth: 0,
    container: '#waveform-'+trackName,
    waveColor: 'gray',
    progressColor: 'gray',
    maxCanvasWidth: 100,
    pixelRatio: 1,
  });
};

Wave.prototype.load = function(soundUrl) {
  var wavesurfer = this.wavesurfer;
  var wave = this;
  wavesurfer.load(soundUrl);
  wavesurfer.on('ready', function() {
    var duration = wavesurfer.getDuration();
    wavesurfer.addRegion({
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
}
