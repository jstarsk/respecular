var diffuse = 0xbbbbbb;
var shader = THREE.ShaderSkin.skin;
var shininess = 50;
var specular = 0x555555;

var uniformsUV = THREE.UniformsUtils.clone(shader.uniforms);
var textureLoader = new THREE.TextureLoader();

uniformsUV['tNormal'].value = textureLoader.load(
  'assets/models/leeperrysmith/Infinite-Level_02_Tangent_SmoothUV.jpg');
uniformsUV['uNormalScale'].value = -1.5;

uniformsUV['tDiffuse'].value = textureLoader.load(
  'assets/models/leeperrysmith/Map-COL.jpg');

uniformsUV['passID'].value = 0;

uniformsUV['diffuse'].value.setHex(diffuse);
uniformsUV['specular'].value.setHex(specular);

uniformsUV['uRoughness'].value = 0.185;
uniformsUV['uSpecularBrightness'].value = 0.7;

var uniforms = THREE.UniformsUtils.clone(uniformsUV);
uniforms['tDiffuse'].value = uniformsUV['tDiffuse'].value;
uniforms['tNormal'].value = uniformsUV['tNormal'].value;
uniforms['passID'].value = 1;

AFRAME.registerShader('skin', {
  init: function () {
    this.material = new THREE.ShaderMaterial({
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      uniforms: uniforms,
      lights: true
    });
    this.material.extensions.derivatives = true;
    return this.material;
  }
});

AFRAME.registerShader('skin-uv', {
  init: function () {
    this.material = new THREE.ShaderMaterial({
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShaderUV,
      uniforms: uniformsUV,
      lights: true
    });
    this.material.extensions.derivatives = true;
    return this.material;
  }
});
