'use client';

import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';

const LOOP_SECONDS = 6.8;
const FINAL_STATE_SECONDS = 4.4;

type ClearingMachineSceneProps = {
  paused: boolean;
  reducedMotion: boolean;
};

type SceneState = {
  coinProgress: number;
  receiptProgress: number;
  seamProgress: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edgeStart: number, edgeEnd: number, value: number) {
  const progress = clamp((value - edgeStart) / (edgeEnd - edgeStart));
  return progress * progress * (3 - 2 * progress);
}

function easeInCubic(value: number) {
  return value * value * value;
}

function stateAtTime(seconds: number): SceneState {
  if (seconds < 0.7) {
    return {coinProgress: 0, receiptProgress: 0, seamProgress: 0};
  }

  if (seconds < 1.8) {
    return {
      coinProgress: easeInCubic((seconds - 0.7) / 1.1),
      receiptProgress: 0,
      seamProgress: 0,
    };
  }

  if (seconds < 2.3) {
    return {coinProgress: 1, receiptProgress: 0, seamProgress: 0};
  }

  if (seconds < 2.8) {
    return {
      coinProgress: 1,
      receiptProgress: 0,
      seamProgress: smoothstep(2.3, 2.8, seconds),
    };
  }

  if (seconds < 3.8) {
    return {
      coinProgress: 1,
      receiptProgress: smoothstep(2.8, 3.8, seconds),
      seamProgress: 1,
    };
  }

  if (seconds < 5.2) {
    return {coinProgress: 1, receiptProgress: 1, seamProgress: 1};
  }

  const resetProgress = (seconds - 5.2) / 1.6;

  return {
    coinProgress: 1 - smoothstep(0.45, 1, resetProgress),
    receiptProgress: 1 - smoothstep(0, 0.36, resetProgress),
    seamProgress: 1 - smoothstep(0.25, 0.52, resetProgress),
  };
}

function createRoundedBox(
  width: number,
  height: number,
  depth: number,
  radius: number,
  material: THREE.Material,
) {
  const geometry = new RoundedBoxGeometry(
    width,
    height,
    depth,
    5,
    Math.min(radius, width / 2, height / 2, depth / 2),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createCoinTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(196, 170, 16, 256, 256, 250);
  gradient.addColorStop(0, '#fffaf0');
  gradient.addColorStop(0.45, '#ded5c6');
  gradient.addColorStop(0.78, '#bdb3a2');
  gradient.addColorStop(1, '#e8dfd0');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  context.strokeStyle = 'rgba(82, 75, 65, 0.7)';
  context.lineWidth = 14;
  context.beginPath();
  context.arc(256, 256, 218, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = 'rgba(250, 246, 236, 0.72)';
  context.lineWidth = 8;
  context.beginPath();
  context.arc(256, 256, 190, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = 'rgba(78, 71, 62, 0.76)';
  context.font = '600 244px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('5', 256, 271);

  context.fillStyle = 'rgba(248, 243, 233, 0.7)';
  context.font = '500 30px Arial, sans-serif';
  context.fillText('WORK BUDGET', 256, 112);

  for (let index = 0; index < 22; index += 1) {
    const angle = (index / 22) * Math.PI * 2;
    const x = 256 + Math.cos(angle) * 168;
    const y = 256 + Math.sin(angle) * 168;
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function addRoundedRectangle(
  path: THREE.Shape | THREE.Path,
  width: number,
  height: number,
  radius: number,
) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const corner = Math.min(radius, halfWidth, halfHeight);

  path.moveTo(-halfWidth + corner, -halfHeight);
  path.lineTo(halfWidth - corner, -halfHeight);
  path.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + corner);
  path.lineTo(halfWidth, halfHeight - corner);
  path.quadraticCurveTo(halfWidth, halfHeight, halfWidth - corner, halfHeight);
  path.lineTo(-halfWidth + corner, halfHeight);
  path.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - corner);
  path.lineTo(-halfWidth, -halfHeight + corner);
  path.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + corner, -halfHeight);
}

function addFrame(
  group: THREE.Group,
  centerX: number,
  width: number,
  height: number,
  bar: number,
  depth: number,
  z: number,
  material: THREE.Material,
) {
  const outer = new THREE.Shape();
  addRoundedRectangle(outer, width, height, Math.max(0.12, bar * 1.5));

  const inner = new THREE.Path();
  addRoundedRectangle(
    inner,
    width - bar * 2,
    height - bar * 2,
    Math.max(0.08, bar),
  );
  outer.holes.push(inner);

  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outer, {
      depth,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: Math.min(0.025, bar * 0.18),
      bevelThickness: Math.min(0.018, depth * 0.25),
      curveSegments: 8,
    }),
    material,
  );
  frame.position.set(centerX, 0, z);
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);
}

