const THREE = require('three')
const fboHelper = require('./helpers/fboHelper')
import EventEmitter from 'eventemitter3'
import { 
  webGL2 as hasWebGL2,
  multiRenderTargets as supportsMultiRenderTargets, 
  depthTexture as supportsDepthTextures } from '../utils/supports'


function createRenderTarget (isMultiRenderTarget) {
  if (isMultiRenderTarget) {
    return fboHelper.createMultiRenderTarget(exports.multiRenderTargetCount, 1, 1, THREE.RGBFormat, THREE.UnsignedByteType)
  }
  return fboHelper.createRenderTarget(1, 1, THREE.RGBFormat, THREE.UnsignedByteType)
}


// const MinSignal = require('min-signal')
// const mixIn = require('mout/object/mixIn')

// let undef

// // functions
// exports.init = init
// exports.hijackRenderer = hijackRenderer
// exports.resize = resize
// exports.updateSizeFromRenderMethod = updateSizeFromRenderMethod
// exports.renderQueue = renderQueue
// exports.renderScene = renderScene
// exports.render = render
// exports.swapRenderTarget = swapRenderTarget

// // properties
// exports.queue = []
// exports.gl = undef
// exports.renderer = undef
// exports.scene = undef
// exports.camera = undef
// exports.renderMethod = undef

// read only properties
let beforeRendered = exports.beforeRendered = new MinSignal()
let afterRendered = exports.afterRendered = new MinSignal()

let sceneRenderTarget = exports.sceneRenderTarget = undef
let fromRenderTarget = exports.fromRenderTarget = undef
let toRenderTarget = exports.toRenderTarget = undef
let resolution = exports.resolution = undef
let viewportResolution = exports.viewportResolution = undef
let depthTexture = exports.depthTexture = undef

let _isWebGL2 = exports._isWebGL2 = undef
let _isSupportMultiRenderTarget = exports._isSupportMultiRenderTarget = undef
let _isSupportDepthTexture = exports._isSupportDepthTexture = undef

let width = exports.width = 0
let height = exports.height = 0

let _renderTargetWidth = 0
let _renderTargetHeight = 0

 
function hijackRenderer (renderer) {
  if (!renderer._actualRender) {
    renderer._actualRender = renderer.render
    renderer.render = _rendererActualRender
  }
}

function rendererActualRender (scene, camera, renderTarget, forceClear) {
  beforeRendered.dispatch(scene, camera, renderTarget, forceClear)
  exports.renderer._actualRender(scene, camera, renderTarget, forceClear)
  afterRendered.dispatch(scene, camera, renderTarget, forceClear)
}





function resize (w, h) {
  // width = exports.width = refWidth
  // height = exports.height = refHeight

  // let renderer = exports.renderer
  // let camera = exports.camera

  if (this.camera.type === 'OrthographicCamera') {
    this.camera.left = w / -2
    this.camera.right = w / 2
    this.camera.top = h / 2
    this.camera.bottom = h / -2
  } else {
    this.camera.aspect = w / h
  }

  this.camera.updateProjectionMatrix()
  // let renderMethod = exports.renderMethod || exports.renderer

  renderer.setRenderTarget(null)
  renderer.setSize(width, height)

  // if (renderMethod === exports.renderer) {
    // updateSizeFromRenderMethod()
  // }
}

// function updateSizeFromRenderMethod () {
//   // let renderer = exports.renderer
//   let rendererSize = this.renderer.getSize()
//   // width = exports.width = rendererSize.width
//   // height = exports.height = rendererSize.height

//   let renderMethod = exports.renderMethod
//   let viewportScaleX = renderMethod ? renderMethod.viewportScaleX : 1
//   let viewportScaleY = renderMethod ? renderMethod.viewportScaleY : 1

//   resolution.set(width, height)
//   viewportResolution.set(width * viewportScaleX, height * viewportScaleY)
// }


class EffectComposer{

  constructor(renderer){
    this.renderer = renderer
    const depthTexture = new THREE.DepthTexture()
    depthTexture.type = hasWebGL2 ? THREE.FloatType : THREE.UnsignedShortType

    const gl = renderer.getContext()

    const sceneRenderTarget = createRenderTarget(supportsMultiRenderTargets)
    sceneRenderTarget.depthBuffer = true
    sceneRenderTarget.stencilBuffer = true

    const fromRenderTarget = createRenderTarget()
    const toRenderTarget =  createRenderTarget()

    const resolution = new THREE.Vector2()
    const viewportResolution = exports.viewportResolution = new THREE.Vector2()
  }

  setSize(w, h){
    this.sceneRenderTarget.setSize(w, h)
    this.fromRenderTarget.setSize(w, h)
    this.toRenderTarget.setSize(w, h)
  }

  render (queue, dt) {
    hijackRenderer(this.renderer)

    let renderableQueue = queue.filter(effect => effect.enabled && effect.needsRender())

    if (renderableQueue.length > 0) {

      // _resizeRenderTargets()

      if (sceneRenderTarget.depthBuffer && supportsDepthTextures /*&& exports.useDepthTexture*/) {
        depthTexture.width = sceneRenderTarget.width
        depthTexture.height = sceneRenderTarget.height
        sceneRenderTarget.depthTexture = depthTexture
      }

      this.renderer.render(scene, camera, sceneRenderTarget)

      sceneRenderTarget.depthTexture = null

      fboHelper.renderer.setViewport(0, 0, sceneRenderTarget.width, sceneRenderTarget.height)
      fboHelper.renderer.setScissor(0, 0, sceneRenderTarget.width, sceneRenderTarget.height)

      const [fromRenderTarget, toRenderTarget] = [toRenderTarget, fromRenderTarget]
      
      // swapRenderTarget()
      let scene = exports.scene
      let autoUpdate = scene.autoUpdate
      let effect, renderTarget

      for (let i = 0, len = renderableQueue.length; i < len; i++) {
        effect = renderableQueue[i]
        if (i) {
          renderTarget = fromRenderTarget
        } else if (supportsMultiRenderTargets) {
          renderTarget = sceneRenderTarget.attachments[0] // assume it is using the first attachment for the scene
        } else {
          renderTarget = sceneRenderTarget
        }
        effect.render(dt, renderTarget, (i === len - 1))
      }

      scene.autoUpdate = autoUpdate

    } else {

      this.renderer.render(scene, camera)

    }

    // if (exports.renderMethod) {
    //   exports.renderMethod.afterRendering()
    // }
  }

  // renderScene (scene, camera, renderTarget) {
  //   // scene = scene || exports.scene
  //   // camera = camera || exports.camera

  //   if (renderTarget) {
  //     this.renderer.render(scene, camera, renderTarget)
  //   } else {
  //     this.renderer.render(scene, camera)
  //   }
  // }

  render (material, toScreen, swap) {
    fboHelper.render(material, toScreen ? undef : toRenderTarget)
    if (swap !== false) {
      swapRenderTarget()
    }
    return fromRenderTarget
  }

  // swap the from & to renderTargets
 
}

function swapRenderTarget () {
  let tmp = toRenderTarget
  toRenderTarget = toRenderTarget = fromRenderTarget
  fromRenderTarget = fromRenderTarget = tmp
}