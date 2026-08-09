import os
import pandas as pd

from xgboost import XGBClassifier

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)

# =========================================================
# CONFIG
# =========================================================

DATASET = "dataset/ransomware_v3.csv"
MODEL_OUTPUT = "models/ransomware_xgb.json"

FEATURES = [
    "process_create_count",
    "process_terminated_count",
    "file_create_count",
    "file_creation_time_changed",
    "registry_write_count",
    "pipe_create_count",
    "network_connection_count",
    "dns_query_count",
    "file_activity_rate",
    "process_activity_rate",
    "network_activity_rate",
    "registry_activity_rate",
    "pipe_activity_rate",
    "unique_extensions_written",
    "unique_directories_touched",
    "known_encrypted_ext_count",
    "file_operation_ratio",
    "file_name_entropy",
    "average_file_path_length",
    "suspicious_path_ratio",
    "network_unique_destinations",
]

# =========================================================
# LOAD DATASET
# =========================================================

print("=" * 70)
print("LOADING DATASET")
print("=" * 70)

df = pd.read_csv(DATASET)

print(f"Dataset shape: {df.shape}")

# =========================================================
# VALIDATE
# =========================================================

missing = [
    feature
    for feature in FEATURES
    if feature not in df.columns
]

if missing:
    raise ValueError(
        f"Missing features: {missing}"
    )

if "label" not in df.columns:
    raise ValueError(
        "Dataset does not contain 'label'."
    )

print("\nClass distribution:")
print(df["label"].value_counts())

# =========================================================
# FEATURES / TARGET
# =========================================================

X = df[FEATURES].copy()

# good = 0
# ransomware = 1

y = (
    df["label"]
    .map({
        "good": 0,
        "ransomware": 1,
    })
)

if y.isna().any():
    raise ValueError(
        "Unknown labels found in dataset."
    )

y = y.astype(int)

# =========================================================
# TRAIN / TEST SPLIT
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

print("\nSplit:")
print(f"Training samples: {len(X_train)}")
print(f"Testing samples:  {len(X_test)}")

# =========================================================
# MODEL
# =========================================================

print("\n" + "=" * 70)
print("TRAINING XGBOOST")
print("=" * 70)

model = XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1,
)

model.fit(
    X_train,
    y_train,
)

print("Training complete.")

# =========================================================
# PREDICTION
# =========================================================

y_pred = model.predict(X_test)

# =========================================================
# METRICS
# =========================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred
)

recall = recall_score(
    y_test,
    y_pred
)

f1 = f1_score(
    y_test,
    y_pred
)

print("\n" + "=" * 70)
print("MODEL PERFORMANCE")
print("=" * 70)

print(
    f"Accuracy : {accuracy:.4f}"
)

print(
    f"Precision: {precision:.4f}"
)

print(
    f"Recall   : {recall:.4f}"
)

print(
    f"F1 Score : {f1:.4f}"
)

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "good",
            "ransomware",
        ],
    )
)

print("Confusion Matrix:")
print(
    confusion_matrix(
        y_test,
        y_pred
    )
)

# =========================================================
# FEATURE IMPORTANCE
# =========================================================

print("\n" + "=" * 70)
print("FEATURE IMPORTANCE")
print("=" * 70)

importance = pd.DataFrame({
    "feature": FEATURES,
    "importance": model.feature_importances_,
})

importance = importance.sort_values(
    "importance",
    ascending=False
)

print(
    importance.to_string(
        index=False
    )
)

# =========================================================
# SAVE MODEL
# =========================================================

os.makedirs(
    "models",
    exist_ok=True
)

model.save_model(
    MODEL_OUTPUT
)

print("\n" + "=" * 70)
print("MODEL SAVED")
print("=" * 70)

print(
    f"Model: {MODEL_OUTPUT}"
)