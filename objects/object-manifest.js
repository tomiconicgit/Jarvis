// File: objects/object-manifest.js
import TowerBase from './towerbase.js';
import DoubleDoor from './doubledoor.js';
import WindowAsset from './window.js';
import Floor from './floor.js';
import Pipe from './pipe.js';
import Roof from './roof.js';
import TrussArm from './trussarm.js';
import Cube from './cube.js';
import Sphere from './sphere.js';
import Cylinder from './cylinder.js';

// This is your new "Plugin" registry.
// To add a new object, you just add a new entry to this array.
export const OBJECT_DEFINITIONS = [
  {
    type: 'TowerBase',
    label: 'Tower (Door)',
    ctor: TowerBase,
    defaultParams: { width: 12, depth: 12, height: 6, wallThickness: 1, cornerRadius: 1.2, edgeRoundness: 0.3, doorWidth: 4 },
    // We move the "Shape" tab logic here, co-located with its object.
    buildShapeTab: (object, page) => {
      // All the paramConfig logic for 'TowerBase' from your
      // old buildShapeTab function goes right here.
      // Example:
      // const p = object.userData.params;
      // const paramConfig = { height: { min: 1, max: 80, ... } };
      // ... logic to build sliders ...
    }
  },
  {
    type: 'TowerBase',
    label: 'Tower (Solid)',
    ctor: TowerBase,
    defaultParams: { width: 10, depth: 10, height: 8, wallThickness: 1, cornerRadius: 1.0, edgeRoundness: 0.2, doorWidth: 0 },
    buildShapeTab: (object, page) => {
      // Same function as above. This allows different defaults
      // to still share the same property builder.
      const def = OBJECT_DEFINITIONS.find(d => d.label === 'Tower (Door)');
      def.buildShapeTab(object, page);
    }
  },
  {
    type: 'Cube',
    label: 'Cube',
    ctor: Cube,
    defaultParams: { width: 1, height: 1, depth: 1 },
    buildShapeTab: (object, page) => {
      // All the paramConfig logic for 'Cube' goes here.
      // const p = object.userData.params;
      // const paramConfig = { width: { min: 0.1, max: 50, ... } };
      // ... logic to build sliders ...
    }
  },
  {
    type: 'Sphere',
    label: 'Sphere',
    ctor: Sphere,
    defaultParams: { radius: 1 },
    buildShapeTab: (object, page) => {
      // paramConfig for 'Sphere'
    }
  },
  {
    type: 'Cylinder',
    label: 'Cylinder',
    ctor: Cylinder,
    defaultParams: { radius: 0.5, height: 1 },
    buildShapeTab: (object, page) => {
      // paramConfig for 'Cylinder'
    }
  },
  // ... add entries for DoubleDoor, Window, Floor, Pipe, Roof, TrussArm ...
];

// We can also auto-generate the BUILDERS map for file loading.
export const BUILDERS = OBJECT_DEFINITIONS.reduce((map, def) => {
  if (!map[def.type]) {
    map[def.type] = def.ctor;
  }
  return map;
}, {});
