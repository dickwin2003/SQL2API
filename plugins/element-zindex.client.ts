import { ZINDEX_INJECTION_KEY } from 'element-plus';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.provide(ZINDEX_INJECTION_KEY, { current: 0 });
}); 