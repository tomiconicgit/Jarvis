File: objects/object-manifest.js
--------------------------------------------------------------------------------
// File: objects/object-manifest.js
import * as THREE from 'three';
// --- All complex models removed ---
import Cube from './cube.js';
import Sphere from './sphere.js';
import Cylinder from './cylinder.js';

// --- ADDED DUMMY CLASS ---
// This allows saving/loading of imported/merged objects as empty placeholders.
// The .json format does not save geometry, only procedural parameters.
class ImportedGLB extends THREE.Group {
  constructor() {
    super();
    this.userData.isModel = true;
    this.userData.type = 'ImportedGLB';
  }
}
// --- END DUMMY CLASS ---


// --- Reusable Slider Building Logic ---
// This is kept for the primitives
function createSlider(page, object, key, cfg) {
  const p = object.userData.params;
  const numberInputClasses = "w-20 text-right bg-slate-800 rounded px-2 py-0.5 text-sm";
  const value = (p[key] ?? cfg.min);
  const valueFmt = (cfg.step >= 1) ? Math.round(value) : Number(value).toFixed(2);
  
  const row = document.createElement('div');
  row.className = 'space-y-1';
  row.innerHTML = `
    <label class="text-sm font-medium flex justify-between items-center">
      <span>${cfg.label}</span>
      <input type="number" id="${key}-value" class="${numberInputClasses}" 
             min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${valueFmt}">
    </label>
    <input type="range" id="${key}-slider" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${value}">
  `;
  page.appendChild(row);
}
function createCheckbox(page, object, key, cfg) {
  const p = object.userData.params;
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';
  row.innerHTML = `<input type="checkbox" id="${key}-toggle" ${p[key] ? 'checked':''}><label for="${key}-toggle" class="text-sm font-medium">${cfg.label}</label>`;
  page.appendChild(row);
}
function linkControls(page, object, paramConfig) {
  const updateModelParams = () => {
    let next = { ...object.userData.params };
    
    // Read all values from controls
    page.querySelectorAll('input[type="number"]').forEach(number => {
      const key = number.id.replace('-value', '');
      if (paramConfig[key]) next[key] = parseFloat(number.value);
    });
    page.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      const key = checkbox.id.replace('-toggle', '');
      if (paramConfig[key]) next[key] = checkbox.checked;
    });

    // --- Re-run constraint logic ---
    const type = object.userData.type;
    Object.keys(paramConfig).forEach(key => {
        const slider = page.querySelector(`#${key}-slider`);
        if (!slider) return;

        let maxVal = parseFloat(slider.max);
        // We re-calculate the dynamic 'max' value based on the *next* params
        if (key === 'cornerRadius') {
            // --- MODIFIED --- Constraint for Cube cornerRadius
            if (type === 'Cube') {
              maxVal = Math.min(next.width, next.height, next.depth) / 2;
            }
        }
        
        slider.max = maxVal;
        if (next[key] > maxVal) next[key] = maxVal;
    });
    
    // Update the model
    object.updateParams(next); // This will rebuild the object

    // Refresh UI values
    Object.keys(paramConfig).forEach(key => {
      const cfg = paramConfig[key];
      if (cfg.type === 'checkbox') {
        const check = page.querySelector(`#${key}-toggle`);
        if (check) check.checked = object.userData.params[key];
      } else {
        const slider = page.querySelector(`#${key}-slider`);
        const number = page.querySelector(`#${key}-value`);
        if (slider && number) {
          const val = object.userData.params[key];
          const valFmt = (cfg.step >= 1) ? Math.round(val) : Number(val).toFixed(2);
          slider.value = val;
          number.value = valFmt;
        }
      }
    });
  };

  // Link sliders
  page.querySelectorAll('input[type="range"]').forEach(slider => {
    const key = slider.id.replace('-slider', '');
    const cfg = paramConfig[key];
    const number = page.querySelector(`#${key}-value`);
    
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      const valFmt = (cfg.step >= 1) ? Math.round(val) : val.toFixed(2);
      if (number) number.value = valFmt;
    });
    slider.addEventListener('change', updateModelParams);
  });

  // Link number inputs
  page.querySelectorAll('input[type="number"]').forEach(number => {
    const key = number.id.replace('-value', '');
    const cfg = paramConfig[key];
    const slider = page.querySelector(`#${key}-slider`);

    const updateFromNumber = () => {
      let val = parseFloat(number.value);
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val)); // Clamp
      
      const valFmt = (cfg.step >= 1) ? Math.round(val) : val.toFixed(2);
      number.value = valFmt;
      if (slider) slider.value = val;
      updateModelParams();
    };
    number.addEventListener('change', updateFromNumber);
    number.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); updateFromNumber(); number.blur(); }
    });
  });

  // Link checkboxes
  page.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateModelParams);
  });
}
function buildTabFromConfig(object, page, paramConfig) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-4';
  page.innerHTML = '';
  page.appendChild(wrap);

  Object.keys(paramConfig).forEach(key => {
    const cfg = paramConfig[key];
    if (cfg.type === 'checkbox') {
      createCheckbox(wrap, object, key, cfg);
    } else {
      createSlider(wrap, object, key, cfg);
    }
  });
  
  linkControls(page, object, paramConfig);
}
// --- End Reusable Logic ---

