/*
 * egjs-view3d-editor
 * Copyright (c) 2020-present NAVER Corp.
 * MIT license
 */

import View3D, {
  THREE,
  GLTFLoader,
  DracoLoader,
  ShadowPlane,
  OrbitControl,
  AutoDirectionalLight,
  Model,
} from "@egjs/view3d";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import Swal from "sweetalert2";
import { SimpleDropzone } from "simple-dropzone";

import LOD from "./components/LOD";
import { LightOption } from "./types";

class App {
  private _viewer: View3D;
  private _gltfLoader: GLTFLoader;
  private _dracoLoader: DracoLoader;
  private _light1: AutoDirectionalLight;
  private _light2: AutoDirectionalLight;
  private _light3: AutoDirectionalLight;
  private _lightHelper1: THREE.DirectionalLightHelper;
  private _lightHelper2: THREE.DirectionalLightHelper;
  private _lightHelper3: THREE.DirectionalLightHelper;
  private _ambient: THREE.AmbientLight;
  private _shadowPlane: ShadowPlane;
  private _lod: Readonly<LOD>;
  private _controlKit: any
  private _modelOptions: {
    size: number;
    sizeRange: [number, number];
    castShadow: boolean;
    receiveShadow: boolean;
  };
  private _simplifyOptions: {
    targetPercentage: number;
    aggressiveness: number;
    targetRange: [number, number];
    aggressiveRange: [number, number];
  };
  private _cameraOptions: {
    yaw: number;
    yawRange: [number, number];
    pitch: number;
    pitchRange: [number, number];
    distanceRange: [number, number];
  };
  private _envOptions: {
    background: string;
    shadow: {
      opacity: number;
      opacityRange: [number, number];
    },
    ambient: {
      color: string;
      intensity: number;
      intensityRange: [number, number];
    },
    light1: LightOption;
    light2: LightOption;
    light3: LightOption;
  };

  constructor() {
    this._viewer = new View3D("#app");
    this._gltfLoader = new GLTFLoader();
    this._dracoLoader = new DracoLoader();
    // @ts-ignore
    this._controlKit = new ControlKit();

    this._lod = new LOD();

    this._modelOptions = {
      size: 80,
      sizeRange: [1, 200],
      castShadow: true,
      receiveShadow: false,
    };
    this._simplifyOptions = {
      targetPercentage: 0.5,
      targetRange: [0.01, 0.99],
      aggressiveness: 7,
      aggressiveRange: [1, 14],
    };
    this._cameraOptions = {
      yaw: 30,
      yawRange: [0, 360],
      pitch: 15,
      pitchRange: [-90, 90],
      distanceRange: [1, 500],
    };
    this._envOptions = {
      background: "#574646",
      shadow: {
        opacity: 0.3,
        opacityRange: [0, 1],
      },
      ambient: {
        color: "#ffffff",
        intensity: 0.4,
        intensityRange: [0, 5],
      },
      light1: {
        color: "#ffffaa",
        intensity: 1.5,
        intensityRange: [0, 5],
        x: 1,
        y: 0.66,
        z: 0.33,
        range: [-1, 1],
        castShadow: true,
        showHelper: true,
      },
      light2: {
        color: "#ffffff",
        intensity: 0.1,
        intensityRange: [0, 5],
        x: 0.33,
        y: 0.66,
        z: 1,
        range: [-1, 1],
        castShadow: false,
        showHelper: true,
      },
      light3: {
        color: "#5555ff",
        intensity: 1,
        intensityRange: [0, 5],
        x: -1,
        y: -0.33,
        z: -1,
        range: [-1, 1],
        castShadow: false,
        showHelper: true,
      }
    };

    this._initEnv();
    this._initDropZone();
    this._initControl();

    // Load default model
    this._gltfLoader.load("./assets/moon.glb").then(this._loadModel);
  }

