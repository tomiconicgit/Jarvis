File: objects/object-manifest.js
--------------------------------------------------------------------------------
...
  {
    type: 'Cube',
    label: 'Cube',
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
...