function createCradle(material: THREE.Material) {
  const group = new THREE.Group();
  const leftShape = new THREE.Shape();
  leftShape.moveTo(-0.58, -0.48);
  leftShape.lineTo(-0.12, -0.48);
  leftShape.lineTo(-0.12, -0.18);
  leftShape.closePath();

  const rightShape = new THREE.Shape();
  rightShape.moveTo(0.12, -0.48);
  rightShape.lineTo(0.58, -0.48);
  rightShape.lineTo(0.12, -0.18);
  rightShape.closePath();

  const options: THREE.ExtrudeGeometryOptions = {
    depth: 0.18,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.035,
    bevelThickness: 0.035,
  };

  for (const shape of [leftShape, rightShape]) {
    const wedge = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, options),
      material,
    );
    wedge.castShadow = true;
    wedge.receiveShadow = true;
    group.add(wedge);
  }

  return group;
}

function createMachine() {
  const machine = new THREE.Group();

  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcfc7ba,
    roughness: 0.46,
    metalness: 0.04,
    clearcoat: 0.28,
    clearcoatRoughness: 0.34,
  });
  const shellEdgeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb8aea0,
    roughness: 0.46,
    metalness: 0.08,
    clearcoat: 0.32,
  });
  const navyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x071a2a,
    roughness: 0.35,
    metalness: 0.32,
    clearcoat: 0.2,
  });
  const navyFloorMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b2438,
    roughness: 0.42,
    metalness: 0.38,
  });
  const cradleMaterial = new THREE.MeshStandardMaterial({
    color: 0xb7afa0,
    roughness: 0.25,
    metalness: 0.82,
  });
  const slotMaterial = new THREE.MeshStandardMaterial({
    color: 0x03090d,
    roughness: 0.48,
    metalness: 0.25,
  });
  const paperMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xded6c9,
    roughness: 0.72,
    metalness: 0,
    clearcoat: 0.08,
  });
  const reserveMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c755f,
    roughness: 0.35,
    metalness: 0.24,
    emissive: 0x174c3c,
    emissiveIntensity: 0.26,
  });

  const shell = createRoundedBox(7.5, 3.1, 2.12, 0.42, shellMaterial);
  shell.position.set(0, 0.02, 0);
  machine.add(shell);

  const chamberBack = createRoundedBox(
    4.42,
    1.9,
    0.18,
    0.1,
    navyMaterial,
  );
  chamberBack.position.set(-0.72, 0.02, 1.08);
  chamberBack.receiveShadow = true;
  machine.add(chamberBack);

  const chamberFloor = createRoundedBox(
    4.45,
    0.18,
    0.5,
    0.07,
    navyFloorMaterial,
  );
  chamberFloor.position.set(-0.72, -0.83, 1.05);
  machine.add(chamberFloor);

  const chamberCeiling = createRoundedBox(
    4.45,
    0.08,
    0.34,
    0.04,
    navyMaterial,
  );
  chamberCeiling.position.set(-0.72, 0.96, 1.17);
  machine.add(chamberCeiling);

  addFrame(
    machine,
    -0.72,
    5.08,
    2.42,
    0.12,
    0.08,
    1.12,
    shellEdgeMaterial,
  );
  addFrame(
    machine,
    -0.72,
    4.83,
    2.17,
    0.07,
    0.065,
    1.16,
    shellMaterial,
  );
  addFrame(
    machine,
    -0.72,
    4.63,
    1.98,
    0.04,
    0.05,
    1.19,
    shellEdgeMaterial,
  );

  const cradle = createCradle(cradleMaterial);
  cradle.position.set(-0.72, -0.27, 1.24);
  machine.add(cradle);

  const coinTexture = createCoinTexture();
  const coinEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0xc5bbab,
    roughness: 0.24,
    metalness: 0.92,
  });
  const coinFaceMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0d7c8,
    roughness: 0.25,
    metalness: 0.78,
    map: coinTexture ?? undefined,
    bumpMap: coinTexture ?? undefined,
    bumpScale: 0.025,
  });
  const coin = new THREE.Group();
  const coinBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.47, 0.47, 0.13, 72, 1, false),
    [coinEdgeMaterial, coinEdgeMaterial, coinEdgeMaterial],
  );
  coinBody.rotation.x = Math.PI / 2;
  coinBody.castShadow = true;
  coinBody.receiveShadow = true;
  coin.add(coinBody);

  const coinFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.435, 72),
    coinFaceMaterial,
  );
  coinFace.position.z = 0.071;
  coinFace.castShadow = true;
  coin.add(coinFace);

  machine.add(coin);

  const coinRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.405, 0.022, 12, 72),
    coinEdgeMaterial,
  );
  coinRing.position.z = 0.078;
  coin.add(coinRing);

  const receiptMouth = createRoundedBox(
    1.2,
    0.13,
    0.08,
    0.04,
    slotMaterial,
  );
  receiptMouth.position.set(2.68, -0.31, 1.16);
  machine.add(receiptMouth);

  const receipt = createRoundedBox(
    1.14,
    0.055,
    0.52,
    0.035,
    paperMaterial,
  );
  receipt.position.set(2.68, -0.35, 1.19);
  receipt.rotation.x = 0.24;
  receipt.castShadow = true;
  machine.add(receipt);

  const verticalSeam = createRoundedBox(
    0.035,
    3.14,
    0.026,
    0.012,
    reserveMaterial,
  );
  verticalSeam.position.set(1.83, 0.055, 1.19);
  verticalSeam.castShadow = false;
  machine.add(verticalSeam);

  const topSeam = createRoundedBox(
    0.035,
    0.026,
    1.72,
    0.012,
    reserveMaterial,
  );
  topSeam.position.set(1.83, 1.59, 0.33);
  topSeam.castShadow = false;
  machine.add(topSeam);

  return {
    machine,
    coin,
    receipt,
    verticalSeam,
    topSeam,
    coinTexture,
  };
}