  private _initControl() {
    const controlKit = this._controlKit;

    const viewer = this._viewer;
    const modelOptions = this._modelOptions;
    const envOptions = this._envOptions;
    const simplifyOptions = this._simplifyOptions;
    const cameraOptions = this._cameraOptions;

    const lights = [this._light1, this._light2, this._light3];
    const helpers = [this._lightHelper1, this._lightHelper2, this._lightHelper3];
    const ambient = this._ambient;
    const lod = this._lod;
    const shadowPlane = this._shadowPlane;

    const updateLight = (light, helper, values) => {
      light.direction.set(
        -values.x,
        -values.y,
        values.z
      );
      light.fit(viewer.model);
      light.light.updateMatrixWorld();
      helper.update();
    }

    const panel = controlKit.addPanel({ width: 400, align: "right" })
    panel
      .addButton("Download", this._download)
      .addButton("Download Model (GLB)", this._downloadModel)
      .addButton("Download Simplified Model (GLB)", this._downloadSimplifiedModel)
      .addGroup({ label: "Model" })
        .addSubGroup()
          .addSlider(modelOptions, "size", "sizeRange", { step: 1, dp: 0,
            onChange: () => viewer.model.size = modelOptions.size,
          })
          .addCheckbox(modelOptions, "castShadow", {
            onChange: e => viewer.model && (viewer.model.castShadow = modelOptions.castShadow),
          })
          .addCheckbox(modelOptions, "receiveShadow", {
            onChange: e => viewer.model && (viewer.model.receiveShadow = modelOptions.receiveShadow),
          })
      .addGroup({ label: "Camera" })
        .addSubGroup()
          .addSlider(cameraOptions, "yaw", "yawRange", { step: 0.1, dp: 1,
            onChange: () => viewer.camera.yaw = cameraOptions.yaw,
            onFinish: () => viewer.camera.yaw = cameraOptions.yaw,
          })
          .addSlider(cameraOptions, "pitch", "pitchRange", { step: 0.1, dp: 1,
            onChange: () => viewer.camera.pitch = cameraOptions.pitch,
            onFinish: () => viewer.camera.pitch = cameraOptions.pitch,
          })
          .addRange(cameraOptions, "distanceRange", { label: "distance - range",
            onChange: () => {
              viewer.camera.minDistance = cameraOptions.distanceRange[0];
              viewer.camera.maxDistance = cameraOptions.distanceRange[1];

              viewer.controller.syncToCamera();
            }
          })
      .addGroup({ label: "Environment" })
        .addSubGroup()
          .addColor(envOptions, "background", {
            onChange: e => viewer.scene.setBackground(new THREE.Color(e))
          })
        .addSubGroup({ label: "Shadow" })
          .addSlider(envOptions.shadow, "opacity", "opacityRange", { step: 0.01, dp: 2,
            onChange: () => shadowPlane.opacity = envOptions.shadow.opacity,
            onFinish: () => shadowPlane.opacity = envOptions.shadow.opacity,
          })

    const lightGroup = panel.addGroup({ label: "Light" });
    lightGroup.addSubGroup({ label: "Ambient" })
      .addColor(envOptions.ambient, "color", {
        onChange: e => ambient.color = new THREE.Color(e)
      })
      .addSlider(envOptions.ambient, "intensity", "intensityRange", { step: 0.1, dp: 2,
        onChange: () => ambient.intensity = envOptions.ambient.intensity,
        onFinish: () => ambient.intensity = envOptions.ambient.intensity,
      });

    [0, 1, 2].forEach(lightIndex => {
      const light = lights[lightIndex];
      const helper = helpers[lightIndex];
      const options = envOptions[`light${lightIndex + 1}`];

      lightGroup.addSubGroup({ label: `Directional ${lightIndex + 1}` })
        .addColor(options, "color", {
          onChange: e => light.light.color = new THREE.Color(e),
          onFinish: e => light.light.color = new THREE.Color(e)
        })
        .addSlider(options, "intensity", "intensityRange", { step: 0.1, dp: 2,
          onChange: () => light.light.intensity = options.intensity,
          onFinish: () => light.light.intensity = options.intensity,
        })
        .addSlider(options, "x", "range", { step: 0.01, dp: 2,
          onChange: () => updateLight(light, helper, options),
          onFinish: () => updateLight(light, helper, options),
        })
        .addSlider(options, "y", "range", { step: 0.01, dp: 2,
          onChange: () => updateLight(light, helper, options),
          onFinish: () => updateLight(light, helper, options),
        })
        .addSlider(options, "z", "range", { step: 0.01, dp: 2,
          onChange: () => updateLight(light, helper, options),
          onFinish: () => updateLight(light, helper, options),
        })
        .addCheckbox(options, "castShadow", {
          onChange: () => light.light.castShadow = options.castShadow,
        })
        .addCheckbox(options, "showHelper", {
          onChange: () => helper.visible = options.showHelper,
        })
    });

    panel.addGroup({ label: "LOD" })
      .addSubGroup()
        .addSlider(simplifyOptions, "targetPercentage", "targetRange", { step: 0.1, dp: 2,
          onFinish: () => lod.simplifier.targetPercentage = this._simplifyOptions.targetPercentage,
        })
        .addSlider(simplifyOptions, "aggressiveness", "aggressiveRange", { step: 1, dp: 0,
          onFinish: () => lod.simplifier.aggressiveness = this._simplifyOptions.aggressiveness,
        })
        .addButton("Preview", this._showLowLOD)
        .addButton("Restore", this._restoreModel)
  }

