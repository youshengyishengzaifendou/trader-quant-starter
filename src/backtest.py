from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "market.csv"
OUTPUT_DIR = ROOT / "outputs"


def load_market_data() -> pd.DataFrame:
    if DATA_PATH.exists():
        df = pd.read_csv(DATA_PATH, parse_dates=["date"])
        df = df.sort_values("date").dropna(subset=["close"])
        return df[["date", "close"]].reset_index(drop=True)

    return generate_sample_market()


def generate_sample_market(days: int = 720, seed: int = 20) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range("2023-01-02", periods=days)

    regimes = np.r_[
        np.full(260, 0.00075),
        np.full(180, -0.00020),
        np.full(280, 0.00055),
    ]
    cycle = np.sin(np.linspace(0, 7 * np.pi, days)) * 0.001
    shock = rng.normal(0, 0.008, days)
    returns = regimes + cycle + shock

    close = 100 * np.exp(np.cumsum(returns))
    return pd.DataFrame({"date": dates, "close": close})


def max_drawdown(equity: pd.Series) -> float:
    running_max = equity.cummax()
    drawdown = equity / running_max - 1
    return float(drawdown.min())


def sharpe_ratio(returns: pd.Series, periods: int = 252) -> float:
    vol = returns.std()
    if vol == 0 or np.isnan(vol):
        return 0.0
    return float(np.sqrt(periods) * returns.mean() / vol)


def run_backtest(df: pd.DataFrame, fee: float = 0.0003) -> tuple[pd.DataFrame, pd.DataFrame]:
    data = df.copy()
    data["ret"] = data["close"].pct_change().fillna(0)

    data["ma_short"] = data["close"].rolling(20).mean()
    data["ma_mid"] = data["close"].rolling(60).mean()
    data["ma_long"] = data["close"].rolling(120).mean()

    trend_ok = data["close"] > data["ma_long"]
    momentum_ok = data["ma_short"] > data["ma_mid"]
    data["position"] = (trend_ok & momentum_ok).astype(float).shift(1).fillna(0)

    data["trade"] = data["position"].diff().abs().fillna(0)
    data["strategy_ret"] = data["position"] * data["ret"] - data["trade"] * fee
    data["strategy_equity"] = (1 + data["strategy_ret"]).cumprod()
    data["benchmark_equity"] = (1 + data["ret"]).cumprod()

    summary = pd.DataFrame(
        [
            {
                "metric": "strategy_total_return",
                "value": data["strategy_equity"].iloc[-1] - 1,
            },
            {
                "metric": "benchmark_total_return",
                "value": data["benchmark_equity"].iloc[-1] - 1,
            },
            {
                "metric": "strategy_max_drawdown",
                "value": max_drawdown(data["strategy_equity"]),
            },
            {
                "metric": "benchmark_max_drawdown",
                "value": max_drawdown(data["benchmark_equity"]),
            },
            {
                "metric": "strategy_sharpe",
                "value": sharpe_ratio(data["strategy_ret"]),
            },
            {
                "metric": "annualized_volatility",
                "value": data["strategy_ret"].std() * np.sqrt(252),
            },
            {
                "metric": "trade_count",
                "value": int(data["trade"].sum()),
            },
            {
                "metric": "days_in_market_ratio",
                "value": data["position"].mean(),
            },
        ]
    )

    return data, summary


def save_outputs(data: pd.DataFrame, summary: pd.DataFrame) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    summary.to_csv(OUTPUT_DIR / "backtest_summary.csv", index=False, encoding="utf-8-sig")

    plt.figure(figsize=(10, 5))
    plt.plot(data["date"], data["strategy_equity"], label="Strategy")
    plt.plot(data["date"], data["benchmark_equity"], label="Buy and Hold", alpha=0.75)
    plt.title("Momentum Strategy Backtest")
    plt.xlabel("Date")
    plt.ylabel("Equity")
    plt.legend()
    plt.grid(alpha=0.25)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "equity_curve.png", dpi=160)


def main() -> None:
    df = load_market_data()
    data, summary = run_backtest(df)
    save_outputs(data, summary)

    print("Backtest completed.")
    print(summary.to_string(index=False))
    print(f"Outputs saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
