// This is the correct "three-csgmesh" library (UMD build)
// It will be found by the `getCSG()` function in your index.html

(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
        typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
        (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.threecsg = {}, global.THREE));
}(this, (function(exports, THREE) {
    'use strict';

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function(k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function() {
                            return e[k];
                        }
                    });
                }
            });
        }
        n['default'] = e;
        return Object.freeze(n);
    }

    var THREE__namespace = /*#__PURE__*/ _interopNamespace(THREE);

    // Split a polygon by a plane and return either the polygon itself or a
    // "back" and "front" polygon split by the plane.
    const COPLANAR = 0;
    const FRONT = 1;
    const BACK = 2;
    const SPANNING = 3;

    function splitPolygon(plane, polygon, coplanarFront, coplanarBack, front, back) {

        const {
            vertices,
            normal
        } = polygon;
        const numVertices = vertices.length;
        if (numVertices === 0) {

            return;

        }

        // if we have a planecoplanar plane then all the points should be on one
        // side or the other
        let polygonType = 0;
        const types = [];
        for (let i = 0; i < numVertices; i++) {

            const v = vertices[i];
            const t = plane.distanceToPoint(v);
            const type = t < -1e-5 ? BACK : t > 1e-5 ? FRONT : COPLANAR;
            polygonType |= type;
            types.push(type);

        }

        // Put the polygon in the correct list, splitting it when necessary.
        switch (polygonType) {

            case COPLANAR:

                if (plane.normal.dot(normal) > 0) {

                    coplanarFront.push(polygon);

                } else {

                    coplanarBack.push(polygon);

                }

                break;

            case FRONT:

                front.push(polygon);
                break;

            case BACK:

                back.push(polygon);
                break;

            case SPANNING:

                const f = [];
                const b = [];
                for (let i = 0; i < numVertices; i++) {

                    const j = (i + 1) % numVertices;
                    const ti = types[i];
                    const tj = types[j];
                    const vi = vertices[i];
                    const vj = vertices[j];

                    if (ti !== BACK) {

                        f.push(vi);

                    }

                    if (ti !== FRONT) {

                        b.push(vi);

                    }

                    if ((ti | tj) === SPANNING) {

                        // v = vi + (vj - vi) * t
                        // We're looking for the point intersection point between the plane and the line
                        // segment vi, vj.
                        //
                        // t = (plane.w - plane.normal.dot(vi)) / plane.normal.dot(vj - vi)
                        const segmentDirection = vj.clone().sub(vi);
                        const t = (plane.constant - plane.normal.dot(vi)) / plane.normal.dot(segmentDirection);
                        const v = vi.clone().add(segmentDirection.multiplyScalar(t));

                        f.push(v);
                        b.push(v);

                    }

                }

                if (f.length >= 3) {

                    front.push(polygon.clone(f));

                }

                if (b.length >= 3) {

                    back.push(polygon.clone(b));

                }

                break;

        }

    }

    // A polygon is composed of vertices and a normal
    class Polygon {

        constructor(vertices = [], normal = new THREE__namespace.Vector3()) {

            this.vertices = vertices;
            this.normal = normal;

        }

        // invert the polygon by flipping the normal and reversing the vertices
        invert() {

            this.normal.multiplyScalar(-1);
            this.vertices.reverse();
            return this;

        }

        // Translate the polygon by the given vector
        translate(vec) {

            this.vertices.forEach(v => {

                v.add(vec);

            });

            return this;

        }

        // Return a new polygon with the given vertices
        clone(vertices = null) {

            return new Polygon(vertices || this.vertices.map(v => v.clone()), this.normal.clone());

        }

    }

    // A node in the BSP tree
    class Node {

        constructor(polygons = null, plane = new THREE__namespace.Plane(), front = null, back = null) {

            this.polygons = polygons;
            this.plane = plane;
            this.front = front;
            this.back = back;

        }

        // Invert the node by inverting the polygons, flipping the plane, and swapping the front and back
        invert() {

            this.polygons.forEach(polygon => {

                polygon.invert();

            });

            this.plane.negate();

            const temp = this.front;
            this.front = this.back;
            this.back = temp;

            if (this.front) {

                this.front.invert();

            }

            if (this.back) {

                this.back.invert();

            }

            return this;

        }

        // clip the polygons to the node
        clipPolygons(polygons) {

            const {
                plane
            } = this;
            if (plane.normal.x === 0 && plane.normal.y === 0 && plane.normal.z === 0) {

                return polygons.slice();

            }

            let front = [];
            let back = [];
            polygons.forEach(polygon => {

                splitPolygon(plane, polygon, back, back, front, back);

            });

            if (this.front) {

                front = this.front.clipPolygons(front);

            }

            if (this.back) {

                back = this.back.clipPolygons(back);

            } else {

                back = [];

            }

            return front.concat(back);

        }

        // Clip the node to the given node
        clipTo(node) {

            this.polygons = node.clipPolygons(this.polygons);
            if (this.front) {

                this.front.clipTo(node);

            }

            if (this.back) {

                this.back.clipTo(node);

            }

    
        }

        // Return all polygons in the node
        allPolygons() {

            let polygons = this.polygons.slice();
            if (this.front) {

                polygons = polygons.concat(this.front.allPolygons());

            }

            if (this.back) {

                polygons = polygons.concat(this.back.allPolygons());

            }

            return polygons;

        }

        // Build the node from the given polygons
        build(polygons) {

            if (polygons.length === 0) {

                return;

            }

            if (this.polygons === null) {

                this.polygons = [];

            }

            // use the first polygon as the plane
            const referencePolygon = polygons[0];
            this.plane.setFromNormalAndCoplanarPoint(referencePolygon.normal, referencePolygon.vertices[0]);

            // push all coplanar polygons to the node
            const coplanar = [];
            const front = [];
            const back = [];
            for (let i = 0, l = polygons.length; i < l; i++) {

                splitPolygon(this.plane, polygons[i], this.polygons, this.polygons, front, back);

            }

            // build the front and back nodes
            if (front.length > 0) {

                if (this.front === null) {

                    this.front = new Node();

                }

                this.front.build(front);

            }

            if (back.length > 0) {

                if (this.back === null) {

                    this.back = new Node();

                }

                this.back.build(back);

            }

        }

        // Create a copy of the node
        clone() {

            return new Node(
                this.polygons ? this.polygons.map(p => p.clone()) : null,
                this.plane.clone(),
                this.front ? this.front.clone() : null,
                this.back ? this.back.clone() : null,
            );

        }

    }

    // Return a new CSG solid representing space in either this solid or in the
    // solid `csg`. Neither this solid nor the solid `csg` are modified.
    function union(a, b) {

        a = a.clone();
        b = b.clone();
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        return a;

    }

    // Return a new CSG solid representing space in this solid but not in the
    // solid `csg`. Neither this solid nor the solid `csg` are modified.
    function subtract(a, b) {

        a = a.clone();
        b = b.clone();
        a.invert();
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        a.invert();
        return a;

    }

    // Return a new CSG solid representing space both this solid and in the
    // solid `csg`. Neither this solid nor the solid `csg` are modified.
    function intersect(a, b) {

        a = a.clone();
        b = b.clone();
        a.invert();
        b.clipTo(a);
        b.invert();
        a.clipTo(b);
        b.clipTo(a);
        a.build(b.allPolygons());
        a.invert();
        return a;

    }

    // Convert the CSG into a THREE.BufferGeometry
    function toGeometry(csg, referenceMatrix = null) {

        const polygons = csg.allPolygons();
        if (polygons.length === 0) {

            // Return empty geometry
            return new THREE__namespace.BufferGeometry();

        }

        // create the geometry
        const geometry = new THREE__namespace.BufferGeometry();
        const vertices = [];
        const normals = [];

        // create the vertices and normals
        polygons.forEach(polygon => {

            const polygonVertices = polygon.vertices;
            const numVertices = polygonVertices.length;
            for (let i = 2; i < numVertices; i++) {

                //
                const v0 = polygonVertices[0];
                const v1 = polygonVertices[i - 1];
                const v2 = polygonVertices[i];
                const normal = polygon.normal;

                vertices.push(v0.x, v0.y, v0.z);
                vertices.push(v1.x, v1.y, v1.z);
                vertices.push(v2.x, v2.y, v2.z);

                normals.push(normal.x, normal.y, normal.z);
                normals.push(normal.x, normal.y, normal.z);
                normals.push(normal.x, normal.y, normal.z);

            }

        });

        // set the attributes
        geometry.setAttribute('position', new THREE__namespace.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE__namespace.Float32BufferAttribute(normals, 3));

        // apply the reference matrix
        if (referenceMatrix) {

            geometry.applyMatrix4(referenceMatrix);

        }

        return geometry;

    }

    // Convert the THREE.BufferGeometry into a CSG solid
    function fromGeometry(geometry, objectMatrix = null) {

        if (geometry.index) {

            geometry = geometry.toNonIndexed();

        }

        const position = geometry.attributes.position.array;
        const normal = geometry.attributes.normal.array;
        const polygons = [];
        for (let i = 0, l = position.length; i < l; i += 9) {

            const vertices = [];
            for (let j = 0; j < 3; j++) {

                const i3 = i + j * 3;
                vertices.push(
                    new THREE__namespace.Vector3(
                        position[i3],
                        position[i3 + 1],
                        position[i3 + 2],
                    )
                );

            }

            polygons.push(
                new Polygon(
                    vertices,
                    new THREE__namespace.Vector3(
                        normal[i],
                        normal[i + 1],
                        normal[i + 2],
                    )
                )
            );

        }

        const node = new Node(polygons);
        const matrix = objectMatrix ? new THREE__namespace.Matrix4().copy(objectMatrix) : null;
        if (matrix) {

            // TODO: do this in the node build step
            // to improve performance
            const normalMatrix = new THREE__namespace.Matrix3().getNormalMatrix(matrix);
            polygons.forEach(polygon => {

                polygon.vertices.forEach(vertex => {

                    vertex.applyMatrix4(matrix);

                });

                polygon.normal.applyMatrix3(normalMatrix).normalize();

            });

        }

        return node;

    }

    // Convert the THREE.Mesh into a CSG solid
    function fromMesh(mesh) {

        return fromGeometry(mesh.geometry, mesh.matrix);

    }

    // Convert the CSG solid into a THREE.Mesh
    function toMesh(csg, matrix, material) {

        const geometry = toGeometry(csg, matrix);
        return new THREE__namespace.Mesh(geometry, material);

    }

    exports.CSG = {
        fromMesh,
        toMesh,
        fromGeometry,
        toGeometry,
        union,
        subtract,
        intersect,
    };

    Object.defineProperty(exports, '__esModule', {
        value: true
    });

})));
//# sourceMappingURL=three-csgmesh.umd.js.map
