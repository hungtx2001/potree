/**
 * CesiumControls - Potree navigation controls driven by Cesium camera.
 *
 * Instead of handling mouse/keyboard input directly, this controller
 * reads the Cesium camera state each frame and converts it back into
 * Potree's scene.view (UTM local coordinates).
 *
 * Cesium ScreenSpaceController handles all user input natively.
 * When a Potree tool is active (measure, clip, volume), Cesium input
 * is temporarily disabled and the Potree canvas receives events.
 */

import * as THREE from "../../libs/three.js/build/three.module.js";
import {EventDispatcher} from "../EventDispatcher.js";

export class CesiumControls extends EventDispatcher {

  constructor(viewer, cesiumViewer, projection) {
    super();

    this.viewer = viewer;
    this.renderer = viewer.renderer;
    this.scene = null;

    this.cesiumViewer = cesiumViewer;
    this.projection = projection;

    this.sceneControls = new THREE.Scene();

    // Pre-allocated scratch vectors (zero GC per frame)
    this._scratchPos = new THREE.Vector3();
    this._scratchTarget = new THREE.Vector3();
    this._scratchUpPt = new THREE.Vector3();
    this._scratchUpDir = new THREE.Vector3();
    this._scratchCenter = new THREE.Vector3();

    this._toolActive = false;
    this.directCamera = false;

    // Cached Cesium references
    this._ellipsoid = cesiumViewer.scene.globe.ellipsoid;
    this._cesiumCamera = cesiumViewer.camera;
    this._cesiumSSC = cesiumViewer.scene.screenSpaceCameraController;

    // Pre-allocated Cesium scratch objects (avoid new per frame)
    var Cesium = window.Cesium;
    if ( Cesium ) {
      this._cScratch1 = new Cesium.Cartesian3();
      this._cScratch2 = new Cesium.Cartesian3();
      this._cScratchTarget = new Cesium.Cartesian3();
      this._cScratchUp = new Cesium.Cartesian3();
    }

    // Reusable arrays for projection calls
    this._degPos = [0, 0];
    this._degTarget = [0, 0];
    this._degUp = [0, 0];

    this._lastLogTime = 0;
  }

  setScene(scene) {
    this.scene = scene;
  }

  stop() {
    // No-op: Cesium handles its own deceleration
  }

  /**
   * Toggle between tool mode and navigation mode.
   */
  setToolActive(active) {
    this._toolActive = active;

    var potreeCanvas = this.renderer.domElement;
    var ssc = this._cesiumSSC;

    if ( active ) {
      potreeCanvas.style.pointerEvents = 'auto';
      ssc.enableInputs = false;
    } else {
      potreeCanvas.style.pointerEvents = 'none';
      ssc.enableInputs = true;
    }
  }

