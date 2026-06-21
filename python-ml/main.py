from fastapi import FastAPI, HTTPException
import pandas as pd
import datetime
import joblib
import os

app = FastAPI()

DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

def get_tag(predicted: int, avg: float) -> str:
    if predicted > avg * 1.5: return "busy"
    if predicted < avg * 0.5: return "quiet"
    return "steady"

@app.post("/retrain")
async def retrain():
    # Load the pre-trained model bundle
    bundle_path = os.path.join(os.path.dirname(__file__), 'model_bundle.joblib')
    if not os.path.exists(bundle_path):
        raise HTTPException(status_code=500, detail="Model bundle not found. Please run the train_model notebook first.")
    
    bundle = joblib.load(bundle_path)
    model = bundle["model"]
    mae = bundle["mae"]
    sample_size = bundle["sample_size"]
    party_mix_prop = bundle["party_mix_prop"]
    mood_mix_prop = bundle["mood_mix_prop"]
    daily_avg = bundle["daily_avg"]
    avg_party = bundle["avg_party"]

    # Generate Predictions for Next 7 Days
    today = datetime.date.today()
    days_pred = []
    
    total_pred_bookings = 0
    total_pred_covers = 0
    
    for i in range(7):
        target_date = today + datetime.timedelta(days=i)
        target_dow = (target_date.weekday() + 1) % 7
        
        # Predict for hours 17..26 (5 PM to 2 AM)
        hours = list(range(17, 27))
        X_pred = pd.DataFrame({'dow_js': [target_dow]*len(hours), 'hour': [h % 24 for h in hours]})
        y_pred = model.predict(X_pred)
        
        day_total = sum(y_pred)
        total_pred_bookings += day_total
        
        by_hour = [{"hour": int(h % 24), "value": round(val, 1)} for h, val in zip(hours, y_pred)]
        
        covers = round(day_total * avg_party)
        total_pred_covers += covers
        
        days_pred.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "dow": target_dow,
            "dow_label": DOW_LABELS[target_dow],
            "predicted_bookings": int(round(day_total)),
            "predicted_covers": int(covers),
            "low": max(0, int(round(day_total * 0.7))),
            "high": int(round(day_total * 1.3)),
            "tag": get_tag(day_total, daily_avg),
            "by_hour": by_hour,
            "party_mix": {
                "p1": round(day_total * party_mix_prop["p1"], 1),
                "p2": round(day_total * party_mix_prop["p2"], 1),
                "p34": round(day_total * party_mix_prop["p34"], 1),
                "p5": round(day_total * party_mix_prop["p5"], 1),
            },
            "mood_mix": {k: round(day_total * v, 1) for k, v in mood_mix_prop.items()}
        })
        
    predictions_obj = {
        "days": days_pred,
        "totals": {
            "bookings": int(round(total_pred_bookings)),
            "covers": int(round(total_pred_covers)),
            "party_mix": {k: round(total_pred_bookings * v, 1) for k, v in party_mix_prop.items()},
            "mood_mix": {k: round(total_pred_bookings * v, 1) for k, v in mood_mix_prop.items()}
        },
        "hours_range": {"start": 17, "end": 26},
        "generated_for": {
            "week_start": today.strftime("%Y-%m-%d"),
            "week_end": (today + datetime.timedelta(days=6)).strftime("%Y-%m-%d")
        },
        "cold_start": False
    }
    
    return {
        "success": True,
        "training_window_start": None,
        "training_window_end": today.strftime("%Y-%m-%d"),
        "sample_size": sample_size,
        "mae": round(mae, 2),
        "predictions": predictions_obj,
        "notes": "Served via Python FastAPI using pre-trained model bundle."
    }
