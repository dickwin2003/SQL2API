/**
 * 根路径重定向中间件
 * 将根路径"/"重定向到登录页面"/login"
 */
export default defineNuxtRouteMiddleware((to) => {
  // 只处理根路径
  if (to.path === '/') {
    // 检查是否已经登录
    const session = useState('session');
    if (!session.value || !session.value.authenticated) {
      // 未登录时重定向到登录页
      return navigateTo('/login');
    }
    // 已登录则允许访问首页
    return;
  }
});