  private _initDropZone() {
    const pageWrapper = document.querySelector("#container");
    const fileInput = document.querySelector("#file-fallback");
    const dropzone = new SimpleDropzone(pageWrapper, fileInput);
    const gltfLoader = this._gltfLoader;
    const drcLoader = this._dracoLoader;

    dropzone.on("drop", ({ files: fileMap }) => {
      Swal.fire({
        title: "Loading your model...",
        showCancelButton: false,
        showCloseButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        onBeforeOpen: () => { Swal.showLoading(); }
      });

      const files = Array.from(fileMap) as [string, File][];
      const isDRC = files.some(([name]) => name.endsWith(".drc"));

      if (isDRC) {
        const [_, drcFile] = files.find(([name]) => name.endsWith(".drc"))!;
        const fileURL = URL.createObjectURL(drcFile);

        drcLoader.load(fileURL)
          .then(model => {
            this._loadModel(model);
          })
          .catch(e => {
            this._showError(e);
          })
          .finally(() => {
            Swal.close();
            URL.revokeObjectURL(fileURL);
          });
      } else {
        gltfLoader.loadFromFiles(files.map(([name, file]) => file))
          .then(model => {
            this._loadModel(model);
          })
          .catch(e => {
            this._showError(e);
          })
          .finally(() => {
            Swal.close();
          });
      }
    });
  }

  private _initEnv() {
    // Add default env objects that won't be removed after showing a new model
    const viewer = this._viewer;
    const shadowPlane = new ShadowPlane();
    const envOptions = this._envOptions;
    const cameraOptions = this._cameraOptions;

    viewer.renderer.enableShadow();
    viewer.camera.setDefaultPose({
      yaw: cameraOptions.yaw,
      pitch: cameraOptions.pitch,
    });

    viewer.scene.setBackground(new THREE.Color(envOptions.background));

    // Lights & Shaodw setup
    const ambient = new THREE.AmbientLight(envOptions.ambient.color, envOptions.ambient.intensity);
    const light1 = new AutoDirectionalLight(envOptions.light1.color, envOptions.light1.intensity);
    const light2 = new AutoDirectionalLight(envOptions.light2.color, envOptions.light2.intensity);
    const light3 = new AutoDirectionalLight(envOptions.light3.color, envOptions.light3.intensity);

    light1.direction.set(-envOptions.light1.x, -envOptions.light1.y, -envOptions.light1.z);
    light2.direction.set(-envOptions.light2.x, -envOptions.light2.y, -envOptions.light2.z);
    light3.direction.set(-envOptions.light3.x, -envOptions.light3.y, -envOptions.light3.z);

    light1.light.castShadow = envOptions.light1.castShadow;
    light2.light.castShadow = envOptions.light2.castShadow;
    light3.light.castShadow = envOptions.light3.castShadow;

    viewer.scene.addEnv(light1);
    viewer.scene.addEnv(light2);
    viewer.scene.addEnv(light3);

    const lightHelper1 = new THREE.DirectionalLightHelper(light1.light, 5);
    const lightHelper2 = new THREE.DirectionalLightHelper(light2.light, 5);
    const lightHelper3 = new THREE.DirectionalLightHelper(light3.light, 5);

    viewer.scene.addEnv(lightHelper1);
    viewer.scene.addEnv(lightHelper2);
    viewer.scene.addEnv(lightHelper3);

    viewer.scene.addEnv(ambient);
    viewer.scene.addEnv(shadowPlane);

    // Controls setup
    viewer.controller.add(new OrbitControl());

    this._ambient = ambient;
    this._light1 = light1;
    this._light2 = light2;
    this._light3 = light3;
    this._lightHelper1 = lightHelper1;
    this._lightHelper2 = lightHelper2;
    this._lightHelper3 = lightHelper3;
    this._shadowPlane = shadowPlane;
  }

