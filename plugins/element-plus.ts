// Element Plus插件配置
import { defineNuxtPlugin } from "#app";
import ElementPlus from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import { ID_INJECTION_KEY } from 'element-plus'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(ElementPlus);

  // 全局注册Element Plus图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    nuxtApp.vueApp.component(key, component);
  }

  // 提供 ID 注入器
  nuxtApp.vueApp.provide(ID_INJECTION_KEY, {
    prefix: 100,
    current: 0,
  })
});
