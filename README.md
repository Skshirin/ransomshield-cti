@'
# Ransomware CTI Platform

ML-based ransomware detection with blockchain-anchored Cyber Threat Intelligence (CTI) sharing.

A Windows agent monitors endpoint behavior via Sysmon, an XGBoost model scores each event for ransomware likelihood, confirmed detections auto-generate a CTI report, and that report's integrity hash is published to the Polygon Amoy blockchain so other organizations can trust and verify shared threat intelligence.

## Architecture
Detailed per-service notes live in code comments — this README covers setup and running the stack, not implementation depth.

## Prerequisites

- Node.js 20+, Python 3.11+, Docker Desktop, Git
- Node.js 22+ (via nvm-windows) specifically for `blockchain/` — Hardhat 3 requires it
- Windows machine with admin rights (for Sysmon, agent only)
- A MetaMask wallet funded with test POL on Polygon Amoy ([faucet](https://faucet.polygon.technology/))

## Quick Start (Backend + ML Service + Database)

```powershell
docker compose up --build -d
```

This starts MongoDB, the ML service, and the backend. Verify:
```powershell
Invoke-RestMethod http://localhost:4000/api/health
Invoke-RestMethod http://localhost:8000/health/
```

Seed demo data (wipes existing data — see `apps/backend/src/scripts/seed.ts`):
```powershell
cd apps/backend
npm run seed -- --confirm
```
Demo logins: `sarah@brightpath.com` / `jordan@northwind.com`, password `DemoPass123!` for both.

## Running the Windows Agent (not containerized — needs real Sysmon access)

1. Install Sysmon with `agent/sysmon/sysmonconfig.xml` (see comments in that file for install commands).
2. `cd agent && venv\Scripts\activate`
3. Fill in `agent/.env` with a real `ORGANIZATION_ID` / `ENDPOINT_ID` (from `/api/endpoints`).
4. Run as **Administrator**: `python main.py`

## ML Model Training

Dataset and training script live in `apps/ml-service/`. To retrain:
```powershell
cd apps/ml-service
venv\Scripts\activate
python train_model.py
```
Trains Random Forest and XGBoost, picks the winner by ROC-AUC, saves to `app/ml/model.pkl`. Current model: XGBoost, ROC-AUC 0.9956, F1 0.9614 on the ransomware class.

## Blockchain (Polygon Amoy)

Contract source: `blockchain/contracts/CTIRegistry.sol` (OpenZeppelin `Ownable` — only the backend's wallet can publish). Tests: `cd blockchain && npx hardhat test`. Redeploying requires updating `CTI_REGISTRY_CONTRACT_ADDRESS` and the ABI copy in `apps/backend/src/abi/`.

## Environment Variables

Each service has its own `.env` (gitignored). See `.env` file comments in each service folder for what's required — `apps/backend/.env`, `apps/ml-service/.env`, `agent/.env`, `blockchain/.env`.

## Project Status

Backend, ML pipeline, blockchain integration, and Windows agent (Sysmon-based) are complete and end-to-end tested. Frontend (`apps/web`) is being integrated separately from an existing Figma design.
'@ | Set-Content README.md