# 交易员量化回测入门项目

这是一个用于 ETF / 指数动量策略研究的 Python 回测项目，包含行情数据处理、交易信号生成、风险指标计算和静态前端展示。

项目覆盖以下内容：

- 使用 Python 处理行情时间序列数据。
- 理解收益率、波动率、最大回撤、胜率、盈亏比、夏普比率等交易指标。
- 能把交易想法转成明确规则，并用回测验证。
- 重视手续费、滑点、仓位、止损和回撤控制。
- 能输出清晰的研究结论和复盘材料。

## 策略逻辑

策略以宽基指数或高流动性 ETF 为研究对象，使用两类简单信号：

1. 趋势过滤：收盘价高于 120 日均线时才允许持仓。
2. 动量确认：20 日均线高于 60 日均线时持仓，否则空仓。

仓位只做 `0` 或 `1`，不使用杠杆。回测中扣除简单交易成本，用于观察策略净值曲线、基准净值曲线和最大回撤。

## 前端展示

项目新增了纯静态前端仪表盘：

```text
index.html
assets/
  style.css
  app.js
data/
  backtest_summary.csv
  equity_curve.csv
```

页面会读取 `data/backtest_summary.csv` 和 `data/equity_curve.csv`，自动渲染核心指标和净值曲线。重新运行回测或替换 CSV 后，页面展示会随数据变化。

本地查看：

```bash
python -m http.server 8000
```

然后在浏览器打开：

```text
http://localhost:8000
```

也可以直接部署到 GitHub Pages，作为在线项目展示页。

## 项目结构

```text
trader-quant-starter/
  index.html
  assets/
    app.js
    style.css
  data/
    backtest_summary.csv
    equity_curve.csv
  README.md
  requirements.txt
  src/
    backtest.py
  outputs/
    backtest_summary.csv
    equity_curve.png
```

## 运行方式

```bash
pip install -r requirements.txt
python src/backtest.py
```

脚本默认会生成一组可复现的模拟行情数据，保证没有网络和外部数据时也能运行。如果有自己的行情 CSV，可以放在 `data/market.csv`，字段格式：

```csv
date,close
2024-01-02,100.25
2024-01-03,101.10
```

## 输出结果

运行后会在 `outputs` 目录生成：

- `backtest_summary.csv`：策略收益、基准收益、最大回撤、年化波动率、夏普比率、交易次数等。
- `equity_curve.png`：策略净值与基准净值对比图。

同时会在 `data` 目录生成前端专用数据：

- `backtest_summary.csv`：前端指标卡数据。
- `equity_curve.csv`：前端净值曲线数据。

## 风险提示

当前策略使用简单均线和动量规则，主要用于展示研究流程和技术实现。回测结果不构成投资建议，也不代表未来收益。进一步研究需要接入真实历史数据、扩大标的范围，并进行参数稳健性、交易成本、滑点和极端行情测试。
