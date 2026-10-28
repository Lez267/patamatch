import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type CatAction = "pet" | "play" | "walk" | "stretch" | "jump";
export interface CatScene {
  act: (action: CatAction) => void;
  setPaused: (paused: boolean) => void;
  rotate: (amount: number) => void;
  reset: () => void;
  destroy: () => void;
}

function disposeModel(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
  });
  textures.forEach((texture) => { texture.dispose(); if (typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) texture.image.close(); });
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

export async function createCatScene(canvas: HTMLCanvasElement, initiallyPaused: boolean, signal: AbortSignal, onAction: (action: CatAction | null) => void): Promise<CatScene> {
  const response = await fetch("/models/miso.glb", { signal });
  if (!response.ok) throw new Error("No se pudo cargar a Miso.");
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "");
  if (signal.aborted) { disposeModel(gltf.scene); throw new DOMException("Carga cancelada", "AbortError"); }
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" }); }
  catch (error) { disposeModel(gltf.scene); throw error; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  const cameraTarget = new THREE.Vector3(0, 1.25, 0);
  scene.add(new THREE.HemisphereLight(0xfff8ed, 0x78806a, 2));
  const keyLight = new THREE.DirectionalLight(0xffeddb, 2.5);
  keyLight.position.set(-3, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -5;
  keyLight.shadow.camera.right = 5;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -5;
  keyLight.shadow.normalBias = 0.025;
  keyLight.shadow.bias = -0.0002;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 2);
  rimLight.position.set(4, 3, -4);
  scene.add(rimLight);

  const cat = new THREE.Group();
  cat.rotation.order = "YXZ";
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const modelScale = 2.65 / size.y;
  model.scale.multiplyScalar(modelScale);
  model.position.set(-center.x * modelScale, -bounds.min.y * modelScale, -center.z * modelScale);
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.metalness = 0;
      material.roughness = material.name === "material" ? 0.33 : 0.95;
      material.envMapIntensity = 0.65;
      if (material.map) material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    }
  });
  cat.add(model);
  scene.add(cat);
  const mixer = new THREE.AnimationMixer(model);
  const originalAnimation = gltf.animations[0] ? mixer.clipAction(gltf.animations[0]).play() : null;
  if (originalAnimation) originalAnimation.timeScale = 0.65;
  mixer.update(0);

  const skeleton: { bone: THREE.Bone; quaternion: THREE.Quaternion; position: THREE.Vector3 }[] = [];
  model.traverse((object) => { if (object instanceof THREE.Bone) skeleton.push({ bone: object, quaternion: object.quaternion.clone(), position: object.position.clone() }); });
  const head = model.getObjectByName("Wolf_Neck_TopSHJnt_14");
  const neck = model.getObjectByName("Wolf_Neck_01SHJnt_16");
  const jaw = model.getObjectByName("Wolf_Head_JawSHJnt_12");
  const spine = model.getObjectByName("Wolf_Spine_03SHJnt_19");
  const tail = model.getObjectByName("Wolf_Tail_01_03SHJnt_36");
  const legs = [
    { hip: model.getObjectByName("Wolf_l_FrontLeg_HipSHJnt_4"), knee: model.getObjectByName("Wolf_l_FrontLeg_KneeSHJnt_3"), phase: 0 },
    { hip: model.getObjectByName("Wolf_r_FrontLeg_HipSHJnt_10"), knee: model.getObjectByName("Wolf_r_FrontLeg_KneeSHJnt_9"), phase: Math.PI },
    { hip: model.getObjectByName("Wolf_l_HindLeg_HipSHJnt_27"), knee: model.getObjectByName("Wolf_l_HindLeg_Knee1SHJnt_26"), phase: Math.PI },
    { hip: model.getObjectByName("Wolf_r_HindLeg_HipSHJnt_33"), knee: model.getObjectByName("Wolf_r_HindLeg_Knee1SHJnt_32"), phase: 0 },
  ];
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ color: 0x071109, opacity: 0.28 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.005;
  floor.receiveShadow = true;
  scene.add(floor);
  const ball = new THREE.Group();
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 24), new THREE.MeshStandardMaterial({ color: 0xb47448, roughness: 0.88 }));
  ballMesh.castShadow = true;
  ball.add(ballMesh);
  const yarnMaterial = new THREE.MeshStandardMaterial({ color: 0xdfb88c, roughness: 1 });
  const yarnGeometry = new THREE.TorusGeometry(0.189, 0.008, 5, 40);
  for (let index = 0; index < 13; index++) {
    const yarn = new THREE.Mesh(yarnGeometry, yarnMaterial);
    yarn.rotation.set(index * 0.32, index * 0.7, index * 0.16);
    ball.add(yarn);
  }
  ball.position.set(-1.65, 0.2, 0.8);
  scene.add(ball);
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0.15);
  heartShape.bezierCurveTo(-0.5, 0.75, -0.95, 0, 0, -0.6);
  heartShape.bezierCurveTo(0.95, 0, 0.5, 0.75, 0, 0.15);
  const hearts = Array.from({ length: 3 }, (_, index) => {
    const heart = new THREE.Mesh(new THREE.ShapeGeometry(heartShape), new THREE.MeshBasicMaterial({ color: 0xc47f70, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    heart.scale.setScalar(0.15 + index * 0.035);
    heart.visible = false;
    scene.add(heart);
    return heart;
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2);
  const groundPoint = new THREE.Vector3();
  const parentQuaternion = new THREE.Quaternion();
  const rotationQuaternion = new THREE.Quaternion();
  const localAxis = new THREE.Vector3();
  const horizontalAxis = new THREE.Vector3(1, 0, 0);
  const verticalAxis = new THREE.Vector3(0, 1, 0);
  const forwardAxis = new THREE.Vector3(0, 0, 1);
  const headWorld = new THREE.Vector3();
  const destination = new THREE.Vector3();
  let paused = initiallyPaused;
  let visible = true;
  let destroyed = false;
  let frame = 0;
  let previousTime = 0;
  let elapsed = 0;
  let action: CatAction | null = null;
  let actionStarted = 0;
  let lookX = 0;
  let lookY = 0;
  let targetLookX = 0;
  let targetLookY = 0;
  let orbit = 0;
  let targetOrbit = 0;
  let walking = 0;
  let gait = 0;
  let yaw = 0.25;
  let pointerInside = false;
  let dragging = false;
  let dragDistance = 0;
  let pointerOrigin = 0;
  let pointerOriginY = 0;
  let orbitOrigin = 0;
  let boundsCache = canvas.getBoundingClientRect();
  const host = canvas.parentElement!;

  function rotateBone(bone: THREE.Object3D | undefined, axis: THREE.Vector3, angle: number) {
    if (!bone?.parent) return;
    bone.parent.getWorldQuaternion(parentQuaternion).invert();
    localAxis.copy(axis).applyQuaternion(parentQuaternion);
    rotationQuaternion.setFromAxisAngle(localAxis, angle);
    bone.quaternion.premultiply(rotationQuaternion);
  }
  function startAction(nextAction: CatAction) {
    if (paused || destroyed) return;
    action = action === "play" && nextAction === "play" ? null : nextAction;
    actionStarted = elapsed;
    canvas.dataset.action = action ?? "idle";
    onAction(action);
  }
  function pose(delta: number) {
    const damping = 1 - Math.exp(-delta * 5);
    const age = elapsed - actionStarted;
    if (action && action !== "play" && age > (action === "walk" ? 8 : action === "stretch" ? 4 : 2.8)) { action = null; canvas.dataset.action = "idle"; onAction(null); }
    lookX += (targetLookX - lookX) * damping;
    lookY += (targetLookY - lookY) * damping;
    orbit += (targetOrbit - orbit) * damping;
    for (const joint of skeleton) { joint.bone.quaternion.copy(joint.quaternion); joint.bone.position.copy(joint.position); }
    mixer.update(delta);
    let speed = 0;
    let targetYaw = 0.25 + lookX * 0.13;
    destination.set(0, 0, 0);
    if (action === "walk") {
      destination.set(Math.sin(age * 0.8) * 0.95, 0, Math.cos(age * 0.8) * 0.3);
      speed = 1;
    } else if (action === "play") {
      if (!pointerInside) {
        ball.position.x = Math.sin(age * 1.7) * 1.65;
        ball.position.z = Math.cos(age * 1.3) * 0.5 + 0.5;
      }
      destination.set(ball.position.x * 0.55, 0, (ball.position.z - 0.5) * 0.25);
      speed = Math.min(1.3, cat.position.distanceTo(destination) * 4);
      ball.rotation.x += delta * 3;
      ball.rotation.z += delta * 2;
    }
    const travelX = destination.x - cat.position.x;
    const travelZ = destination.z - cat.position.z;
    if (!action) speed = Math.min(1, Math.hypot(travelX, travelZ) * 2);
    if (speed > 0.05) targetYaw = Math.atan2(travelX, travelZ + 0.1);
    const yawDifference = Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw));
    yaw += yawDifference * (1 - Math.exp(-delta * 2.5));
    cat.position.x += travelX * (1 - Math.exp(-delta * 1.7));
    cat.position.z += travelZ * (1 - Math.exp(-delta * 1.7));
    cat.rotation.y = yaw;
    walking += (speed - walking) * damping;
    gait += delta * 8 * Math.max(walking, 0.15);
    cat.position.y = Math.abs(Math.sin(gait * 2)) * 0.025 * walking;
    cat.rotation.x = 0;
    cat.updateMatrixWorld(true);
    horizontalAxis.set(1, 0, 0).applyQuaternion(cat.quaternion);
    forwardAxis.set(0, 0, 1).applyQuaternion(cat.quaternion);
    rotateBone(head, verticalAxis, lookX * 0.24);
    rotateBone(neck, horizontalAxis, -lookY * 0.11);
    rotateBone(spine, forwardAxis, Math.sin(elapsed * 1.5) * 0.012);
    rotateBone(tail, forwardAxis, Math.sin(elapsed * 1.9) * 0.1);
    for (const leg of legs) {
      rotateBone(leg.hip, horizontalAxis, Math.sin(gait + leg.phase) * 0.32 * walking);
      rotateBone(leg.knee, horizontalAxis, Math.max(0, Math.cos(gait + leg.phase)) * 0.35 * walking);
    }
    if (action === "pet") {
      const envelope = Math.sin(Math.min(age / 2.8, 1) * Math.PI);
      rotateBone(head, forwardAxis, envelope * 0.2);
      rotateBone(neck, horizontalAxis, -envelope * 0.16);
      rotateBone(jaw, horizontalAxis, Math.sin(age * 8) * envelope * 0.025);
    }
    if (action === "stretch") {
      const envelope = Math.sin(Math.min(age / 4, 1) * Math.PI);
      cat.rotation.x = envelope * 0.13;
      cat.position.y -= envelope * 0.12;
      rotateBone(spine, horizontalAxis, envelope * 0.2);
      rotateBone(neck, horizontalAxis, envelope * 0.25);
      for (let index = 0; index < 2; index++) { rotateBone(legs[index].hip, horizontalAxis, -envelope * 0.35); rotateBone(legs[index].knee, horizontalAxis, envelope * 0.2); }
    }
    if (action === "jump") {
      const phase = Math.min(age / 1.4, 1);
      cat.position.y += Math.sin(phase * Math.PI) * 0.55;
      for (const leg of legs) rotateBone(leg.knee, horizontalAxis, Math.sin(phase * Math.PI) * 0.65);
    }
    head?.getWorldPosition(headWorld);
    for (let index = 0; index < hearts.length; index++) {
      const heart = hearts[index];
      heart.visible = action === "pet" && age > index * 0.25;
      if (heart.visible) {
        const phase = (age - index * 0.25) / 2.8;
        heart.position.set(headWorld.x + (index - 1) * 0.3, headWorld.y + 0.3 + phase * 0.9, headWorld.z);
        heart.quaternion.copy(camera.quaternion);
        heart.material.opacity = Math.max(0, 1 - phase);
      }
    }
    const cameraDistance = 6.2 + Math.abs(Math.sin(orbit + 0.5 - yaw)) * 1.3;
    camera.position.set(Math.sin(orbit + 0.5) * cameraDistance, 2.8, Math.cos(orbit + 0.5) * cameraDistance);
    camera.lookAt(cameraTarget);
  }
  function render(time: number) {
    frame = 0;
    if (destroyed || paused || !visible || document.hidden) return;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.04) : 0;
    previousTime = time;
    elapsed += delta;
    pose(delta);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    if (!destroyed && !paused && visible && !document.hidden) frame = requestAnimationFrame(render);
  }
  function resize() {
    boundsCache = canvas.getBoundingClientRect();
    if (!boundsCache.width || !boundsCache.height || destroyed) return;
    camera.aspect = boundsCache.width / boundsCache.height;
    camera.fov = camera.aspect < 1.15 ? 40 : 34;
    camera.updateProjectionMatrix();
    renderer.setSize(boundsCache.width, boundsCache.height, false);
    renderer.render(scene, camera);
  }
  function updateBounds() { boundsCache = canvas.getBoundingClientRect(); }
  function pointerMove(event: PointerEvent) {
    if (paused) return;
    targetLookX = THREE.MathUtils.clamp((event.clientX - boundsCache.left - boundsCache.width / 2) / (boundsCache.width * 0.65), -1, 1);
    targetLookY = THREE.MathUtils.clamp(-(event.clientY - boundsCache.top - boundsCache.height * 0.4) / boundsCache.height, -1, 1);
    pointerInside = event.clientX >= boundsCache.left && event.clientX <= boundsCache.right && event.clientY >= boundsCache.top && event.clientY <= boundsCache.bottom;
    if (dragging) {
      dragDistance = Math.hypot(event.clientX - pointerOrigin, event.clientY - pointerOriginY);
      if (action !== "play") targetOrbit = orbitOrigin - (event.clientX - pointerOrigin) * 0.009;
    }
    if (action === "play" && pointerInside) {
      pointer.set((event.clientX - boundsCache.left) / boundsCache.width * 2 - 1, -(event.clientY - boundsCache.top) / boundsCache.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(ground, groundPoint)) {
        ball.position.x = THREE.MathUtils.clamp(groundPoint.x, -2, 2);
        ball.position.z = THREE.MathUtils.clamp(groundPoint.z, -0.7, 1.6);
      }
    }
  }
  function pointerDown(event: PointerEvent) {
    if (paused || event.button !== 0) return;
    dragging = true;
    dragDistance = 0;
    pointerOrigin = event.clientX;
    pointerOriginY = event.clientY;
    orbitOrigin = targetOrbit;
    host.setPointerCapture(event.pointerId);
    host.dataset.dragging = "true";
    if (action === "play") pointerMove(event);
  }
  function pointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    host.dataset.dragging = "false";
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
    if (dragDistance < 7 && action !== "play") startAction("pet");
  }
  function pointerCancel() { dragging = false; host.dataset.dragging = "false"; }
  function pointerLeave() { targetLookX = 0; targetLookY = 0; pointerInside = false; }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  intersectionObserver.observe(canvas);
  window.addEventListener("pointermove", pointerMove, { passive: true });
  window.addEventListener("scroll", updateBounds, { passive: true, capture: true });
  document.documentElement.addEventListener("pointerleave", pointerLeave);
  document.addEventListener("visibilitychange", sync);
  host.addEventListener("pointerdown", pointerDown);
  host.addEventListener("pointerup", pointerUp);
  host.addEventListener("pointercancel", pointerCancel);
  pose(0);
  resize();
  sync();
  return {
    act: startAction,
    setPaused(nextPaused) { paused = nextPaused; if (paused) pointerCancel(); sync(); },
    rotate(amount) { if (!paused) targetOrbit += amount; },
    reset() { targetOrbit = 0; action = null; canvas.dataset.action = "idle"; ball.position.set(-1.65, 0.2, 0.8); onAction(null); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("scroll", updateBounds, true);
      document.documentElement.removeEventListener("pointerleave", pointerLeave);
      document.removeEventListener("visibilitychange", sync);
      host.removeEventListener("pointerdown", pointerDown);
      host.removeEventListener("pointerup", pointerUp);
      host.removeEventListener("pointercancel", pointerCancel);
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      disposeModel(scene);
      keyLight.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
