import blurFs from './blur.fs?raw';
import blurVs from './blur.vs?raw';
import edlFs from './edl.fs?raw';
import edlVs from './edl.vs?raw';
import normalizeFs from './normalize.fs?raw';
import normalizeVs from './normalize.vs?raw';
import normalizeAndEdlFs from './normalize_and_edl.fs?raw';
import pointcloudFs from './pointcloud.fs?raw';
import pointcloudVs from './pointcloud.vs?raw';
import pointcloudSmFs from './pointcloud_sm.fs?raw';
import pointcloudSmVs from './pointcloud_sm.vs?raw';
import pointcloudDynamicFs from './pointcloud_dynamic.fs?raw';
import pointcloudDynamicVs from './pointcloud_dynamic.vs?raw';

export const Shaders = {
  'blur.fs': blurFs,
  'blur.vs': blurVs,
  'edl.fs': edlFs,
  'edl.vs': edlVs,
  'normalize.fs': normalizeFs,
  'normalize.vs': normalizeVs,
  'normalize_and_edl.fs': normalizeAndEdlFs,
  'pointcloud.fs': pointcloudFs,
  'pointcloud.vs': pointcloudVs,
  'pointcloud_sm.fs': pointcloudSmFs,
  'pointcloud_sm.vs': pointcloudSmVs,
  'pointcloud_dynamic.fs': pointcloudDynamicFs,
  'pointcloud_dynamic.vs': pointcloudDynamicVs,
};
