/*
File: src/registry.js
*/
// Contains the component registry, builders, and UI generator.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'; // Keep if other components use it

/* ---------- Materials ---------- */
export const metalMat = new THREE.MeshStandardMaterial({ color:0xffffff, metalness:.1, roughness:.4, side:THREE.DoubleSide });
export const glassMat = new THREE.MeshStandardMaterial({ color:0x88ccff, transparent:true, opacity:.32, side:THREE.DoubleSide, depthWrite:false }); // Keep if window uses it

/* ---------- UV + helpers ---------- */
// ... (keep ensureBB, addPlanarUV, addCylUV, roundedRectShape, superellipsePoint, firstMeshIn, cylBetween if needed by remaining components) ...
function ensureBB(g){ if(!g.boundingBox) g.computeBoundingBox(); }
function addPlanarUV(g, axes='xz'){ /* ... */ }
function addCylUV(g){ /* ... */ }
function roundedRectShape(w,h,r){
  const hw=w/2, hh=h/2, rr=Math.min(r,hw,hh);
  if (rr < 0) rr = 0; // Prevent negative radius
  const s=new THREE.Shape(); s.moveTo(-hw+rr,-hh);
  s.lineTo(hw-rr,-hh); s.quadraticCurveTo(hw,-hh, hw,-hh+rr);
  s.lineTo(hw, hh-rr); s.quadraticCurveTo(hw,hh, hw-rr,hh);
  s.lineTo(-hw+rr,hh); s.quadraticCurveTo(-hw,hh, -hw,hh-rr);
  s.lineTo(-hw, -hh+rr); s.quadraticCurveTo(-hw,-hh, -hw+rr,-hh); return s;
}
function superellipsePoint(a,b,n,t){ /* ... */ }
// export function firstMeshIn(object3d) { /* ... no longer needed ... */ }
function cylBetween(a,b,r,mat){ /* ... keep if truss/piping use it ... */ }

/* ---------- CSG Functions ---------- */
// Removed

/* ---------- Registry (plugins) ---------- */
export const Registry = new Map();
export function register(type, label, schema, builder, actions=[]) {
  Registry.set(type, { type, label, schema, builder, actions });
}

/**
 * Builds the Inspector UI inside a given root element.
 */
export function buildInspectorUI(rootEl, type, values, onChange, onAction, state){ /* ... keep existing ... */ }

/* ================================================================================
NEW TOWER BASE DEFINITION
================================================================================
*/