  /**
   * Each frame: read Cesium camera → convert to Potree scene.view
   */
  update(delta) {
    if ( !this.scene || !this.cesiumViewer || !this.projection ) {
      return;
    }

    var view = this.scene.view;
    var cam = this._cesiumCamera;
    var Cesium = window.Cesium;

    if ( !Cesium ) return;

    // Throttled debug logging
    var now = Date.now();
    var doLog = false;
    if ( (now - this._lastLogTime) > 2000 ) {
      this._lastLogTime = now;
      doLog = true;
    }

    // === Reverse 3-point projection (zero allocations) ===
    var posECEF = cam.positionWC;

    // target = pos + dir * 100
    Cesium.Cartesian3.multiplyByScalar(cam.directionWC, 100, this._cScratch1);
    Cesium.Cartesian3.add(posECEF, this._cScratch1, this._cScratchTarget);

    // up = pos + up * 100
    Cesium.Cartesian3.multiplyByScalar(cam.upWC, 100, this._cScratch2);
    Cesium.Cartesian3.add(posECEF, this._cScratch2, this._cScratchUp);

    var cartPos = this._ellipsoid.cartesianToCartographic(posECEF);
    var cartTarget = this._ellipsoid.cartesianToCartographic(this._cScratchTarget);
    var cartUp = this._ellipsoid.cartesianToCartographic(this._cScratchUp);

    if ( !cartPos || !cartTarget || !cartUp ) return;

    // Reuse arrays instead of creating new ones
    this._degPos[0] = Cesium.Math.toDegrees(cartPos.longitude);
    this._degPos[1] = Cesium.Math.toDegrees(cartPos.latitude);
    this._degTarget[0] = Cesium.Math.toDegrees(cartTarget.longitude);
    this._degTarget[1] = Cesium.Math.toDegrees(cartTarget.latitude);
    this._degUp[0] = Cesium.Math.toDegrees(cartUp.longitude);
    this._degUp[1] = Cesium.Math.toDegrees(cartUp.latitude);

    var utmPos, utmTarget, utmUp;
    try {
      utmPos = this.projection.toScene.forward(this._degPos);
      utmTarget = this.projection.toScene.forward(this._degTarget);
      utmUp = this.projection.toScene.forward(this._degUp);
    } catch ( e ) {
      return;
    }

    if ( !utmPos || !utmTarget || !utmUp ) return;

    // Build 3D vectors (reusing scratch)
    var pos3 = this._scratchPos.set(utmPos[0], utmPos[1], cartPos.height);
    var target3 = this._scratchTarget.set(utmTarget[0], utmTarget[1], cartTarget.height);
    var up3 = this._scratchUpPt.set(utmUp[0], utmUp[1], cartUp.height);

    // Update View for tools/sidebar
    view.position.copy(pos3);
    var dirX = target3.x - pos3.x;
    var dirY = target3.y - pos3.y;
    var dirZ = target3.z - pos3.z;
    var hLen = Math.sqrt(dirX * dirX + dirY * dirY);
    if ( hLen > 0.0001 ) {
      view.yaw = Math.atan2(dirY, dirX) - Math.PI / 2;
    }
    view.pitch = Math.atan2(dirZ, hLen);
    view.radius = Math.max(1, cartPos.height);

    // === DIRECTLY set THREE.js camera ===
    var camera = this.scene.cameraP;
    camera.position.copy(pos3);

    var upDir = this._scratchUpDir.set(
      up3.x - pos3.x,
      up3.y - pos3.y,
      up3.z - pos3.z
    ).normalize();

    camera.up.copy(upDir);
    camera.lookAt(target3);

    var cameraO = this.scene.cameraO;
    cameraO.position.copy(pos3);
    cameraO.up.copy(upDir);
    cameraO.lookAt(target3);

    this.directCamera = true;

    // Move speed
    var speed = Math.max(5.0, Math.max(1, cartPos.height) / 2.5);
    this.viewer.setMoveSpeed(speed);

    // FOV sync
    var frustum = cam.frustum;
    if ( frustum ) {
      var vFov;
      if ( frustum.fovy !== undefined ) {
        vFov = frustum.fovy;
      } else if ( frustum.fov !== undefined ) {
        var aspect = frustum.aspectRatio || 1;
        if ( aspect >= 1 ) {
          vFov = 2 * Math.atan(Math.tan(frustum.fov * 0.5) / aspect);
        } else {
          vFov = frustum.fov;
        }
      }
      if ( vFov ) {
        var fovDeg = vFov * 180 / Math.PI;
        if ( fovDeg > 1 && fovDeg < 179 ) {
          this.viewer.setFOV(fovDeg);
        }
      }
    }

    if ( doLog ) {
      console.log('=== CesiumControls sync ===');
      console.log('pos:', pos3.x.toFixed(1), pos3.y.toFixed(1), pos3.z.toFixed(1));
      console.log('target:', target3.x.toFixed(1), target3.y.toFixed(1), target3.z.toFixed(1));
      var box = this.scene.getBoundingBox();
      if ( box && !box.isEmpty() ) {
        var c = box.getCenter(this._scratchCenter);
        console.log('PC center:', c.x.toFixed(1), c.y.toFixed(1), c.z.toFixed(1), 'dist:', pos3.distanceTo(c).toFixed(1));
      }
      if ( frustum ) {
        console.log('FOV: fov=' + ((frustum.fov || 0) * 180 / Math.PI).toFixed(1) +
          ' fovy=' + ((frustum.fovy || 0) * 180 / Math.PI).toFixed(1) +
          ' potree=' + this.viewer.getFOV().toFixed(1));
      }
    }
  }

  /**
   * Fly the Cesium camera to the loaded point clouds' bounding box.
   * Must be called after point clouds are loaded and projection is set.
   *
   * @param {number} duration - animation duration in seconds (default 2)
   */
  flyToPointCloud(duration) {
    if ( duration === undefined ) duration = 2;

    var Cesium = window.Cesium;
    if ( !Cesium || !this.scene || !this.projection || !this.projection.toMap || !this.projection.toMap.forward ) return;

    var box = this.scene.getBoundingBox();
    if ( !box || box.isEmpty() ) return;

    var center = box.getCenter(this._scratchCenter);
    var size = box.getSize(this._scratchPos);

    // Horizontal extent of the point cloud
    var horizontalExtent = Math.max(size.x, size.y);

    // Convert UTM center to WGS84
    var degCenter;
    try {
      degCenter = this.projection.toMap.forward([center.x, center.y]);
    } catch ( e ) {
      console.warn('CesiumControls: projection failed for flyToPointCloud');
      return;
    }

    if ( !degCenter || degCenter.length < 2 ) return;

    var lon = degCenter[0];
    var lat = degCenter[1];

    // Compute camera height to fit the full extent in view
    // h = (extent / 2) / tan(fov/2)
    var fovRad = (this.viewer.getFOV() || 60) * Math.PI / 180;
    var halfFov = fovRad / 2;
    var cameraHeight = (horizontalExtent / 2) / Math.tan(halfFov);

    // Ensure minimum height and add some padding
    cameraHeight = Math.max(cameraHeight, center.z + size.z * 2);

    var destination = Cesium.Cartesian3.fromDegrees(lon, lat, cameraHeight);

    this.cesiumViewer.camera.flyTo({
      destination: destination,
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90), // look straight down
        roll: 0,
      },
      duration: duration,
    });

    console.log('CesiumControls: flyTo [' + lon.toFixed(4) + ', ' + lat.toFixed(4) + '] h=' + cameraHeight.toFixed(0) +
      ' extent=' + horizontalExtent.toFixed(0) + ' fov=' + (fovRad * 180 / Math.PI).toFixed(1));
  }
}
