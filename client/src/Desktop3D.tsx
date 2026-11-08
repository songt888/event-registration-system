import { useEffect, useRef } from 'react';

// Decorative 3D desktop behind every window: chrome CDs, floppy disks and translucent folders floating in the sky.
// Demo only: three.js is loaded at run time from a CDN, so no npm dependency is added; adopting it needs a recorded decision.
// The canvas is aria-hidden and holds no information; with reduced motion it draws one still frame; without WebGL it stays empty.
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/+esm';
const ROOM_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/environments/RoomEnvironment.js/+esm';

// Quality tier: only draw the 3D layer on a real GPU. Software renderers (SwiftShader, llvmpipe) would make the
// whole page slow, so they keep the CSS sky only.
function hasFastWebGL() {
  try {
    const gl = (document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    return !/swiftshader|llvmpipe|software/i.test(name);
  } catch {
    return false;
  }
}

export function Desktop3D() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !hasFastWebGL()) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [THREE, { RoomEnvironment }]: any[] = await Promise.all([import(/* @vite-ignore */ THREE_URL), import(/* @vite-ignore */ ROOM_URL)]);
      if (disposed) return;

      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      const coarse = matchMedia('(pointer: coarse)').matches;
      const lite = coarse || Math.min(innerWidth, innerHeight) < 600;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !lite });
      renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.25 : 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 16);
      scene.add(new THREE.HemisphereLight(0xdff6ff, 0x1d5fb8, 1.2));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6);
      sun.position.set(4, 8, 6);
      scene.add(sun);

      const geos: { dispose(): void }[] = [];
      const mats: { dispose(): void }[] = [];
      const track = <T extends { dispose(): void }>(x: T, list: { dispose(): void }[]) => (list.push(x), x);

      // chrome CD with an iridescent face
      const cdGeo = track(new THREE.CylinderGeometry(1.2, 1.2, 0.06, 64, 1, false), geos);
      const face = document.createElement('canvas');
      face.width = face.height = 256;
      const fc = face.getContext('2d')!;
      const cg = fc.createConicGradient(0, 128, 128);
      ['#c9f3ff', '#ffc7f0', '#fff4b8', '#c6ffd9', '#b9d4ff', '#ffc7f0', '#c9f3ff'].forEach((c, i, a) => cg.addColorStop(i / (a.length - 1), c));
      fc.fillStyle = cg;
      fc.fillRect(0, 0, 256, 256);
      const faceTex = new THREE.CanvasTexture(face);
      faceTex.colorSpace = THREE.SRGBColorSpace;
      const cdMat = track(new THREE.MeshPhysicalMaterial({ map: faceTex, metalness: 0.35, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.6, iridescenceIOR: 1.5 }), mats);
      mats.push(faceTex);
      const holeGeo = track(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 32), geos);
      const holeMat = track(new THREE.MeshPhysicalMaterial({ color: 0x9fd9ff, transmission: 1, roughness: 0.1, thickness: 0.2 }), mats);
      // floppy disk: plastic body, metal shutter, paper label
      const floppyGeo = track(new THREE.BoxGeometry(1.6, 1.6, 0.12), geos);
      const shutterGeo = track(new THREE.BoxGeometry(0.75, 0.5, 0.14), geos);
      const labelGeo = track(new THREE.BoxGeometry(1.15, 0.7, 0.13), geos);
      const floppyMats = [0xff6fd8, 0x38c8ff, 0xc6ff4d].map((c) => track(new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 }), mats));
      const shutterMat = track(new THREE.MeshStandardMaterial({ color: 0xc8d3dc, metalness: 1, roughness: 0.25 }), mats);
      const labelMat = track(new THREE.MeshStandardMaterial({ color: 0xf8fbff, roughness: 0.9 }), mats);
      // translucent folder: two slabs, a tab on the back one
      const slabGeo = track(new THREE.BoxGeometry(2.0, 1.45, 0.08), geos);
      const tabGeo = track(new THREE.BoxGeometry(0.8, 0.28, 0.08), geos);
      const folderMat = track(new THREE.MeshPhysicalMaterial({ color: 0x7fe0ff, transmission: 0.85, roughness: 0.15, thickness: 0.6, ior: 1.45, clearcoat: 1 }), mats);

      type Item = { obj: InstanceType<typeof THREE.Group>; base: InstanceType<typeof THREE.Vector3>; phase: number; spin: number; boost: number; cd: boolean };
      const items: Item[] = [];
      const add = (obj: Item['obj'], x: number, y: number, z: number, cd = false) => {
        obj.position.set(x, y, z);
        obj.rotation.set(Math.random() * 0.8 - 0.4, Math.random() * 0.8 - 0.4, Math.random() * 0.6 - 0.3);
        scene.add(obj);
        items.push({ obj, base: obj.position.clone(), phase: Math.random() * Math.PI * 2, spin: cd ? 0.25 : 0.08, boost: 0, cd });
      };
      const makeCD = () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(cdGeo, cdMat), new THREE.Mesh(holeGeo, holeMat));
        g.rotation.x = Math.PI / 2;
        const wrap = new THREE.Group();
        wrap.add(g);
        return wrap;
      };
      const makeFloppy = (i: number) => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(floppyGeo, floppyMats[i % 3]);
        const shutter = new THREE.Mesh(shutterGeo, shutterMat);
        shutter.position.set(0.1, 0.52, 0.01);
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(0, -0.3, 0.005);
        g.add(body, shutter, label);
        return g;
      };
      const makeFolder = () => {
        const g = new THREE.Group();
        const back = new THREE.Mesh(slabGeo, folderMat);
        const tab = new THREE.Mesh(tabGeo, folderMat);
        tab.position.set(-0.5, 0.85, 0);
        const front = new THREE.Mesh(slabGeo, folderMat);
        front.position.set(0, -0.08, 0.16);
        front.rotation.x = -0.18;
        g.add(back, tab, front);
        return g;
      };

      // composition: objects live at the edges so the windows in the middle stay readable
      add(makeCD(), -7.2, 3.2, -2, true);
      add(makeCD(), 7.6, -2.6, -1, true);
      add(makeCD(), 4.2, 4.6, -6, true);
      add(makeFloppy(0), -6.4, -3.4, -1.5);
      add(makeFloppy(1), 8.2, 3.0, -3);
      if (!lite) add(makeFloppy(2), -2.6, 5.4, -7);
      add(makeFolder(), -8.6, 0.2, -4);
      if (!lite) add(makeFolder(), 6.2, 0.6, -8);

      const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
      const ndc = new THREE.Vector2(2, 2);
      const raycaster = new THREE.Raycaster();
      const onMove = (e: PointerEvent) => {
        pointer.x = (e.clientX / innerWidth) * 2 - 1;
        pointer.y = (e.clientY / innerHeight) * 2 - 1;
        ndc.set(pointer.x, -pointer.y);
      };
      addEventListener('pointermove', onMove);

      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.z = w < 700 ? 22 : 16; // phones see the objects smaller, around the window
        camera.updateProjectionMatrix();
        draw(0);
      };

      const clock = new THREE.Clock();
      let raf = 0;
      function draw(dt: number) {
        const t = clock.elapsedTime;
        const still = reduced.matches;
        if (!still) {
          // hover: a CD under the cursor spins up, like a drive reading it
          raycaster.setFromCamera(ndc, camera);
          const hit = raycaster.intersectObjects(items.filter((i) => i.cd).map((i) => i.obj), true)[0];
          for (const it of items) {
            const over = !!hit && it.cd && it.obj.getObjectById(hit.object.id);
            it.boost += ((over ? 1 : 0) - it.boost) * Math.min(1, dt * 4);
            it.obj.position.y = it.base.y + Math.sin(t * 0.6 + it.phase) * 0.25;
            it.obj.position.x = it.base.x + Math.cos(t * 0.4 + it.phase) * 0.12;
            it.obj.rotation.y += dt * (it.spin + it.boost * 6);
            it.obj.rotation.z += dt * 0.03;
          }
          pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.5);
          pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.5);
          camera.position.x = pointer.sx * 0.9;
          camera.position.y = -pointer.sy * 0.6;
          camera.lookAt(0, 0, -3);
        }
        renderer.render(scene, camera);
      }
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        draw(Math.min(clock.getDelta(), 0.05));
      };
      const start = () => {
        cancelAnimationFrame(raf);
        if (reduced.matches) draw(0);
        else loop();
      };
      reduced.addEventListener('change', start);
      addEventListener('resize', resize);
      canvas.addEventListener('webglcontextlost', () => cancelAnimationFrame(raf));
      resize();
      start();

      cleanup = () => {
        cancelAnimationFrame(raf);
        removeEventListener('pointermove', onMove);
        removeEventListener('resize', resize);
        reduced.removeEventListener('change', start);
        geos.forEach((g) => g.dispose());
        mats.forEach((m) => m.dispose());
        envTex.dispose();
        pmrem.dispose();
        renderer.dispose();
      };
    })().catch(() => {
      /* CDN or WebGL failure: the CSS sky stays, nothing is lost */
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <canvas ref={ref} className="desktop3d" aria-hidden="true" />;
}
