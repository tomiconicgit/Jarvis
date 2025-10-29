(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
  typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.threecsg = {}, global.THREE));
})(this, (function (exports, THREE) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var THREE__default = /*#__PURE__*/_interopDefaultLegacy(THREE);

  const _matrix = new THREE.Matrix4();
  const _vector = new THREE.Vector3();

  const _plane = new THREE.Plane();
  const _q = new THREE.Quaternion();

  const COPLANAR = 0;
  const FRONT = 1;
  const BACK = 2;
  const SPANNING = 3;

  class Polygon {
  	constructor( vertices = [], normal = new THREE.Vector3(), w = 0 ) {

  		this.vertices = vertices;
  		this.normal = normal;
  		this.w = w;

  		if ( this.vertices.length >= 3 ) {

  			this.normal = this.normal.copy( this.vertices[ 1 ].clone().sub( this.vertices[ 0 ] ).cross( this.vertices[ 2 ].clone().sub( this.vertices[ 0 ] ) ) ).normalize();
  			this.w = this.normal.dot( this.vertices[ 0 ] );

  		}

  	}

  	classifySide( plane ) {

  		let t = 0;
  		const numVertices = this.vertices.length;
  		for ( let i = 0; i < numVertices; i ++ ) {

  			const v = this.vertices[ i ];
  			const side = plane.distanceToPoint( v );
  			if ( side < - EPSILON ) {

  				t |= BACK;

  			} else if ( side > EPSILON ) {

  				t |= FRONT;

  			}

  		}

  		return t;

  	}

  	//
  	classifyVertex( vertex ) {

  		const side = this.normal.dot( vertex ) - this.w;
  		if ( side < - EPSILON ) {

  			return BACK;

  		} else if ( side > EPSILON ) {

  			return FRONT;

  		} else {

  			return COPLANAR;

  		}

  	}

  	//
  	invert() {

  		this.normal.multiplyScalar( - 1 );
  		this.w *= - 1;
  		this.vertices.reverse();
  		return this;

  	}

  	//
  	clone() {

  		const p = new Polygon();
  		p.normal.copy( this.normal );
  		p.w = this.w;
  		for ( let i = 0, numVertices = this.vertices.length; i < numVertices; i ++ ) {

  			p.vertices.push( this.vertices[ i ].clone() );

  		}

  		return p;

  	}
  }

  const EPSILON = 1e-5;
  const _v = new THREE.Vector3();

  //
  //
  class Node {

  	constructor( polygons = null ) {

  		this.plane = null;
  		this.front = null;
  		this.back = null;
  		this.polygons = [];
  		if ( polygons ) {

  			this.build( polygons );

  		}

  	}

  	//
  	build( polygons ) {

  		if ( ! polygons || polygons.length === 0 ) {

  			return;

  		}

  		if ( ! this.plane ) {

  			this.plane = new THREE.Plane().setFromCoplanarPoints( polygons[ 0 ].vertices[ 0 ], polygons[ 0 ].vertices[ 1 ], polygons[ 0 ].vertices[ 2 ] );

  		}

  		const front = [];
  		const back = [];
  		for ( let i = 0, l = polygons.length; i < l; i ++ ) {

  			this.splitPolygon( polygons[ i ], this.polygons, this.polygons, front, back );

  		}

  		if ( front.length ) {

  			if ( ! this.front ) {

  				this.front = new Node();

  			}

  			this.front.build( front );

  		}

  		if ( back.length ) {

  			if ( ! this.back ) {

  				this.back = new Node();

  			}

  			this.back.build( back );

  		}

  	}

  	//
  	clone() {

  		const node = new Node();
  		node.plane = this.plane ? this.plane.clone() : null;
  		node.front = this.front ? this.front.clone() : null;
  		node.back = this.back ? this.back.clone() : null;
  		for ( let i = 0, l = this.polygons.length; i < l; i ++ ) {

  			node.polygons.push( this.polygons[ i ].clone() );

  		}

  		return node;

  	}

  	//
  	invert() {

  		const polygons = this.polygons;
  		for ( let i = 0, l = polygons.length; i < l; i ++ ) {

  			polygons[ i ].invert();

  		}

  		if ( this.plane ) {

  			this.plane.negate();

  		}

  		if ( this.front ) {

  			this.front.invert();

  		}

  		if ( this.back ) {

  			this.back.invert();

  		}

  		const temp = this.front;
  		this.front = this.back;
  		this.back = temp;
  		return this;

  	}

  	//
  	clipTo( node ) {

  		this.polygons = node.clipPolygons( this.polygons );
  		if ( this.front ) {

  			this.front.clipTo( node );

  		}

  		if ( this.back ) {

  			this.back.clipTo( node );

  		}

  		return this;

  	}

  	//
  	clipPolygons( polygons ) {

  		if ( ! this.plane ) {

  			return polygons.slice();

  		}

  		let front = [];
  		let back = [];
  		for ( let i = 0, l = polygons.length; i < l; i ++ ) {

  			this.splitPolygon( polygons[ i ], front, back, front, back );

  		}

  		if ( this.front ) {

  			front = this.front.clipPolygons( front );

  		}

  		if ( this.back ) {

  			back = this.back.clipPolygons( back );

  		}

  		return front.concat( back );

  	}

  	//
  	splitPolygon( polygon, coplanarFront, coplanarBack, front, back ) {

  		const side = polygon.classifySide( this.plane );
  		if ( side === COPLANAR ) {

  			if ( this.plane.normal.dot( polygon.normal ) > 0 ) {

  				coplanarFront.push( polygon );

  			} else {

  				coplanarBack.push( polygon );

  			}

  		} else if ( side === FRONT ) {

  			front.push( polygon );

  		} else if ( side === BACK ) {

  			back.push( polygon );

  		} else {

  			// SPANNING
  			const f = [];
  			const b = [];
  			const vertices = polygon.vertices;
  			const numVertices = vertices.length;
  			for ( let i = 0; i < numVertices; i ++ ) {

  				const v1 = vertices[ i ];
  				const v2 = vertices[ ( i + 1 ) % numVertices ];
  				const t1 = polygon.classifyVertex( v1 );
  				const t2 = polygon.classifyVertex( v2 );
  				if ( t1 !== BACK ) {

  					f.push( v1 );

  				}

  				if ( t1 !== FRONT ) {

  					b.push( v1.clone() );

  				}

  				if ( ( t1 | t2 ) === SPANNING ) {

  					this.plane.intersectLine( new THREE.Line3( v1, v2 ), _v );
  					f.push( _v );
  					b.push( _v.clone() );

  				}

  			}

  			if ( f.length >= 3 ) {

  				front.push( new Polygon( f, polygon.normal.clone(), polygon.w ) );

  			}

  			if ( b.length >= 3 ) {

  				back.push( new Polygon( b, polygon.normal.clone(), polygon.w ) );

  			}

  		}

  	}

  }

  //
  function fromMesh( mesh, matrix ) {

  	const polygons = [];
  	let geo;
  	if ( mesh.geometry.isBufferGeometry ) {

  		if ( ! matrix && ( mesh.matrixWorld || mesh.matrix ) ) {

  			matrix = mesh.matrixWorld || mesh.matrix;

  		}

  		geo = toGeometry( mesh.geometry, matrix );

  	} else {

  		geo = mesh.geometry;

  	}

  	const faces = geo.faces;
  	const vertices = geo.vertices;
  	const v = vertices;
  	for ( let i = 0, l = faces.length; i < l; i ++ ) {

  		const f = faces[ i ];
  		if ( f.d ) {

  			polygons.push(
  				new Polygon( [ v[ f.a ], v[ f.b ], v[ f.c ] ], f.normal ),
  				new Polygon( [ v[ f.a ], v[ f.c ], v[ f.d ] ], f.normal ),
  			);

  		} else {

  			polygons.push( new Polygon( [ v[ f.a ], v[ f.b ], v[ f.c ] ], f.normal ) );

  		}

  	}

  	return new Node( polygons );

  }

  function toMesh( node, matrix, material ) {

  	const geo = toGeometry$1( node );
  	const m = new THREE__default["default"].Mesh( geo, material );
  	m.matrix.copy( matrix );
  	m.matrix.decompose( m.position, m.quaternion, m.scale );
  	m.updateMatrixWorld( true );
  	return m;

  }

  //
  const _v1 = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _v3 = new THREE.Vector3();

  function toGeometry( bufferGeometry, matrix ) {

  	const geometry = new THREE.Geometry();
  	const position = bufferGeometry.attributes.position;
  	const normal = bufferGeometry.attributes.normal;
  	const indexes = bufferGeometry.index;
  	if ( indexes ) {

  		for ( let i = 0, l = indexes.count; i < l; i += 3 ) {

  			const a = indexes.getX( i + 0 );
  			const b = indexes.getX( i + 1 );
  			const c = indexes.getX( i + 2 );

  			_v1.set( position.getX( a ), position.getY( a ), position.getZ( a ) );
  			_v2.set( position.getX( b ), position.getY( b ), position.getZ( b ) );
  			_v3.set( position.getX( c ), position.getY( c ), position.getZ( c ) );

  			if ( matrix ) {

  				_v1.applyMatrix4( matrix );
  				_v2.applyMatrix4( matrix );
  				_v3.applyMatrix4( matrix );

  			}

  			const nidx = geometry.vertices.length;
  			geometry.vertices.push( _v1.clone(), _v2.clone(), _v3.clone() );

  			const f = new THREE.Face3( nidx, nidx + 1, nidx + 2 );
  			if ( normal ) {

  				_v1.set( normal.getX( a ), normal.getY( a ), normal.getZ( a ) );
  				_v2.set( normal.getX( b ), normal.getY( b ), normal.getZ( b ) );
  				_v3.set( normal.getX( c ), normal.getY( c ), normal.getZ( c ) );

  				if ( matrix ) {

  					// check for an alternate way to do this
  					_v1.transformDirection( matrix );
  					_v2.transformDirection( matrix );
  					_v3.transformDirection( matrix );

  				}

  				f.vertexNormals.push( _v1.clone(), _v2.clone(), _v3.clone() );

  			}

  			geometry.faces.push( f );

  		}

  	} else {

  		for ( let i = 0, l = position.count; i < l; i += 3 ) {

  			_v1.set( position.getX( i ), position.getY( i ), position.getZ( i ) );
  			_v2.set( position.getX( i + 1 ), position.getY( i + 1 ), position.getZ( i + 1 ) );
  			_v3.set( position.getX( i + 2 ), position.getY( i + 2 ), position.getZ( i + 2 ) );

  			if ( matrix ) {

  				_v1.applyMatrix4( matrix );
  				_v2.applyMatrix4( matrix );
  				_v3.applyMatrix4( matrix );

  			}

  			const nidx = geometry.vertices.length;
  			geometry.vertices.push( _v1.clone(), _v2.clone(), _v3.clone() );

  			const f = new THREE.Face3( nidx, nidx + 1, nidx + 2 );
  			if ( normal ) {

  				_v1.set( normal.getX( i ), normal.getY( i ), normal.getZ( i ) );
  				_v2.set( normal.getX( i + 1 ), normal.getY( i + 1 ), normal.getZ( i + 1 ) );
  				_v3.set( normal.getX( i + 2 ), normal.getY( i + 2 ), normal.getZ( i + 2 ) );

  				if ( matrix ) {

  					_v1.transformDirection( matrix );
  					_v2.transformDirection( matrix );
  					_v3.transformDirection( matrix );

  				}

  				f.vertexNormals.push( _v1.clone(), _v2.clone(), _v3.clone() );

  			}

  			geometry.faces.push( f );

  		}

	 }

  	geometry.computeFaceNormals();
  	geometry.computeVertexNormals();
  	return geometry;

  }

  function toGeometry$1( node ) {

  	const geometry = new THREE.Geometry();
  	const polygons = node.polygons;
  	for ( let i = 0, l = polygons.length; i < l; i ++ ) {

  		const p = polygons[ i ];
  		const numVertices = p.vertices.length;
  		const nidx = geometry.vertices.length;
  		if ( numVertices === 3 ) {

  			geometry.vertices.push( p.vertices[ 0 ], p.vertices[ 1 ], p.vertices[ 2 ] );
  			const f = new THREE.Face3( nidx, nidx + 1, nidx + 2, p.normal );
  			geometry.faces.push( f );

  		} else if ( numVertices === 4 ) {

  			geometry.vertices.push( p.vertices[ 0 ], p.vertices[ 1 ], p.vertices[ 2 ], p.vertices[ 3 ] );
  			geometry.faces.push(
  				new THREE.Face3( nidx, nidx + 1, nidx + 2, p.normal ),
  				new THREE.Face3( nidx, nidx + 2, nidx + 3, p.normal ),
  			);

  		} else {

  			const center = new THREE.Vector3();
  			for ( let j = 0; j < numVertices; j ++ ) {

  				center.add( p.vertices[ j ] );

  			}

  			center.divideScalar( numVertices );

  			const cidx = geometry.vertices.push( center ) - 1;
  			for ( let j = 0; j < numVertices; j ++ ) {

  				const vidx = geometry.vertices.push( p.vertices[ j ] ) - 1;
  				geometry.faces.push( new THREE.Face3( cidx, vidx, vidx === geometry.vertices.length - 1 ? nidx : vidx + 1, p.normal ) );

  			}

  		}

  	}

  	geometry.computeVertexNormals();
  	return geometry;

  }

  //
  function subtract( nodeA, nodeB ) {

  	const a = nodeA.clone();
  	const b = nodeB.clone();

  	a.invert();
  	a.clipTo( b );
  	b.clipTo( a );
  	b.invert();
  	b.clipTo( a );
  	b.invert();

  	const bsp = new Node( a.polygons.concat( b.polygons ) );
  	const res = new Node();
  	res.plane = bsp.plane;
  	res.front = bsp.front;
  	res.back = bsp.back;
  	res.polygons = bsp.polygons;
  	return res;

  }

  function union( nodeA, nodeB ) {

  	const a = nodeA.clone();
  	const b = nodeB.clone();
  	a.clipTo( b );
  	b.clipTo( a );
  	b.invert();
  	b.clipTo( a );
  	b.invert();

  	const bsp = new Node( a.polygons.concat( b.polygons ) );
  	const res = new Node();
  	res.plane = bsp.plane;
  	res.front = bsp.front;
  	res.back = bsp.back;
  	res.polygons = bsp.polygons;
  	return res;

  }

  function intersect( nodeA, nodeB ) {

  	const a = nodeA.clone();
  	const b = nodeB.clone();
  	a.invert();
  	b.clipTo( a );
  	b.invert();
  	a.clipTo( b );
  	b.clipTo( a );

  	const bsp = new Node( a.polygons.concat( b.polygons ) );
  	const res = new Node();
  	res.plane = bsp.plane;
  	res.front = bsp.front;
  	res.back = bsp.back;
  	res.polygons = bsp.polygons;
  	return res;

  }

  //
  //
  //
  //
  //
  // New API
  //
  //
  //
  //
  //

  const _matrix$1 = new THREE.Matrix4();
  const _mesh = new THREE.Mesh();
  const _geom = new THREE.Geometry();

  const operations = {
  	subtract,
  	union,
  	intersect
  };

  const CSG = {
  	fromMesh,
  	toMesh,
  	toGeometry: toGeometry$1,
  };

  for ( const op in operations ) {

  	CSG[ op ] = ( meshA, meshB, material ) => {

  		const nodeA = fromMesh( meshA );
  		const nodeB = fromMesh( meshB );

  		const matrix = meshA.matrix ? meshA.matrix.clone() : new THREE.Matrix4();
  		let mat = material;
  		if ( material === undefined ) {

  			mat = meshA.material;

  		} else if ( Array.isArray( material ) ) {

  			mat = material[ 0 ];

  		}


  		const node = operations[ op ]( nodeA, nodeB );
  		const mesh = toMesh( node, matrix, mat );

  		if ( Array.isArray( material ) ) {

  			const o = toGeometry$1( node );
  			_geom.dispose();
  			_mesh.geometry = _geom;

  			o.groups.forEach( g => {

  				g.materialIndex = 0;

  			} );


  			mesh.geometry = THREE.BufferGeometryUtils.fromGeometry( o, { useGroups: true } );
  			mesh.material = material;


  		}

  		_v.set( 0, 0, 0 ).applyMatrix4( mesh.matrix );
  		mesh.position.copy( _v );

  		_q.setFromRotationMatrix( mesh.matrix );
  		mesh.quaternion.copy( _q );

  		mesh.matrix.identity();

  		mesh.updateMatrixWorld( true );
  		return mesh;


  	};

  }

  exports.CSG = CSG;
  exports.fromMesh = fromMesh;
  exports.intersect = intersect;
  exports.subtract = subtract;
  exports.toGeometry = toGeometry$1;
  exports.toMesh = toMesh;
  exports.union = union;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
