/*
File: src/registry.js
*/
// ... (imports, materials, helpers, other components remain the same) ...

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
      // --- ADDED: Log entry ---
      console.log('Building tower.base.new with params:', p);
      try { // Wrap in try...catch to catch internal errors
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

          // --- ADDED: Check for invalid dimensions ---
          if (innerHalfSize <= 0) {
              console.error("Tower Base build failed: Inner size is zero or negative due to wall thickness.");
              __logErr("Tower Base build failed: Inner size zero/negative.");
              return undefined; // Explicitly return undefined if invalid
          }
          // --- END ADDED ---

          const vertices = [];
          const indices = [];
          const uvs = [];
          const tempVec = new THREE.Vector3();

          // --- Simplified segments for testing ---
          // const numSideSegments = Math.max(1, Math.floor(size / 2));
          const numSideSegments = 2; // Fixed low value for testing
          // const pointsPerLevel = (numSideSegments * 4) + (cornerSegments * 4); // Theoretical
          // --- End Simplified ---

          // --- Generate Profile Points (Outer and Inner) ---
          function getProfilePoints(radius, segments, cornerRadius, cornerSegments) {
            // Ensure non-negative radius for corners
            cornerRadius = Math.max(0, cornerRadius);
            const points = [];
            const halfPi = Math.PI / 2;
            // Ensure sideLength is non-negative
            const sideLength = Math.max(0, radius * 2 - cornerRadius * 2);
            // Ensure segmentsPerSide is at least 1 if sideLength > 0
            const segmentsPerSide = sideLength > 1e-6 ? Math.max(1, Math.floor(sideLength / (radius * 2) * segments)) : 0; // Use input segments proportionally, ensure >= 1 if side exists

            // Corner function
            const corner = (centerX, centerZ, startAngle) => {
                // If no radius, just add the corner point
                if (cornerRadius < 1e-6) {
                    points.push(new THREE.Vector3(centerX, 0, centerZ));
                    return;
                }
                // If radius exists, generate segments
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

             // Generate corners - calculate corner centers correctly
             const cornerCenterX = radius - cornerRadius;
             const cornerCenterZ = radius - cornerRadius;
             corner( cornerCenterX,  cornerCenterZ, 0);          // Top Right
             corner(-cornerCenterX,  cornerCenterZ, halfPi);      // Top Left
             corner(-cornerCenterX, -cornerCenterZ, Math.PI);     // Bottom Left
             corner( cornerCenterX, -cornerCenterZ, Math.PI + halfPi); // Bottom Right
            //  corner( cornerCenterX,  cornerCenterZ, 0); // No need to close loop here

             // Refine points: Add straight segments between corners
             const refinedPoints = [];
             const pointsPerCorner = cornerRadius < 1e-6 ? 1 : cornerSegments + 1;

             for (let c = 0; c < 4; c++) {
                 const cornerStartIndex = c * pointsPerCorner;
                 const nextCornerStartIndex = ((c + 1) % 4) * pointsPerCorner;

                 // Add corner points (all points if radius=0, else skip first point of segment)
                 const cornerPointsToAdd = points.slice(cornerStartIndex + (cornerRadius < 1e-6 ? 0 : 1) , cornerStartIndex + pointsPerCorner);
                 refinedPoints.push(...cornerPointsToAdd);


                 // Add straight line points ONLY if sideLength > 0
                 if (sideLength > 1e-6 && segmentsPerSide > 0) {
                     const pStartStraight = points[cornerStartIndex + pointsPerCorner -1]; // Last point of current corner
                     const pEndStraight = points[nextCornerStartIndex]; // First point of next corner
                     for (let i = 1; i < segmentsPerSide; i++) { // Generate points BETWEEN start and end
                        refinedPoints.push(pStartStraight.clone().lerp(pEndStraight, i / segmentsPerSide));
                    }
                     // Ensure the end point of the straight (start of next corner) is added
                    refinedPoints.push(pEndStraight.clone());
                 } else if (sideLength <= 1e-6) {
                     // If no straight side, ensure the connection point is added
                     refinedPoints.push(points[nextCornerStartIndex].clone());
                 }
             }

             // Shift points check (adjust if necessary, might not be needed depending on generation order)
             // const shiftAmount = Math.floor(refinedPoints.length / 8);
             // return [...refinedPoints.slice(shiftAmount), ...refinedPoints.slice(0, shiftAmount)];
             return refinedPoints; // Try without shifting first
          }


          const outerPoints = getProfilePoints(halfSize, numSideSegments, actualRadius, cornerSegments);
          const innerPoints = getProfilePoints(innerHalfSize, numSideSegments, Math.max(0, actualRadius - actualThickness * (actualRadius/halfInnerSize)), cornerSegments); // Adjust inner radius slightly

           // --- ADDED: Check if profile generation worked ---
           if (!outerPoints || outerPoints.length === 0 || !innerPoints || innerPoints.length === 0) {
               console.error("Tower Base build failed: Profile point generation failed.");
                __logErr("Tower Base build failed: Profile generation error.");
               return undefined;
           }
            if (outerPoints.length !== innerPoints.length) {
               console.error("Tower Base build failed: Inner and Outer point counts mismatch.", outerPoints.length, innerPoints.length);
                __logErr("Tower Base build failed: Profile point mismatch.");
               return undefined;
           }
           console.log('Outer points:', outerPoints.length, 'Inner points:', innerPoints.length);
           // --- END ADDED ---

          const pointsPerLevelActual = outerPoints.length; // Use actual length after generation

          // --- Define Cutout Boundaries ---
          const cutoutMinX = -cutoutWidth / 2;
          const cutoutMaxX = cutoutWidth / 2;
          const cutoutMinY = cutoutBottomOffset;
          const cutoutMaxY = cutoutBottomOffset + cutoutHeight;

          // --- Generate Vertices ---
          // ... (Vertex generation loop remains the same) ...
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
          // ... (Face generation loop, including cutout skip logic, remains the same) ...
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
                    // Use a slightly larger epsilon for float comparisons
                    const zCheckEpsilon = 0.05;
                    const v_out_bl_z = vertices[out_bl * 3 + 2];
                    const v_out_br_z = vertices[out_br * 3 + 2];
                     // Check if BOTH Z coordinates are close to -halfSize
                    const isFrontFace = Math.abs(v_out_bl_z - (-halfSize)) < zCheckEpsilon && Math.abs(v_out_br_z - (-halfSize)) < zCheckEpsilon;

                    // Check if the base edge of the outer quad is part of the front face cutout
                    let skipOuter = false;
                    if (isFrontFace) {
                        const y_bl = vertices[out_bl * 3 + 1];
                        const y_tl = vertices[out_tl * 3 + 1]; // Use top Y for the quad's height range
                        const x_bl = vertices[out_bl * 3];
                        const x_br = vertices[out_br * 3];

                        // Vertical Overlap Check: Does the quad's Y range overlap the cutout's Y range?
                        const quadMinY = y_bl;
                        const quadMaxY = y_tl;
                        const yOverlap = Math.max(quadMinY, cutoutMinY) < Math.min(quadMaxY, cutoutMaxY);

                        // Horizontal Overlap Check: Does the quad's X range overlap the cutout's X range?
                        const quadMinX = Math.min(x_bl, x_br);
                        const quadMaxX = Math.max(x_bl, x_br);
                        const xOverlap = Math.max(quadMinX, cutoutMinX) < Math.min(quadMaxX, cutoutMaxX);


                        if (yOverlap && xOverlap) {
                            skipOuter = true; // Skip this outer face quad if it overlaps the cutout region
                        }
                    }

                    // Outer faces (skip if it's part of the cutout)
                    if (!skipOuter) {
                        indices.push(out_bl, out_br, out_tl);
                        indices.push(out_br, out_tr, out_tl);
                    } else {
                        // TODO: Add faces for the sides/top/bottom of the cutout hole
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

          // --- ADDED: Check geometry validity ---
          if (indices.length === 0 || vertices.length === 0) {
              console.error("Tower Base build failed: Resulting geometry has no vertices or indices.");
              __logErr("Tower Base build failed: Empty geometry.");
              geometry.dispose(); // Clean up empty geometry
              return undefined;
          }
          // --- END ADDED ---

          const mesh = new THREE.Mesh(geometry, metalMat.clone()); // Use clone for unique material
          mesh.name = 'towerBaseNew'; // Give it a name

          // --- ADDED: Log success ---
          console.log('Finished building tower.base.new geometry, returning mesh:', mesh);
          // --- END ADDED ---
          return mesh;

      } catch (error) {
          // --- ADDED: Catch internal errors ---
          console.error("Error during Tower Base build:", error);
          __logErr("Tower Base build error: " + error.message);
          return undefined; // Return undefined on error
          // --- END ADDED ---
      }
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