register(
  'tower.base.new', 'Tower Base (New)',
  {
      size: { type: 'range', label: 'Base Size (X/Z)', min: 2, max: 30, step: 0.5, default: 10 },
      height: { type: 'range', label: 'Height', min: 1, max: 50, step: 0.5, default: 5 },
      wallThickness: { type: 'range', label: 'Wall Thickness', min: 0.1, max: 5, step: 0.1, default: 1 },
      cornerSegments: { type: 'range', label: 'Corner Segments', min: 1, max: 16, step: 1, default: 4 }, // For rounding quality
      cornerRadius: { type: 'range', label: 'Corner Radius', min: 0, max: 5, step: 0.1, default: 0.5 },
      heightSegments: { type: 'range', label: 'Height Segments', min: 1, max: 32, step: 1, default: 5 },
      // Fixed Cutout properties (could become parameters later)
      cutoutWidth: { type: 'number', label: 'Cutout Width', default: 4, hidden: true }, // Hidden parameter
      cutoutHeight: { type: 'number', label: 'Cutout Height', default: 3, hidden: true }, // Hidden parameter
      cutoutBottomOffset: { type: 'number', label: 'Cutout Bottom Offset', default: 0.2, hidden: true } // How far cutout starts from base
  },
  (p) => {
      const {
          size, height, wallThickness, cornerSegments, cornerRadius, heightSegments,
          cutoutWidth, cutoutHeight, cutoutBottomOffset
      } = p;

      // Ensure thickness doesn't exceed half the size
      const maxThickness = (size / 2) * 0.99; // Allow some margin
      const actualThickness = Math.min(wallThickness, maxThickness);
      if (wallThickness > maxThickness) {
          console.warn("Wall thickness adjusted to prevent inversion.");
      }
       // Ensure radius doesn't exceed half the inner size
       const halfInnerSize = Math.max(0.01, (size / 2) - actualThickness);
       const actualRadius = Math.min(cornerRadius, halfInnerSize);

      const halfSize = size / 2;
      const innerHalfSize = halfSize - actualThickness;

      const vertices = [];
      const indices = [];
      const uvs = [];
      const tempVec = new THREE.Vector3();

      const numSideSegments = Math.max(1, Math.floor(size / 2)); // Segments per flat side
      const pointsPerLevel = (numSideSegments * 4) + (cornerSegments * 4);

      // --- Generate Profile Points (Outer and Inner) ---
      function getProfilePoints(radius, segments, cornerRadius, cornerSegments) {
          const points = [];
          const halfPi = Math.PI / 2;
          const sideLength = radius * 2 - cornerRadius * 2;
          const segmentsPerSide = Math.max(1, Math.floor(sideLength / (radius * 2) * segments));

          // Corner function
          const corner = (centerX, centerZ, startAngle) => {
              for (let i = 0; i <= cornerSegments; i++) {
                  const angle = startAngle + (i / cornerSegments) * halfPi;
                  points.push(
                      new THREE.Vector3(
                          centerX + Math.cos(angle) * cornerRadius,
                          0,
                          centerZ + Math.sin(angle) * cornerRadius
                      )
                  );
              }
          };

          // Generate corners and sides
          corner(radius - cornerRadius, radius - cornerRadius, 0); // Top Right
          corner(-(radius - cornerRadius), radius - cornerRadius, halfPi); // Top Left
          corner(-(radius - cornerRadius), -(radius - cornerRadius), Math.PI); // Bottom Left
          corner(radius - cornerRadius, -(radius - cornerRadius), Math.PI + halfPi); // Bottom Right
          corner(radius - cornerRadius, radius - cornerRadius, 0); // Close loop for calculation

          // Refine points for straight sections (replace corner start/end with straight points)
          const refinedPoints = [];
          for(let c = 0; c < 4; c++) {
              const p1 = points[c * (cornerSegments + 1)]; // End of previous corner / start of straight
              const p2 = points[(c+1) * (cornerSegments + 1)]; // Start of next corner / end of straight

              // Add corner points (excluding start and end which are replaced by straight line)
              for (let i = 1; i < cornerSegments + 1; i++) {
                 refinedPoints.push(points[c * (cornerSegments + 1) + i]);
              }

              // Add straight line points
               for (let i = 0; i <= segmentsPerSide; i++) {
                   refinedPoints.push(p2.clone().lerp(p1, i / segmentsPerSide));
               }
          }
          // Shift points so index 0 is center of -Z face
          const shiftAmount = Math.floor(refinedPoints.length / 8); // Approx center of first side (-Z)
          return [...refinedPoints.slice(shiftAmount), ...refinedPoints.slice(0, shiftAmount)];
      }

      const outerPoints = getProfilePoints(halfSize, numSideSegments, actualRadius, cornerSegments);
      const innerPoints = getProfilePoints(innerHalfSize, numSideSegments, Math.max(0, actualRadius - actualThickness * (actualRadius/halfInnerSize)), cornerSegments); // Adjust inner radius slightly
      const pointsPerLevelActual = outerPoints.length; // Use actual length after generation

      // --- Define Cutout Boundaries ---
      const cutoutMinX = -cutoutWidth / 2;
      const cutoutMaxX = cutoutWidth / 2;
      const cutoutMinY = cutoutBottomOffset;
      const cutoutMaxY = cutoutBottomOffset + cutoutHeight;

      // --- Generate Vertices ---
      for (let j = 0; j <= heightSegments; j++) {
          const y = (j / heightSegments) * height;
          const uY = j / heightSegments; // V coordinate for UVs

          for (let i = 0; i < pointsPerLevelActual; i++) {
              // Outer vertices
              const op = outerPoints[i];
              vertices.push(op.x, y, op.z);
              uvs.push(i / pointsPerLevelActual, uY); // U along perimeter, V along height

              // Inner vertices
              const ip = innerPoints[i];
              vertices.push(ip.x, y, ip.z);
              uvs.push(i / pointsPerLevelActual, uY); // Inner uses same UV for now
          }
      }

      // --- Generate Faces ---
      for (let j = 0; j < heightSegments; j++) {
          for (let i = 0; i < pointsPerLevelActual; i++) {
              const i_next = (i + 1) % pointsPerLevelActual;

              const baseIdx = j * pointsPerLevelActual * 2;
              const nextLevelBaseIdx = (j + 1) * pointsPerLevelActual * 2;

              // Indices for the current quad level
              const out_tl = nextLevelBaseIdx + i * 2;
              const out_tr = nextLevelBaseIdx + i_next * 2;
              const out_bl = baseIdx + i * 2;
              const out_br = baseIdx + i_next * 2;

              const in_tl = nextLevelBaseIdx + i * 2 + 1;
              const in_tr = nextLevelBaseIdx + i_next * 2 + 1;
              const in_bl = baseIdx + i * 2 + 1;
              const in_br = baseIdx + i_next * 2 + 1;

              // Get vertex positions for cutout check
              const v_out_bl_z = vertices[out_bl * 3 + 2];
              const v_out_br_z = vertices[out_br * 3 + 2];
              const isFrontFace = Math.abs(v_out_bl_z - (-halfSize)) < 0.01 && Math.abs(v_out_br_z - (-halfSize)) < 0.01;

              // Check if the base edge of the outer quad is part of the front face cutout
              let skipOuter = false;
              if (isFrontFace) {
                  const y_bl = vertices[out_bl * 3 + 1];
                  const y_tl = vertices[out_tl * 3 + 1]; // Use top-left Y for the quad's height range
                  const x_bl = vertices[out_bl * 3];
                  const x_br = vertices[out_br * 3];

                  // Check if quad segment is entirely within cutout bounds
                  if (y_bl >= cutoutMinY && y_tl <= cutoutMaxY && // Vertical check
                      ((x_bl >= cutoutMinX && x_bl <= cutoutMaxX) || (x_br >= cutoutMinX && x_br <= cutoutMaxX) || // Horizontal check (at least one vertex inside)
                       (x_bl < cutoutMinX && x_br > cutoutMaxX)) // Edge spans the cutout
                  ) {
                       // More precise check: does the horizontal segment (x_bl to x_br) overlap with (cutoutMinX to cutoutMaxX)?
                       const segMinX = Math.min(x_bl, x_br);
                       const segMaxX = Math.max(x_bl, x_br);
                       if (Math.max(segMinX, cutoutMinX) < Math.min(segMaxX, cutoutMaxX)) {
                            skipOuter = true; // Skip this outer face quad if it's within the cutout region
                       }
                  }
              }

              // Outer faces (skip if it's part of the cutout)
              if (!skipOuter) {
                  indices.push(out_bl, out_br, out_tl);
                  indices.push(out_br, out_tr, out_tl);
              } else {
                  // TODO: Add faces for the sides/top/bottom of the cutout hole
                  // This part is complex and involves connecting inner wall vertices
                  // to the cutout boundary on the outer wall. For now, it just leaves a hole.
              }

              // Inner faces (reversed winding order)
              indices.push(in_bl, in_tl, in_br);
              indices.push(in_br, in_tl, in_tr);

              // Top/Bottom cap faces (only at j=0 for bottom, j=heightSegments-1 for top)
              if (j === 0) { // Bottom cap
                  indices.push(out_bl, in_bl, out_br);
                  indices.push(in_bl, in_br, out_br);
              }
              if (j === heightSegments - 1) { // Top cap
                  indices.push(out_tl, out_tr, in_tl);
                  indices.push(in_tl, out_tr, in_tr);
              }
          }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const mesh = new THREE.Mesh(geometry, metalMat.clone()); // Use clone for unique material
      mesh.name = 'towerBaseNew'; // Give it a name
      return mesh;
  }
);


/* ================================================================================
END NEW TOWER BASE DEFINITION
================================================================================
*/


/* ================================================================================
REMAINING COMPONENT DEFINITIONS
================================================================================
*/
// ... (Piping, Window (Framed), Double Doors, Box Truss Beam definitions remain unchanged) ...
register( 'piping','Piping', { /* ... schema ... */ }, (p)=>{ /* ... builder ... */ } );
register( 'window.mesh','Window (Framed)', { /* ... schema ... */ }, (p)=>{ /* ... builder ... */ } );
register( 'doors.double','Double Doors', { /* ... schema ... */ }, (p)=>{ /* ... builder ... */ } );
register( 'truss.box','Box Truss Beam', { /* ... schema ... */ }, (p)=>{ /* ... builder ... */ } );
/* ================================================================================
END REMAINING COMPONENT DEFINITIONS
================================================================================
*/
