import { DEFAULT_ROUTE_PATH, ROUTES, type AppRoute, type RouteGroup } from './routes';

export { ROUTES, DEFAULT_ROUTE_PATH };
export type { AppRoute, RouteGroup };

/** 按 group 聚合的导航分组（保留 ROUTES 的原始顺序） */
export const NAV_GROUPS: { title: RouteGroup; items: AppRoute[] }[] = (() => {
  const map = new Map<RouteGroup, AppRoute[]>();
  for (const route of ROUTES) {
    const list = map.get(route.group) ?? [];
    list.push(route);
    map.set(route.group, list);
  }
  return Array.from(map, ([title, items]) => ({ title, items }));
})();

/** 通过路径首段定位路由（用于 header 渲染当前页信息） */
export function findRouteByKey(key: string): AppRoute | undefined {
  return ROUTES.find((route) => route.key === key);
}