  private _loadModel = (model: Model) => {
    const viewer = this._viewer;
    const cameraOptions = this._cameraOptions;

    model.castShadow = this._modelOptions.castShadow;
    model.receiveShadow = this._modelOptions.receiveShadow;

    viewer.animator.setClips(model.animations);

    viewer.display(model);

    viewer.camera.minDistance = cameraOptions.distanceRange[0];
    viewer.camera.maxDistance = cameraOptions.distanceRange[1];

    this._light1.light.updateMatrixWorld();
    this._light2.light.updateMatrixWorld();
    this._light3.light.updateMatrixWorld();
    this._lightHelper1.update();
    this._lightHelper2.update();
    this._lightHelper3.update();

    this._lod.restore();

    viewer.animator.play(0);
  }

  private _download = async () => {
    try {
      Swal.fire({
        title: "Processing Your Model...",
        html: "<div id=\"swal-msg\">Preparing preset file</div>",
        showCancelButton: false,
        showCloseButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        onBeforeOpen: () => { Swal.showLoading(); }
      });

      const modelOptions = this._modelOptions;
      const cameraOptions = this._cameraOptions;
      const envOptions = this._envOptions;

      const options = {
        model: modelOptions,
        camera: cameraOptions,
        env: envOptions,
        LOD: [
          "model_simplified.glb",
          "model_original.glb",
        ]
      };

      const a = document.createElement("a");
      const metafile = new Blob([JSON.stringify(options)], { type: "application/json" });
      const url = URL.createObjectURL(metafile);
      a.href = url;
      a.download = "model.json";
      a.click();

      URL.revokeObjectURL(url);

      const swalMsg = document.querySelector("#swal-msg")!;
      swalMsg.innerHTML = "Preparing original model";
      await this._downloadModel();
      swalMsg.innerHTML = "Preparing simplified model";
      await this._downloadSimplifiedModel();
      Swal.close();
    } catch (e) {
      this._showError(e);
      Swal.close();
    }
  }

  private _downloadModel = async () => {
    try {
      const origModel = this._viewer.model;

      new GLTFExporter().parse(origModel.scene, gltf => {
        const tempAnchorTag = document.createElement("a");

        const blob = new Blob([gltf as ArrayBuffer]);
        const url = URL.createObjectURL(blob);

        tempAnchorTag.href = url;
        tempAnchorTag.download = "model_original.glb";
        tempAnchorTag.click();
        URL.revokeObjectURL(url);
      }, { binary: true, animations: origModel.animations });
    } catch (e) {
      this._showError(e);
    }
  }

  private _downloadSimplifiedModel = async () => {
    const lod = this._lod;

    try {
      if (!lod.simplifiedModel) {
        await this._simplifyModel();
      }
      const simplifiedModel = lod.simplifiedModel!;

      simplifiedModel.fixSkinnedBbox = true;

      new GLTFExporter().parse(simplifiedModel.scene, gltf => {
        const tempAnchorTag = document.createElement("a");

        const blob = new Blob([gltf as ArrayBuffer]);
        const url = URL.createObjectURL(blob);

        tempAnchorTag.href = url;
        tempAnchorTag.download = "model_simplified.glb";
        tempAnchorTag.click();
        URL.revokeObjectURL(url);
      }, { binary: true });

      this._viewer.animator.play(0);
    } catch (e) {
      this._showError(e);
    }
  }

  private _simplifyModel = async () => {
    this._viewer.animator.stop(0);
    this._viewer.renderer.render(this._viewer.scene, this._viewer.camera);

    const targetModel = this._lod.simplifiedModel
      ? this._lod.origModel
      : this._viewer.model;

    await this._lod.simplify(targetModel!)
      .catch(this._showError);
  }

  private _showLowLOD = async () => {
    const lod = this._lod;

    try {
      Swal.fire({
        title: "Simplifying your model...",
        showCancelButton: false,
        showCloseButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        onBeforeOpen: () => { Swal.showLoading(); }
      });

      await this._simplifyModel();

      const simplifiedModel = lod.simplifiedModel!;

      this._viewer.display(simplifiedModel);
      simplifiedModel.size = this._modelOptions.size;
      Swal.close();
    } catch (e) {
      this._showError(e);
    }
  }

  private _restoreModel = () => {
    const viewer = this._viewer;

    if (!this._lod.origModel) return;

    viewer.display(this._lod.origModel);
    viewer.animator.play(0);

    this._lod.restore();
  }

  private _showError(e: Error) {
    Swal.fire(e.name, e.message, "error");
    console.error(e);
  }
}

export default App;

