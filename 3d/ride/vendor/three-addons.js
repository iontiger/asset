/* three.js r160 add-ons (MIT, © three.js authors) — EffectComposer · RenderPass · ShaderPass · OutputPass · UnrealBloomPass · GTAOPass · Sky · Water.
   원본 ES 모듈을 전역 THREE 로 쓰도록 파일마다 블록으로 감쌌다 (import → THREE / ADD, export → ADD). */
/* three.js r160 examples/jsm (EffectComposer, RenderPass, ShaderPass, OutputPass, UnrealBloomPass, GTAOPass, Sky, Water and their shaders)
   MIT License — Copyright © 2010-2023 three.js authors. Bundled as a classic script exposing window.THREE_ADDONS. */
window.THREE_ADDONS=(function(){'use strict';const ADD={};
{ /* shaders/CopyShader */
const CopyShader = {
	name: 'CopyShader',
	uniforms: {
		'tDiffuse': { value: null },
		'opacity': { value: 1.0 }
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		uniform float opacity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;
		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;
		}`
};
Object.assign(ADD,{CopyShader});
}
{ /* shaders/OutputShader */
const OutputShader = {
	name: 'OutputShader',
	uniforms: {
		'tDiffuse': { value: null },
		'toneMappingExposure': { value: 1 }
	},
	vertexShader: /* glsl */`
		precision highp float;
		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;
		attribute vec3 position;
		attribute vec2 uv;
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		precision highp float;
		uniform sampler2D tDiffuse;
		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>
		varying vec2 vUv;
		void main() {
			gl_FragColor = texture2D( tDiffuse, vUv );
			// tone mapping
			#ifdef LINEAR_TONE_MAPPING
				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
			#elif defined( REINHARD_TONE_MAPPING )
				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
			#elif defined( CINEON_TONE_MAPPING )
				gl_FragColor.rgb = OptimizedCineonToneMapping( gl_FragColor.rgb );
			#elif defined( ACES_FILMIC_TONE_MAPPING )
				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
			#elif defined( AGX_TONE_MAPPING )
				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
			#endif
			// color space
			#ifdef SRGB_TRANSFER
				gl_FragColor = sRGBTransferOETF( gl_FragColor );
			#endif
		}`
};
Object.assign(ADD,{OutputShader});
}
{ /* shaders/LuminosityHighPassShader */
const {Color}=THREE;
const LuminosityHighPassShader = {
	name: 'LuminosityHighPassShader',
	shaderID: 'luminosityHighPass',
	uniforms: {
		'tDiffuse': { value: null },
		'luminosityThreshold': { value: 1.0 },
		'smoothWidth': { value: 1.0 },
		'defaultColor': { value: new Color( 0x000000 ) },
		'defaultOpacity': { value: 0.0 }
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;
		varying vec2 vUv;
		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			vec3 luma = vec3( 0.299, 0.587, 0.114 );
			float v = dot( texel.xyz, luma );
			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );
			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );
			gl_FragColor = mix( outputColor, texel, alpha );
		}`
};
Object.assign(ADD,{LuminosityHighPassShader});
}
{ /* shaders/GTAOShader */
const {DataTexture,Matrix4,RepeatWrapping,Vector2,Vector3}=THREE;
const GTAOShader = {
	name: 'GTAOShader',
	defines: {
		PERSPECTIVE_CAMERA: 1,
		SAMPLES: 16,
		NORMAL_VECTOR_TYPE: 1,
		DEPTH_SWIZZLING: 'x',
		SCREEN_SPACE_RADIUS: 0,
		SCREEN_SPACE_RADIUS_SCALE: 100.0,
		SCENE_CLIP_BOX: 0,
	},
	uniforms: {
		tNormal: { value: null },
		tDepth: { value: null },
		tNoise: { value: null },
		resolution: { value: new Vector2() },
		cameraNear: { value: null },
		cameraFar: { value: null },
		cameraProjectionMatrix: { value: new Matrix4() },
		cameraProjectionMatrixInverse: { value: new Matrix4() },
		cameraWorldMatrix: { value: new Matrix4() },
		radius: { value: 0.25 },
		distanceExponent: { value: 1. },
		thickness: { value: 1. },
		distanceFallOff: { value: 1. },
		scale: { value: 1. },
		sceneBoxMin: { value: new Vector3( - 1, - 1, - 1 ) },
		sceneBoxMax: { value: new Vector3( 1, 1, 1 ) },
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		varying vec2 vUv;
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraProjectionMatrixInverse;		
		uniform mat4 cameraWorldMatrix;
		uniform float radius;
		uniform float distanceExponent;
		uniform float thickness;
		uniform float distanceFallOff;
		uniform float scale;
		#if SCENE_CLIP_BOX == 1
			uniform vec3 sceneBoxMin;
			uniform vec3 sceneBoxMax;
		#endif
		#include <common>
		#include <packing>
		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(vec3(ao), 1.)
		#endif
		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}
		float getDepth(const vec2 uv) {  
			return textureLod(tDepth, uv.xy, 0.0).DEPTH_SWIZZLING;
		}
		float fetchDepth(const ivec2 uv) {   
			return texelFetch(tDepth, uv.xy, 0).DEPTH_SWIZZLING;
		}
		float getViewZ(const in float depth) {
			#if PERSPECTIVE_CAMERA == 1
				return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
			#else
				return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
			#endif
		}
		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ? ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz : -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ? ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz : -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}
		vec3 getViewNormal(const vec2 uv) {
			#if NORMAL_VECTOR_TYPE == 2
				return normalize(textureLod(tNormal, uv, 0.).rgb);
			#elif NORMAL_VECTOR_TYPE == 1
				return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
			#else
				return computeNormalFromDepth(uv);
			#endif
		}
		vec3 getSceneUvAndDepth(vec3 sampleViewPos) {
			vec4 sampleClipPos = cameraProjectionMatrix * vec4(sampleViewPos, 1.);
			vec2 sampleUv = sampleClipPos.xy / sampleClipPos.w * 0.5 + 0.5;
			float sampleSceneDepth = getDepth(sampleUv);
			return vec3(sampleUv, sampleSceneDepth);
		}
		void main() {
			float depth = getDepth(vUv.xy);
			if (depth >= 1.0) {
				discard;
				return;
			}
			vec3 viewPos = getViewPosition(vUv, depth);
			vec3 viewNormal = getViewNormal(vUv);
			float radiusToUse = radius;
			float distanceFalloffToUse = thickness;
			#if SCREEN_SPACE_RADIUS == 1
				float radiusScale = getViewPosition(vec2(0.5 + float(SCREEN_SPACE_RADIUS_SCALE) / resolution.x, 0.0), depth).x;
				radiusToUse *= radiusScale;
				distanceFalloffToUse *= radiusScale;
			#endif
			#if SCENE_CLIP_BOX == 1
				vec3 worldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
				float boxDistance = length(max(vec3(0.0), max(sceneBoxMin - worldPos, worldPos - sceneBoxMax)));
				if (boxDistance > radiusToUse) {
					discard;
					return;
				}
			#endif
			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
			vec3 randomVec = noiseTexel.xyz * 2.0 - 1.0;
			vec3 tangent = normalize(vec3(randomVec.xy, 0.));
			vec3 bitangent = vec3(-tangent.y, tangent.x, 0.);
			mat3 kernelMatrix = mat3(tangent, bitangent, vec3(0., 0., 1.));
			const int DIRECTIONS = SAMPLES < 30 ? 3 : 5;
			const int STEPS = (SAMPLES + DIRECTIONS - 1) / DIRECTIONS;
			float ao = 0.0, totalWeight = 0.0;
			for (int i = 0; i < DIRECTIONS; ++i) {
				float angle = float(i) / float(DIRECTIONS) * PI;
				vec4 sampleDir = vec4(cos(angle), sin(angle), 0., 0.5 + 0.5 * noiseTexel.w); 
				sampleDir.xyz = normalize(kernelMatrix * sampleDir.xyz);
				vec3 viewDir = normalize(-viewPos.xyz);
				vec3 sliceBitangent = normalize(cross(sampleDir.xyz, viewDir));
				vec3 sliceTangent = cross(sliceBitangent, viewDir);
				vec3 normalInSlice = normalize(viewNormal - sliceBitangent * dot(viewNormal, sliceBitangent));
				vec3 tangentToNormalInSlice = cross(normalInSlice, sliceBitangent);
				vec2 cosHorizons = vec2(dot(viewDir, tangentToNormalInSlice), dot(viewDir, -tangentToNormalInSlice));
				for (int j = 0; j < STEPS; ++j) {
					vec3 sampleViewOffset = sampleDir.xyz * radiusToUse * sampleDir.w * pow(float(j + 1) / float(STEPS), distanceExponent);	
					vec3 sampleSceneUvDepth = getSceneUvAndDepth(viewPos + sampleViewOffset);
					vec3 sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					vec3 viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.x += max(0., (sampleCosHorizon - cosHorizons.x) * mix(1., 2. / float(j + 2), distanceFallOff));
					}		
					sampleSceneUvDepth = getSceneUvAndDepth(viewPos - sampleViewOffset);
					sampleSceneViewPos = getViewPosition(sampleSceneUvDepth.xy, sampleSceneUvDepth.z);
					viewDelta = sampleSceneViewPos - viewPos;
					if (abs(viewDelta.z) < thickness) {
						float sampleCosHorizon = dot(viewDir, normalize(viewDelta));
						cosHorizons.y += max(0., (sampleCosHorizon - cosHorizons.y) * mix(1., 2. / float(j + 2), distanceFallOff));
					}
				}
				vec2 sinHorizons = sqrt(1. - cosHorizons * cosHorizons);
				float nx = dot(normalInSlice, sliceTangent);
				float ny = dot(normalInSlice, viewDir);
				float nxb = 1. / 2. * (acos(cosHorizons.y) - acos(cosHorizons.x) + sinHorizons.x * cosHorizons.x - sinHorizons.y * cosHorizons.y);
				float nyb = 1. / 2. * (2. - cosHorizons.x * cosHorizons.x - cosHorizons.y * cosHorizons.y);
				float occlusion = nx * nxb + ny * nyb;
				ao += occlusion;
			}
			ao = clamp(ao / float(DIRECTIONS), 0., 1.);		
		#if SCENE_CLIP_BOX == 1
			ao = mix(ao, 1., smoothstep(0., radiusToUse, boxDistance));
		#endif
			ao = pow(ao, scale);
			gl_FragColor = FRAGMENT_OUTPUT;
		}`
};
const GTAODepthShader = {
	name: 'GTAODepthShader',
	defines: {
		PERSPECTIVE_CAMERA: 1
	},
	uniforms: {
		tDepth: { value: null },
		cameraNear: { value: null },
		cameraFar: { value: null },
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
		varying vec2 vUv;
		#include <packing>
		float getLinearDepth( const in vec2 screenPosition ) {
			#if PERSPECTIVE_CAMERA == 1
				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			#else
				return texture2D( tDepth, screenPosition ).x;
			#endif
		}
		void main() {
			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );
		}`
};
const GTAOBlendShader = {
	name: 'GTAOBlendShader',
	uniforms: {
		tDiffuse: { value: null },
		intensity: { value: 1.0 }
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		uniform float intensity;
		uniform sampler2D tDiffuse;
		varying vec2 vUv;
		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = vec4(mix(vec3(1.), texel.rgb, intensity), texel.a);
		}`
};
function generateMagicSquareNoise( size = 5 ) {
	const noiseSize = Math.floor( size ) % 2 === 0 ? Math.floor( size ) + 1 : Math.floor( size );
	const magicSquare = generateMagicSquare( noiseSize );
	const noiseSquareSize = magicSquare.length;
	const data = new Uint8Array( noiseSquareSize * 4 );
	for ( let inx = 0; inx < noiseSquareSize; ++ inx ) {
		const iAng = magicSquare[ inx ];
		const angle = ( 2 * Math.PI * iAng ) / noiseSquareSize;
		const randomVec = new Vector3(
			Math.cos( angle ),
			Math.sin( angle ),
			0
		).normalize();
		data[ inx * 4 ] = ( randomVec.x * 0.5 + 0.5 ) * 255;
		data[ inx * 4 + 1 ] = ( randomVec.y * 0.5 + 0.5 ) * 255;
		data[ inx * 4 + 2 ] = 127;
		data[ inx * 4 + 3 ] = 255;
	}
	const noiseTexture = new DataTexture( data, noiseSize, noiseSize );
	noiseTexture.wrapS = RepeatWrapping;
	noiseTexture.wrapT = RepeatWrapping;
	noiseTexture.needsUpdate = true;
	return noiseTexture;
}
function generateMagicSquare( size ) {
	const noiseSize = Math.floor( size ) % 2 === 0 ? Math.floor( size ) + 1 : Math.floor( size );
	const noiseSquareSize = noiseSize * noiseSize;
	const magicSquare = Array( noiseSquareSize ).fill( 0 );
	let i = Math.floor( noiseSize / 2 );
	let j = noiseSize - 1;
	for ( let num = 1; num <= noiseSquareSize; ) {
		if ( i === - 1 && j === noiseSize ) {
			j = noiseSize - 2;
			i = 0;
		} else {
			if ( j === noiseSize ) {
				j = 0;
			}
			if ( i < 0 ) {
				i = noiseSize - 1;
			}
		}
		if ( magicSquare[ i * noiseSize + j ] !== 0 ) {
			j -= 2;
			i ++;
			continue;
		} else {
			magicSquare[ i * noiseSize + j ] = num ++;
		}
		j ++;
		i --;
	}
	return magicSquare;
}
Object.assign(ADD,{generateMagicSquareNoise,GTAOShader,GTAODepthShader,GTAOBlendShader});
}
{ /* shaders/PoissonDenoiseShader */
const {Matrix4,Vector2,Vector3}=THREE;
const PoissonDenoiseShader = {
	name: 'PoissonDenoiseShader',
	defines: {
		'SAMPLES': 16,
		'SAMPLE_VECTORS': generatePdSamplePointInitializer( 16, 2, 1 ),
		'NORMAL_VECTOR_TYPE': 1,
		'DEPTH_VALUE_SOURCE': 0,
	},
	uniforms: {
		'tDiffuse': { value: null },
		'tNormal': { value: null },
		'tDepth': { value: null },
		'tNoise': { value: null },
		'resolution': { value: new Vector2() },
		'cameraProjectionMatrixInverse': { value: new Matrix4() },
		'lumaPhi': { value: 5. },
		'depthPhi': { value: 5. },
		'normalPhi': { value: 5. },
		'radius': { value: 4. },
		'index': { value: 0 }
	},
	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: /* glsl */`
		varying vec2 vUv;
		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;
		uniform vec2 resolution;
		uniform mat4 cameraProjectionMatrixInverse;
		uniform float lumaPhi;
		uniform float depthPhi;
		uniform float normalPhi;
		uniform float radius;
		uniform int index;
		#include <common>
		#include <packing>
		#ifndef SAMPLE_LUMINANCE
		#define SAMPLE_LUMINANCE dot(vec3(0.2125, 0.7154, 0.0721), a)
		#endif
		#ifndef FRAGMENT_OUTPUT
		#define FRAGMENT_OUTPUT vec4(denoised, 1.)
		#endif
		float getLuminance(const in vec3 a) {
			return SAMPLE_LUMINANCE;
		}
		const vec3 poissonDisk[SAMPLES] = SAMPLE_VECTORS;
		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
			vec4 viewSpacePosition = cameraProjectionMatrixInverse * clipSpacePosition;
			return viewSpacePosition.xyz / viewSpacePosition.w;
		}
		float getDepth(const vec2 uv) {
		#if DEPTH_VALUE_SOURCE == 1    
			return textureLod(tDepth, uv.xy, 0.0).a;
		#else
			return textureLod(tDepth, uv.xy, 0.0).r;
		#endif
		}
		float fetchDepth(const ivec2 uv) {
			#if DEPTH_VALUE_SOURCE == 1    
				return texelFetch(tDepth, uv.xy, 0).a;
			#else
				return texelFetch(tDepth, uv.xy, 0).r;
			#endif
		}
		vec3 computeNormalFromDepth(const vec2 uv) {
			vec2 size = vec2(textureSize(tDepth, 0));
			ivec2 p = ivec2(uv * size);
			float c0 = fetchDepth(p);
			float l2 = fetchDepth(p - ivec2(2, 0));
			float l1 = fetchDepth(p - ivec2(1, 0));
			float r1 = fetchDepth(p + ivec2(1, 0));
			float r2 = fetchDepth(p + ivec2(2, 0));
			float b2 = fetchDepth(p - ivec2(0, 2));
			float b1 = fetchDepth(p - ivec2(0, 1));
			float t1 = fetchDepth(p + ivec2(0, 1));
			float t2 = fetchDepth(p + ivec2(0, 2));
			float dl = abs((2.0 * l1 - l2) - c0);
			float dr = abs((2.0 * r1 - r2) - c0);
			float db = abs((2.0 * b1 - b2) - c0);
			float dt = abs((2.0 * t1 - t2) - c0);
			vec3 ce = getViewPosition(uv, c0).xyz;
			vec3 dpdx = (dl < dr) ?  ce - getViewPosition((uv - vec2(1.0 / size.x, 0.0)), l1).xyz
									: -ce + getViewPosition((uv + vec2(1.0 / size.x, 0.0)), r1).xyz;
			vec3 dpdy = (db < dt) ?  ce - getViewPosition((uv - vec2(0.0, 1.0 / size.y)), b1).xyz
									: -ce + getViewPosition((uv + vec2(0.0, 1.0 / size.y)), t1).xyz;
			return normalize(cross(dpdx, dpdy));
		}
		vec3 getViewNormal(const vec2 uv) {
		#if NORMAL_VECTOR_TYPE == 2
			return normalize(textureLod(tNormal, uv, 0.).rgb);
		#elif NORMAL_VECTOR_TYPE == 1
			return unpackRGBToNormal(textureLod(tNormal, uv, 0.).rgb);
		#else
			return computeNormalFromDepth(uv);
		#endif
		}
		void denoiseSample(in vec3 center, in vec3 viewNormal, in vec3 viewPos, in vec2 sampleUv, inout vec3 denoised, inout float totalWeight) {
			vec4 sampleTexel = textureLod(tDiffuse, sampleUv, 0.0);
			float sampleDepth = getDepth(sampleUv);
			vec3 sampleNormal = getViewNormal(sampleUv);
			vec3 neighborColor = sampleTexel.rgb;
			vec3 viewPosSample = getViewPosition(sampleUv, sampleDepth);
			float normalDiff = dot(viewNormal, sampleNormal);
			float normalSimilarity = pow(max(normalDiff, 0.), normalPhi);
			float lumaDiff = abs(getLuminance(neighborColor) - getLuminance(center));
			float lumaSimilarity = max(1.0 - lumaDiff / lumaPhi, 0.0);
			float depthDiff = abs(dot(viewPos - viewPosSample, viewNormal));
			float depthSimilarity = max(1. - depthDiff / depthPhi, 0.);
			float w = lumaSimilarity * depthSimilarity * normalSimilarity;
			denoised += w * neighborColor;
			totalWeight += w;
		}
		void main() {
			float depth = getDepth(vUv.xy);	
			vec3 viewNormal = getViewNormal(vUv);	
			if (depth == 1. || dot(viewNormal, viewNormal) == 0.) {
				discard;
				return;
			}
			vec4 texel = textureLod(tDiffuse, vUv, 0.0);
			vec3 center = texel.rgb;
			vec3 viewPos = getViewPosition(vUv, depth);
			vec2 noiseResolution = vec2(textureSize(tNoise, 0));
			vec2 noiseUv = vUv * resolution / noiseResolution;
			vec4 noiseTexel = textureLod(tNoise, noiseUv, 0.0);
      		vec2 noiseVec = vec2(sin(noiseTexel[index % 4] * 2. * PI), cos(noiseTexel[index % 4] * 2. * PI));
    		mat2 rotationMatrix = mat2(noiseVec.x, -noiseVec.y, noiseVec.x, noiseVec.y);
			float totalWeight = 1.0;
			vec3 denoised = texel.rgb;
			for (int i = 0; i < SAMPLES; i++) {
				vec3 sampleDir = poissonDisk[i];
				vec2 offset = rotationMatrix * (sampleDir.xy * (1. + sampleDir.z * (radius - 1.)) / resolution);
				vec2 sampleUv = vUv + offset;
				denoiseSample(center, viewNormal, viewPos, sampleUv, denoised, totalWeight);
			}
			if (totalWeight > 0.) { 
				denoised /= totalWeight;
			}
			gl_FragColor = FRAGMENT_OUTPUT;
		}`
};
function generatePdSamplePointInitializer( samples, rings, radiusExponent ) {
	const poissonDisk = generateDenoiseSamples(
		samples,
		rings,
		radiusExponent,
	);
	let glslCode = 'vec3[SAMPLES](';
	for ( let i = 0; i < samples; i ++ ) {
		const sample = poissonDisk[ i ];
		glslCode += `vec3(${sample.x}, ${sample.y}, ${sample.z})${( i < samples - 1 ) ? ',' : ')'}`;
	}
	return glslCode;
}
function generateDenoiseSamples( numSamples, numRings, radiusExponent ) {
	const samples = [];
	for ( let i = 0; i < numSamples; i ++ ) {
		const angle = 2 * Math.PI * numRings * i / numSamples;
		const radius = Math.pow( i / ( numSamples - 1 ), radiusExponent );
		samples.push( new Vector3( Math.cos( angle ), Math.sin( angle ), radius ) );
	}
	return samples;
}
Object.assign(ADD,{generatePdSamplePointInitializer,PoissonDenoiseShader});
}
{ /* math/SimplexNoise */
// Ported from Stefan Gustavson's java implementation
// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
// Read Stefan's excellent paper for details on how this code works.
//
// Sean McCullough banksean@gmail.com
//
// Added 4D noise
class SimplexNoise {
	constructor( r = Math ) {
		this.grad3 = [[ 1, 1, 0 ], [ - 1, 1, 0 ], [ 1, - 1, 0 ], [ - 1, - 1, 0 ],
			[ 1, 0, 1 ], [ - 1, 0, 1 ], [ 1, 0, - 1 ], [ - 1, 0, - 1 ],
			[ 0, 1, 1 ], [ 0, - 1, 1 ], [ 0, 1, - 1 ], [ 0, - 1, - 1 ]];
		this.grad4 = [[ 0, 1, 1, 1 ], [ 0, 1, 1, - 1 ], [ 0, 1, - 1, 1 ], [ 0, 1, - 1, - 1 ],
			[ 0, - 1, 1, 1 ], [ 0, - 1, 1, - 1 ], [ 0, - 1, - 1, 1 ], [ 0, - 1, - 1, - 1 ],
			[ 1, 0, 1, 1 ], [ 1, 0, 1, - 1 ], [ 1, 0, - 1, 1 ], [ 1, 0, - 1, - 1 ],
			[ - 1, 0, 1, 1 ], [ - 1, 0, 1, - 1 ], [ - 1, 0, - 1, 1 ], [ - 1, 0, - 1, - 1 ],
			[ 1, 1, 0, 1 ], [ 1, 1, 0, - 1 ], [ 1, - 1, 0, 1 ], [ 1, - 1, 0, - 1 ],
			[ - 1, 1, 0, 1 ], [ - 1, 1, 0, - 1 ], [ - 1, - 1, 0, 1 ], [ - 1, - 1, 0, - 1 ],
			[ 1, 1, 1, 0 ], [ 1, 1, - 1, 0 ], [ 1, - 1, 1, 0 ], [ 1, - 1, - 1, 0 ],
			[ - 1, 1, 1, 0 ], [ - 1, 1, - 1, 0 ], [ - 1, - 1, 1, 0 ], [ - 1, - 1, - 1, 0 ]];
		this.p = [];
		for ( let i = 0; i < 256; i ++ ) {
			this.p[ i ] = Math.floor( r.random() * 256 );
		}
		// To remove the need for index wrapping, double the permutation table length
		this.perm = [];
		for ( let i = 0; i < 512; i ++ ) {
			this.perm[ i ] = this.p[ i & 255 ];
		}
		// A lookup table to traverse the simplex around a given point in 4D.
		// Details can be found where this table is used, in the 4D noise method.
		this.simplex = [
			[ 0, 1, 2, 3 ], [ 0, 1, 3, 2 ], [ 0, 0, 0, 0 ], [ 0, 2, 3, 1 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 1, 2, 3, 0 ],
			[ 0, 2, 1, 3 ], [ 0, 0, 0, 0 ], [ 0, 3, 1, 2 ], [ 0, 3, 2, 1 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 1, 3, 2, 0 ],
			[ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ],
			[ 1, 2, 0, 3 ], [ 0, 0, 0, 0 ], [ 1, 3, 0, 2 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 2, 3, 0, 1 ], [ 2, 3, 1, 0 ],
			[ 1, 0, 2, 3 ], [ 1, 0, 3, 2 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 2, 0, 3, 1 ], [ 0, 0, 0, 0 ], [ 2, 1, 3, 0 ],
			[ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ],
			[ 2, 0, 1, 3 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 3, 0, 1, 2 ], [ 3, 0, 2, 1 ], [ 0, 0, 0, 0 ], [ 3, 1, 2, 0 ],
			[ 2, 1, 0, 3 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 3, 1, 0, 2 ], [ 0, 0, 0, 0 ], [ 3, 2, 0, 1 ], [ 3, 2, 1, 0 ]];
	}
	dot( g, x, y ) {
		return g[ 0 ] * x + g[ 1 ] * y;
	}
	dot3( g, x, y, z ) {
		return g[ 0 ] * x + g[ 1 ] * y + g[ 2 ] * z;
	}
	dot4( g, x, y, z, w ) {
		return g[ 0 ] * x + g[ 1 ] * y + g[ 2 ] * z + g[ 3 ] * w;
	}
	noise( xin, yin ) {
		let n0; // Noise contributions from the three corners
		let n1;
		let n2;
		// Skew the input space to determine which simplex cell we're in
		const F2 = 0.5 * ( Math.sqrt( 3.0 ) - 1.0 );
		const s = ( xin + yin ) * F2; // Hairy factor for 2D
		const i = Math.floor( xin + s );
		const j = Math.floor( yin + s );
		const G2 = ( 3.0 - Math.sqrt( 3.0 ) ) / 6.0;
		const t = ( i + j ) * G2;
		const X0 = i - t; // Unskew the cell origin back to (x,y) space
		const Y0 = j - t;
		const x0 = xin - X0; // The x,y distances from the cell origin
		const y0 = yin - Y0;
		// For the 2D case, the simplex shape is an equilateral triangle.
		// Determine which simplex we are in.
		let i1; // Offsets for second (middle) corner of simplex in (i,j) coords
		let j1;
		if ( x0 > y0 ) {
			i1 = 1; j1 = 0;
			// lower triangle, XY order: (0,0)->(1,0)->(1,1)
		}	else {
			i1 = 0; j1 = 1;
		} // upper triangle, YX order: (0,0)->(0,1)->(1,1)
		// A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
		// a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
		// c = (3-sqrt(3))/6
		const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
		const y1 = y0 - j1 + G2;
		const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
		const y2 = y0 - 1.0 + 2.0 * G2;
		// Work out the hashed gradient indices of the three simplex corners
		const ii = i & 255;
		const jj = j & 255;
		const gi0 = this.perm[ ii + this.perm[ jj ] ] % 12;
		const gi1 = this.perm[ ii + i1 + this.perm[ jj + j1 ] ] % 12;
		const gi2 = this.perm[ ii + 1 + this.perm[ jj + 1 ] ] % 12;
		// Calculate the contribution from the three corners
		let t0 = 0.5 - x0 * x0 - y0 * y0;
		if ( t0 < 0 ) n0 = 0.0;
		else {
			t0 *= t0;
			n0 = t0 * t0 * this.dot( this.grad3[ gi0 ], x0, y0 ); // (x,y) of grad3 used for 2D gradient
		}
		let t1 = 0.5 - x1 * x1 - y1 * y1;
		if ( t1 < 0 ) n1 = 0.0;
		else {
			t1 *= t1;
			n1 = t1 * t1 * this.dot( this.grad3[ gi1 ], x1, y1 );
		}
		let t2 = 0.5 - x2 * x2 - y2 * y2;
		if ( t2 < 0 ) n2 = 0.0;
		else {
			t2 *= t2;
			n2 = t2 * t2 * this.dot( this.grad3[ gi2 ], x2, y2 );
		}
		// Add contributions from each corner to get the final noise value.
		// The result is scaled to return values in the interval [-1,1].
		return 70.0 * ( n0 + n1 + n2 );
	}
	// 3D simplex noise
	noise3d( xin, yin, zin ) {
		let n0; // Noise contributions from the four corners
		let n1;
		let n2;
		let n3;
		// Skew the input space to determine which simplex cell we're in
		const F3 = 1.0 / 3.0;
		const s = ( xin + yin + zin ) * F3; // Very nice and simple skew factor for 3D
		const i = Math.floor( xin + s );
		const j = Math.floor( yin + s );
		const k = Math.floor( zin + s );
		const G3 = 1.0 / 6.0; // Very nice and simple unskew factor, too
		const t = ( i + j + k ) * G3;
		const X0 = i - t; // Unskew the cell origin back to (x,y,z) space
		const Y0 = j - t;
		const Z0 = k - t;
		const x0 = xin - X0; // The x,y,z distances from the cell origin
		const y0 = yin - Y0;
		const z0 = zin - Z0;
		// For the 3D case, the simplex shape is a slightly irregular tetrahedron.
		// Determine which simplex we are in.
		let i1; // Offsets for second corner of simplex in (i,j,k) coords
		let j1;
		let k1;
		let i2; // Offsets for third corner of simplex in (i,j,k) coords
		let j2;
		let k2;
		if ( x0 >= y0 ) {
			if ( y0 >= z0 ) {
				i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
				// X Y Z order
			} else if ( x0 >= z0 ) {
				i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
				// X Z Y order
			} else {
				i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
			} // Z X Y order
		} else { // x0<y0
			if ( y0 < z0 ) {
				i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
				// Z Y X order
			} else if ( x0 < z0 ) {
				i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
				// Y Z X order
			} else {
				i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
			} // Y X Z order
		}
		// A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
		// a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
		// a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
		// c = 1/6.
		const x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
		const y1 = y0 - j1 + G3;
		const z1 = z0 - k1 + G3;
		const x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
		const y2 = y0 - j2 + 2.0 * G3;
		const z2 = z0 - k2 + 2.0 * G3;
		const x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
		const y3 = y0 - 1.0 + 3.0 * G3;
		const z3 = z0 - 1.0 + 3.0 * G3;
		// Work out the hashed gradient indices of the four simplex corners
		const ii = i & 255;
		const jj = j & 255;
		const kk = k & 255;
		const gi0 = this.perm[ ii + this.perm[ jj + this.perm[ kk ] ] ] % 12;
		const gi1 = this.perm[ ii + i1 + this.perm[ jj + j1 + this.perm[ kk + k1 ] ] ] % 12;
		const gi2 = this.perm[ ii + i2 + this.perm[ jj + j2 + this.perm[ kk + k2 ] ] ] % 12;
		const gi3 = this.perm[ ii + 1 + this.perm[ jj + 1 + this.perm[ kk + 1 ] ] ] % 12;
		// Calculate the contribution from the four corners
		let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
		if ( t0 < 0 ) n0 = 0.0;
		else {
			t0 *= t0;
			n0 = t0 * t0 * this.dot3( this.grad3[ gi0 ], x0, y0, z0 );
		}
		let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
		if ( t1 < 0 ) n1 = 0.0;
		else {
			t1 *= t1;
			n1 = t1 * t1 * this.dot3( this.grad3[ gi1 ], x1, y1, z1 );
		}
		let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
		if ( t2 < 0 ) n2 = 0.0;
		else {
			t2 *= t2;
			n2 = t2 * t2 * this.dot3( this.grad3[ gi2 ], x2, y2, z2 );
		}
		let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
		if ( t3 < 0 ) n3 = 0.0;
		else {
			t3 *= t3;
			n3 = t3 * t3 * this.dot3( this.grad3[ gi3 ], x3, y3, z3 );
		}
		// Add contributions from each corner to get the final noise value.
		// The result is scaled to stay just inside [-1,1]
		return 32.0 * ( n0 + n1 + n2 + n3 );
	}
	// 4D simplex noise
	noise4d( x, y, z, w ) {
		// For faster and easier lookups
		const grad4 = this.grad4;
		const simplex = this.simplex;
		const perm = this.perm;
		// The skewing and unskewing factors are hairy again for the 4D case
		const F4 = ( Math.sqrt( 5.0 ) - 1.0 ) / 4.0;
		const G4 = ( 5.0 - Math.sqrt( 5.0 ) ) / 20.0;
		let n0; // Noise contributions from the five corners
		let n1;
		let n2;
		let n3;
		let n4;
		// Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
		const s = ( x + y + z + w ) * F4; // Factor for 4D skewing
		const i = Math.floor( x + s );
		const j = Math.floor( y + s );
		const k = Math.floor( z + s );
		const l = Math.floor( w + s );
		const t = ( i + j + k + l ) * G4; // Factor for 4D unskewing
		const X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
		const Y0 = j - t;
		const Z0 = k - t;
		const W0 = l - t;
		const x0 = x - X0; // The x,y,z,w distances from the cell origin
		const y0 = y - Y0;
		const z0 = z - Z0;
		const w0 = w - W0;
		// For the 4D case, the simplex is a 4D shape I won't even try to describe.
		// To find out which of the 24 possible simplices we're in, we need to
		// determine the magnitude ordering of x0, y0, z0 and w0.
		// The method below is a good way of finding the ordering of x,y,z,w and
		// then find the correct traversal order for the simplex we’re in.
		// First, six pair-wise comparisons are performed between each possible pair
		// of the four coordinates, and the results are used to add up binary bits
		// for an integer index.
		const c1 = ( x0 > y0 ) ? 32 : 0;
		const c2 = ( x0 > z0 ) ? 16 : 0;
		const c3 = ( y0 > z0 ) ? 8 : 0;
		const c4 = ( x0 > w0 ) ? 4 : 0;
		const c5 = ( y0 > w0 ) ? 2 : 0;
		const c6 = ( z0 > w0 ) ? 1 : 0;
		const c = c1 + c2 + c3 + c4 + c5 + c6;
		// simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
		// Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
		// impossible. Only the 24 indices which have non-zero entries make any sense.
		// We use a thresholding to set the coordinates in turn from the largest magnitude.
		// The number 3 in the "simplex" array is at the position of the largest coordinate.
		const i1 = simplex[ c ][ 0 ] >= 3 ? 1 : 0;
		const j1 = simplex[ c ][ 1 ] >= 3 ? 1 : 0;
		const k1 = simplex[ c ][ 2 ] >= 3 ? 1 : 0;
		const l1 = simplex[ c ][ 3 ] >= 3 ? 1 : 0;
		// The number 2 in the "simplex" array is at the second largest coordinate.
		const i2 = simplex[ c ][ 0 ] >= 2 ? 1 : 0;
		const j2 = simplex[ c ][ 1 ] >= 2 ? 1 : 0;
		const k2 = simplex[ c ][ 2 ] >= 2 ? 1 : 0;
		const l2 = simplex[ c ][ 3 ] >= 2 ? 1 : 0;
		// The number 1 in the "simplex" array is at the second smallest coordinate.
		const i3 = simplex[ c ][ 0 ] >= 1 ? 1 : 0;
		const j3 = simplex[ c ][ 1 ] >= 1 ? 1 : 0;
		const k3 = simplex[ c ][ 2 ] >= 1 ? 1 : 0;
		const l3 = simplex[ c ][ 3 ] >= 1 ? 1 : 0;
		// The fifth corner has all coordinate offsets = 1, so no need to look that up.
		const x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
		const y1 = y0 - j1 + G4;
		const z1 = z0 - k1 + G4;
		const w1 = w0 - l1 + G4;
		const x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
		const y2 = y0 - j2 + 2.0 * G4;
		const z2 = z0 - k2 + 2.0 * G4;
		const w2 = w0 - l2 + 2.0 * G4;
		const x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
		const y3 = y0 - j3 + 3.0 * G4;
		const z3 = z0 - k3 + 3.0 * G4;
		const w3 = w0 - l3 + 3.0 * G4;
		const x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
		const y4 = y0 - 1.0 + 4.0 * G4;
		const z4 = z0 - 1.0 + 4.0 * G4;
		const w4 = w0 - 1.0 + 4.0 * G4;
		// Work out the hashed gradient indices of the five simplex corners
		const ii = i & 255;
		const jj = j & 255;
		const kk = k & 255;
		const ll = l & 255;
		const gi0 = perm[ ii + perm[ jj + perm[ kk + perm[ ll ] ] ] ] % 32;
		const gi1 = perm[ ii + i1 + perm[ jj + j1 + perm[ kk + k1 + perm[ ll + l1 ] ] ] ] % 32;
		const gi2 = perm[ ii + i2 + perm[ jj + j2 + perm[ kk + k2 + perm[ ll + l2 ] ] ] ] % 32;
		const gi3 = perm[ ii + i3 + perm[ jj + j3 + perm[ kk + k3 + perm[ ll + l3 ] ] ] ] % 32;
		const gi4 = perm[ ii + 1 + perm[ jj + 1 + perm[ kk + 1 + perm[ ll + 1 ] ] ] ] % 32;
		// Calculate the contribution from the five corners
		let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
		if ( t0 < 0 ) n0 = 0.0;
		else {
			t0 *= t0;
			n0 = t0 * t0 * this.dot4( grad4[ gi0 ], x0, y0, z0, w0 );
		}
		let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
		if ( t1 < 0 ) n1 = 0.0;
		else {
			t1 *= t1;
			n1 = t1 * t1 * this.dot4( grad4[ gi1 ], x1, y1, z1, w1 );
		}
		let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
		if ( t2 < 0 ) n2 = 0.0;
		else {
			t2 *= t2;
			n2 = t2 * t2 * this.dot4( grad4[ gi2 ], x2, y2, z2, w2 );
		}
		let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
		if ( t3 < 0 ) n3 = 0.0;
		else {
			t3 *= t3;
			n3 = t3 * t3 * this.dot4( grad4[ gi3 ], x3, y3, z3, w3 );
		}
		let t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
		if ( t4 < 0 ) n4 = 0.0;
		else {
			t4 *= t4;
			n4 = t4 * t4 * this.dot4( grad4[ gi4 ], x4, y4, z4, w4 );
		}
		// Sum up and scale the result to cover the range [-1,1]
		return 27.0 * ( n0 + n1 + n2 + n3 + n4 );
	}
}
Object.assign(ADD,{SimplexNoise});
}
{ /* postprocessing/Pass */
const {BufferGeometry,Float32BufferAttribute,OrthographicCamera,Mesh}=THREE;
class Pass {
	constructor() {
		this.isPass = true;
		// if set to true, the pass is processed by the composer
		this.enabled = true;
		// if set to true, the pass indicates to swap read and write buffer after rendering
		this.needsSwap = true;
		// if set to true, the pass clears its buffer before rendering
		this.clear = false;
		// if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
		this.renderToScreen = false;
	}
	setSize( /* width, height */ ) {}
	render( /* renderer, writeBuffer, readBuffer, deltaTime, maskActive */ ) {
		console.error( 'THREE.Pass: .render() must be implemented in derived pass.' );
	}
	dispose() {}
}
// Helper for passes that need to fill the viewport with a single quad.
const _camera = new OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
// https://github.com/mrdoob/three.js/pull/21358
class FullscreenTriangleGeometry extends BufferGeometry {
	constructor() {
		super();
		this.setAttribute( 'position', new Float32BufferAttribute( [ - 1, 3, 0, - 1, - 1, 0, 3, - 1, 0 ], 3 ) );
		this.setAttribute( 'uv', new Float32BufferAttribute( [ 0, 2, 0, 0, 2, 0 ], 2 ) );
	}
}
const _geometry = new FullscreenTriangleGeometry();
class FullScreenQuad {
	constructor( material ) {
		this._mesh = new Mesh( _geometry, material );
	}
	dispose() {
		this._mesh.geometry.dispose();
	}
	render( renderer ) {
		renderer.render( this._mesh, _camera );
	}
	get material() {
		return this._mesh.material;
	}
	set material( value ) {
		this._mesh.material = value;
	}
}
Object.assign(ADD,{Pass,FullScreenQuad});
}
{ /* postprocessing/ShaderPass */
const {ShaderMaterial,UniformsUtils}=THREE;
const {Pass,FullScreenQuad}=ADD;
class ShaderPass extends Pass {
	constructor( shader, textureID ) {
		super();
		this.textureID = ( textureID !== undefined ) ? textureID : 'tDiffuse';
		if ( shader instanceof ShaderMaterial ) {
			this.uniforms = shader.uniforms;
			this.material = shader;
		} else if ( shader ) {
			this.uniforms = UniformsUtils.clone( shader.uniforms );
			this.material = new ShaderMaterial( {
				name: ( shader.name !== undefined ) ? shader.name : 'unspecified',
				defines: Object.assign( {}, shader.defines ),
				uniforms: this.uniforms,
				vertexShader: shader.vertexShader,
				fragmentShader: shader.fragmentShader
			} );
		}
		this.fsQuad = new FullScreenQuad( this.material );
	}
	render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {
		if ( this.uniforms[ this.textureID ] ) {
			this.uniforms[ this.textureID ].value = readBuffer.texture;
		}
		this.fsQuad.material = this.material;
		if ( this.renderToScreen ) {
			renderer.setRenderTarget( null );
			this.fsQuad.render( renderer );
		} else {
			renderer.setRenderTarget( writeBuffer );
			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
			if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			this.fsQuad.render( renderer );
		}
	}
	dispose() {
		this.material.dispose();
		this.fsQuad.dispose();
	}
}
Object.assign(ADD,{ShaderPass});
}
{ /* postprocessing/MaskPass */
const {Pass}=ADD;
class MaskPass extends Pass {
	constructor( scene, camera ) {
		super();
		this.scene = scene;
		this.camera = camera;
		this.clear = true;
		this.needsSwap = false;
		this.inverse = false;
	}
	render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {
		const context = renderer.getContext();
		const state = renderer.state;
		// don't update color or depth
		state.buffers.color.setMask( false );
		state.buffers.depth.setMask( false );
		// lock buffers
		state.buffers.color.setLocked( true );
		state.buffers.depth.setLocked( true );
		// set up stencil
		let writeValue, clearValue;
		if ( this.inverse ) {
			writeValue = 0;
			clearValue = 1;
		} else {
			writeValue = 1;
			clearValue = 0;
		}
		state.buffers.stencil.setTest( true );
		state.buffers.stencil.setOp( context.REPLACE, context.REPLACE, context.REPLACE );
		state.buffers.stencil.setFunc( context.ALWAYS, writeValue, 0xffffffff );
		state.buffers.stencil.setClear( clearValue );
		state.buffers.stencil.setLocked( true );
		// draw into the stencil buffer
		renderer.setRenderTarget( readBuffer );
		if ( this.clear ) renderer.clear();
		renderer.render( this.scene, this.camera );
		renderer.setRenderTarget( writeBuffer );
		if ( this.clear ) renderer.clear();
		renderer.render( this.scene, this.camera );
		// unlock color and depth buffer and make them writable for subsequent rendering/clearing
		state.buffers.color.setLocked( false );
		state.buffers.depth.setLocked( false );
		state.buffers.color.setMask( true );
		state.buffers.depth.setMask( true );
		// only render where stencil is set to 1
		state.buffers.stencil.setLocked( false );
		state.buffers.stencil.setFunc( context.EQUAL, 1, 0xffffffff ); // draw if == 1
		state.buffers.stencil.setOp( context.KEEP, context.KEEP, context.KEEP );
		state.buffers.stencil.setLocked( true );
	}
}
class ClearMaskPass extends Pass {
	constructor() {
		super();
		this.needsSwap = false;
	}
	render( renderer /*, writeBuffer, readBuffer, deltaTime, maskActive */ ) {
		renderer.state.buffers.stencil.setLocked( false );
		renderer.state.buffers.stencil.setTest( false );
	}
}
Object.assign(ADD,{MaskPass,ClearMaskPass});
}
{ /* postprocessing/EffectComposer */
const {Clock,HalfFloatType,NoBlending,Vector2,WebGLRenderTarget}=THREE;
const {CopyShader}=ADD;
const {ShaderPass}=ADD;
const {MaskPass}=ADD;
const {ClearMaskPass}=ADD;
class EffectComposer {
	constructor( renderer, renderTarget ) {
		this.renderer = renderer;
		this._pixelRatio = renderer.getPixelRatio();
		if ( renderTarget === undefined ) {
			const size = renderer.getSize( new Vector2() );
			this._width = size.width;
			this._height = size.height;
			renderTarget = new WebGLRenderTarget( this._width * this._pixelRatio, this._height * this._pixelRatio, { type: HalfFloatType } );
			renderTarget.texture.name = 'EffectComposer.rt1';
		} else {
			this._width = renderTarget.width;
			this._height = renderTarget.height;
		}
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();
		this.renderTarget2.texture.name = 'EffectComposer.rt2';
		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;
		this.renderToScreen = true;
		this.passes = [];
		this.copyPass = new ShaderPass( CopyShader );
		this.copyPass.material.blending = NoBlending;
		this.clock = new Clock();
	}
	swapBuffers() {
		const tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;
	}
	addPass( pass ) {
		this.passes.push( pass );
		pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );
	}
	insertPass( pass, index ) {
		this.passes.splice( index, 0, pass );
		pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );
	}
	removePass( pass ) {
		const index = this.passes.indexOf( pass );
		if ( index !== - 1 ) {
			this.passes.splice( index, 1 );
		}
	}
	isLastEnabledPass( passIndex ) {
		for ( let i = passIndex + 1; i < this.passes.length; i ++ ) {
			if ( this.passes[ i ].enabled ) {
				return false;
			}
		}
		return true;
	}
	render( deltaTime ) {
		// deltaTime value is in seconds
		if ( deltaTime === undefined ) {
			deltaTime = this.clock.getDelta();
		}
		const currentRenderTarget = this.renderer.getRenderTarget();
		let maskActive = false;
		for ( let i = 0, il = this.passes.length; i < il; i ++ ) {
			const pass = this.passes[ i ];
			if ( pass.enabled === false ) continue;
			pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) );
			pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive );
			if ( pass.needsSwap ) {
				if ( maskActive ) {
					const context = this.renderer.getContext();
					const stencil = this.renderer.state.buffers.stencil;
					//context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );
					stencil.setFunc( context.NOTEQUAL, 1, 0xffffffff );
					this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime );
					//context.stencilFunc( context.EQUAL, 1, 0xffffffff );
					stencil.setFunc( context.EQUAL, 1, 0xffffffff );
				}
				this.swapBuffers();
			}
			if ( MaskPass !== undefined ) {
				if ( pass instanceof MaskPass ) {
					maskActive = true;
				} else if ( pass instanceof ClearMaskPass ) {
					maskActive = false;
				}
			}
		}
		this.renderer.setRenderTarget( currentRenderTarget );
	}
	reset( renderTarget ) {
		if ( renderTarget === undefined ) {
			const size = this.renderer.getSize( new Vector2() );
			this._pixelRatio = this.renderer.getPixelRatio();
			this._width = size.width;
			this._height = size.height;
			renderTarget = this.renderTarget1.clone();
			renderTarget.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );
		}
		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();
		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;
	}
	setSize( width, height ) {
		this._width = width;
		this._height = height;
		const effectiveWidth = this._width * this._pixelRatio;
		const effectiveHeight = this._height * this._pixelRatio;
		this.renderTarget1.setSize( effectiveWidth, effectiveHeight );
		this.renderTarget2.setSize( effectiveWidth, effectiveHeight );
		for ( let i = 0; i < this.passes.length; i ++ ) {
			this.passes[ i ].setSize( effectiveWidth, effectiveHeight );
		}
	}
	setPixelRatio( pixelRatio ) {
		this._pixelRatio = pixelRatio;
		this.setSize( this._width, this._height );
	}
	dispose() {
		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.copyPass.dispose();
	}
}
Object.assign(ADD,{EffectComposer});
}
{ /* postprocessing/RenderPass */
const {Color}=THREE;
const {Pass}=ADD;
class RenderPass extends Pass {
	constructor( scene, camera, overrideMaterial = null, clearColor = null, clearAlpha = null ) {
		super();
		this.scene = scene;
		this.camera = camera;
		this.overrideMaterial = overrideMaterial;
		this.clearColor = clearColor;
		this.clearAlpha = clearAlpha;
		this.clear = true;
		this.clearDepth = false;
		this.needsSwap = false;
		this._oldClearColor = new Color();
	}
	render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {
		const oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;
		let oldClearAlpha, oldOverrideMaterial;
		if ( this.overrideMaterial !== null ) {
			oldOverrideMaterial = this.scene.overrideMaterial;
			this.scene.overrideMaterial = this.overrideMaterial;
		}
		if ( this.clearColor !== null ) {
			renderer.getClearColor( this._oldClearColor );
			renderer.setClearColor( this.clearColor );
		}
		if ( this.clearAlpha !== null ) {
			oldClearAlpha = renderer.getClearAlpha();
			renderer.setClearAlpha( this.clearAlpha );
		}
		if ( this.clearDepth == true ) {
			renderer.clearDepth();
		}
		renderer.setRenderTarget( this.renderToScreen ? null : readBuffer );
		if ( this.clear === true ) {
			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
			renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
		}
		renderer.render( this.scene, this.camera );
		// restore
		if ( this.clearColor !== null ) {
			renderer.setClearColor( this._oldClearColor );
		}
		if ( this.clearAlpha !== null ) {
			renderer.setClearAlpha( oldClearAlpha );
		}
		if ( this.overrideMaterial !== null ) {
			this.scene.overrideMaterial = oldOverrideMaterial;
		}
		renderer.autoClear = oldAutoClear;
	}
}
Object.assign(ADD,{RenderPass});
}
{ /* postprocessing/OutputPass */
const {ColorManagement,RawShaderMaterial,UniformsUtils,LinearToneMapping,ReinhardToneMapping,CineonToneMapping,AgXToneMapping,ACESFilmicToneMapping,SRGBTransfer}=THREE;
const {Pass,FullScreenQuad}=ADD;
const {OutputShader}=ADD;
class OutputPass extends Pass {
	constructor() {
		super();
		//
		const shader = OutputShader;
		this.uniforms = UniformsUtils.clone( shader.uniforms );
		this.material = new RawShaderMaterial( {
			name: shader.name,
			uniforms: this.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader
		} );
		this.fsQuad = new FullScreenQuad( this.material );
		// internal cache
		this._outputColorSpace = null;
		this._toneMapping = null;
	}
	render( renderer, writeBuffer, readBuffer/*, deltaTime, maskActive */ ) {
		this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
		this.uniforms[ 'toneMappingExposure' ].value = renderer.toneMappingExposure;
		// rebuild defines if required
		if ( this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping ) {
			this._outputColorSpace = renderer.outputColorSpace;
			this._toneMapping = renderer.toneMapping;
			this.material.defines = {};
			if ( ColorManagement.getTransfer( this._outputColorSpace ) === SRGBTransfer ) this.material.defines.SRGB_TRANSFER = '';
			if ( this._toneMapping === LinearToneMapping ) this.material.defines.LINEAR_TONE_MAPPING = '';
			else if ( this._toneMapping === ReinhardToneMapping ) this.material.defines.REINHARD_TONE_MAPPING = '';
			else if ( this._toneMapping === CineonToneMapping ) this.material.defines.CINEON_TONE_MAPPING = '';
			else if ( this._toneMapping === ACESFilmicToneMapping ) this.material.defines.ACES_FILMIC_TONE_MAPPING = '';
			else if ( this._toneMapping === AgXToneMapping ) this.material.defines.AGX_TONE_MAPPING = '';
			this.material.needsUpdate = true;
		}
		//
		if ( this.renderToScreen === true ) {
			renderer.setRenderTarget( null );
			this.fsQuad.render( renderer );
		} else {
			renderer.setRenderTarget( writeBuffer );
			if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			this.fsQuad.render( renderer );
		}
	}
	dispose() {
		this.material.dispose();
		this.fsQuad.dispose();
	}
}
Object.assign(ADD,{OutputPass});
}
{ /* postprocessing/UnrealBloomPass */
const {AdditiveBlending,Color,HalfFloatType,MeshBasicMaterial,ShaderMaterial,UniformsUtils,Vector2,Vector3,WebGLRenderTarget}=THREE;
const {Pass,FullScreenQuad}=ADD;
const {CopyShader}=ADD;
const {LuminosityHighPassShader}=ADD;
class UnrealBloomPass extends Pass {
	constructor( resolution, strength, radius, threshold ) {
		super();
		this.strength = ( strength !== undefined ) ? strength : 1;
		this.radius = radius;
		this.threshold = threshold;
		this.resolution = ( resolution !== undefined ) ? new Vector2( resolution.x, resolution.y ) : new Vector2( 256, 256 );
		// create color only once here, reuse it later inside the render function
		this.clearColor = new Color( 0, 0, 0 );
		// render targets
		this.renderTargetsHorizontal = [];
		this.renderTargetsVertical = [];
		this.nMips = 5;
		let resx = Math.round( this.resolution.x / 2 );
		let resy = Math.round( this.resolution.y / 2 );
		this.renderTargetBright = new WebGLRenderTarget( resx, resy, { type: HalfFloatType } );
		this.renderTargetBright.texture.name = 'UnrealBloomPass.bright';
		this.renderTargetBright.texture.generateMipmaps = false;
		for ( let i = 0; i < this.nMips; i ++ ) {
			const renderTargetHorizonal = new WebGLRenderTarget( resx, resy, { type: HalfFloatType } );
			renderTargetHorizonal.texture.name = 'UnrealBloomPass.h' + i;
			renderTargetHorizonal.texture.generateMipmaps = false;
			this.renderTargetsHorizontal.push( renderTargetHorizonal );
			const renderTargetVertical = new WebGLRenderTarget( resx, resy, { type: HalfFloatType } );
			renderTargetVertical.texture.name = 'UnrealBloomPass.v' + i;
			renderTargetVertical.texture.generateMipmaps = false;
			this.renderTargetsVertical.push( renderTargetVertical );
			resx = Math.round( resx / 2 );
			resy = Math.round( resy / 2 );
		}
		// luminosity high pass material
		const highPassShader = LuminosityHighPassShader;
		this.highPassUniforms = UniformsUtils.clone( highPassShader.uniforms );
		this.highPassUniforms[ 'luminosityThreshold' ].value = threshold;
		this.highPassUniforms[ 'smoothWidth' ].value = 0.01;
		this.materialHighPassFilter = new ShaderMaterial( {
			uniforms: this.highPassUniforms,
			vertexShader: highPassShader.vertexShader,
			fragmentShader: highPassShader.fragmentShader
		} );
		// gaussian blur materials
		this.separableBlurMaterials = [];
		const kernelSizeArray = [ 3, 5, 7, 9, 11 ];
		resx = Math.round( this.resolution.x / 2 );
		resy = Math.round( this.resolution.y / 2 );
		for ( let i = 0; i < this.nMips; i ++ ) {
			this.separableBlurMaterials.push( this.getSeperableBlurMaterial( kernelSizeArray[ i ] ) );
			this.separableBlurMaterials[ i ].uniforms[ 'invSize' ].value = new Vector2( 1 / resx, 1 / resy );
			resx = Math.round( resx / 2 );
			resy = Math.round( resy / 2 );
		}
		// composite material
		this.compositeMaterial = this.getCompositeMaterial( this.nMips );
		this.compositeMaterial.uniforms[ 'blurTexture1' ].value = this.renderTargetsVertical[ 0 ].texture;
		this.compositeMaterial.uniforms[ 'blurTexture2' ].value = this.renderTargetsVertical[ 1 ].texture;
		this.compositeMaterial.uniforms[ 'blurTexture3' ].value = this.renderTargetsVertical[ 2 ].texture;
		this.compositeMaterial.uniforms[ 'blurTexture4' ].value = this.renderTargetsVertical[ 3 ].texture;
		this.compositeMaterial.uniforms[ 'blurTexture5' ].value = this.renderTargetsVertical[ 4 ].texture;
		this.compositeMaterial.uniforms[ 'bloomStrength' ].value = strength;
		this.compositeMaterial.uniforms[ 'bloomRadius' ].value = 0.1;
		const bloomFactors = [ 1.0, 0.8, 0.6, 0.4, 0.2 ];
		this.compositeMaterial.uniforms[ 'bloomFactors' ].value = bloomFactors;
		this.bloomTintColors = [ new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ), new Vector3( 1, 1, 1 ) ];
		this.compositeMaterial.uniforms[ 'bloomTintColors' ].value = this.bloomTintColors;
		// blend material
		const copyShader = CopyShader;
		this.copyUniforms = UniformsUtils.clone( copyShader.uniforms );
		this.blendMaterial = new ShaderMaterial( {
			uniforms: this.copyUniforms,
			vertexShader: copyShader.vertexShader,
			fragmentShader: copyShader.fragmentShader,
			blending: AdditiveBlending,
			depthTest: false,
			depthWrite: false,
			transparent: true
		} );
		this.enabled = true;
		this.needsSwap = false;
		this._oldClearColor = new Color();
		this.oldClearAlpha = 1;
		this.basic = new MeshBasicMaterial();
		this.fsQuad = new FullScreenQuad( null );
	}
	dispose() {
		for ( let i = 0; i < this.renderTargetsHorizontal.length; i ++ ) {
			this.renderTargetsHorizontal[ i ].dispose();
		}
		for ( let i = 0; i < this.renderTargetsVertical.length; i ++ ) {
			this.renderTargetsVertical[ i ].dispose();
		}
		this.renderTargetBright.dispose();
		//
		for ( let i = 0; i < this.separableBlurMaterials.length; i ++ ) {
			this.separableBlurMaterials[ i ].dispose();
		}
		this.compositeMaterial.dispose();
		this.blendMaterial.dispose();
		this.basic.dispose();
		//
		this.fsQuad.dispose();
	}
	setSize( width, height ) {
		let resx = Math.round( width / 2 );
		let resy = Math.round( height / 2 );
		this.renderTargetBright.setSize( resx, resy );
		for ( let i = 0; i < this.nMips; i ++ ) {
			this.renderTargetsHorizontal[ i ].setSize( resx, resy );
			this.renderTargetsVertical[ i ].setSize( resx, resy );
			this.separableBlurMaterials[ i ].uniforms[ 'invSize' ].value = new Vector2( 1 / resx, 1 / resy );
			resx = Math.round( resx / 2 );
			resy = Math.round( resy / 2 );
		}
	}
	render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {
		renderer.getClearColor( this._oldClearColor );
		this.oldClearAlpha = renderer.getClearAlpha();
		const oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;
		renderer.setClearColor( this.clearColor, 0 );
		if ( maskActive ) renderer.state.buffers.stencil.setTest( false );
		// Render input to screen
		if ( this.renderToScreen ) {
			this.fsQuad.material = this.basic;
			this.basic.map = readBuffer.texture;
			renderer.setRenderTarget( null );
			renderer.clear();
			this.fsQuad.render( renderer );
		}
		// 1. Extract Bright Areas
		this.highPassUniforms[ 'tDiffuse' ].value = readBuffer.texture;
		this.highPassUniforms[ 'luminosityThreshold' ].value = this.threshold;
		this.fsQuad.material = this.materialHighPassFilter;
		renderer.setRenderTarget( this.renderTargetBright );
		renderer.clear();
		this.fsQuad.render( renderer );
		// 2. Blur All the mips progressively
		let inputRenderTarget = this.renderTargetBright;
		for ( let i = 0; i < this.nMips; i ++ ) {
			this.fsQuad.material = this.separableBlurMaterials[ i ];
			this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = inputRenderTarget.texture;
			this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = UnrealBloomPass.BlurDirectionX;
			renderer.setRenderTarget( this.renderTargetsHorizontal[ i ] );
			renderer.clear();
			this.fsQuad.render( renderer );
			this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = this.renderTargetsHorizontal[ i ].texture;
			this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = UnrealBloomPass.BlurDirectionY;
			renderer.setRenderTarget( this.renderTargetsVertical[ i ] );
			renderer.clear();
			this.fsQuad.render( renderer );
			inputRenderTarget = this.renderTargetsVertical[ i ];
		}
		// Composite All the mips
		this.fsQuad.material = this.compositeMaterial;
		this.compositeMaterial.uniforms[ 'bloomStrength' ].value = this.strength;
		this.compositeMaterial.uniforms[ 'bloomRadius' ].value = this.radius;
		this.compositeMaterial.uniforms[ 'bloomTintColors' ].value = this.bloomTintColors;
		renderer.setRenderTarget( this.renderTargetsHorizontal[ 0 ] );
		renderer.clear();
		this.fsQuad.render( renderer );
		// Blend it additively over the input texture
		this.fsQuad.material = this.blendMaterial;
		this.copyUniforms[ 'tDiffuse' ].value = this.renderTargetsHorizontal[ 0 ].texture;
		if ( maskActive ) renderer.state.buffers.stencil.setTest( true );
		if ( this.renderToScreen ) {
			renderer.setRenderTarget( null );
			this.fsQuad.render( renderer );
		} else {
			renderer.setRenderTarget( readBuffer );
			this.fsQuad.render( renderer );
		}
		// Restore renderer settings
		renderer.setClearColor( this._oldClearColor, this.oldClearAlpha );
		renderer.autoClear = oldAutoClear;
	}
	getSeperableBlurMaterial( kernelRadius ) {
		const coefficients = [];
		for ( let i = 0; i < kernelRadius; i ++ ) {
			coefficients.push( 0.39894 * Math.exp( - 0.5 * i * i / ( kernelRadius * kernelRadius ) ) / kernelRadius );
		}
		return new ShaderMaterial( {
			defines: {
				'KERNEL_RADIUS': kernelRadius
			},
			uniforms: {
				'colorTexture': { value: null },
				'invSize': { value: new Vector2( 0.5, 0.5 ) }, // inverse texture size
				'direction': { value: new Vector2( 0.5, 0.5 ) },
				'gaussianCoefficients': { value: coefficients } // precomputed Gaussian coefficients
			},
			vertexShader:
				`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
			fragmentShader:
				`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];
				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`
		} );
	}
	getCompositeMaterial( nMips ) {
		return new ShaderMaterial( {
			defines: {
				'NUM_MIPS': nMips
			},
			uniforms: {
				'blurTexture1': { value: null },
				'blurTexture2': { value: null },
				'blurTexture3': { value: null },
				'blurTexture4': { value: null },
				'blurTexture5': { value: null },
				'bloomStrength': { value: 1.0 },
				'bloomFactors': { value: null },
				'bloomTintColors': { value: null },
				'bloomRadius': { value: 0.0 }
			},
			vertexShader:
				`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
			fragmentShader:
				`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];
				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}
				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`
		} );
	}
}
UnrealBloomPass.BlurDirectionX = new Vector2( 1.0, 0.0 );
UnrealBloomPass.BlurDirectionY = new Vector2( 0.0, 1.0 );
Object.assign(ADD,{UnrealBloomPass});
}
{ /* postprocessing/GTAOPass */
const {AddEquation,Color,CustomBlending,DataTexture,DepthTexture,DepthStencilFormat,DstAlphaFactor,DstColorFactor,HalfFloatType,MeshNormalMaterial,NearestFilter,NoBlending,RepeatWrapping,RGBAFormat,ShaderMaterial,UniformsUtils,UnsignedByteType,UnsignedInt248Type,WebGLRenderTarget,ZeroFactor}=THREE;
const {Pass,FullScreenQuad}=ADD;
const {generateMagicSquareNoise,GTAOShader,GTAODepthShader,GTAOBlendShader}=ADD;
const {generatePdSamplePointInitializer,PoissonDenoiseShader}=ADD;
const {CopyShader}=ADD;
const {SimplexNoise}=ADD;
class GTAOPass extends Pass {
	constructor( scene, camera, width, height, parameters, aoParameters, pdParameters ) {
		super();
		this.width = ( width !== undefined ) ? width : 512;
		this.height = ( height !== undefined ) ? height : 512;
		this.clear = true;
		this.camera = camera;
		this.scene = scene;
		this.output = 0;
		this._renderGBuffer = true;
		this._visibilityCache = new Map();
		this.blendIntensity = 1.;
		this.pdRings = 2.;
		this.pdRadiusExponent = 2.;
		this.pdSamples = 16;
		this.gtaoNoiseTexture = generateMagicSquareNoise();
		this.pdNoiseTexture = this.generateNoise();
		this.gtaoRenderTarget = new WebGLRenderTarget( this.width, this.height, { type: HalfFloatType } );
		this.pdRenderTarget = this.gtaoRenderTarget.clone();
		this.gtaoMaterial = new ShaderMaterial( {
			defines: Object.assign( {}, GTAOShader.defines ),
			uniforms: UniformsUtils.clone( GTAOShader.uniforms ),
			vertexShader: GTAOShader.vertexShader,
			fragmentShader: GTAOShader.fragmentShader,
			blending: NoBlending,
			depthTest: false,
			depthWrite: false,
		} );
		this.gtaoMaterial.definesPERSPECTIVE_CAMERA = this.camera.isPerspectiveCamera ? 1 : 0;
		this.gtaoMaterial.uniforms.tNoise.value = this.gtaoNoiseTexture;
		this.gtaoMaterial.uniforms.resolution.value.set( this.width, this.height );
		this.gtaoMaterial.uniforms.cameraNear.value = this.camera.near;
		this.gtaoMaterial.uniforms.cameraFar.value = this.camera.far;
		this.normalMaterial = new MeshNormalMaterial();
		this.normalMaterial.blending = NoBlending;
		this.pdMaterial = new ShaderMaterial( {
			defines: Object.assign( {}, PoissonDenoiseShader.defines ),
			uniforms: UniformsUtils.clone( PoissonDenoiseShader.uniforms ),
			vertexShader: PoissonDenoiseShader.vertexShader,
			fragmentShader: PoissonDenoiseShader.fragmentShader,
			depthTest: false,
			depthWrite: false,
		} );
		this.pdMaterial.uniforms.tDiffuse.value = this.gtaoRenderTarget.texture;
		this.pdMaterial.uniforms.tNoise.value = this.pdNoiseTexture;
		this.pdMaterial.uniforms.resolution.value.set( this.width, this.height );
		this.pdMaterial.uniforms.lumaPhi.value = 10;
		this.pdMaterial.uniforms.depthPhi.value = 2;
		this.pdMaterial.uniforms.normalPhi.value = 3;
		this.pdMaterial.uniforms.radius.value = 8;
		this.depthRenderMaterial = new ShaderMaterial( {
			defines: Object.assign( {}, GTAODepthShader.defines ),
			uniforms: UniformsUtils.clone( GTAODepthShader.uniforms ),
			vertexShader: GTAODepthShader.vertexShader,
			fragmentShader: GTAODepthShader.fragmentShader,
			blending: NoBlending
		} );
		this.depthRenderMaterial.uniforms.cameraNear.value = this.camera.near;
		this.depthRenderMaterial.uniforms.cameraFar.value = this.camera.far;
		this.copyMaterial = new ShaderMaterial( {
			uniforms: UniformsUtils.clone( CopyShader.uniforms ),
			vertexShader: CopyShader.vertexShader,
			fragmentShader: CopyShader.fragmentShader,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			blendSrc: DstColorFactor,
			blendDst: ZeroFactor,
			blendEquation: AddEquation,
			blendSrcAlpha: DstAlphaFactor,
			blendDstAlpha: ZeroFactor,
			blendEquationAlpha: AddEquation
		} );
		this.blendMaterial = new ShaderMaterial( {
			uniforms: UniformsUtils.clone( GTAOBlendShader.uniforms ),
			vertexShader: GTAOBlendShader.vertexShader,
			fragmentShader: GTAOBlendShader.fragmentShader,
			transparent: true,
			depthTest: false,
			depthWrite: false,
			blending: CustomBlending,
			blendSrc: DstColorFactor,
			blendDst: ZeroFactor,
			blendEquation: AddEquation,
			blendSrcAlpha: DstAlphaFactor,
			blendDstAlpha: ZeroFactor,
			blendEquationAlpha: AddEquation
		} );
		this.fsQuad = new FullScreenQuad( null );
		this.originalClearColor = new Color();
		this.setGBuffer( parameters ? parameters.depthTexture : undefined, parameters ? parameters.normalTexture : undefined );
		if ( aoParameters !== undefined ) {
			this.updateGtaoMaterial( aoParameters );
		}
		if ( pdParameters !== undefined ) {
			this.updatePdMaterial( pdParameters );
		}
	}
	dispose() {
		this.gtaoNoiseTexture.dispose();
		this.pdNoiseTexture.dispose();
		this.normalRenderTarget.dispose();
		this.gtaoRenderTarget.dispose();
		this.pdRenderTarget.dispose();
		this.normalMaterial.dispose();
		this.pdMaterial.dispose();
		this.copyMaterial.dispose();
		this.depthRenderMaterial.dispose();
		this.fsQuad.dispose();
	}
	setGBuffer( depthTexture, normalTexture ) {
		if ( depthTexture !== undefined ) {
			this.depthTexture = depthTexture;
			this.normalTexture = normalTexture;
			this._renderGBuffer = false;
		} else {
			this.depthTexture = new DepthTexture();
			this.depthTexture.format = DepthStencilFormat;
			this.depthTexture.type = UnsignedInt248Type;
			this.normalRenderTarget = new WebGLRenderTarget( this.width, this.height, {
				minFilter: NearestFilter,
				magFilter: NearestFilter,
				type: HalfFloatType,
				depthTexture: this.depthTexture
			} );
			this.normalTexture = this.normalRenderTarget.texture;
			this._renderGBuffer = true;
		}
		const normalVectorType = ( this.normalTexture ) ? 1 : 0;
		const depthValueSource = ( this.depthTexture === this.normalTexture ) ? 'w' : 'x';
		this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE = normalVectorType;
		this.gtaoMaterial.defines.DEPTH_SWIZZLING = depthValueSource;
		this.gtaoMaterial.uniforms.tNormal.value = this.normalTexture;
		this.gtaoMaterial.uniforms.tDepth.value = this.depthTexture;
		this.pdMaterial.defines.NORMAL_VECTOR_TYPE = normalVectorType;
		this.pdMaterial.defines.DEPTH_SWIZZLING = depthValueSource;
		this.pdMaterial.uniforms.tNormal.value = this.normalTexture;
		this.pdMaterial.uniforms.tDepth.value = this.depthTexture;
		this.depthRenderMaterial.uniforms.tDepth.value = this.normalRenderTarget.depthTexture;
	}
	setSceneClipBox( box ) {
		if ( box ) {
			this.gtaoMaterial.needsUpdate = this.gtaoMaterial.defines.SCENE_CLIP_BOX !== 1;
			this.gtaoMaterial.defines.SCENE_CLIP_BOX = 1;
			this.gtaoMaterial.uniforms.sceneBoxMin.value.copy( box.min );
			this.gtaoMaterial.uniforms.sceneBoxMax.value.copy( box.max );
		} else {
			this.gtaoMaterial.needsUpdate = this.gtaoMaterial.defines.SCENE_CLIP_BOX === 0;
			this.gtaoMaterial.defines.SCENE_CLIP_BOX = 0;
		}
	}
	updateGtaoMaterial( parameters ) {
		if ( parameters.radius !== undefined ) {
			this.gtaoMaterial.uniforms.radius.value = parameters.radius;
		}
		if ( parameters.distanceExponent !== undefined ) {
			this.gtaoMaterial.uniforms.distanceExponent.value = parameters.distanceExponent;
		}
		if ( parameters.thickness !== undefined ) {
			this.gtaoMaterial.uniforms.thickness.value = parameters.thickness;
		}
		if ( parameters.distanceFallOff !== undefined ) {
			this.gtaoMaterial.uniforms.distanceFallOff.value = parameters.distanceFallOff;
			this.gtaoMaterial.needsUpdate = true;
		}
		if ( parameters.scale !== undefined ) {
			this.gtaoMaterial.uniforms.scale.value = parameters.scale;
		}
		if ( parameters.samples !== undefined && parameters.samples !== this.gtaoMaterial.defines.SAMPLES ) {
			this.gtaoMaterial.defines.SAMPLES = parameters.samples;
			this.gtaoMaterial.needsUpdate = true;
		}
		if ( parameters.screenSpaceRadius !== undefined && ( parameters.screenSpaceRadius ? 1 : 0 ) !== this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS ) {
			this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS = parameters.screenSpaceRadius ? 1 : 0;
			this.gtaoMaterial.needsUpdate = true;
		}
	}
	updatePdMaterial( parameters ) {
		let updateShader = false;
		if ( parameters.lumaPhi !== undefined ) {
			this.pdMaterial.uniforms.lumaPhi.value = parameters.lumaPhi;
		}
		if ( parameters.depthPhi !== undefined ) {
			this.pdMaterial.uniforms.depthPhi.value = parameters.depthPhi;
		}
		if ( parameters.normalPhi !== undefined ) {
			this.pdMaterial.uniforms.normalPhi.value = parameters.normalPhi;
		}
		if ( parameters.radius !== undefined && parameters.radius !== this.radius ) {
			this.pdMaterial.uniforms.radius.value = parameters.radius;
		}
		if ( parameters.radiusExponent !== undefined && parameters.radiusExponent !== this.pdRadiusExponent ) {
			this.pdRadiusExponent = parameters.radiusExponent;
			updateShader = true;
		}
		if ( parameters.rings !== undefined && parameters.rings !== this.pdRings ) {
			this.pdRings = parameters.rings;
			updateShader = true;
		}
		if ( parameters.samples !== undefined && parameters.samples !== this.pdSamples ) {
			this.pdSamples = parameters.samples;
			updateShader = true;
		}
		if ( updateShader ) {
			this.pdMaterial.defines.SAMPLES = this.pdSamples;
			this.pdMaterial.defines.SAMPLE_VECTORS = generatePdSamplePointInitializer( this.pdSamples, this.pdRings, this.pdRadiusExponent );
			this.pdMaterial.needsUpdate = true;
		}
	}
	render( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {
		// render normals and depth (honor only meshes, points and lines do not contribute to AO)
		if ( this._renderGBuffer ) {
			this.overrideVisibility();
			this.renderOverride( renderer, this.normalMaterial, this.normalRenderTarget, 0x7777ff, 1.0 );
			this.restoreVisibility();
		}
		// render AO
		this.gtaoMaterial.uniforms.cameraNear.value = this.camera.near;
		this.gtaoMaterial.uniforms.cameraFar.value = this.camera.far;
		this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy( this.camera.projectionMatrix );
		this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy( this.camera.projectionMatrixInverse );
		this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy( this.camera.matrixWorld );
		this.renderPass( renderer, this.gtaoMaterial, this.gtaoRenderTarget, 0xffffff, 1.0 );
		// render poisson denoise
		this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy( this.camera.projectionMatrixInverse );
		this.renderPass( renderer, this.pdMaterial, this.pdRenderTarget, 0xffffff, 1.0 );
		// output result to screen
		switch ( this.output ) {
			case GTAOPass.OUTPUT.Diffuse:
				this.copyMaterial.uniforms.tDiffuse.value = readBuffer.texture;
				this.copyMaterial.blending = NoBlending;
				this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
				break;
			case GTAOPass.OUTPUT.AO:
				this.copyMaterial.uniforms.tDiffuse.value = this.gtaoRenderTarget.texture;
				this.copyMaterial.blending = NoBlending;
				this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
				break;
			case GTAOPass.OUTPUT.Denoise:
				this.copyMaterial.uniforms.tDiffuse.value = this.pdRenderTarget.texture;
				this.copyMaterial.blending = NoBlending;
				this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
				break;
			case GTAOPass.OUTPUT.Depth:
				this.depthRenderMaterial.uniforms.cameraNear.value = this.camera.near;
				this.depthRenderMaterial.uniforms.cameraFar.value = this.camera.far;
				this.renderPass( renderer, this.depthRenderMaterial, this.renderToScreen ? null : writeBuffer );
				break;
			case GTAOPass.OUTPUT.Normal:
				this.copyMaterial.uniforms.tDiffuse.value = this.normalRenderTarget.texture;
				this.copyMaterial.blending = NoBlending;
				this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
				break;
			case GTAOPass.OUTPUT.Default:
				this.copyMaterial.uniforms.tDiffuse.value = readBuffer.texture;
				this.copyMaterial.blending = NoBlending;
				this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
				this.blendMaterial.uniforms.intensity.value = this.blendIntensity;
				this.blendMaterial.uniforms.tDiffuse.value = this.pdRenderTarget.texture;
				this.renderPass( renderer, this.blendMaterial, this.renderToScreen ? null : writeBuffer );
				break;
			default:
				console.warn( 'THREE.GTAOPass: Unknown output type.' );
		}
	}
	renderPass( renderer, passMaterial, renderTarget, clearColor, clearAlpha ) {
		// save original state
		renderer.getClearColor( this.originalClearColor );
		const originalClearAlpha = renderer.getClearAlpha();
		const originalAutoClear = renderer.autoClear;
		renderer.setRenderTarget( renderTarget );
		// setup pass state
		renderer.autoClear = false;
		if ( ( clearColor !== undefined ) && ( clearColor !== null ) ) {
			renderer.setClearColor( clearColor );
			renderer.setClearAlpha( clearAlpha || 0.0 );
			renderer.clear();
		}
		this.fsQuad.material = passMaterial;
		this.fsQuad.render( renderer );
		// restore original state
		renderer.autoClear = originalAutoClear;
		renderer.setClearColor( this.originalClearColor );
		renderer.setClearAlpha( originalClearAlpha );
	}
	renderOverride( renderer, overrideMaterial, renderTarget, clearColor, clearAlpha ) {
		renderer.getClearColor( this.originalClearColor );
		const originalClearAlpha = renderer.getClearAlpha();
		const originalAutoClear = renderer.autoClear;
		renderer.setRenderTarget( renderTarget );
		renderer.autoClear = false;
		clearColor = overrideMaterial.clearColor || clearColor;
		clearAlpha = overrideMaterial.clearAlpha || clearAlpha;
		if ( ( clearColor !== undefined ) && ( clearColor !== null ) ) {
			renderer.setClearColor( clearColor );
			renderer.setClearAlpha( clearAlpha || 0.0 );
			renderer.clear();
		}
		this.scene.overrideMaterial = overrideMaterial;
		renderer.render( this.scene, this.camera );
		this.scene.overrideMaterial = null;
		renderer.autoClear = originalAutoClear;
		renderer.setClearColor( this.originalClearColor );
		renderer.setClearAlpha( originalClearAlpha );
	}
	setSize( width, height ) {
		this.width = width;
		this.height = height;
		this.gtaoRenderTarget.setSize( width, height );
		this.normalRenderTarget.setSize( width, height );
		this.pdRenderTarget.setSize( width, height );
		this.gtaoMaterial.uniforms.resolution.value.set( width, height );
		this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy( this.camera.projectionMatrix );
		this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy( this.camera.projectionMatrixInverse );
		this.pdMaterial.uniforms.resolution.value.set( width, height );
		this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy( this.camera.projectionMatrixInverse );
	}
	overrideVisibility() {
		const scene = this.scene;
		const cache = this._visibilityCache;
		scene.traverse( function ( object ) {
			cache.set( object, object.visible );
			if ( object.isPoints || object.isLine ) object.visible = false;
		} );
	}
	restoreVisibility() {
		const scene = this.scene;
		const cache = this._visibilityCache;
		scene.traverse( function ( object ) {
			const visible = cache.get( object );
			object.visible = visible;
		} );
		cache.clear();
	}
	generateNoise( size = 64 ) {
		const simplex = new SimplexNoise();
		const arraySize = size * size * 4;
		const data = new Uint8Array( arraySize );
		for ( let i = 0; i < size; i ++ ) {
			for ( let j = 0; j < size; j ++ ) {
				const x = i;
				const y = j;
				data[ ( i * size + j ) * 4 ] = ( simplex.noise( x, y ) * 0.5 + 0.5 ) * 255;
				data[ ( i * size + j ) * 4 + 1 ] = ( simplex.noise( x + size, y ) * 0.5 + 0.5 ) * 255;
				data[ ( i * size + j ) * 4 + 2 ] = ( simplex.noise( x, y + size ) * 0.5 + 0.5 ) * 255;
				data[ ( i * size + j ) * 4 + 3 ] = ( simplex.noise( x + size, y + size ) * 0.5 + 0.5 ) * 255;
			}
		}
		const noiseTexture = new DataTexture( data, size, size, RGBAFormat, UnsignedByteType );
		noiseTexture.wrapS = RepeatWrapping;
		noiseTexture.wrapT = RepeatWrapping;
		noiseTexture.needsUpdate = true;
		return noiseTexture;
	}
}
GTAOPass.OUTPUT = {
	'Default': 0,
	'Diffuse': 1,
	'Depth': 2,
	'Normal': 3,
	'AO': 4,
	'Denoise': 5,
};
Object.assign(ADD,{GTAOPass});
}
{ /* objects/Sky */
const {BackSide,BoxGeometry,Mesh,ShaderMaterial,UniformsUtils,Vector3}=THREE;
class Sky extends Mesh {
	constructor() {
		const shader = Sky.SkyShader;
		const material = new ShaderMaterial( {
			name: shader.name,
			uniforms: UniformsUtils.clone( shader.uniforms ),
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader,
			side: BackSide,
			depthWrite: false
		} );
		super( new BoxGeometry( 1, 1, 1 ), material );
		this.isSky = true;
	}
}
Sky.SkyShader = {
	name: 'SkyShader',
	uniforms: {
		'turbidity': { value: 2 },
		'rayleigh': { value: 1 },
		'mieCoefficient': { value: 0.005 },
		'mieDirectionalG': { value: 0.8 },
		'sunPosition': { value: new Vector3() },
		'up': { value: new Vector3( 0, 1, 0 ) }
	},
	vertexShader: /* glsl */`
		uniform vec3 sunPosition;
		uniform float rayleigh;
		uniform float turbidity;
		uniform float mieCoefficient;
		uniform vec3 up;
		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;
		// constants for atmospheric scattering
		const float e = 2.71828182845904523536028747135266249775724709369995957;
		const float pi = 3.141592653589793238462643383279502884197169;
		// wavelength of used primaries, according to preetham
		const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
		// this pre-calcuation replaces older TotalRayleigh(vec3 lambda) function:
		// (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
		const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );
		// mie stuff
		// K coefficient for the primaries
		const float v = 4.0;
		const vec3 K = vec3( 0.686, 0.678, 0.666 );
		// MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
		const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );
		// earth shadow hack
		// cutoffAngle = pi / 1.95;
		const float cutoffAngle = 1.6110731556870734;
		const float steepness = 1.5;
		const float EE = 1000.0;
		float sunIntensity( float zenithAngleCos ) {
			zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
			return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
		}
		vec3 totalMie( float T ) {
			float c = ( 0.2 * T ) * 10E-18;
			return 0.434 * c * MieConst;
		}
		void main() {
			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			vWorldPosition = worldPosition.xyz;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			gl_Position.z = gl_Position.w; // set z to camera.far
			vSunDirection = normalize( sunPosition );
			vSunE = sunIntensity( dot( vSunDirection, up ) );
			vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );
			float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );
			// extinction (absorbtion + out scattering)
			// rayleigh coefficients
			vBetaR = totalRayleigh * rayleighCoefficient;
			// mie coefficients
			vBetaM = totalMie( turbidity ) * mieCoefficient;
		}`,
	fragmentShader: /* glsl */`
		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;
		uniform float mieDirectionalG;
		uniform vec3 up;
		// constants for atmospheric scattering
		const float pi = 3.141592653589793238462643383279502884197169;
		const float n = 1.0003; // refractive index of air
		const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)
		// optical length at zenith for molecules
		const float rayleighZenithLength = 8.4E3;
		const float mieZenithLength = 1.25E3;
		// 66 arc seconds -> degrees, and the cosine of that
		const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;
		// 3.0 / ( 16.0 * pi )
		const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
		// 1.0 / ( 4.0 * pi )
		const float ONE_OVER_FOURPI = 0.07957747154594767;
		float rayleighPhase( float cosTheta ) {
			return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
		}
		float hgPhase( float cosTheta, float g ) {
			float g2 = pow( g, 2.0 );
			float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
			return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
		}
		void main() {
			vec3 direction = normalize( vWorldPosition - cameraPosition );
			// optical length
			// cutoff angle at 90 to avoid singularity in next formula.
			float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
			float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
			float sR = rayleighZenithLength * inverse;
			float sM = mieZenithLength * inverse;
			// combined extinction factor
			vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );
			// in scattering
			float cosTheta = dot( direction, vSunDirection );
			float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
			vec3 betaRTheta = vBetaR * rPhase;
			float mPhase = hgPhase( cosTheta, mieDirectionalG );
			vec3 betaMTheta = vBetaM * mPhase;
			vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
			Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );
			// nightsky
			float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
			float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
			vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
			vec3 L0 = vec3( 0.1 ) * Fex;
			// composition + solar disc
			float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
			L0 += ( vSunE * 19000.0 * Fex ) * sundisk;
			vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
			vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );
			gl_FragColor = vec4( retColor, 1.0 );
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
		}`
};
Object.assign(ADD,{Sky});
}
{ /* objects/Water */
const {Color,FrontSide,Matrix4,Mesh,PerspectiveCamera,Plane,ShaderMaterial,UniformsLib,UniformsUtils,Vector3,Vector4,WebGLRenderTarget}=THREE;
class Water extends Mesh {
	constructor( geometry, options = {} ) {
		super( geometry );
		this.isWater = true;
		const scope = this;
		const textureWidth = options.textureWidth !== undefined ? options.textureWidth : 512;
		const textureHeight = options.textureHeight !== undefined ? options.textureHeight : 512;
		const clipBias = options.clipBias !== undefined ? options.clipBias : 0.0;
		const alpha = options.alpha !== undefined ? options.alpha : 1.0;
		const time = options.time !== undefined ? options.time : 0.0;
		const normalSampler = options.waterNormals !== undefined ? options.waterNormals : null;
		const sunDirection = options.sunDirection !== undefined ? options.sunDirection : new Vector3( 0.70707, 0.70707, 0.0 );
		const sunColor = new Color( options.sunColor !== undefined ? options.sunColor : 0xffffff );
		const waterColor = new Color( options.waterColor !== undefined ? options.waterColor : 0x7F7F7F );
		const eye = options.eye !== undefined ? options.eye : new Vector3( 0, 0, 0 );
		const distortionScale = options.distortionScale !== undefined ? options.distortionScale : 20.0;
		const side = options.side !== undefined ? options.side : FrontSide;
		const fog = options.fog !== undefined ? options.fog : false;
		//
		const mirrorPlane = new Plane();
		const normal = new Vector3();
		const mirrorWorldPosition = new Vector3();
		const cameraWorldPosition = new Vector3();
		const rotationMatrix = new Matrix4();
		const lookAtPosition = new Vector3( 0, 0, - 1 );
		const clipPlane = new Vector4();
		const view = new Vector3();
		const target = new Vector3();
		const q = new Vector4();
		const textureMatrix = new Matrix4();
		const mirrorCamera = new PerspectiveCamera();
		const renderTarget = new WebGLRenderTarget( textureWidth, textureHeight );
		const mirrorShader = {
			name: 'MirrorShader',
			uniforms: UniformsUtils.merge( [
				UniformsLib[ 'fog' ],
				UniformsLib[ 'lights' ],
				{
					'normalSampler': { value: null },
					'mirrorSampler': { value: null },
					'alpha': { value: 1.0 },
					'time': { value: 0.0 },
					'size': { value: 1.0 },
					'distortionScale': { value: 20.0 },
					'textureMatrix': { value: new Matrix4() },
					'sunColor': { value: new Color( 0x7F7F7F ) },
					'sunDirection': { value: new Vector3( 0.70707, 0.70707, 0 ) },
					'eye': { value: new Vector3() },
					'waterColor': { value: new Color( 0x555555 ) }
				}
			] ),
			vertexShader: /* glsl */`
				uniform mat4 textureMatrix;
				uniform float time;
				varying vec4 mirrorCoord;
				varying vec4 worldPosition;
				#include <common>
				#include <fog_pars_vertex>
				#include <shadowmap_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				void main() {
					mirrorCoord = modelMatrix * vec4( position, 1.0 );
					worldPosition = mirrorCoord.xyzw;
					mirrorCoord = textureMatrix * mirrorCoord;
					vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );
					gl_Position = projectionMatrix * mvPosition;
				#include <beginnormal_vertex>
				#include <defaultnormal_vertex>
				#include <logdepthbuf_vertex>
				#include <fog_vertex>
				#include <shadowmap_vertex>
			}`,
			fragmentShader: /* glsl */`
				uniform sampler2D mirrorSampler;
				uniform float alpha;
				uniform float time;
				uniform float size;
				uniform float distortionScale;
				uniform sampler2D normalSampler;
				uniform vec3 sunColor;
				uniform vec3 sunDirection;
				uniform vec3 eye;
				uniform vec3 waterColor;
				varying vec4 mirrorCoord;
				varying vec4 worldPosition;
				vec4 getNoise( vec2 uv ) {
					vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
					vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
					vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
					vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
					vec4 noise = texture2D( normalSampler, uv0 ) +
						texture2D( normalSampler, uv1 ) +
						texture2D( normalSampler, uv2 ) +
						texture2D( normalSampler, uv3 );
					return noise * 0.5 - 1.0;
				}
				void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
					vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
					float direction = max( 0.0, dot( eyeDirection, reflection ) );
					specularColor += pow( direction, shiny ) * sunColor * spec;
					diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
				}
				#include <common>
				#include <packing>
				#include <bsdfs>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <lights_pars_begin>
				#include <shadowmap_pars_fragment>
				#include <shadowmask_pars_fragment>
				void main() {
					#include <logdepthbuf_fragment>
					vec4 noise = getNoise( worldPosition.xz * size );
					vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );
					vec3 diffuseLight = vec3(0.0);
					vec3 specularLight = vec3(0.0);
					vec3 worldToEye = eye-worldPosition.xyz;
					vec3 eyeDirection = normalize( worldToEye );
					sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );
					float distance = length(worldToEye);
					vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
					vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );
					float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
					float rf0 = 0.3;
					float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );
					vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
					vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);
					vec3 outgoingLight = albedo;
					gl_FragColor = vec4( outgoingLight, alpha );
					#include <tonemapping_fragment>
					#include <colorspace_fragment>
					#include <fog_fragment>	
				}`
		};
		const material = new ShaderMaterial( {
			name: mirrorShader.name,
			uniforms: UniformsUtils.clone( mirrorShader.uniforms ),
			vertexShader: mirrorShader.vertexShader,
			fragmentShader: mirrorShader.fragmentShader,
			lights: true,
			side: side,
			fog: fog
		} );
		material.uniforms[ 'mirrorSampler' ].value = renderTarget.texture;
		material.uniforms[ 'textureMatrix' ].value = textureMatrix;
		material.uniforms[ 'alpha' ].value = alpha;
		material.uniforms[ 'time' ].value = time;
		material.uniforms[ 'normalSampler' ].value = normalSampler;
		material.uniforms[ 'sunColor' ].value = sunColor;
		material.uniforms[ 'waterColor' ].value = waterColor;
		material.uniforms[ 'sunDirection' ].value = sunDirection;
		material.uniforms[ 'distortionScale' ].value = distortionScale;
		material.uniforms[ 'eye' ].value = eye;
		scope.material = material;
		scope.onBeforeRender = function ( renderer, scene, camera ) {
			mirrorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
			cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );
			rotationMatrix.extractRotation( scope.matrixWorld );
			normal.set( 0, 0, 1 );
			normal.applyMatrix4( rotationMatrix );
			view.subVectors( mirrorWorldPosition, cameraWorldPosition );
			// Avoid rendering when mirror is facing away
			if ( view.dot( normal ) > 0 ) return;
			view.reflect( normal ).negate();
			view.add( mirrorWorldPosition );
			rotationMatrix.extractRotation( camera.matrixWorld );
			lookAtPosition.set( 0, 0, - 1 );
			lookAtPosition.applyMatrix4( rotationMatrix );
			lookAtPosition.add( cameraWorldPosition );
			target.subVectors( mirrorWorldPosition, lookAtPosition );
			target.reflect( normal ).negate();
			target.add( mirrorWorldPosition );
			mirrorCamera.position.copy( view );
			mirrorCamera.up.set( 0, 1, 0 );
			mirrorCamera.up.applyMatrix4( rotationMatrix );
			mirrorCamera.up.reflect( normal );
			mirrorCamera.lookAt( target );
			mirrorCamera.far = camera.far; // Used in WebGLBackground
			mirrorCamera.updateMatrixWorld();
			mirrorCamera.projectionMatrix.copy( camera.projectionMatrix );
			// Update the texture matrix
			textureMatrix.set(
				0.5, 0.0, 0.0, 0.5,
				0.0, 0.5, 0.0, 0.5,
				0.0, 0.0, 0.5, 0.5,
				0.0, 0.0, 0.0, 1.0
			);
			textureMatrix.multiply( mirrorCamera.projectionMatrix );
			textureMatrix.multiply( mirrorCamera.matrixWorldInverse );
			// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
			// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
			mirrorPlane.setFromNormalAndCoplanarPoint( normal, mirrorWorldPosition );
			mirrorPlane.applyMatrix4( mirrorCamera.matrixWorldInverse );
			clipPlane.set( mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant );
			const projectionMatrix = mirrorCamera.projectionMatrix;
			q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
			q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
			q.z = - 1.0;
			q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];
			// Calculate the scaled plane vector
			clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) );
			// Replacing the third row of the projection matrix
			projectionMatrix.elements[ 2 ] = clipPlane.x;
			projectionMatrix.elements[ 6 ] = clipPlane.y;
			projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - clipBias;
			projectionMatrix.elements[ 14 ] = clipPlane.w;
			eye.setFromMatrixPosition( camera.matrixWorld );
			// Render
			const currentRenderTarget = renderer.getRenderTarget();
			const currentXrEnabled = renderer.xr.enabled;
			const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
			scope.visible = false;
			renderer.xr.enabled = false; // Avoid camera modification and recursion
			renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows
			renderer.setRenderTarget( renderTarget );
			renderer.state.buffers.depth.setMask( true ); // make sure the depth buffer is writable so it can be properly cleared, see #18897
			if ( renderer.autoClear === false ) renderer.clear();
			renderer.render( scene, mirrorCamera );
			scope.visible = true;
			renderer.xr.enabled = currentXrEnabled;
			renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
			renderer.setRenderTarget( currentRenderTarget );
			// Restore viewport
			const viewport = camera.viewport;
			if ( viewport !== undefined ) {
				renderer.state.viewport( viewport );
			}
		};
	}
}
Object.assign(ADD,{Water});
}
return ADD})();
