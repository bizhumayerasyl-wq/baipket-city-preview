// NPC кейіпкерлер: ойыншының моделінің (Quaternius «Business Man», CC0) жеке көшірмелері — өз қаңқасы, өз анимациясы, өз түсі.
// GLB бір рет жүктеледі, әр NPC үшін жадтағы буферден қайта оқылады (SkeletonUtils керек емес).
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';

let bufP = null;
const buffer = () => bufP || (bufP = fetch('assets/models/businessman.glb').then(r => { if (!r.ok) throw new Error('GLB ' + r.status); return r.arrayBuffer(); }));

export async function makeCharacter({ suit = 0x2c3e5c, tie = null, shirt = null, height = 2.3 } = {}) {
  const g = await new GLTFLoader().parseAsync(await buffer(), '');
  const m = g.scene; m.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(m, true), s = height / (box.max.y - box.min.y);
  m.scale.setScalar(s); m.position.y = -box.min.y * s;
  m.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; o.castShadow = false; o.material = o.material.clone();
    const n = o.material.name; if (n === 'Suit') o.material.color.setHex(suit); if (tie && n === 'Tie') o.material.color.setHex(tie); if (shirt && n === 'White') o.material.color.setHex(shirt); });
  const root = new THREE.Group(); root.add(m); const mixer = new THREE.AnimationMixer(m), act = {};
  for (const c of g.animations) act[c.name] = mixer.clipAction(c);
  return { root, mixer, act, cur: null };
}
// Анимацияны тегіс ауыстыру
export function play(ch, name, { fade = .3, speed = 1 } = {}) {
  const a = ch.act[name]; if (!a) return; a.timeScale = speed; if (a === ch.cur) return;
  a.reset().fadeIn(fade).play(); if (ch.cur) ch.cur.fadeOut(fade); ch.cur = a;
}
// Толық тазалау: геометрия, материал және қаңқаның сүйек текстурасы (әйтпесе видеожадта қалып қояды)
export function disposeCharacter(ch) { ch.mixer.stopAllAction(); ch.mixer.uncacheRoot(ch.root.children[0]);
  ch.root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); if (o.skeleton) o.skeleton.dispose(); } }); }
