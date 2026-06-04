# 静态前端仪表盘实施计划

## 目标

为量化回测项目增加一个纯静态前端展示页。页面不依赖后端服务，能够读取 CSV 数据并随数据变化自动更新指标和净值曲线。

## 文件改动

- 修改 `src/backtest.py`：继续输出原有 `outputs` 文件，同时新增 `data/backtest_summary.csv` 和 `data/equity_curve.csv`。
- 新增 `index.html`：仪表盘入口页面。
- 新增 `assets/style.css`：金融终端风格样式。
- 新增 `assets/app.js`：读取 CSV、渲染指标卡、绘制 SVG 净值曲线、支持上传 CSV 更新页面。
- 修改 `README.md`：补充前端展示和 GitHub Pages 使用说明。

## 验证

- 运行 `python src/backtest.py`，确认前端数据文件生成。
- 启动本地静态服务器，打开 `index.html`。
- 检查页面能够读取 CSV、渲染指标、绘制曲线。
- 检查上传 CSV 后指标区域可刷新。
