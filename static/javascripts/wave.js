function Wave() {
  this.soundBuffer = null;
  this.wavesurfer = null;
  this.currentSound = null;
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
  wavesurfer.load(soundUrl);
  wavesurfer.on('ready', function() {
    wavesurfer.addRegion({
      start: 0,
      end: wavesurfer.getDuration(),
      color: 'hsla(400, 100%, 30%, 0.1)',
    });
    wavesurfer.on('region-updated', function(obj){
      console.log(obj.start, obj.end);
    });
  });
}
