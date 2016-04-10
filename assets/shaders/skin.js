/**
 * Skin shader
 * - Blinn-Phong diffuse term (using normal + diffuse maps).
 * - Subsurface scattering approximation by four blur layers.
 * - Physically-based specular term (Kelemen/Szirmay-Kalos specular reflectance)
 *
 * - Point and directional lights (with `lights: true` material option).
 * - Based on Nvidia Advanced Skin Rendering GDC 2007 presentation
 *	 and GPU Gems 3 Chapter 14. Advanced Techniques for Realistic Real-Time Skin Rendering
 *
 * @author alteredq - http://alteredqualia.com/
 * @see http://developer.download.nvidia.com/presentations/2007/gdc/Advanced_Skin.pdf
 * @see http://http.developer.nvidia.com/GPUGems3/gpugems3_ch14.html
 */
AFRAME.registerShader('skin', {
  schema: {
    diffuse: {type: 'color', default: '#EEE', is: 'uniform'},
    opacity: {default: 1.0, is: 'uniform'},
    passId: {type: 'int', is: 'uniform'},
    specular: {type: 'color', default: '#111', is: 'uniform'},
    tBeckmann: {type: 'texture', is: 'uniform'},
    tBlur1: {type: 'texture', is: 'uniform'},
    tBlur2: {type: 'texture', is: 'uniform'},
    tBlur3: {type: 'texture', is: 'uniform'},
    tBlur4: {type: 'texture', is: 'uniform'},
    tDiffuse: {type: 'texture', default: 'url(assets/models/leeperrysmith/Map-COL.jpg)',
               is: 'uniform'},
    tNormal: {type: 'texture',
              default: 'url(assets/models/leeperrysmith/Infinite-Level_02_Tangent_SmoothUV.jpg)',
              is: 'uniform'},
    uNormalScale: {default: -1.5, is: 'uniform'},
    uRoughness: {default: 0.15, is: 'uniform'},
    uSpecularBrightness: {default: 0.75, is: 'uniform'}
  },

  lights: true,

  vertexShader: [
    "#ifdef VERTEX_TEXTURES",

      "uniform sampler2D tDisplacement;",
      "uniform float uDisplacementScale;",
      "uniform float uDisplacementBias;",

    "#endif",

    "varying vec3 vNormal;",
    "varying vec2 vUv;",

    "varying vec3 vViewPosition;",

    THREE.ShaderChunk[ "common" ],

    "void main() {",

      "vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",

      "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

      "vViewPosition = -mvPosition.xyz;",

      "vNormal = normalize( normalMatrix * normal );",

      "vUv = uv;",

      // displacement mapping

      "#ifdef VERTEX_TEXTURES",

        "vec3 dv = texture2D( tDisplacement, uv ).xyz;",
        "float df = uDisplacementScale * dv.x + uDisplacementBias;",
        "vec4 displacedPosition = vec4( vNormal.xyz * df, 0.0 ) + mvPosition;",
        "gl_Position = projectionMatrix * displacedPosition;",

      "#else",

        "gl_Position = projectionMatrix * mvPosition;",

      "#endif",

    "}"
  ].join( "\n" ),

  fragmentShader: [
    "uniform vec3 diffuse;",
    "uniform vec3 specular;",
    "uniform float opacity;",

    "uniform float uRoughness;",
    "uniform float uSpecularBrightness;",

    "uniform int passID;",

    "uniform sampler2D tDiffuse;",
    "uniform sampler2D tNormal;",

    "uniform sampler2D tBlur1;",
    "uniform sampler2D tBlur2;",
    "uniform sampler2D tBlur3;",
    "uniform sampler2D tBlur4;",

    "uniform sampler2D tBeckmann;",

    "uniform float uNormalScale;",

    "varying vec3 vNormal;",
    "varying vec2 vUv;",

    "varying vec3 vViewPosition;",

    THREE.ShaderChunk[ "common" ],
    THREE.ShaderChunk[ "lights_pars" ],
    THREE.ShaderChunk[ "fog_pars_fragment" ],

    "float fresnelReflectance( vec3 H, vec3 V, float F0 ) {",

      "float base = 1.0 - dot( V, H );",
      "float exponential = pow( base, 5.0 );",

      "return exponential + F0 * ( 1.0 - exponential );",

    "}",

    // Kelemen/Szirmay-Kalos specular BRDF

    "float KS_Skin_Specular( vec3 N,", 		// Bumped surface normal
                "vec3 L,", 		// Points to light
                "vec3 V,", 		// Points to eye
                "float m,",  	// Roughness
                "float rho_s", 	// Specular brightness
                ") {",

      "float result = 0.0;",
      "float ndotl = dot( N, L );",

      "if( ndotl > 0.0 ) {",

        "vec3 h = L + V;", // Unnormalized half-way vector
        "vec3 H = normalize( h );",

        "float ndoth = dot( N, H );",

        "float PH = pow( 2.0 * texture2D( tBeckmann, vec2( ndoth, m ) ).x, 10.0 );",
        "float F = fresnelReflectance( H, V, 0.028 );",
        "float frSpec = max( PH * F / dot( h, h ), 0.0 );",

        "result = ndotl * rho_s * frSpec;", // BRDF * dot(N,L) * rho_s

      "}",

      "return result;",

    "}",

    "void main() {",

      "vec3 outgoingLight = vec3( 0.0 );",	// outgoing light does not have an alpha, the surface does
      "vec4 diffuseColor = vec4( diffuse, opacity );",

      "vec4 mSpecular = vec4( specular, opacity );",

      "vec4 colDiffuse = texture2D( tDiffuse, vUv );",
      "colDiffuse *= colDiffuse;",

      "diffuseColor *= colDiffuse;",

      // normal mapping

      "vec4 posAndU = vec4( -vViewPosition, vUv.x );",
      "vec4 posAndU_dx = dFdx( posAndU ),  posAndU_dy = dFdy( posAndU );",
      "vec3 tangent = posAndU_dx.w * posAndU_dx.xyz + posAndU_dy.w * posAndU_dy.xyz;",
      "vec3 normal = normalize( vNormal );",
      "vec3 binormal = normalize( cross( tangent, normal ) );",
      "tangent = cross( normal, binormal );",	// no normalization required
      "mat3 tsb = mat3( tangent, binormal, normal );",

      "vec3 normalTex = texture2D( tNormal, vUv ).xyz * 2.0 - 1.0;",
      "normalTex.xy *= uNormalScale;",
      "normalTex = normalize( normalTex );",

      "vec3 finalNormal = tsb * normalTex;",
      "normal = normalize( finalNormal );",

      "vec3 viewerDirection = normalize( vViewPosition );",

      // point lights

      "vec3 totalDiffuseLight = vec3( 0.0 );",
      "vec3 totalSpecularLight = vec3( 0.0 );",

      "#if NUM_POINT_LIGHTS > 0",

        "for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {",

          "vec3 pointVector = normalize( pointLights[ i ].direction );",
          "float attenuation = calcLightAttenuation( length( lVector ), pointLights[ i ].distance, pointLights[ i ].decay );",

          "float pointDiffuseWeight = max( dot( normal, pointVector ), 0.0 );",

          "totalDiffuseLight += pointLightColor[ i ] * ( pointDiffuseWeight * attenuation );",

          "if ( passID == 1 ) {",

            "float pointSpecularWeight = KS_Skin_Specular( normal, pointVector, viewerDirection, uRoughness, uSpecularBrightness );",

            "totalSpecularLight += pointLightColor[ i ] * mSpecular.xyz * ( pointSpecularWeight * attenuation );",

          "}",

        "}",

      "#endif",

      // directional lights

      "#if NUM_DIR_LIGHTS > 0",

        "for( int i = 0; i < NUM_DIR_LIGHTS; i++ ) {",

          "vec3 dirVector = directionalLights[ i ].direction;",

          "float dirDiffuseWeight = max( dot( normal, dirVector ), 0.0 );",


          "totalDiffuseLight += directionalLights[ i ].color * dirDiffuseWeight;",

          "if ( passID == 1 ) {",

            "float dirSpecularWeight = KS_Skin_Specular( normal, dirVector, viewerDirection, uRoughness, uSpecularBrightness );",

            "totalSpecularLight += directionalLights[ i ].color * mSpecular.xyz * dirSpecularWeight;",

          "}",

        "}",

      "#endif",


      "outgoingLight += diffuseColor.rgb * ( totalDiffuseLight + totalSpecularLight );",

      "if ( passID == 0 ) {",

        "outgoingLight = sqrt( outgoingLight );",

      "} else if ( passID == 1 ) {",

        //"#define VERSION1",

        "#ifdef VERSION1",

          "vec3 nonblurColor = sqrt(outgoingLight );",

        "#else",

          "vec3 nonblurColor = outgoingLight;",

        "#endif",

        "vec3 blur1Color = texture2D( tBlur1, vUv ).xyz;",
        "vec3 blur2Color = texture2D( tBlur2, vUv ).xyz;",
        "vec3 blur3Color = texture2D( tBlur3, vUv ).xyz;",
        "vec3 blur4Color = texture2D( tBlur4, vUv ).xyz;",


        //"gl_FragColor = vec4( blur1Color, gl_FragColor.w );",

        //"gl_FragColor = vec4( vec3( 0.22, 0.5, 0.7 ) * nonblurColor + vec3( 0.2, 0.5, 0.3 ) * blur1Color + vec3( 0.58, 0.0, 0.0 ) * blur2Color, gl_FragColor.w );",

        //"gl_FragColor = vec4( vec3( 0.25, 0.6, 0.8 ) * nonblurColor + vec3( 0.15, 0.25, 0.2 ) * blur1Color + vec3( 0.15, 0.15, 0.0 ) * blur2Color + vec3( 0.45, 0.0, 0.0 ) * blur3Color, gl_FragColor.w );",


        "outgoingLight = vec3( vec3( 0.22,  0.437, 0.635 ) * nonblurColor + ",
                   "vec3( 0.101, 0.355, 0.365 ) * blur1Color + ",
                   "vec3( 0.119, 0.208, 0.0 )   * blur2Color + ",
                   "vec3( 0.114, 0.0,   0.0 )   * blur3Color + ",
                   "vec3( 0.444, 0.0,   0.0 )   * blur4Color );",

        "outgoingLight *= sqrt( colDiffuse.xyz );",

        "outgoingLight += ambientLightColor * diffuse * colDiffuse.xyz + totalSpecularLight;",

        "#ifndef VERSION1",

          "outgoingLight = sqrt( outgoingLight );",

        "#endif",

      "}",

      "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",	// TODO, this should be pre-multiplied to allow for bright highlights on very transparent objects

      THREE.ShaderChunk[ "fog_fragment" ],

    "}"
  ].join( "\n" )
});
