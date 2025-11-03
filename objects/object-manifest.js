File: objects/object-manifest.js
--------------------------------------------------------------------------------
// File: objects/object-manifest.js
import * as THREE from 'three';

// --- All primitive object imports have been removed ---

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

// --- All slider logic and OBJECT_DEFINITIONS array removed ---

// This part automatically includes your new object, so it's correct
export const BUILDERS = {
  // --- MODIFIED ---
  // Manually add the dummy loader for imported/merged objects
  'ImportedGLB': ImportedGLB
};
