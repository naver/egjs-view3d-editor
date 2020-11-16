/*
 * egjs-view3d-editor
 * Copyright (c) 2020-present NAVER Corp.
 * MIT license
 */

export interface LightOption {
  color: string;
  intensity: number;
  intensityRange: [number, number];
  x: number;
  y: number;
  z: number;
  range: [number, number];
  castShadow: boolean,
  showHelper: boolean,
}