export function ClearingMachineScene({
  paused,
  reducedMotion,
}: ClearingMachineSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const reducedMotionRef = useRef(reducedMotion);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const mountElement = mountRef.current;

    if (!mountElement) {
      return;
    }

    const container: HTMLDivElement = mountElement;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f1e8);
    scene.fog = new THREE.Fog(0xf5f1e8, 25, 55);
    scene.environmentIntensity = 0.5;

    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 60);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environmentScene = new RoomEnvironment();
    const environmentTexture =
      pmremGenerator.fromScene(environmentScene, 0.035).texture;
    scene.environment = environmentTexture;

    const stage = new THREE.Group();
    scene.add(stage);

    const {
      machine,
      coin,
      receipt,
      verticalSeam,
      topSeam,
      coinTexture,
    } = createMachine();
    machine.position.set(3.05, 0.08, 0);
    machine.rotation.y = 0.1;
    stage.add(machine);

    const groundMaterial = new THREE.ShadowMaterial({
      color: 0x758694,
      opacity: 0.08,
      transparent: true,
    });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      groundMaterial,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.82;
    ground.receiveShadow = true;
    scene.add(ground);

    const hemisphere = new THREE.HemisphereLight(0xfff8ed, 0x9fb3c5, 1.25);
    scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xfff7ea, 1.9);
    key.position.set(-5.5, 7.5, 7.8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.00018;
    scene.add(key);

    const coolFill = new THREE.RectAreaLight(0xd9ecff, 1.6, 5, 4);
    coolFill.position.set(5.2, 2, 5);
    coolFill.lookAt(1.5, 0, 0);
    scene.add(coolFill);

    const warmRim = new THREE.RectAreaLight(0xffead7, 1.8, 4, 5);
    warmRim.position.set(-5, 4, 1.5);
    warmRim.lookAt(0, 0, 0);
    scene.add(warmRim);

    const coinStartY = 1.32;
    const coinTargetY = -0.12;
    const receiptHiddenZ = 1.19;
    const receiptTargetZ = 1.62;

    function applyState(state: SceneState, seconds: number) {
      const settling =
        seconds >= 1.8 && seconds < 2.3
          ? Math.exp(-8 * (seconds - 1.8)) *
            Math.cos((seconds - 1.8) * 24) *
            0.055
          : 0;
      coin.position.set(
        -0.72,
        THREE.MathUtils.lerp(
          coinStartY,
          coinTargetY,
          state.coinProgress,
        ) + settling,
        1.32,
      );
      coin.rotation.z = 0.015 * (1 - state.coinProgress);

      receipt.position.z = THREE.MathUtils.lerp(
        receiptHiddenZ,
        receiptTargetZ,
        state.receiptProgress,
      );

      const seamScale = Math.max(0.0001, state.seamProgress);
      verticalSeam.scale.y = seamScale;
      verticalSeam.position.y = 1.61 - (3.14 * seamScale) / 2;
      verticalSeam.visible = state.seamProgress > 0.002;
      topSeam.scale.z = seamScale;
      topSeam.position.z = 1.01 - (1.72 * seamScale) / 2;
      topSeam.visible = state.seamProgress > 0.002;
    }

    let width = 0;
    let height = 0;

    function resize() {
      const nextWidth = Math.max(1, container.clientWidth);
      const nextHeight = Math.max(1, container.clientHeight);

      if (nextWidth === width && nextHeight === height) {
        return;
      }

      width = nextWidth;
      height = nextHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;

      const mobile = width <= 780;

      if (mobile) {
        camera.position.set(3.05, 2.7, 34);
        camera.fov = 31;
        camera.lookAt(3.05, -1.55, 0);
      } else {
        camera.position.set(5.5, 3.18, 13.15);
        camera.fov = 31;
        camera.lookAt(0.6, 0.02, 0);
      }

      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let elapsed = 0;
    let previousTimestamp = performance.now();
    let frameId = 0;

    function render(timestamp: number) {
      resize();
      const delta = Math.min(0.05, (timestamp - previousTimestamp) / 1000);
      previousTimestamp = timestamp;

      if (reducedMotionRef.current) {
        applyState(stateAtTime(FINAL_STATE_SECONDS), FINAL_STATE_SECONDS);
      } else {
        if (!pausedRef.current && !document.hidden) {
          elapsed = (elapsed + delta) % LOOP_SECONDS;
        }

        applyState(stateAtTime(elapsed), elapsed);
      }

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    }

    applyState(stateAtTime(0), 0);
    renderer.render(scene, camera);
    container.classList.add('is-ready');
    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.classList.remove('is-ready');
      container.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) {
            material.dispose();
          }
        }
      });
      coinTexture?.dispose();
      environmentTexture.dispose();
      environmentScene.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="clearing-machine-canvas" />;
}
