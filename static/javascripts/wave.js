function Wave() {
  this.soundBuffer = null;
  this.wavesurfer = null;
}

Wave.prototype.init = function() {
  this.wavesurfer = WaveSurfer.create({
    container: '#waveform'
  });
};

Wave.prototype.load = function(soundUrl) {
 this.wavesurfer.load(soundUrl);
}
