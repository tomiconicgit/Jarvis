// File: ui/props-panel.js
import { OBJECT_DEFINITIONS } from '../objects/object-manifest.js';
// ... import all your texture/PBR helper functions ...

// Your old makeTabs function
function makeTabs(rootEl, tabsSpec) { /* ... */ }

// Your old buildTransformTab function
function buildTransformTab(object, page) { /* ... */ }

// Your old buildTexturesTab function
function buildTexturesTab(object, page) { /* ... */ }

// Your NEW buildShapeTab
function buildShapeTab(object, page) {
  const type = object.userData.type;
  
  // Find the object's definition in the manifest
  // We use type here, not label, as type is the class identifier
  const def = OBJECT_DEFINITIONS.find(d => d.type === type);

  if (def && def.buildShapeTab) {
    // Call the function we defined in the manifest!
    def.buildShapeTab(object, page);
  } else {
    page.innerHTML = '<p class="text-gray-400">No shape parameters for this object.</p>';
  }
}

// Your old updatePropsPanel function
export function updatePropsPanel(object) {
  const propsContent = document.getElementById('props-content');
  if (!propsContent) return;
  
  propsContent.innerHTML = '';
  if (!object) {
    propsContent.innerHTML = '<p class="text-gray-400">No selection.</p>';
    return;
  }

  // This is now fully dynamic.
  makeTabs(propsContent, [
    { id: 'transform', label: 'Transform', build: (page) => buildTransformTab(object, page) },
    { id: 'shape',     label: 'Shape',     build: (page) => buildShapeTab(object, page) },
    { id: 'textures',  label: 'Textures',  build: (page) => buildTexturesTab(object, page) }
  ]);
}
