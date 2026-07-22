"""
Trains Random Forest and XGBoost classifiers on the ransomware behavioural
dataset, compares them on held-out test data, and saves the better-performing
model (plus its feature order) to app/ml/ for the FastAPI service to load.
"""
import json
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
# pyrefly: ignore [missing-import]
from xgboost import XGBClassifier

DATA_PATH = "data/Ransomware_Data.csv"
MODEL_OUTPUT_PATH = "app/ml/model.pkl"
METADATA_OUTPUT_PATH = "app/ml/model_metadata.json"

LABEL_COLUMN = "Ware Type"
POSITIVE_LABEL = "ransom"  # the value in LABEL_COLUMN that means "is ransomware"


def load_data():
    df = pd.read_csv(DATA_PATH)
    df["label"] = (df[LABEL_COLUMN] == POSITIVE_LABEL).astype(int)
    feature_cols = [c for c in df.columns if c not in (LABEL_COLUMN, "label")]
    return df[feature_cols], df["label"], feature_cols


def evaluate(name, model, X_test, y_test):
    pred = model.predict(X_test)
    proba = model.predict_proba(X_test)[:, 1]

    print(f"\n=== {name} ===")
    print(classification_report(y_test, pred, target_names=["good", "ransom"]))
    auc = roc_auc_score(y_test, proba)
    print(f"ROC-AUC: {auc:.4f}")
    print("Confusion matrix:\n", confusion_matrix(y_test, pred))

    return {
        "roc_auc": auc,
        "f1_ransom": f1_score(y_test, pred, pos_label=1),
    }


def main():
    print("Loading dataset...")
    X, y, feature_cols = load_data()
    print(f"Loaded {len(X)} rows, {len(feature_cols)} features")
    print(f"Class balance — ransomware: {y.mean():.2%}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # --- Random Forest ---
    t0 = time.time()
    rf = RandomForestClassifier(
        n_estimators=200,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
    )
    rf.fit(X_train, y_train)
    print(f"\nRandom Forest trained in {time.time() - t0:.1f}s")
    rf_scores = evaluate("Random Forest", rf, X_test, y_test)

    # --- XGBoost ---
    # scale_pos_weight compensates for class imbalance (ransomware is the
    # minority class), similar in spirit to class_weight="balanced" above.
    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    t0 = time.time()
    xgb = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    xgb.fit(X_train, y_train)
    print(f"\nXGBoost trained in {time.time() - t0:.1f}s")
    xgb_scores = evaluate("XGBoost", xgb, X_test, y_test)

    # --- Pick the winner by ROC-AUC ---
    if xgb_scores["roc_auc"] >= rf_scores["roc_auc"]:
        winner_name, winner_model, winner_scores = "XGBoost", xgb, xgb_scores
    else:
        winner_name, winner_model, winner_scores = "Random Forest", rf, rf_scores

    print(f"\n{'=' * 50}")
    print(f"WINNER: {winner_name} (ROC-AUC: {winner_scores['roc_auc']:.4f})")
    print(f"{'=' * 50}")

    joblib.dump(winner_model, MODEL_OUTPUT_PATH)

    metadata = {
        "model_name": winner_name,
        "model_version": "v1.0.0",
        "feature_order": feature_cols,
        "roc_auc": winner_scores["roc_auc"],
        "f1_ransom": winner_scores["f1_ransom"],
        "trained_on_rows": len(X),
    }
    with open(METADATA_OUTPUT_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved model to {MODEL_OUTPUT_PATH}")
    print(f"Saved metadata to {METADATA_OUTPUT_PATH}")


if __name__ == "__main__":
    main()