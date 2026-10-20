import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests/e2e',fullyParallel:false,workers:1,retries:0,reporter:'list',
  use:{baseURL:'http://127.0.0.1:3000',viewport:{width:1280,height:900},trace:'retain-on-failure'},
  webServer:{command:'npm run start -- --port 3000',url:'http://127.0.0.1:3000',reuseExistingServer:false,timeout:60000,
    env:{FORKTRADE_MODE:'offline',FORKTRADE_DB:`.local/e2e-offline-${Date.now()}.db`,FORKTRADE_ORIGIN:'http://127.0.0.1:3000',FORKTRADE_AUTH_ENABLED:'false',FORKTRADE_EXECUTION_ENABLED:'false'}}
});
