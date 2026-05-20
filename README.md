# 容器项目
## 项目说明
“容器项目”，负责画布、设备框、页面说明和跳转关系展示。

## 运行方式
原型页面目录要在在启动开发服务器或编译时通过 `PROTOTYPE_PAGES_DIR` 动态指定，比如：
```bash
PROTOTYPE_PAGES_DIR=../OtherPrototype/src/pages npm run dev
```

## 目录说明
- `src/components`：用于存放可复用的VUE组件。
- `src/styles`：用于存放可复用的样式和DesignToken。
- `src/pages`：用于存放具体的VUE页面。
- `src/utils`：用于存放工具函数的目录。
  - `utils-device.ts`：用于获取设计基准设备相关数据。
- `src/constants`：用于存放常量的目录。
  - `constants-devices.ts`：用于存放设计基准设备相关常量。
- `plugins/`：用于存放vite插件
