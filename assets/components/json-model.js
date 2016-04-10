/* THREE.JSONLoader component. */

AFRAME.registerComponent('json-model', {
  schema: {
    type: 'src'
  },

  init: function () {
    this.loader = new THREE.JSONLoader();
  },

  update: function () {
    var mesh = this.el.getOrCreateObject3D('mesh', THREE.Mesh);
    this.loader.load(this.data, function (geometry) {
      mesh.geometry = geometry;
    });
  }
});
