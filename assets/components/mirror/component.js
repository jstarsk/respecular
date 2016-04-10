AFRAME.registerComponent('mirror', {
  schema: {
    clipBias: {default: .003},
    color: {type: 'color', default: '#777'},
    height: {default: window.innerHeight},
    width: {default: window.innerWidth},
  },

  init: function () {
    var el = this.el;
    var sceneEl = el.sceneEl;
    var mesh = el.getOrCreateObject3D('mesh', THREE.Mesh);
    var self = this;

    sceneEl.addEventListener('renderstart', function () {
      self.mirror = new THREE.Mirror(sceneEl.renderer, sceneEl.camera, self.data);
      mesh.add(self.mirror)
      mesh.material = self.mirror.material;
    });
  },

  tick: function () {
    if (!this.mirror) { return; }
    this.mirror.render();
  }
});
