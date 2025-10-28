/*
File: src/dpad.js
*/
// D-Pad logic for touch-friendly nudging.
import * as THREE from 'three';

export default {
  init(bus, State) {
    const dpad = document.getElementById('dpad');
    if (!dpad) return;
    
    const step = document.getElementById('stepSize');
    const stepOut = document.getElementById('stepOut');
    step.addEventListener('input', () => stepOut.textContent = Number(step.value).toFixed(2));

    function nudgeSelected(dx, dy, dz) {
      const ent = State.getEntity(State.getSelected());
      if (!ent) return;
      ent.object.position.x += dx;
      ent.object.position.y += dy;
      ent.object.position.z += dz;
      bus.emit('transform-changed-by-gizmo', { id: ent.id, object: ent.object });
      bus.emit('history-push-debounced', 'Nudge');
    }

    function rotateSelected(ry) {
      const ent = State.getEntity(State.getSelected());
      if (!ent) return;
      ent.object.rotation.y += ry;
      bus.emit('transform-changed-by-gizmo', { id: ent.id, object: ent.object });
      bus.emit('history-push-debounced', 'Nudge');
    }

    let pressTimer = null;
    let act = null;

    function fireAction(a) {
      const s = parseFloat(step.value);
      if (a === 'left') nudgeSelected(-s, 0, 0);
      if (a === 'right') nudgeSelected(+s, 0, 0);
      if (a === 'up') nudgeSelected(0, 0, -s); // Z-
      if (a === 'down') nudgeSelected(0, 0, +s); // Z+
      if (a === 'in') nudgeSelected(0, 0, -s); // Z- (alias)
      if (a === 'out') nudgeSelected(0, 0, +s); // Z+ (alias)
      if (a === 'yup') nudgeSelected(0, +s, 0);
      if (a === 'ydown') nudgeSelected(0, -s, 0);
      if (a === 'rotL') rotateSelected(+THREE.MathUtils.degToRad(s * 10));
      if (a === 'rotR') rotateSelected(-THREE.MathUtils.degToRad(s * 10));
    }

    function startRepeat(a) {
      act = a;
      fireAction(a);
      clearInterval(pressTimer);
      pressTimer = setInterval(() => fireAction(a), 75);
    }
    function stopRepeat() {
      clearInterval(pressTimer);
      pressTimer = null;
      act = null;
    }

    dpad.querySelectorAll('button').forEach(b => {
      const a = b.dataset.act;
      b.addEventListener('mousedown', () => startRepeat(a));
      b.addEventListener('mouseup', stopRepeat);
      b.addEventListener('mouseleave', stopRepeat);
      b.addEventListener('touchstart', (e) => { e.preventDefault(); startRepeat(a); }, { passive: false });
      b.addEventListener('touchend', (e) => { e.preventDefault(); stopRepeat(); }, { passive: false });
    });
  }
};
