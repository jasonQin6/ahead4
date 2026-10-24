import { buildShipGeometries } from './geometry.js';
import { initApp } from './app.js';

const build = buildShipGeometries();
initApp(build);
