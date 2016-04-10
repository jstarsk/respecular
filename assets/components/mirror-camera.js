AFRAME.registerComponent('mirror-camera', {
  init: function () {
    var el = this.el;
    var sceneEl = el.sceneEl;

    sceneEl.addEventListener('camera-ready', function () {
      sceneEl.camera.el.addEventListener('componentchanged', function (evt) {
        if (evt.detail.name !== 'rotation') { return; }
        el.setAttribute('rotation', {
          x: -1 * evt.detail.newData.x,
          y: -1 * evt.detail.newData.y,
          z: -1 * evt.detail.newData.z
        });
      });
    });
  }
});