// --- *** OVERHAUL CHANGE *** ---
// Removed all complex models. Only Primitives remain.
export const OBJECT_DEFINITIONS = [
  {
    type: 'Cube',
    label: 'Cube',
    category: 'Primitives', // <-- NEW
    ctor: Cube,
    defaultParams: { width: 1, height: 1, depth: 1, cornerRadius: 0.05, cornerSmoothness: 4 }, // Use renamed params
    initialY: (p) => 0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        width:  { min: 0.1, max: 200, step: 0.1, label: 'Width' },
        height: { min: 0.1, max: 200, step: 0.1, label: 'Height' },
        depth:  { min: 0.1, max: 200, step: 0.1, label: 'Depth' },
        // --- RENAMED SLIDERS ---
        cornerRadius: { min: 0, max: Math.min(p.width, p.height, p.depth) / 2, step: 0.01, label: 'Corner/Edge Radius' },
        cornerSmoothness: { min: 1, max: 20, step: 1, label: 'Corner/Edge Smoothness' },
        // --- END RENAMED ---
        colorR: { min: 0, max: 1, step: 0.01, label: 'Color R' },
        colorG: { min: 0, max: 1, step: 0.01, label: 'Color G' },
        colorB: { min: 0, max: 1, step: 0.01, label: 'Color B' },
        // --- NEW SLIDERS ---
        bendAngle:   { min: -180, max: 180, step: 1, label: 'Bend Angle °' },
        bendStartY:  { min: 0.0, max: 1.0, step: 0.01, label: 'Bend Start %' },
        flareAmount: { min: -10, max: 10, step: 0.05, label: 'Flare Amount' },
        flareStartY: { min: 0.0, max: 1.0, step: 0.01, label: 'Flare Start %' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Sphere',
    label: 'Sphere',
    category: 'Primitives', // <-- NEW
    ctor: Sphere,
    defaultParams: { radius: 1, segments: 32, phiStart: 0, phiLength: 360, thetaStart: 0, thetaLength: 180 },
    initialY: (p) => 0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        radius: { min: 0.1, max: 50, step: 0.1, label: 'Radius' },
        segments: { min: 4, max: 64, step: 1, label: 'Segments' },
        phiStart: { min: 0, max: 360, step: 1, label: 'Horiz. Start °' },
        phiLength: { min: 0, max: 360, step: 1, label: 'Horiz. Length °' },
        thetaStart: { min: 0, max: 180, step: 1, label: 'Vert. Start °' },
        thetaLength: { min: 0, max: 180, step: 1, label: 'Vert. Length °' },
        colorR: { min: 0, max: 1, step: 0.01, label: 'Color R' },
        colorG: { min: 0, max: 1, step: 0.01, label: 'Color G' },
        colorB: { min: 0, max: 1, step: 0.01, label: 'Color B' },
        // --- NEW SLIDERS ---
        bendAngle:   { min: -180, max: 180, step: 1, label: 'Bend Angle °' },
        bendStartY:  { min: 0.0, max: 1.0, step: 0.01, label: 'Bend Start %' },
        flareAmount: { min: -10, max: 10, step: 0.05, label: 'Flare Amount' },
        flareStartY: { min: 0.0, max: 1.0, step: 0.01, label: 'Flare Start %' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Cylinder',
    label: 'Cylinder',
    category: 'Primitives', // <-- NEW
    ctor: Cylinder,
    defaultParams: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 16, openEnded: false, thetaStart: 0, thetaLength: 360 },
    initialY: (p) => 0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        radiusTop: { min: 0, max: 50, step: 0.1, label: 'Radius Top' },
        radiusBottom: { min: 0, max: 50, step: 0.1, label: 'Radius Bottom' },
        height: { min: 0.1, max: 50, step: 0.1, label: 'Height' },
        radialSegments: { min: 3, max: 64, step: 1, label: 'Radial Segments' },
        thetaStart: { min: 0, max: 360, step: 1, label: 'Start Angle °' },
        thetaLength: { min: 0, max: 360, step: 1, label: 'Arc Length °' },
        openEnded: { type: 'checkbox', label: 'Open Ended' },
        colorR: { min: 0, max: 1, step: 0.01, label: 'Color R' },
        colorG: { min: 0, max: 1, step: 0.01, label: 'Color G' },
        colorB: { min: 0, max: 1, step: 0.01, label: 'Color B' },
        // --- NEW SLIDERS ---
        bendAngle:   { min: -180, max: 180, step: 1, label: 'Bend Angle °' },
        bendStartY:  { min: 0.0, max: 1.0, step: 0.01, label: 'Bend Start %' },
        flareAmount: { min: -10, max: 10, step: 0.05, label: 'Flare Amount' },
        flareStartY: { min: 0.0, max: 1.0, step: 0.01, label: 'Flare Start %' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
];
// --- *** END OVERHAUL CHANGE *** ---


export const BUILDERS = OBJECT_DEFINITIONS.reduce((map, def) => {
  if (!map[def.type]) {
    map[def.type] = def.ctor;
  }
  return map;
}, {
  // --- MODIFIED ---
  // Manually add the dummy loader for imported/merged objects
  'ImportedGLB': ImportedGLB
});
