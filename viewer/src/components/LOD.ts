/*
 * egjs-view3d-editor
 * Copyright (c) 2020-present NAVER Corp.
 * MIT license
 */

import { FastQuadric, ThreeAdapter } from "mesh-simplifier";
import { THREE, Model } from "@egjs/view3d";

import { STANDARD_MAPS } from "../consts";

class LOD {
  public simplifier: FastQuadric;
  public origModel: Model | null;
  public simplifiedModel: Model | null;

  constructor() {
    this.simplifier = new FastQuadric();

    this.origModel = null;
    this.simplifiedModel = null;
  }

  public async simplify(model: Model) {
    const adaptedModel = new ThreeAdapter(model.scene, true);
    this.origModel = model;

    // Synchronous
    this.simplifier.simplify(adaptedModel);
    this.simplifiedModel = new Model(adaptedModel.object, model.cameras, []);

    console.log(`Simplify - took ${this.simplifier.timeConsumed}ms`);

    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d")!;

    const resize = (texture: THREE.Texture) => {
      const image = texture.image;
      const origWidth = image.naturalWidth;
      const origHeight = image.naturalHeight;

      const width = origWidth >= 128 ? 128 : origWidth;
      const height = origHeight >= 128 ? 128 : origHeight;

      tempCanvas.width = width;
      tempCanvas.height = height;
      ctx.drawImage(image, 0, 0, width, height);

      // Bind new image element
      texture.image = document.createElement("img");
      texture.image.src = tempCanvas.toDataURL("image/png");
      texture.needsUpdate = true;
    }

    const meshes: THREE.Mesh[] = [];
    this.simplifiedModel.scene.traverse(obj => {
      if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
    });


    const promises = meshes.map(mesh => {
      const materials: THREE.MeshStandardMaterial[] = Array.isArray(mesh.material)
        ? mesh.material as THREE.MeshStandardMaterial[]
        : [mesh.material as THREE.MeshStandardMaterial];

      return Promise.all(materials.map(mat => {
        return Promise.all(STANDARD_MAPS.map(mapName => {
          if (mat[mapName]) {
            const texture = mat[mapName];

            if (texture.image.complete) {
              resize(texture);
              return Promise.resolve();
            } else {
              return new Promise(resolve => {
                const onload = () => {
                  resize(texture);
                  mat[mapName].image.removeEventListener("load", onload);
                  resolve();
                }
                mat[mapName].image.addEventListener("load", onload);
              });
            }
          }
        }))
      }));
    });

    return Promise.all(promises);
  }

  public restore() {
    if (this.simplifiedModel) {
      this.simplifiedModel.meshes.forEach(mesh => {
        mesh.geometry.dispose();

        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        materials.forEach(mat => {
          for (const property in mat) {
            if (mat[property] && mat[property].isTexture) {
              mat[property].dispose();
            }
          }
          mat.dispose();
        })
      });
    }

    this.origModel = null;
    this.simplifiedModel = null;
  }
}

export default LOD;
