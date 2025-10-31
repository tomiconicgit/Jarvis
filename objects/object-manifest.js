// File: objects/object-manifest.js
import * as THREE from 'three'; // IMPORT THREE
import TowerBase from './towerbase.js';
import TowerBaseSculpted from './tower_sculpted.js'; // <-- IMPORT YOUR NEW CLASS
import DoubleDoor from './doubledoor.js';
import WindowAsset from './window.js';
import Floor from './floor.js';
import Pipe from './pipe.js';
import Roof from './roof.js';
import TrussArm from './trussarm.js';
import Cube from './cube.js';
import Sphere from './sphere.js';
import Cylinder from './cylinder.js';
// --- NEW IMPORTS ---
import FloodLight from './floodlight.js';
import RoofLight from './rooflight.js';
import FuelTank from './fueltank.js';
import Gear from './gear.js';
import Screen from './screen.js';

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
// (These are the helper functions you already had, unmodified)
function createSlider(page, object, key, cfg) {
  const p = object.userData.params;
  const numberInputClasses = "w-20 text-right bg-gray-800 rounded px-2 py-0.5 text-sm";
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
    // This logic relies on the 'max' value of the slider being set correctly
    // by the buildShapeTab function, so it's now more generic.
    const type = object.userData.type;
    Object.keys(paramConfig).forEach(key => {
        const slider = page.querySelector(`#${key}-slider`);
        if (!slider) return;

        let maxVal = parseFloat(slider.max);
        // We re-calculate the dynamic 'max' value based on the *next* params
        if (key === 'cornerRadius') {
            if (type === 'TowerBase') maxVal = TowerBase.getMaxCornerRadius(next);
            else if (type === 'TowerBaseSculpted') maxVal = TowerBaseSculpted.getMaxCornerRadius(next);
            else if (type === 'DoubleDoor') maxVal = DoubleDoor.getMaxCornerRadius(next);
            else if (type === 'Window') maxVal = WindowAsset.getMaxCornerRadius(next);
            else if (type === 'Floor') maxVal = Floor.getMaxCornerRadius(next);
            else if (type === 'Roof') maxVal = Roof.getMaxCornerRadius(next);
        } else if (key === 'edgeRoundness') {
             if (type === 'TowerBase') maxVal = TowerBase.getMaxEdgeRoundness(next);
            else if (type === 'TowerBaseSculpted') maxVal = TowerBaseSculpted.getMaxEdgeRoundness(next);
            else if (type === 'DoubleDoor') maxVal = DoubleDoor.getMaxEdgeRoundness(next);
            else if (type === 'Window') maxVal = WindowAsset.getMaxEdgeRoundness(next);
            else if (type === 'Floor') maxVal = Floor.getMaxEdgeRoundness(next);
            else if (type === 'Roof') maxVal = Roof.getMaxEdgeRoundness(next);
        } else if (key === 'doorWidth' && type === 'TowerBase') {
            maxVal = TowerBase.getMaxDoorWidth(next);
        } else if (key === 'doorWidthFront' && type === 'TowerBaseSculpted') {
            maxVal = TowerBaseSculpted.getMaxDoorWidth(next);
        } else if (key === 'doorWidthSide' && type === 'TowerBaseSculpted') {
            maxVal = TowerBaseSculpted.getMaxSideDoorWidth(next);
        } else if (key === 'wallThickness' && type === 'Pipe') {
            maxVal = Pipe.getMaxWall(next);
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

export const OBJECT_DEFINITIONS = [
  {
    type: 'TowerBase',
    label: 'Tower (Door)',
    ctor: TowerBase,
    defaultParams: { width: 12, depth: 12, height: 6, wallThickness: 1, cornerRadius: 1.2, edgeRoundness: 0.3, doorWidth: 4 },
    initialY: (p) => p.height / 2,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        height:           { min: 1,   max: 80, step: 0.1, label: 'Height' },
        width:            { min: 4,   max: 80, step: 0.1, label: 'Width' },
        depth:            { min: 4,   max: 80, step: 0.1, label: 'Depth' },
        wallThickness:    { min: 0.1, max: 5,  step: 0.05, label: 'Wall Thickness' },
        cornerRadius:     { min: 0,   max: TowerBase.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
        cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
        edgeRoundness:    { min: 0,   max: TowerBase.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
        edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
        doorWidth:        { min: 0,   max: TowerBase.getMaxDoorWidth(p), step: 0.1, label: 'Door Width' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'TowerBase',
    label: 'Tower (Solid)',
    ctor: TowerBase,
    defaultParams: { width: 10, depth: 10, height: 8, wallThickness: 1, cornerRadius: 1.0, edgeRoundness: 0.2, doorWidth: 0 },
    initialY: (p) => p.height / 2,
    buildShapeTab: (object, page) => {
      const doorTowerDef = OBJECT_DEFINITIONS.find(d => d.label === 'Tower (Door)');
      if (doorTowerDef) {
        doorTowerDef.buildShapeTab(object, page);
      }
    }
  },
  // --- ADD YOUR NEW OBJECT DEFINITION HERE ---
  {
    type: 'TowerBaseSculpted',
    label: 'Tower (Sculpted)',
    ctor: TowerBaseSculpted,
    defaultParams: {
        // Wall
        width: 12,
        depth: 12,
        height: 8,
        wallThickness: 1,
        cornerRadius: 1.2,
        cornerSmoothness: 16,
        edgeRoundness: 0.3,
        edgeSmoothness: 4,
        doorWidthFront: 4,
        doorWidthSide: 3,
        // Plinth
        plinthHeight: 0.8,
        plinthOutset: 0.5,
        plinthRoundness: 0.1,
        plinthEdgeSmoothness: 2,
        // Cornice
        corniceHeight: 0.6,
        corniceOutset: 0.4,
        corniceRoundness: 0.1,
        corniceEdgeSmoothness: 2,
        // Buttresses
        buttressCountFront: 2,
        buttressWidth: 0.6,
        buttressDepth: 0.4,
        buttressRoundness: 0.1,
        buttressEdgeSmoothness: 2,
        sideColumnPos: 0.5,
        sideColumnCurveHeight: 2.0,
        sideColumnCurveAmount: 0.5,
    },
    initialY: (p) => (p.height / 2) + p.plinthHeight, // Places bottom of plinth at y=plinthHeight/2 (so plinth bottom is at 0)
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        // Wall
        height:           { min: 1,   max: 80, step: 0.1, label: 'Wall Height' },
        width:            { min: 4,   max: 80, step: 0.1, label: 'Wall Width' },
        depth:            { min: 4,   max: 80, step: 0.1, label: 'Wall Depth' },
        wallThickness:    { min: 0.1, max: 5,  step: 0.05, label: 'Wall Thickness' },
        cornerRadius:     { min: 0,   max: TowerBaseSculpted.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
        cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
        edgeRoundness:    { min: 0,   max: TowerBaseSculpted.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
        edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
        doorWidthFront:   { min: 0,   max: TowerBaseSculpted.getMaxDoorWidth(p), step: 0.1, label: 'Front Door Width' },
        doorWidthSide:    { min: 0,   max: TowerBaseSculpted.getMaxSideDoorWidth(p), step: 0.1, label: 'Side Door Width' },
        // Plinth
        plinthHeight:     { min: 0.1, max: 5,  step: 0.05, label: 'Plinth Height' },
        plinthOutset:     { min: 0,   max: 5,  step: 0.05, label: 'Plinth Outset' },
        plinthRoundness:  { min: 0,   max: 2,  step: 0.01, label: 'Plinth Roundness' },
        // Cornice
        corniceHeight:    { min: 0.1, max: 5,  step: 0.05, label: 'Cornice Height' },
        corniceOutset:    { min: 0,   max: 5,  step: 0.05, label: 'Cornice Outset' },
        corniceRoundness: { min: 0,   max: 2,  step: 0.01, label: 'Cornice Roundness' },
        // Buttresses
        buttressCountFront: { min: 0, max: 10, step: 1,    label: 'Front Columns' },
        buttressWidth:    { min: 0.1, max: 3,  step: 0.05, label: 'Column Width' },
        buttressDepth:    { min: 0.1, max: 3,  step: 0.05, label: 'Column Depth' },
        buttressRoundness:{ min: 0,   max: 1,  step: 0.01, label: 'Column Roundness' },
        sideColumnPos:    { min: 0,   max: 1,  step: 0.01, label: 'Side Column Pos' },
        sideColumnCurveHeight: { min: 0, max: 10, step: 0.1, label: 'Col Curve Height' },
        sideColumnCurveAmount: { min: 0, max: 2,  step: 0.05, label: 'Col Curve Amount' },
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  // --- End of new definition ---
  {
    type: 'DoubleDoor',
    label: 'Double Door',
    ctor: DoubleDoor,
    defaultParams: { totalWidth: 8, height: 10, depth: 0.5, frameThickness: 0.5, cornerRadius: 0.2, glassOpacity:0.5, glassRoughness:0.2 },
    initialY: (p) => p.height / 2,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        height:           { min: 1,   max: 60, step: 0.1, label: 'Height' },
        totalWidth:       { min: 4,   max: 80, step: 0.1, label: 'Total Width' },
        depth:            { min: 0.05,max: 5,  step: 0.05, label: 'Depth' },
        frameThickness:   { min: 0.05,max: 2,  step: 0.05, label: 'Frame Thickness' },
        cornerRadius:     { min: 0,   max: DoubleDoor.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
        cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
        edgeRoundness:    { min: 0,   max: DoubleDoor.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
        edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
        glassR:           { min: 0,   max: 1,  step: 0.01, label: 'Glass R' },
        glassG:           { min: 0,   max: 1,  step: 0.01, label: 'Glass G' },
        glassB:           { min: 0,   max: 1,  step: 0.01, label: 'Glass B' },
        glassOpacity:     { min: 0,   max: 1,  step: 0.01, label: 'Glass Opacity' },
        glassRoughness:   { min: 0,   max: 1,  step: 0.01, label: 'Glass Roughness' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Window',
    label: 'Window',
    ctor: WindowAsset,
    defaultParams: { totalWidth: 6, height: 8, depth: 0.3, frameThickness: 0.4, cornerRadius: 0.1, glassOpacity:0.3, glassRoughness:0.1 },
    initialY: (p) => p.height / 2,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        height:           { min: 1,   max: 60, step: 0.1, label: 'Height' },
        totalWidth:       { min: 2,   max: 80, step: 0.1, label: 'Total Width' },
        depth:            { min: 0.02,max: 3,  step: 0.02, label: 'Depth' },
        frameThickness:   { min: 0.05,max: 2,  step: 0.05, label: 'Frame Thickness' },
        cornerRadius:     { min: 0,   max: WindowAsset.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
        cornerSmoothness: { min: 8,   max: 64, step: 1,   label: 'Corner Smoothness' },
        edgeRoundness:    { min: 0,   max: WindowAsset.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
        edgeSmoothness:   { min: 1,   max: 12, step: 1,   label: 'Edge Smoothness' },
        hasBolts:         { type: 'checkbox', label: 'Bolts' },
        hasBars:          { type: 'checkbox', label: 'Bars' },
        glassR:           { min: 0,   max: 1,  step: 0.01, label: 'Glass R' },
        glassG:           { min: 0,   max: 1,  step: 0.01, label: 'Glass G' },
        glassB:           { min: 0,   max: 1,  step: 0.01, label: 'Glass B' },
        glassOpacity:     { min: 0,   max: 1,  step: 0.01, label: 'Glass Opacity' },
        glassRoughness:   { min: 0,   max: 1,  step: 0.01, label: 'Glass Roughness' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Floor',
    label: 'Floor',
    ctor: Floor,
    defaultParams: { width: 20, depth: 20, thickness: 0.5, colorR: 0.5, colorG: 0.5, colorB: 0.5 },
    initialY: (p) => -p.thickness / 2,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        width:            { min: 4,   max: 200, step: 0.1, label: 'Width' },
        depth:            { min: 4,   max: 200, step: 0.1, label: 'Depth' },
        thickness:        { min: 0.1, max: 5,   step: 0.05, label: 'Thickness' },
        colorR:           { min: 0,   max: 1,   step: 0.01, label: 'Color R' },
        colorG:           { min: 0,   max: 1,   step: 0.01, label: 'Color G' },
        colorB:           { min: 0,   max: 1,   step: 0.01, label: 'Color B' },
        cornerRadius:     { min: 0,   max: Floor.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
        edgeRoundness:    { min: 0,   max: Floor.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
        edgeSmoothness:   { min: 1,   max: 12,  step: 1,    label: 'Edge Smoothness' },
        bulgeHeight:      { min: 0,   max: 2,   step: 0.01, label: 'Roof Bulge Height' },
        bulgeExponent:    { min: 0.5, max: 6,   step: 0.1,  label: 'Bulge Exponent' },
        hasSkylight:      { type: 'checkbox', label: 'Skylight Hole' },
        skylightW:        { min: 0.2, max: Math.max(0.2, p.width - 0.6),  step: 0.05, label: 'Skylight W' },
        skylightH:        { min: 0.2, max: Math.max(0.2, p.depth - 0.6),  step: 0.05, label: 'Skylight H' },
        skylightX:        { min: -p.width/2,  max: p.width/2,  step: 0.05, label: 'Skylight X' },
        skylightZ:        { min: -p.depth/2,  max: p.depth/2,  step: 0.05, label: 'Skylight Z' },
        skylightRadius:   { min: 0,   max: Math.min(p.skylightW||6, p.skylightH||6)/2, step: 0.05, label: 'Skylight Corner' },
        hasSkylightGlass: { type: 'checkbox', label: 'Skylight Glass' },
        glassOpacity:     { min: 0,   max: 1,   step: 0.01, label: 'Glass Opacity' },
        glassRoughness:   { min: 0,   max: 1,   step: 0.01, label: 'Glass Roughness' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Pipe',
    label: 'Pipe',
    ctor: Pipe,
    defaultParams: {}, // Uses built-in defaults
    initialY: (p) => 1.0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        length:          { min: 0.5, max: 80,   step: 0.1,  label: 'Length' },
        outerRadius:     { min: 0.02, max: 10,  step: 0.01, label: 'Outer Radius' },
        wallThickness:   { min: 0.002, max: Pipe.getMaxWall(p), step: 0.01, label: 'Wall Thickness' },
        radialSegments:  { min: 8,    max: 64,  step: 1,    label: 'Radial Segments' },
        hasElbow:        { type: 'checkbox', label: 'Has Elbow' },
        shoulderDeg:     { min: 0,    max: 180, step: 1,    label: 'Elbow Angle Â°' },
        elbowRadius:     { min: 0.2,  max: 20,  step: 0.05, label: 'Elbow Bend Radius' },
        elbowSegments:   { min: 8,    max: 64,  step: 1,    label: 'Elbow Segments' },
        elbowPlaneDeg:   { min: -180, max: 180, step: 1,    label: 'Elbow Plane Â°' },
        hasFlangeStart:  { type: 'checkbox', label: 'Flange at Start' },
        hasFlangeEnd:    { type: 'checkbox', label: 'Flange at End' },
        flangeRadius:    { min: 0.1, max: 20,  step: 0.05, label: 'Flange Radius' },
        flangeThickness: { min: 0.02,max: 2,   step: 0.01, label: 'Flange Thickness' },
        hasBolts:        { type: 'checkbox', label: 'Bolts on Flanges' },
        boltCount:       { min: 2,    max: 36,  step: 1,    label: 'Bolt Count' },
        boltRadius:      { min: 0.01, max: 0.5, step: 0.01, label: 'Bolt Radius' },
        boltHeight:      { min: 0.04, max: 1.5, step: 0.01, label: 'Bolt Height' },
        boltRingInset:   { min: 0.02, max: 2.0, step: 0.01, label: 'Bolt Ring Inset' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Roof',
    label: 'Roof',
    ctor: Roof,
    defaultParams: {}, // Uses built-in defaults
    initialY: (p) => 0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        width:            { min: 4,  max: 200, step: 0.1, label: 'Width' },
        depth:            { min: 4,  max: 200, step: 0.1, label: 'Depth' },
        overhang:         { min: 0,  max: 5,   step: 0.05, label: 'Overhang' },
        thickness:        { min: 0.1,max: 5,   step: 0.05, label: 'Thickness' },
        cornerRadius:     { min: 0,  max: Roof.getMaxCornerRadius(p), step: 0.05, label: 'Corner Radius' },
        cornerSmoothness: { min: 8,  max: 64,  step: 1,    label: 'Corner Smoothness' },
        edgeRoundness:    { min: 0,  max: Roof.getMaxEdgeRoundness(p), step: 0.05, label: 'Edge Roundness' },
        edgeSmoothness:   { min: 1,  max: 12,  step: 1,    label: 'Edge Smoothness' },
        archHeight:       { min: 0,  max: 5,   step: 0.05, label: 'Arch Height' },
        archX:            { type:'checkbox', label: 'Curve X' },
        archZ:            { type:'checkbox', label: 'Curve Z' },
        hasSkylight:      { type:'checkbox', label: 'Skylight' },
        skylightWidth:    { min: 0.2, max: Math.max(0.2, (p.width||12)+(p.overhang||0)*2 - 0.6), step: 0.05, label: 'Skylight W' },
        skylightDepth:    { min: 0.2, max: Math.max(0.2, (p.depth||12)+(p.overhang||0)*2 - 0.6), step: 0.05, label: 'Skylight D' },
        skylightCornerRadius:{ min: 0, max: 10, step: 0.05, label: 'Skylight Corner' },
        glassOpacity:     { min: 0,  max: 1,   step: 0.01, label: 'Glass Opacity' },
        glassRoughness:   { min: 0,  max: 1,   step: 0.01, label: 'Glass Roughness' },
        hasRails:         { type:'checkbox', label: 'Rails' },
        railHeight:       { min: 0.2,max: 4,   step: 0.05, label: 'Rail Height' },
        railSpacing:      { min: 0.5,max: 5,   step: 0.1,  label: 'Rail Spacing' },
        hasVent:          { type:'checkbox', label: 'Vent' },
        hasAntenna:       { type:'checkbox', label: 'Antenna' },
        colorR:           { min: 0,  max: 1,   step: 0.01, label: 'Color R' },
        colorG:           { min: 0,  max: 1,   step: 0.01, label: 'Color G' },
        colorB:           { min: 0,  max: 1,   step: 0.01, label: 'Color B' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'TrussArm',
    label: 'Truss Arm',
    ctor: TrussArm,
    defaultParams: {}, // Uses built-in defaults
    initialY: (p) => 0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        length:        { min: 1, max: 100, step: 0.1, label: 'Length' },
        armWidth:      { min: 0.2, max: 10, step: 0.05, label: 'Arm Width' },
        armHeight:     { min: 0.2, max: 10, step: 0.05, label: 'Arm Height' },
        tubeRadius:    { min: 0.02, max: 1, step: 0.01, label: 'Tube Radius' },
        roundSegments: { min: 6, max: 64, step: 1, label: 'Round Segments' },
        segments:      { min: 1, max: 64, step: 1, label: 'Lattice Segments' },
        curve:         { min: 0, max: 10, step: 0.05, label: 'Midspan Rise' },
        hasEndJoint:   { type:'checkbox', label: 'End Joint' },
        jointRadius:   { min: 0, max: 2, step: 0.05, label: 'Joint Radius' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  // --- START NEW OBJECTS ---
  {
    type: 'FloodLight',
    label: 'Flood Light',
    ctor: FloodLight,
    defaultParams: {},
    initialY: (p) => (p.baseSize || 0.3) * 0.1,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        baseSize:   { min: 0.1, max: 2, step: 0.05, label: 'Base Size' },
        stalkHeight: { min: 0.1, max: 2, step: 0.05, label: 'Stalk Height' },
        yokeWidth: { min: 0.2, max: 3, step: 0.05, label: 'Yoke Width' },
        lightHousingSize: { min: 0.2, max: 3, step: 0.05, label: 'Housing Size' },
        lightHousingDepth: { min: 0.2, max: 3, step: 0.05, label: 'Housing Depth' },
        lensRadius: { min: 0.05, max: 1.5, step: 0.01, label: 'Lens Radius' },
        color: { min: 0, max: 16777215, step: 1, label: 'Housing Color' }, // Simplified
        lensColor: { min: 0, max: 16777215, step: 1, label: 'Lens Color' } // Simplified
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'RoofLight',
    label: 'Roof Light',
    ctor: RoofLight,
    defaultParams: {},
    initialY: (p) => (p.height || 0.15) * 0.5,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        radius: { min: 0.05, max: 1, step: 0.01, label: 'Radius' },
        height: { min: 0.05, max: 1, step: 0.01, label: 'Total Height' },
        lensHeight: { min: 0.02, max: 0.9, step: 0.01, label: 'Lens Height' },
        color: { min: 0, max: 16777215, step: 1, label: 'Base Color' },
        lensColor: { min: 0, max: 16777215, step: 1, label: 'Lens Color' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'FuelTank',
    label: 'Fuel Tank',
    ctor: FuelTank,
    defaultParams: {},
    initialY: (p) => (p.height || 10) * 0.5,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        radius: { min: 1, max: 20, step: 0.1, label: 'Radius' },
        height: { min: 2, max: 50, step: 0.1, label: 'Total Height' },
        domeHeight: { min: 0.1, max: 10, step: 0.1, label: 'Dome Height' },
        segments: { min: 8, max: 64, step: 1, label: 'Segments' },
        color: { min: 0, max: 16777215, step: 1, label: 'Color' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Gear',
    label: 'Gear',
    ctor: Gear,
    defaultParams: {},
    initialY: (p) => 0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        radius: { min: 0.2, max: 10, step: 0.1, label: 'Outer Radius' },
        height: { min: 0.1, max: 5, step: 0.05, label: 'Height' },
        teeth: { min: 3, max: 60, step: 1, label: 'Teeth' },
        toothHeight: { min: 0.05, max: 5, step: 0.05, label: 'Tooth Height' },
        toothThickness: { min: 0.1, max: 0.9, step: 0.01, label: 'Tooth Width %' },
        color: { min: 0, max: 16777215, step: 1, label: 'Color' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Screen',
    label: 'Screen',
    ctor: Screen,
    defaultParams: {},
    initialY: (p) => (p.height || 1.2) * 0.5,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        width: { min: 0.2, max: 10, step: 0.1, label: 'Width' },
        height: { min: 0.2, max: 10, step: 0.1, label: 'Height' },
        depth: { min: 0.02, max: 2, step: 0.01, label: 'Depth' },
        bevel: { min: 0.01, max: 1, step: 0.01, label: 'Bevel Size' },
        housingColor: { min: 0, max: 16777215, step: 1, label: 'Housing Color' },
        screenColor: { min: 0, max: 16777215, step: 1, label: 'Screen Color' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  // --- END NEW OBJECTS ---
  {
    type: 'Cube',
    label: 'Cube',
    ctor: Cube,
    defaultParams: { width: 1, height: 1, depth: 1 },
    initialY: (p) => 0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        width: { min: 0.1, max: 50, step: 0.1, label: 'Width' },
        height: { min: 0.1, max: 50, step: 0.1, label: 'Height' },
        depth: { min: 0.1, max: 50, step: 0.1, label: 'Depth' },
        colorR: { min: 0, max: 1, step: 0.01, label: 'Color R' },
        colorG: { min: 0, max: 1, step: 0.01, label: 'Color G' },
        colorB: { min: 0, max: 1, step: 0.01, label: 'Color B' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Sphere',
    label: 'Sphere',
    ctor: Sphere,
    defaultParams: { radius: 1 },
    initialY: (p) => 0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        radius: { min: 0.1, max: 50, step: 0.1, label: 'Radius' },
        segments: { min: 4, max: 64, step: 1, label: 'Segments' },
        colorR: { min: 0, max: 1, step: 0.01, label: 'Color R' },
        colorG: { min: 0, max: 1, step: 0.01, label: 'Color G' },
        colorB: { min: 0, max: 1, step: 0.01, label: 'Color B' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
  {
    type: 'Cylinder',
    label: 'Cylinder',
    ctor: Cylinder,
    defaultParams: { radius: 0.5, height: 1 },
    initialY: (p) => 0,
    buildShapeTab: (object, page) => {
      const p = object.userData.params;
      const paramConfig = {
        radius: { min: 0.1, max: 50, step: 0.1, label: 'Radius' },
        height: { min: 0.1, max: 50, step: 0.1, label: 'Height' },
        radialSegments: { min: 3, max: 64, step: 1, label: 'Radial Segments' },
        colorR: { min: 0, max: 1, step: 0.01, label: 'Color R' },
        colorG: { min: 0, max: 1, step: 0.01, label: 'Color G' },
        colorB: { min: 0, max: 1, step: 0.01, label: 'Color B' }
      };
      buildTabFromConfig(object, page, paramConfig);
    }
  },
];

// This part automatically includes your new object, so it's correct
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
